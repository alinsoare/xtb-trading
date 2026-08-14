## 1. Gate logic

- [x] 1.1 In `web/screener/score.js`, replace the exported `GATE_MAX_POSITION_PCT` with a
  peak-discount constant (fraction of the 30-day high, value `0.02`), keeping
  `GATE_MIN_RANGE_PCT` at `0.03`.
- [x] 1.2 In `scoreInstrument()`, read the 30-day `high` from `computeRange()` alongside
  `rangePct` and `positionPct`, and change the gate to require `rangePct >= GATE_MIN_RANGE_PCT`
  and `price < high * (1 - <peak-discount constant>)`, with the strict inequality at the
  boundary.
- [x] 1.3 Keep `rangePct` and `positionPct` on every result object, including the gated-out and
  insufficient-history paths, so the sidebar figures are unchanged.
- [x] 1.4 Confirm no other module reads `GATE_MAX_POSITION_PCT`, and that `web/app.js` and
  `web/screener/range.js` need no change.

## 2. Cache invalidation

- [x] 2.1 Bump `SCAN_CACHE_VERSION` in `web/screener/scan.js` so scores cached under the old gate
  are discarded on the next load.

## 3. Tests

- [x] 3.1 In `tests/js/run_screener.mjs`, replace the max-position constant assertion with one
  for the new peak-discount constant.
- [x] 3.2 Update the gated-out fixture so it gates out for the new reason — price within 2% of
  the 30-day high — and still asserts a zero score with range figures present.
- [x] 3.3 Add a fixture for the JMLP.DE-style case: price ~5.7% below the 30-day high while
  sitting near 38% of the range, asserting the instrument is scored rather than gated out.
- [x] 3.4 Add a boundary fixture asserting that price exactly at `high * 0.98` gates out.
- [x] 3.5 Keep a fixture asserting an instrument whose 30-day range is under 3% gates out even
  when it is well below its peak.
- [x] 3.6 Verify the existing full-confluence fixture still gates in under the new rule, adjusting
  its synthetic bars if the newest bar sits too close to the window high.
- [x] 3.7 Run `node tests/js/run_screener.mjs` and confirm all checks pass.

## 4. Verification

- [x] 4.1 Load the app against the current data store and confirm JMLP.DE now carries marks when
  its signals fire, and that the sidebar still reads "30d range X% · position Y%".
- [x] 4.2 Spot-check one instrument trading within 2% of its 30-day high and confirm it carries no
  mark while still showing its range and position figures.
