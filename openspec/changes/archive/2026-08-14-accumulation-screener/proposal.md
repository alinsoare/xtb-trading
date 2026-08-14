## Why

The app can already show, on one chart at a time, everything needed to spot a mean-reversion
accumulation setup — a live FVG, a rising MACD histogram, the swing structure, the recent range —
but only by opening each of the 44 instruments in turn and reading them by eye. That is a chore
nobody performs daily, so setups are missed simply because nothing looks at every instrument.

A screener closes that gap without adding any new data or any new analysis: it runs the indicator
code that already exists across every enabled instrument on load and marks the candidates in the
sidebar, so the list itself says where to look.

## What Changes

- Add a **cross-instrument accumulation screener** that scores every enabled instrument on page
  load and marks candidates in the sidebar with one to three dots. The app reports facts only —
  the 30-day range, the position inside it, and a confluence score with the reasons that produced
  it. It never suggests an entry, a target, or a position size.
- Score with a **gate then a weighted sum**. An instrument is only flagged when its 30-day range
  is at least 3% of the range low and price sits in the bottom 33% of that range. Signals sum to
  at most 9: price inside a live D1 bullish FVG with the last three completed H1 bars bullish (3),
  price inside a live H1 bullish FVG with the last three completed M15 bars bullish (2), a D1 MACD
  histogram rising over the last three completed bars (1), and the distance from price up to the
  last confirmed D1 high pivot, banded 0/1/2/3. Score 1-3 renders one dot, 4-6 two, 7-9 three.
- Fix the shared reading conventions **once, in one module**: the newest stored bar is forming so
  the last completed bar is `n-2`; current price is the close of the most recent bar across the
  three scanned timeframes; a doji is neutral in a bullish run rather than breaking it; a zone is
  live when it still reaches the newest bar. Every threshold is a named constant so the weights
  can be tuned without reading logic.
- Add a **purpose-built scan payload** — the last 420 bars of M15, H1 and D1 for enabled
  instruments, columnar and volume-free — served by the dev backend and written by the exporter,
  so a whole-catalog scan costs one request instead of 132. Disabled instruments are absent from
  it and are shown as not scanned rather than silently dropped.
- Cache scores in the browser, **keyed by each symbol's last sync time**, so a reload with nothing
  newly synced never fetches the scan payload at all. Consistent with the offline-first
  constraint, the scan reads stored data only and triggers no market-data fetch.
- Extend the sidebar rows with the dots, the range and position figures, a tooltip listing the
  firing rules and their points, and a sort-by-score option beside the existing filters.
- Add Node fixtures for the signal and scoring rules, and Python coverage for the new payload.

Not in scope: any change to how bars are fetched, stored or synced; any change to the FVG, MACD
or swing-structure computations themselves, which are imported as they are; backtesting or
validating the weights; and any recommendation beyond the reported facts.

## Capabilities

### New Capabilities

- `accumulation-screener`: scanning every enabled instrument against stored bars — the gate, the
  weighted signals and their shared bar-reading conventions, the dot buckets and reasons, the scan
  payload it reads, and the cache that keeps a reload free.

### Modified Capabilities

- `charting`: the symbol browser requirement grows the screener marks — dots, the 30-day range and
  position figures, the reasons tooltip, the not-scanned and insufficient-history states, and a
  sort-by-score option next to the existing search, asset-class and compatible-only filters.
- `release-publishing`: the static data export requirement grows the scan payload, so the
  published site screens exactly as the dev backend does.

`market-data` is deliberately **not** modified: nothing changes about what is fetched, how it is
stored, or how deep a series runs. The scan payload is a new view over already-stored bars, so it
belongs to the screener capability rather than to the fetching and storage rules.

## Impact

- `src/xtb_charts/contract.py` — a `build_scan_bars` builder beside `build_catalog` and
  `build_candles`.
- `src/xtb_charts/api.py` and `src/xtb_charts/export.py` — the same payload served at
  `/data/scan-bars.json` and written to the export directory, following the existing pattern.
- `web/screener/` (new) — range, signals, scoring and scan orchestration, importing `fvgZones`,
  `macdArrays` and `computeSwingStructure` rather than reimplementing them.
- `web/app.js` — the scan on load, progress in the existing catalog summary line, the marks in
  `renderList()`, and the score sort.
- `web/styles.css` — dot styles beside the existing badge rules.
- `tests/js/run_screener.mjs` (new), `tests/test_api.py`, `tests/test_export.py`, and the test list
  in `README.md`.
- `data/symbols.csv` — no schema change, but each instrument's `point_size` becomes load-bearing
  across the whole screen rather than on one chart, so it warrants a sanity pass.
- No new dependency, no build step, and no network call beyond the one scan payload request.
