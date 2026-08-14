## 1. Weights and run lengths

- [x] 1.1 In `web/screener/score.js`, add an exported `WEIGHT_GATE_PASS` constant with value `1`,
  and change `WEIGHT_D1_FVG_H1_RUN` from `3` to `2` and `WEIGHT_H1_FVG_M15_RUN` from `2` to `1`.
  Leave `WEIGHT_MACD_ASCENDING`, `GATE_MIN_RANGE_PCT`, `GATE_MIN_PEAK_DISCOUNT` and `PIVOT_BANDS`
  unchanged.
- [x] 1.2 Add exported `H1_RUN_BARS` and `M15_RUN_BARS` constants, both `1`, and replace the
  literal `3` passed to `bullishRun()` at the two call sites in `scoreInstrument()` with them.
- [x] 1.3 Confirm `web/screener/signals.js` needs no edit: `bullishRun(bars, required)` already
  handles `required = 1`, its `last < required - 1` insufficiency check still holds, and doji
  skipping is unchanged.

## 2. Gate scores a point

- [x] 2.1 In `scoreInstrument()`, keep the gate's failure branch returning
  `emptyResult("screened", rangePct, positionPct)` unchanged, so a gated-out instrument still
  scores 0 with its range figures present and no reasons.
- [x] 2.2 On the success path, seed `score` with `WEIGHT_GATE_PASS` and push a reason for the gate
  before evaluating the four signals, so the eligibility gate appears first in the recorded
  reasons.
- [x] 2.3 Use a stable reason label for the gate (`"Eligibility gate"`) consistent in wording with
  the existing rule labels, since the labels are shown to the user in the mark tooltip.
- [x] 2.4 Verify the insufficient-history early returns still run before the gate is evaluated, so
  an instrument with too little history reports `insufficient-history` with score 0 rather than
  earning the gate point.

## 3. Mark bands

- [x] 3.1 Rewrite `markCount()` in `web/screener/score.js` to the four-band scale: 0 for a score of
  0 or less, 1 for 1 to 2, 2 for 3 to 4, 3 for 5 to 6, and 4 for 7 and above, expressed against
  named band edges rather than arithmetic.
- [x] 3.2 Confirm `renderMarks()` in `web/app.js` and `.screener-mark` / `.screener-marks` in
  `web/styles.css` need no change for a fourth bullet, and that the score sort order still reads
  the score field.

## 4. Cache invalidation

- [x] 4.1 Bump `SCAN_CACHE_VERSION` in `web/screener/scan.js` from `2` to `3`, so scores cached
  under the old weights are discarded on the next load without requiring a sync.

## 5. Tests

- [x] 5.1 In `tests/js/run_screener.mjs`, import `WEIGHT_GATE_PASS`, `WEIGHT_D1_FVG_H1_RUN`,
  `WEIGHT_H1_FVG_M15_RUN`, `WEIGHT_MACD_ASCENDING`, `H1_RUN_BARS` and `M15_RUN_BARS`, and assert
  each constant's value alongside the existing gate-constant assertions.
- [x] 5.2 Add an assertion that the weights plus the top pivot band sum to 8, so a future
  reweighting that breaks the documented maximum fails loudly.
- [x] 5.3 Replace the `markCount` bucket checks with the new bands: 0 for 0, 1 for 1 and 2, 2 for 3
  and 4, 3 for 5 and 6, 4 for 7 and 8.
- [x] 5.4 Update the full-confluence fixture to assert a score of 8, four marks, and reasons
  listing the eligibility gate (1), D1 FVG + H1 run (2), H1 FVG + M15 run (1), D1 MACD (1) and
  D1 pivot distance (3), in that order.
- [x] 5.5 Update the JMLP-style fixture's expected score for the new weights (gate point plus the
  D1 FVG + H1 run rule) and keep its assertion that the instrument sits high in its range.
- [x] 5.6 Add a fixture for a gated-in instrument with every signal override off and a null pivot
  distance, asserting a score of 1, one mark, and a reasons list holding only the eligibility
  gate.
- [x] 5.7 Keep the gated-out, discount-boundary and narrow-range fixtures asserting a score of 0
  and no reasons, confirming the gate point is not awarded when the gate fails.
- [x] 5.8 Add a `bullishRun()` fixture asserting a run of one succeeds when the last completed bar
  is bullish and its predecessors are bearish, and fails when the last completed bar is bearish.
- [x] 5.9 Add a `bullishRun()` fixture with a required length of one where the last completed bar
  is a doji and the bar before it is bullish, asserting the run succeeds.
- [x] 5.10 Run `node tests/js/run_screener.mjs` and confirm every check passes.

## 6. Verification

- [x] 6.1 Load the app against the current data store and confirm every gated-in instrument now
  carries at least one bullet, that the tooltip names the eligibility gate as a rule with 1 point,
  and that the sidebar still reads "30d range X% · position Y%".
- [x] 6.2 Confirm at least one instrument reaches three or four bullets, and that a gated-out
  instrument still carries no bullet while showing its range and position figures.
- [x] 6.3 Reload without syncing and confirm marks re-render from the new cache version rather than
  showing pre-change mark counts.
