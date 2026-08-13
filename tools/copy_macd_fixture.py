#!/usr/bin/env python3
"""Copy MACD oracle JSON from MT5-Testing into tests/fixtures/macd/.

Dev-time only. Run ExportMacdOracle on an XAUUSD D1 chart first; it writes
JSON to MQL5/Files/macd_oracle/ in the MT5-Testing install.

Usage:
  uv run python tools/copy_macd_fixture.py
  uv run python tools/copy_macd_fixture.py --mt5-files ~/.mt5/.../MQL5/Files/macd_oracle
"""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
DEFAULT_MT5_FILES = Path.home() / ".mt5/drive_c/Program Files/MT5-Testing/MQL5/Files/macd_oracle"
OUT_DIR = REPO / "tests/fixtures/macd"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--mt5-files",
        type=Path,
        default=DEFAULT_MT5_FILES,
        help="Directory containing ExportMacdOracle JSON output",
    )
    args = parser.parse_args()
    src_dir: Path = args.mt5_files

    if not src_dir.is_dir():
        raise SystemExit(
            f"no export directory at {src_dir}; run ExportMacdOracle in MT5-Testing first"
        )

    files = sorted(src_dir.glob("*.json"))
    if not files:
        raise SystemExit(f"no JSON files in {src_dir}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for path in files:
        data = json.loads(path.read_text())
        name = data.get("name") or path.stem.lower()
        dest = OUT_DIR / f"{name}.json"
        shutil.copy2(path, dest)
        print(f"copied {path.name} -> {dest.relative_to(REPO)}")


if __name__ == "__main__":
    main()
