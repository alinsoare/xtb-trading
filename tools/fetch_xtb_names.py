"""Fetch verbatim xStation names from XTB instrument pages (maintainer helper)."""

from __future__ import annotations

import argparse
import html
import json
import re
import subprocess
import sys
import time
from pathlib import Path

MARKETING = (
    "join xtb",
    "join our",
    "t&cs apply",
    "investing carries",
    "unlock your investment",
)

CURL_HEADERS = [
    "-H",
    "Accept-Language: en-US,en;q=0.9",
    "-H",
    "Accept: text/html",
    "-H",
    "Referer: https://www.xtb.com/",
    "-A",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]


def is_valid_name(name: str) -> bool:
    clean = html.unescape(name).strip()
    low = clean.lower()
    return bool(clean) and len(clean) <= 180 and not any(m in low for m in MARKETING)


def parse_name(page: str) -> str | None:
    for pat in (
        r'"description"\s*:\s*"([^"]+)"',
        r'<meta\s+name="description"\s+content="([^"]+)"',
    ):
        match = re.search(pat, page, re.I)
        if match:
            candidate = html.unescape(match.group(1).strip())
            if is_valid_name(candidate):
                return candidate
    return None


def fetch_name(xtb: str, *, kind: str) -> str | None:
    slug = xtb.lower().replace(".", "-")
    url = f"https://www.xtb.com/int/{kind}/{slug}"
    proc = subprocess.run(
        ["curl", "-sL", *CURL_HEADERS, url],
        capture_output=True,
        text=True,
        check=False,
    )
    return parse_name(proc.stdout)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Fetch xStation names into a JSON cache.")
    parser.add_argument("tickers", nargs="*", help="XTB tickers to fetch")
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--stc", nargs="*", default=[], help="tickers that use /stocks/")
    parser.add_argument("--delay", type=float, default=6.0)
    args = parser.parse_args(argv)

    stc = set(args.stc)
    cache: dict[str, str | None] = {}
    if args.cache.is_file():
        cache = json.loads(args.cache.read_text(encoding="utf-8"))

    for ticker in args.tickers:
        if cache.get(ticker):
            print(f"{ticker}: cached")
            continue
        kind = "stocks" if ticker in stc else "etfs"
        name = fetch_name(ticker, kind=kind)
        cache[ticker] = name
        args.cache.write_text(
            json.dumps(cache, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print(f"{ticker}: {name or 'NOT FOUND'}")
        time.sleep(args.delay)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
