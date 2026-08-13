## 1. Establish the MT5 oracle

- [x] 1.1 Record the source's identity: note the path, `#property version` (3.23) and a content
  hash of `~/daytrading/mt5/indicators/SMCTrading.mq5`, to be carried in the port's module
  header and in every fixture.
- [x] 1.2 Write an MQL5 export script that dumps, for the current symbol and timeframe, the OHLC
  rates (bar open time, open, high, low, close) to CSV in the terminal's `Files` directory.
- [x] 1.3 Extend the export script to read `SMCTrading`'s published buffers via `iCustom` and
  dump the structure: for every bar carrying a pivot, its time, whether it is a high or a low,
  its extreme price, the confirmation bar index and confirmation price, and the `MoveType`
  value (impulse or pullback).
- [x] 1.4 Extend the export script to read back the drawn Order Block rectangles from the chart
  objects (`SMC_RECT_*`) and dump each one's object name, both anchor times and both anchor
  prices.
- [x] 1.5 Compile the export script with the MT5-Testing MetaEditor and confirm a clean build
  (0 errors, 0 warnings).
- [x] 1.6 Document the export procedure in the change's notes or the generator's docstring:
  attach `SMCTrading` with `InpShowHistory = true`, force a recalculation (reload the indicator
  or switch timeframe and back), then run the export script — so the oracle reflects MT5's
  recalculated state rather than accumulated live state.
- [x] 1.7 Produce a first export on a D1 chart of one instrument and eyeball the three CSVs for
  plausibility (bar count, pivot count, zone count all non-zero and mutually consistent).

## 2. Fixture plumbing

- [x] 2.1 Define the OB fixture JSON shape: name, source identity (version and hash), symbol,
  timeframe, `point_size`, parameters, bars, expected pivots, expected zones, and per-zone
  whether it was open at export time.
- [x] 2.2 Write `tools/generate_ob_fixtures.py` to read the MT5 CSV exports and emit fixtures
  into `tests/fixtures/ob/`, deriving each zone's open-or-closed state from whether its right
  anchor lies beyond the newest exported bar.
- [x] 2.3 Generate the D1 fixture from the task 1.7 export and commit it.
- [x] 2.4 Write `tests/js/run_ob_fixtures.mjs` as the OB analogue of `tests/js/run_fixtures.mjs`:
  it compares the pivot sequence first and reports a structural divergence as such, then
  compares zones — times, direction and open/closed state exactly, prices to the existing
  `1e-9` absolute and relative tolerance — and exits non-zero on any failure.

## 3. Swing structure (internal only)

- [x] 3.1 Create `web/indicators/ob-structure.js` with the module header recording the source
  file, version and hash, and the oldest-first index convention.
- [x] 3.2 Implement typical price (mean of high, low, close). Do not port the source's skip-bar
  interval: every bar in the series is eligible on every timeframe, with no time-of-day filter.
- [x] 3.3 Implement raw pivot detection over typical price (strictly more extreme than the
  configured number of neighbours on each side) plus relocation of the pivot to the bar holding
  the true high or low inside that window.
- [x] 3.4 Implement points-based pivot confirmation: the retracement distance from the pivot's
  typical price using the catalog point size, and rejection when a more extreme bar sits between
  the pivot and the confirming bar.
- [x] 3.5 Implement structure containment: reject a candidate pivot that fails to exceed the
  previous confirmed pivot of its own type.
- [x] 3.6 Implement the base-pivot seed: collect raw pivots, pick the first opposite-type pair,
  and set their initial impulse classification.
- [x] 3.7 Implement the break-to-break walk that adds subsequent confirmed pivots, covering both
  break cases the source distinguishes — the continuation case that adds the swing extreme and
  then its opposite pivot, and the reversal case with and without a preceding wick break.
- [x] 3.8 Implement impulse/pullback classification per confirmed pivot, with the first pivot of
  its type counting as an impulse.
- [x] 3.9 Implement break recording and the running "most recent structural break bar", which
  later clamps the zone scan.
- [x] 3.10 Implement the live unconfirmed swing: search for the pending extreme past the newest
  confirmed pivot, check whether it confirms, and check whether the newest close has broken the
  previous same-type level — treating the newest stored bar as MT5's forming bar.
- [x] 3.11 Export the structure result (pivot sequence with times, types, extremes, confirmation
  times and classification; the live swing; the last break bar) in the shape the fixture runner
  compares.
- [x] 3.12 Run the fixture runner's structure comparison against the D1 fixture and drive the
  pivot sequence to an exact match, treating every divergence as a port defect.

## 4. Order Block zones

- [x] 4.1 Create `web/indicators/ob.js` with `OB_PARAMS` in one place — pivot bars, confirmation
  points, validity-scan cap — and comments recording the deviations the spec sanctions: the
  dropped lookback cap, the dropped display filters, and the dropped skip-bar interval together
  with the parity scope (H4 and above) that follows from it.
- [x] 4.2 Implement the per-swing-pair setup: direction from the pivot pair's types, the
  structural boundary from the nearest earlier pivot of the second pivot's type, and skipping a
  pair that has no such boundary.
- [x] 4.3 Implement candidate collection over the swing's bars, offset one bar earlier as the
  source does, clamped so no candidate sits at or after the most recent structural break bar,
  with the boundary filter applied and no time-of-day filter.
- [x] 4.4 Implement the shadow filter so an overlapping run of same-direction candidates within
  one swing collapses to its newest member.
- [x] 4.5 Implement the impulse filter and the size filter (twice the candidate's height below
  the distance from the swing extreme to the candidate's near edge, rejecting a non-positive
  distance).
- [x] 4.6 Implement the live-swing pass, forcing that swing's classification to impulse as the
  source does when a break is active.
- [x] 4.7 Implement zone validity end times: the break-scan from the swing's confirmation bar
  with the source's per-zone bar cap, the fallback to the next pivot's confirmation time, and
  open-ended zones ending at the newest bar's time.
- [x] 4.8 Emit `rect` and `label` drawables using the registry's existing vocabulary, with the
  MT5 colours for demand and supply, and register the indicator as id `ob`, label `OB`, with
  `minBars` mirroring the source's own guard.
- [x] 4.9 Return the "no confirmed swing structure" warning when the series is long enough to
  scan but yields fewer than two confirmed pivots.
- [x] 4.10 Add the one-line import of `./indicators/ob.js` to `web/app.js` beside the FVG import.

## 5. Parity verification

- [x] 5.1 Run the full fixture comparison on D1 and drive zones to a match — times, direction and
  open/closed state exact, prices within tolerance.
- [x] 5.2 For each remaining divergence, classify it as one of the sanctioned deviations or as a
  defect, and fix the defects; record nothing as a difference that the spec does not list.
- [x] 5.3 Spot-check intraday once, as a diagnostic rather than a parity fixture: produce an
  export on a timeframe below H4 (where the source's skip filter is live), run the port over
  those bars, and check that every divergence involves a bar whose open time falls in the
  source's skip window. A divergence on a bar outside that window is a port defect — fix it.
- [x] 5.4 Record the spot-check result next to `OB_PARAMS` — which timeframe and instrument, and
  that intraday differences trace to the dropped filter — so a future intraday mismatch reads as
  an explained consequence rather than a suspected bug.
  Recorded in `OB_PARAMS`, with the result inverted from what this task anticipated: XAUUSD M15
  produced NO divergence to attribute (105 pivots and 77 zones exact over the source's 2000-bar
  lookback), and the skip window was never in effect on the export — MT5 itself placed 4 pivots
  on in-window bars, and XAUUSD has no bars at all in 23:30-23:59 on that feed. So sub-H4 stays
  outside the parity claim on principle rather than because a divergence was seen and excused.
  `tools/ob_intraday_spotcheck.mjs` reproduces the check and now reports an inactive filter
  instead of reading a clean run as evidence about a filter that never ran.
- [x] 5.5 Confirm the sanctioned deviations are observable rather than assumed: a zone deep in
  history beyond the source's lookback window is drawn, a counter-trend zone is drawn, and the
  newest stored bar never becomes a zone.

## 6. In-app checks and wrap-up

- [x] 6.1 Enable `OB` in the browser on the app's own Yahoo-sourced bars and confirm zones render
  behind the candles, stay glued to their bars through pan and zoom, and coexist with FVG when
  both are on. (No oracle here — the app's bars are not the broker's bars; this confirms wiring,
  not parity.)
  Verified so far on AAPL.US d1: zones render with `OB` labels, sit behind the candles, coexist
  with FVG, and stay anchored through repeated wheel zoom in and out at a fixed display limit.
  The renderer's off-screen branch is covered by a headless check of `IndicatorPrimitive`:
  rectangles entirely left or right of the visible range are skipped, while a straddling one
  clamps to the full pane width. Horizontal drag-pan confirmed manually — no browser automation
  can drive it, because the lightweight-charts canvas exposes no accessibility ref and ignores
  synthetic pointer events.
- [x] 6.2 Confirm the framework behaviours the registry already provides work unchanged for the
  new indicator: the toggle appears without UI changes, the enabled state survives a symbol
  switch and a reload, and a display limit below `minBars` produces the insufficient-history
  warning.
- [x] 6.3 Confirm no network request fires when `OB` is toggled or recomputed.
- [x] 6.4 Measure the recompute cost of `OB` against `FVG` on the deepest available series and
  note the result; act only if it is disproportionate. Measured on tiled XAUUSD D1 bars: OB
  0.6 ms at 1k bars, 6.6 ms at 10k, 20.5 ms at 20k — between 1.0x and 2.7x FVG, so linear and
  not disproportionate; no memoisation needed.
- [x] 6.5 Run the whole dev-time test set (`tests/js/*.mjs` and the Python suite) and confirm
  nothing regressed.
- [x] 6.6 Update the README's indicator section to name the `OB` indicator, its source lineage
  and the sanctioned deviations, and document how to regenerate the OB fixtures.
