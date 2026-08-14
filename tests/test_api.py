"""Dev HTTP surface: contract shapes, sync conflict, error codes, offline reads."""

from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from xtb_charts import api, store
from xtb_charts.config import TIMEFRAME_ORDER, TIMEFRAMES
from xtb_charts.contract import SCAN_BAR_CAP, SCAN_TIMEFRAMES
from xtb_charts.store import Bar


@pytest.fixture
def client(monkeypatch, tmp_path):
    """Test client against a temporary database and a fetch module that explodes.

    Patching fetch to raise proves no data endpoint touches the network.
    """
    db = tmp_path / "market.db"
    monkeypatch.setattr(store, "DB_PATH", db)

    from xtb_charts import fetch

    def forbidden(*args, **kwargs):
        raise AssertionError("a data endpoint attempted a market-data fetch")

    monkeypatch.setattr(fetch, "fetch_bars", forbidden)

    store.init_db(db)
    with TestClient(api.app) as test_client:
        yield test_client


def seed(symbol: str, tf_key: str, count: int):
    with store.connect() as conn:
        bars = [
            Bar(ts=1_700_000_000 + i * 3600, open=1, high=2, low=0.5, close=1.5, volume=10.0)
            for i in range(count)
        ]
        store.upsert_bars(conn, symbol, tf_key, bars)


class TestMeta:
    def test_shape_and_mode(self, client):
        payload = client.get("/data/meta.json").json()
        assert payload["mode"] == "dev"
        assert payload["timeframe_order"] == TIMEFRAME_ORDER
        assert payload["generated_utc"]
        for key, tf in TIMEFRAMES.items():
            entry = payload["timeframes"][key]
            assert entry["label"] == tf.label
            assert entry["seconds"] == tf.seconds

    def test_publishes_no_bar_targets(self, client):
        # Depth is not a published value any more: nothing in the contract
        # invites a client to believe it can be read, let alone set.
        payload = client.get("/data/meta.json").json()
        for entry in payload["timeframes"].values():
            assert set(entry) == {"label", "seconds"}


class TestCatalog:
    def test_lists_seed_instruments_with_flags(self, client):
        payload = client.get("/data/catalog.json").json()
        by_symbol = {s["xtb_symbol"]: s for s in payload["symbols"]}
        assert len(payload["symbols"]) == 64
        assert "ABEA.DE" in by_symbol
        for symbol in ("3USL.UK", "COPX.UK", "V.US"):
            entry = by_symbol[symbol]
            assert any(r.startswith("not EUR") for r in entry["incompatibility"])
            assert "CFD" not in entry["incompatibility"]

        aapl = by_symbol["AAPL.US"]  # enabled USD CFD in the seed catalog
        assert not aapl["compatible"]
        assert "CFD" in aapl["incompatibility"]
        assert any(r.startswith("not EUR") for r in aapl["incompatibility"])

        gld = by_symbol["GLD.US"]  # disabled entry stays visible
        assert gld["enabled"] is False

    def test_includes_bar_counts_and_sync_state(self, client):
        seed("ABEA.DE", "d1", 7)
        with store.connect() as conn:
            store.record_sync(
                conn, "ABEA.DE", "d1", status="ok", message="",
                last_sync_utc="2026-08-12T10:00:00+00:00", quote_currency="EUR",
            )
        payload = client.get("/data/catalog.json").json()
        entry = next(s for s in payload["symbols"] if s["xtb_symbol"] == "ABEA.DE")
        assert entry["timeframes"]["d1"]["bars"] == 7
        assert entry["timeframes"]["d1"]["status"] == "ok"
        assert entry["total_bars"] == 7
        assert entry["last_sync_utc"] == "2026-08-12T10:00:00+00:00"


class TestScanBars:
    def test_shape_and_cap(self, client):
        seed("ABEA.DE", "d1", SCAN_BAR_CAP + 50)
        seed("ABEA.DE", "h1", 90)
        seed("ABEA.DE", "m15", SCAN_BAR_CAP)
        seed("GLD.US", "d1", 10)  # disabled in seed catalog

        payload = client.get("/data/scan-bars.json").json()
        assert "symbols" in payload
        assert "ABEA.DE" in payload["symbols"]
        assert "GLD.US" not in payload["symbols"]

        abea = payload["symbols"]["ABEA.DE"]
        assert set(abea) == set(SCAN_TIMEFRAMES)
        for tf_key in SCAN_TIMEFRAMES:
            series = abea[tf_key]
            assert set(series) == {"t", "o", "h", "l", "c"}

        assert len(abea["d1"]["t"]) == SCAN_BAR_CAP
        assert len(abea["h1"]["t"]) == 90
        assert len(abea["m15"]["t"]) == SCAN_BAR_CAP
        assert abea["d1"]["t"] == sorted(abea["d1"]["t"])
        assert abea["d1"]["t"][0] == 1_700_000_000 + 50 * 3600

    def test_export_matches_dev(self, client, tmp_path):
        from xtb_charts.export import export_site

        seed("ABEA.DE", "d1", 12)
        out = tmp_path / "dist"
        export_site(out)
        dev = client.get("/data/scan-bars.json").json()
        exported = json.loads((out / "data" / "scan-bars.json").read_text())
        dev.pop("generated_utc")
        exported.pop("generated_utc")
        assert exported == dev


class TestCandles:
    def test_shape(self, client):
        seed("ABEA.DE", "h1", 3)
        payload = client.get("/data/candles/ABEA.DE/h1.json").json()
        assert payload["symbol"] == "ABEA.DE"
        assert payload["timeframe"] == "h1"
        assert len(payload["candles"]) == 3
        candle = payload["candles"][0]
        assert set(candle) == {"time", "open", "high", "low", "close", "volume"}
        assert candle["time"] == 1_700_000_000  # epoch seconds, not millis

    def test_unknown_timeframe_is_400(self, client):
        assert client.get("/data/candles/ABEA.DE/h4.json").status_code == 400

    def test_unknown_symbol_is_404(self, client):
        assert client.get("/data/candles/NOPE.XX/d1.json").status_code == 404


class TestSyncEndpoints:
    def test_conflict_when_already_running(self, client, monkeypatch):
        monkeypatch.setattr(api.runner, "try_start", lambda **kw: False)
        response = client.post("/api/sync", json={})
        assert response.status_code == 409

    def test_start_forwards_options(self, client, monkeypatch):
        seen = {}

        def fake_start(**kwargs):
            seen.update(kwargs)
            return True

        monkeypatch.setattr(api.runner, "try_start", fake_start)
        monkeypatch.setattr(api.runner, "snapshot", lambda: {"running": True})
        response = client.post(
            "/api/sync", json={"symbols": ["ABEA.DE"], "full": True}
        )
        assert response.status_code == 200
        assert seen == {"symbols": ["ABEA.DE"], "full": True, "periodic": False}

    def test_periodic_flag_reaches_the_runner(self, client, monkeypatch):
        seen = {}
        monkeypatch.setattr(api.runner, "try_start", lambda **kw: (seen.update(kw), True)[1])
        monkeypatch.setattr(api.runner, "snapshot", lambda: {"running": True})

        response = client.post("/api/sync", json={"periodic": True})
        assert response.status_code == 200
        # Carried explicitly rather than inferred: the runner must not have to
        # guess whether the skip rule applies.
        assert seen["periodic"] is True
        assert seen["full"] is False

    def test_a_request_carrying_targets_is_refused(self, client, monkeypatch):
        def forbidden(**kwargs):
            raise AssertionError("a stale request started a sync")

        monkeypatch.setattr(api.runner, "try_start", forbidden)
        response = client.post("/api/sync", json={"targets": {"d1": 2000}})
        # Refused, not ignored: a caller sending a depth is working from a
        # contract that no longer exists and should hear so.
        assert response.status_code == 422

    def test_any_unknown_field_is_refused(self, client, monkeypatch):
        monkeypatch.setattr(api.runner, "try_start", lambda **kw: True)
        assert client.post("/api/sync", json={"depth": 5}).status_code == 422

    def test_status_endpoint(self, client):
        payload = client.get("/api/sync/status").json()
        assert "running" in payload

    def test_frontend_served_at_root(self, client):
        response = client.get("/")
        assert response.status_code == 200
        assert "html" in response.text.lower()
