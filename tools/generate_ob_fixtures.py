"""Generate golden OB fixtures from MT5 CSV exports.

Dev-time only. Reads three CSV dumps produced by tools/mql5/ExportOBOracle.mq5
after attaching SMCTrading (InpShowHistory=true) and forcing a recalculation.

Export procedure (manual, in MT5-Testing):
  1. Open a D1 (or other H4+) chart for the instrument.
  2. Attach SMCTrading with InpShowHistory = true.
  3. Force a full recalculation (remove/re-add indicator, or switch TF and back).
  4. Run Scripts/ExportOBOracle on the chart.
  5. CSVs land in MQL5/Files/ob_oracle/ as bars_*, pivots_*, zones_*.
  6. Run: uv run python tools/generate_ob_fixtures.py [--mt5-files DIR]

Fixture JSON shape (tests/fixtures/ob/*.json):
  name, source {path, version, hash}, symbol, timeframe, point_size,
  params, bars, pivots, zones (each with open flag derived from right anchor).

Run:  uv run python tools/generate_ob_fixtures.py
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
OUT_DIR = REPO / "tests" / "fixtures" / "ob"

SOURCE_PATH = "~/daytrading/mt5/indicators/SMCTrading.mq5"
SOURCE_VERSION = "3.23"
SOURCE_HASH = "065e95609c6fffe1fc824777531f2c1fd237e8cdd07affdb7b40ebcf54388b7d"

DEFAULT_MT5_FILES = Path(
    "/home/alin/.mt5/drive_c/Program Files/MT5-Testing/MQL5/Files/ob_oracle"
)

OB_PARAMS = {
    "pivot_bars": 3,
    "confirm_points": 50,
    "validity_scan_cap": 500,
}

#: Timeframes where the source's skip-bar filter is inert, so MT5 and the port read
#: the same bars and parity is meaningful. Below H4 the source refuses pivots on bars
#: opening inside its server-time window while the port takes every bar, so an
#: intraday export is a diagnostic for the spot-check — never a parity fixture.
PARITY_TIMEFRAMES = {"h4", "d1", "w1", "mn1"}


def read_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def parse_tag(tag: str) -> tuple[str, str]:
    """Parse SYMBOL_PERIOD from e.g. GER40_PERIOD_D1."""
    m = re.match(r"^(.+)_PERIOD_(.+)$", tag)
    if not m:
        return tag, "unknown"
    return m.group(1), m.group(2).lower()


def zone_direction(price_high: float, price_low: float, bar_open: float, bar_close: float) -> str:
    """Infer supply vs demand from bar colour when object colour is unavailable."""
    if bar_close > bar_open:
        return "supply"
    if bar_close < bar_open:
        return "demand"
    mid = (price_high + price_low) / 2
    return "supply" if bar_close >= mid else "demand"


def build_fixture(
    name: str,
    symbol: str,
    timeframe: str,
    point_size: float,
    bars_path: Path,
    pivots_path: Path,
    zones_path: Path,
) -> dict:
    bar_rows = read_csv_rows(bars_path)
    bars = [
        {
            "time": int(r["time"]),
            "open": float(r["open"]),
            "high": float(r["high"]),
            "low": float(r["low"]),
            "close": float(r["close"]),
        }
        for r in bar_rows
    ]
    # Sort rather than trust the export's row order: reading these newest-first
    # once made every zone look still-open, which is invisible in a fixture.
    bars.sort(key=lambda b: b["time"])
    newest_time = bars[-1]["time"] if bars else 0
    bar_by_time = {b["time"]: b for b in bars}

    pivots = []
    for r in read_csv_rows(pivots_path):
        pivots.append(
            {
                "time": int(r["time"]),
                "type": r["type"],
                "extreme": float(r["extreme"]),
                "confirmation_time": int(r["confirmation_time"]),
                "confirm_price": float(r["confirm_price"]),
                "move_type": r["move_type"],
            }
        )

    zones = []
    for r in read_csv_rows(zones_path):
        time_from = int(r["time_from"])
        time_to = int(r["time_to"])
        price_high = float(r["price_high"])
        price_low = float(r["price_low"])
        bar = bar_by_time.get(time_from)
        if bar:
            direction = zone_direction(price_high, price_low, bar["open"], bar["close"])
        else:
            direction = "demand"
        open_zone = time_to > newest_time
        zones.append(
            {
                "time": time_from,
                "direction": direction,
                "price_low": price_low,
                "price_high": price_high,
                "time_to": None if open_zone else time_to,
                "open": open_zone,
            }
        )

    return {
        "name": name,
        "source": {
            "path": SOURCE_PATH,
            "version": SOURCE_VERSION,
            "hash": SOURCE_HASH,
        },
        "symbol": symbol,
        "timeframe": timeframe,
        "point_size": point_size,
        "params": dict(OB_PARAMS),
        "bars": bars,
        "pivots": pivots,
        "zones": zones,
        "warning": None,
    }


def discover_exports(files_dir: Path) -> list[tuple[str, Path, Path, Path]]:
    bars_files = sorted(files_dir.glob("bars_*.csv"))
    out: list[tuple[str, Path, Path, Path]] = []
    for bars_path in bars_files:
        tag = bars_path.stem.replace("bars_", "", 1)
        pivots_path = files_dir / f"pivots_{tag}.csv"
        zones_path = files_dir / f"zones_{tag}.csv"
        if pivots_path.is_file() and zones_path.is_file():
            out.append((tag, bars_path, pivots_path, zones_path))
    return out


def read_meta(files_dir: Path, tag: str) -> dict[str, str]:
    """Terminal-reported metadata for one export, empty when the file is absent."""
    meta_path = files_dir / f"meta_{tag}.csv"
    if not meta_path.is_file():
        return {}
    with meta_path.open(newline="", encoding="utf-8") as fh:
        return {r["key"]: r["value"] for r in csv.DictReader(fh)}


def resolve_point_size(meta: dict[str, str], fallback: float, tag: str) -> float:
    """Prefer the terminal's own point size; the flag is only a fallback.

    The confirmation distance is expressed in points, so a wrong point size
    silently changes which pivots confirm and makes a parity run meaningless.
    """
    raw = meta.get("point_size")
    if raw is None:
        print(f"{tag}: no meta_ export, falling back to --point-size={fallback}")
        return fallback
    value = float(raw)
    if value <= 0:
        raise SystemExit(f"{tag}: exported point_size is {value!r}, which cannot be used")
    return value


def check_pivot_chronology(payload: dict, tag: str) -> None:
    """Refuse an export whose confirmations precede their own pivots.

    A pivot cannot confirm before it exists, so a confirmation strictly earlier
    than the pivot means the export mixed series-indexed and chronological arrays.
    That produced a mirrored oracle once already, and it is invisible once written
    to a fixture, so fail here instead. Confirmation *on* the pivot bar is allowed:
    where the points threshold is small relative to a bar's own range, the pivot
    bar itself can satisfy the retracement.
    """
    offenders = [
        p
        for p in payload["pivots"]
        if p["confirmation_time"] and p["confirmation_time"] < p["time"]
    ]
    if offenders:
        raise SystemExit(
            f"{tag}: {len(offenders)}/{len(payload['pivots'])} pivots report a "
            "confirmation at or before the pivot itself, which is impossible. "
            "Re-export with the current ExportOBOracle build (the earlier one "
            "indexed buffers chronologically while indexing times as a series)."
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate OB fixtures from MT5 CSV exports")
    parser.add_argument(
        "--mt5-files",
        type=Path,
        default=DEFAULT_MT5_FILES,
        help="Directory containing bars_*, pivots_*, zones_* CSV exports",
    )
    parser.add_argument(
        "--point-size",
        type=float,
        default=0.01,
        help="Fallback only; the exported meta_ file's point size wins when present",
    )
    args = parser.parse_args()

    exports = discover_exports(args.mt5_files)
    if not exports:
        raise SystemExit(
            f"No complete export triplets in {args.mt5_files}. "
            "Run ExportOBOracle in MT5 first."
        )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for tag, bars_path, pivots_path, zones_path in exports:
        symbol, timeframe = parse_tag(tag)
        name = f"{symbol.lower()}-{timeframe}"
        if timeframe not in PARITY_TIMEFRAMES:
            print(
                f"{tag}: skipped, {timeframe} is below H4 where the source skips bars in its "
                "server-time window and the port does not. Committing it as a parity fixture "
                "would assert a match that is not required; use it for the intraday spot-check."
            )
            continue
        meta = read_meta(args.mt5_files, tag)
        point_size = resolve_point_size(meta, args.point_size, tag)
        payload = build_fixture(
            name, symbol, timeframe, point_size, bars_path, pivots_path, zones_path
        )
        check_pivot_chronology(payload, tag)
        out = OUT_DIR / f"{name}.json"
        out.write_text(json.dumps(payload), encoding="utf-8")
        print(
            f"{name}: {len(payload['bars'])} bars, "
            f"{len(payload['pivots'])} pivots, {len(payload['zones'])} zones, "
            f"point={point_size}"
        )


if __name__ == "__main__":
    main()
