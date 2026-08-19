"""Catalog loading and portfolio-compatibility rules."""

from __future__ import annotations

from pathlib import Path

import pytest

from xtb_charts.catalog import (
    Instrument,
    by_xtb_symbol,
    enabled_instruments,
    load_catalog,
)

HEADER = (
    "xtb_symbol,xtb_name,yahoo_symbol,name,asset_class,instrument_type,"
    "exchange,quote_currency,point_size,price_divisor,enabled"
)


def make_instrument(**overrides) -> Instrument:
    defaults = dict(
        xtb_symbol="ABEA.DE",
        xtb_name="Alphabet Inc - class A",
        yahoo_symbol="ABEA.DE",
        name="Alphabet Inc.",
        asset_class="STOCK",
        instrument_type="REAL",
        exchange="XETRA",
        quote_currency="EUR",
        point_size=0.01,
        price_divisor=1.0,
        enabled=True,
    )
    defaults.update(overrides)
    return Instrument(**defaults)


def write_catalog(tmp_path: Path, *rows: str) -> Path:
    path = tmp_path / "symbols.csv"
    path.write_text("\n".join([HEADER, *rows]) + "\n", encoding="utf-8")
    return path


class TestCfdDetection:
    def test_cfd_variant_is_flagged(self):
        cfd = make_instrument(xtb_name="Alphabet Inc CFD - class A")
        assert cfd.is_cfd
        assert "CFD" in cfd.incompatibility_reasons()

    def test_real_variant_is_not_flagged(self):
        real = make_instrument(xtb_name="Alphabet Inc - class A")
        assert not real.is_cfd
        assert real.incompatibility_reasons() == []

    def test_cfd_must_be_a_word(self):
        # A ticker fragment containing the letters must not false-positive.
        assert not make_instrument(xtb_name="CFDX Holdings").is_cfd


class TestCurrencyRules:
    def test_non_eur_catalog_currency_is_flagged(self):
        usd = make_instrument(quote_currency="USD")
        assert usd.incompatibility_reasons() == ["not EUR (USD)"]

    def test_observed_currency_wins_over_catalog(self):
        # Catalog claims EUR; Yahoo reports USD -> judged against USD.
        wrong = make_instrument(quote_currency="EUR")
        assert wrong.incompatibility_reasons("USD") == ["not EUR (USD)"]

    def test_observed_eur_clears_a_wrong_catalog_value(self):
        instrument = make_instrument(quote_currency="USD")
        assert instrument.incompatibility_reasons("EUR") == []

    def test_catalog_observed_mismatch_is_warned(self):
        instrument = make_instrument(quote_currency="EUR")
        assert instrument.warnings("USD") == ["catalog says EUR but Yahoo reports USD"]
        assert instrument.warnings("EUR") == []
        assert instrument.warnings(None) == []

    def test_cfd_and_currency_reasons_combine(self):
        both = make_instrument(xtb_name="Apple Inc CFD", quote_currency="USD")
        assert both.incompatibility_reasons() == ["not EUR (USD)", "CFD"]


class TestLoading:
    def test_loads_rows_and_respects_enabled_flag(self, tmp_path):
        path = write_catalog(
            tmp_path,
            "ABEA.DE,Alphabet Inc - class A,ABEA.DE,Alphabet,STOCK,REAL,XETRA,EUR,0.01,1,true",
            "GLD.US,SPDR Gold Shares CFD,GLD,Gold,ETF,CFD,NYSE Arca,USD,0.01,1,false",
        )
        instruments = load_catalog(path)
        assert [i.xtb_symbol for i in instruments] == ["ABEA.DE", "GLD.US"]
        assert [i.xtb_symbol for i in enabled_instruments(instruments)] == ["ABEA.DE"]
        assert by_xtb_symbol(instruments)["GLD.US"].is_cfd

    def test_missing_column_is_rejected(self, tmp_path):
        path = tmp_path / "symbols.csv"
        path.write_text("xtb_symbol,name\nABEA.DE,Alphabet\n", encoding="utf-8")
        with pytest.raises(ValueError, match="missing columns"):
            load_catalog(path)

    def test_duplicate_symbol_is_rejected(self, tmp_path):
        path = write_catalog(
            tmp_path,
            "ABEA.DE,Alphabet,ABEA.DE,Alphabet,STOCK,REAL,XETRA,EUR,0.01,1,true",
            "ABEA.DE,Alphabet,ABEA.DE,Alphabet,STOCK,REAL,XETRA,EUR,0.01,1,true",
        )
        with pytest.raises(ValueError, match="duplicate"):
            load_catalog(path)

    def test_non_positive_point_size_is_rejected(self, tmp_path):
        path = write_catalog(
            tmp_path,
            "ABEA.DE,Alphabet,ABEA.DE,Alphabet,STOCK,REAL,XETRA,EUR,0,1,true",
        )
        with pytest.raises(ValueError, match="positive"):
            load_catalog(path)

    def test_seed_catalog_is_valid(self):
        # The checked-in catalog must always load.
        instruments = load_catalog()
        assert len(instruments) == 133
        assert any(i.enabled for i in instruments)
        assert sum(1 for i in instruments if i.enabled) == 131
        disabled = [i for i in instruments if not i.enabled]
        assert {i.xtb_symbol for i in disabled} == {"GLD.US", "OOEA.DE"}

    def test_non_eur_real_stocks_are_flagged_without_cfd(self):
        instruments = by_xtb_symbol(load_catalog())
        for symbol in ("3USL.UK", "COPX.UK", "V.US"):
            inst = instruments[symbol]
            assert not inst.is_cfd
            reasons = inst.incompatibility_reasons()
            assert any(r.startswith("not EUR") for r in reasons)
            assert "CFD" not in reasons

    def test_three_decimal_point_size(self):
        a1p0 = by_xtb_symbol(load_catalog())["A1P0.DE"]
        assert a1p0.point_size == 0.001
