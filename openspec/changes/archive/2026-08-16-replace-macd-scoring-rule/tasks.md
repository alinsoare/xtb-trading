## 1. Signal function

- [x] 1.1 In `web/screener/signals.js`, replace `macdAscending(bars)` with
  `macdRedMorningStar(bars)`, keeping the same signature, the same `MACD_MIN_BARS` insufficiency
  check, the same `macdArrays()` source and the same `lastCompletedIndex()` anchor, so only the
  comparison changes.
- [x] 1.2 Implement the comparison as a strict trough in negative territory: with `h2`, `h1`, `h0`
  the values at `k - 2`, `k - 1` and `k`, return `ok` only when `h2 > h1`, `h1 < h0`, and all three
  are `< 0`. Do not require `h0 > h2`.
- [x] 1.3 Keep the existing undefined/NaN guards returning `{ ok: false, insufficient: false }`, so a
  warm-up hole is a non-firing signal rather than an insufficient-history verdict.
- [x] 1.4 Express the below-zero boundary against a named constant rather than a bare literal, per
  the spec's requirement that every scoring threshold be a named constant, and note in a brief
  comment that the boundary mirrors the chart's `v >= 0` colour rule.

## 2. Score wiring and labels

- [x] 2.1 In `web/screener/score.js`, rename `WEIGHT_MACD_ASCENDING` to
  `WEIGHT_MACD_RED_MORNING_STAR`, keeping its value at `1`, and update the import and both use
  sites.
- [x] 2.2 Change the recorded reason label from `"D1 MACD ascending"` to a label naming the new
  pattern (`"D1 MACD red morning star"`), matching the wording style of the other rule labels since
  the labels are shown to the user in the mark tooltip.
- [x] 2.3 Confirm nothing else in `scoreInstrument()` changes: the `signalOverrides.macd` seam, the
  insufficiency early return, the component ordering in `reasons`, the gate block, the two
  FVG-plus-run components, the pivot bands and `markCount()` all stay exactly as they are.
- [x] 2.4 Verify the screening gate is untouched — `GATE_MIN_RANGE_PCT`, `GATE_MIN_PEAK_DISCOUNT`,
  the failure short-circuit and the gate's 1-point reason are unchanged — and that the maximum score
  is still 8.

## 3. Cache invalidation

- [x] 3.1 Bump `SCAN_CACHE_VERSION` in `web/screener/scan.js` from `3` to `4`, so scores and reason
  labels cached under the old rule are discarded on the next load without requiring a sync.

## 4. Tests

- [x] 4.1 In `tests/js/run_screener.mjs`, replace the `macdAscending` import and the
  `WEIGHT_MACD_ASCENDING` import with the renamed function and constant, and update the constant
  assertion and the weights-sum-to-8 assertion.
- [x] 4.2 Add a check that a hand-built histogram triple of `-0.42, -0.61, -0.35` fires the signal,
  covering the spec's negative-territory trough scenario.
- [x] 4.3 Add checks for each non-firing case in the spec: a rising triple above zero
  (`0.10, 0.20, 0.30`), a trough whose newest value has crossed above zero (`-0.15, -0.05, 0.08`), a
  still-falling triple (`-0.20, -0.40, -0.60`), a flat pair with all three below zero, and a triple
  ending in exactly `0`.
- [x] 4.4 If reaching those triples through generated OHLC bars proves fragile, expose the
  three-value comparison as a small pure helper in `web/screener/signals.js` and assert against it
  directly, keeping `macdRedMorningStar(bars)` as the bar-driven wrapper.
- [x] 4.5 Keep the existing bar-driven checks as an integration guard: the result is a boolean and a
  short series reports `insufficient: true`.
- [x] 4.6 Update the full-confluence fixture's expected reasons so the fourth entry carries the new
  MACD label with 1 point, and confirm the expected score is still 8 with four marks.
- [x] 4.7 Run `node tests/js/run_screener.mjs` and confirm every check passes.
- [x] 4.8 Run the remaining JS test entrypoints (including `node tests/js/run_macd_fixtures.mjs`) and
  confirm the MACD indicator's own parity fixtures still pass untouched.

## 5. Verification

- [x] 5.1 Load the app against the current data store and confirm scores re-compute rather than
  rendering from the pre-change cache, and that no sync or extra network call is triggered beyond the
  screening payload.
- [x] 5.2 Open the mark tooltip on an instrument where the MACD component fires and confirm it names
  the new pattern with 1 point.
- [x] 5.3 For that instrument, open its D1 chart with the MACD indicator enabled and confirm the
  three completed histogram bars before the forming bar are all red and form a visible trough, so the
  mark is reproducible by eye.
- [x] 5.4 Confirm a gated-out instrument still carries no mark while showing its range and position
  figures, and that a gated-in instrument with no firing signal still carries one mark.
