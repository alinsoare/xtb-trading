## 1. Screening payload

- [x] 1.1 Add `build_scan_bars(conn)` to `src/xtb_charts/contract.py`, emitting `{"symbols": {"<sym>": {"m15"|"h1"|"d1": {"t": [], "o": [], "h": [], "l": [], "c": []}}}}` for enabled instruments only, with a module-level `SCAN_BAR_CAP = 420` and no volume
- [x] 1.2 Take the most recent bars per symbol and timeframe up to the cap, oldest first, serving a shorter series whole rather than padding it
- [x] 1.3 Serve it at `GET /data/scan-bars.json` in `src/xtb_charts/api.py`, following the existing catalog/candles route pattern
- [x] 1.4 Write the same payload to `data/scan-bars.json` in `src/xtb_charts/export.py` so the static site reads an identical file
- [x] 1.5 Extend `tests/test_api.py` and `tests/test_export.py`: disabled instruments absent, bar counts capped at 420, short series served in full, timestamps ascending, and the served and exported payloads identical for the same store

## 2. Shared screening conventions

- [x] 2.1 Create `web/screener/bars.js` holding the conventions used by every signal, each threshold a named export: `SCAN_TIMEFRAMES`, `DOJI_BODY_RATIO = 0.10`, `SEQUENCE_SCAN_CAP = 8`, `RANGE_WINDOW_DAYS = 30`
- [x] 2.2 Implement `lastCompletedIndex(bars)` returning `n - 2`, matching `j3Newest` in `fvg.js` and `lastCompletedJs` in `ob-structure.js`, with a comment naming both
- [x] 2.3 Implement `currentPrice(seriesByTimeframe)` as the close of the newest bar across the scanned timeframes chosen by max timestamp, so a timeframe that failed to sync cannot supply a stale price
- [x] 2.4 Implement `isDoji(bar)` as `|close - open| <= DOJI_BODY_RATIO * (high - low)`, treating any zero-range bar as a doji
- [x] 2.5 Implement `columnarToBars(payloadSeries)` converting the payload's columnar arrays into the `{time, open, high, low, close}` bar objects the existing indicators expect

## 3. Signal primitives

- [x] 3.1 Create `web/screener/range.js`: the 30-day window over D1 bars by timestamp, its highest high and lowest low, `rangePct = (high - low) / low`, and `positionPct = (price - low) / (high - low)`, returning nulls when the window is empty or the range is zero
- [x] 3.2 In `web/screener/signals.js`, implement `bullishRun(bars, required)` walking back from the last completed bar, counting bullish bars, skipping dojis, stopping at the first bearish bar or after `SEQUENCE_SCAN_CAP` bars examined
- [x] 3.3 Implement `inLiveBullishFvg(bars, pointSize, price)` over `fvgZones()`: bullish zones only, live when `zone.time_to >= times[n - 1]`, contained when `price_low <= price <= price_high`
- [x] 3.4 Implement `macdAscending(bars)` over `macdArrays()`: `hist[k] > hist[k-1] > hist[k-2]` ending at the last completed bar, false when any of the three is undefined
- [x] 3.5 Implement `lastConfirmedHighPivot(bars, pointSize)` over `computeSwingStructure().pivots`: the most recent chronological entry with `isHigh === true`, ignoring pending pivots, and `pivotDistance = (pivotHigh - price) / price`
- [x] 3.6 Report insufficient history explicitly, per signal, when a series is shorter than that signal's warm-up, instead of returning a false negative

## 4. Gate, score and buckets

- [x] 4.1 Create `web/screener/score.js` with the tunables as named exports: `GATE_MIN_RANGE_PCT = 0.03`, `GATE_MAX_POSITION_PCT = 0.33`, the weights 3/2/1, and the pivot bands `[0.02, 0.05, 0.10]` scoring 0/1/2/3
- [x] 4.2 Implement the gate: both range and position conditions must hold, and a gated-out instrument scores nothing while keeping its range and position figures
- [x] 4.3 Implement the weighted sum, with D1-FVG-plus-H1-run and H1-FVG-plus-M15-run each as one combined signal that contributes nothing when only half of it holds
- [x] 4.4 Implement the pivot band with boundaries belonging to the lower band (`d <= 2%` scores 0, exactly 5% scores 1, exactly 10% scores 2)
- [x] 4.5 Return a reasons list of `{rule, points}` for every rule that fired, and a mark count bucketing 1-3 to one, 4-6 to two, 7-9 to three
- [x] 4.6 Return a distinct result state for not-screened (disabled) and insufficient-history instruments so the UI can tell them from a screened zero

## 5. Scan orchestration and cache

- [x] 5.1 Create `web/screener/scan.js`: read `catalog.json`, build the cache key from every symbol's `last_sync_utc`, and reuse cached scores without requesting the scan payload when the key matches
- [x] 5.2 Fetch `data/scan-bars.json` only on a key mismatch, then score each symbol using its catalog `point_size`
- [x] 5.3 Yield between instruments so the sidebar stays searchable and clickable during the scan, and report progress through a callback
- [x] 5.4 Write the cache to `localStorage` under a versioned key, invalidating the whole cache on any key mismatch, and degrade to recomputing every load when storage is unavailable
- [x] 5.5 Isolate per-instrument failures so one unscoreable instrument cannot stop the scan

## 6. Sidebar UI

- [x] 6.1 Extend `renderList()` in `web/app.js` with a mark group, the 30-day range and position figures, and the not-screened / insufficient-history states in place of the figures
- [x] 6.2 Set the mark group's `title` to the firing rules and their points so a mark is auditable from the list
- [x] 6.3 Route scan progress into the existing `#catalog-summary` line
- [x] 6.4 Add a sort-by-score control beside the existing search, asset-class and compatible-only filters, sorting what the filters admit, stable within a score
- [x] 6.5 Persist the sort order alongside the existing sidebar filters in `web/settings.js`, falling back to the default on an unknown stored value
- [x] 6.6 Add mark styles to `web/styles.css` next to the existing `.badge` rules: all marks identical in size and colour, only the count carrying meaning
- [x] 6.7 Start the scan on load and render marks as they arrive, without blocking the first paint of the list

## 7. Tests

- [x] 7.1 Create `tests/js/run_screener.mjs` in the existing `tests/js/` harness style with hand-built fixtures
- [x] 7.2 Cover the conventions: last-completed index, current price ignoring a stale timeframe, doji classification including a zero-range bar
- [x] 7.3 Cover run counting: doji-neutral, a bearish bar breaking the run, and the scan cap bounding the walk
- [x] 7.4 Cover MACD ascending on completed bars, including a flat pair not counting and an undefined warm-up value not counting
- [x] 7.5 Cover each pivot-distance band boundary exactly, and range and position arithmetic including a zero-range window
- [x] 7.6 Cover end-to-end score composition: a gated-out instrument scoring nothing, each bucket boundary (3/4, 6/7), and a full-confluence 9 with its reasons list
- [x] 7.7 Add the runner to the test list in `README.md`

## 8. Verification

- [x] 8.1 Sanity-pass `point_size` for every enabled instrument in `data/symbols.csv`, since a wrong value now suppresses that instrument's marks across the whole screen
- [x] 8.2 Load the app and confirm the scan runs once, reports progress, and leaves the list interactive throughout
- [x] 8.3 Reload with nothing newly synced and confirm from the network panel that the scan payload is not requested; sync one instrument and confirm the next load re-screens
- [x] 8.4 Open a marked instrument's chart with FVG, MACD and OB enabled and confirm the tooltip's reasons match what the chart shows
- [x] 8.5 Run the exporter, serve the export as static files, and confirm the marks match what the dev backend produced from the same store
