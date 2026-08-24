## 1. Shared conventions

- [x] 1.1 Add the current-day touch convention to `web/screener/bars.js` as a named, documented
      exception to the forming-bar rule, with a helper that returns the newest stored bar of a series
      and a comment stating why it departs from `lastCompletedIndex`
- [x] 1.2 Add an inclusive interval-overlap helper (bar high-to-low against a zone's price interval)
      alongside it, as the single definition of "touch" the triggers share
- [x] 1.3 Extend `web/screener/range.js` so the 30-day window exposes its bar-time lower bound (or an
      equivalent membership test) in addition to the existing high, low and three figures, so the
      distance component can decide whether a pivot's bar falls inside the window
- [x] 1.4 Verify the range, position and headroom figures are unchanged in value by 1.3 — the window
      definition itself must not move

## 2. Triggers

- [x] 2.1 Replace `inLiveBullishFvg` in `web/screener/signals.js` with a bullish-D1-FVG touch test:
      detect zones, keep only bullish ones live at the newest stored bar per `FVG_PARAMS.rectBars`,
      and return a single boolean for whether the current day's bar overlaps any of them
- [x] 2.2 Add a demand-D1-OB touch test in the same shape, keeping only zones whose `open` flag marks
      them as extending to the newest bar
- [x] 2.3 Confirm both tests are per-indicator binary: overlapping several zones of one indicator
      still yields one trigger
- [x] 2.4 Replace `macdRedMorningStar` with a windowed trough test that admits the trough on the last
      completed bar or the one before it, keeping the strict comparisons and the strictly-below-zero
      condition on all three values of the shape
- [x] 2.5 Keep `isMacdRedMorningStarTrough` (or an equivalent single-shape predicate) as the shared
      inner test both window positions call, so strictness cannot drift between them
- [x] 2.6 Delete the old three-bar-only MACD entry point and the containment-based FVG test once
      nothing imports them

## 3. Distance component

- [x] 3.1 Add a distance-target selector: the last confirmed D1 high pivot's high when that pivot's
      bar time falls inside the 30-day window, otherwise the window's highest high; ignore pending
      pivots
- [x] 3.2 Have the selector report which branch it used, so the audit wording can name it
- [x] 3.3 Replace `PIVOT_BANDS` and `scorePivotDistance` in `web/screener/score.js` with the new bands
      as named constants: above 3% → 1, above 5% → 2, above 8% → 3, at or below 3% → 0, capped at 3

## 4. Scoring model

- [x] 4.1 Delete `GATE_MIN_RANGE_PCT`, `GATE_MIN_PEAK_DISCOUNT`, `WEIGHT_GATE_PASS`, `SOURCE_GATE` and
      the gate branch from `scoreInstrument`, so no instrument is gated out and no automatic point
      exists
- [x] 4.2 Delete `WEIGHT_D1_FVG_H1_RUN`, `WEIGHT_H1_FVG_M15_RUN`, `H1_RUN_BARS`, `M15_RUN_BARS`,
      `SOURCE_D1_FVG_H1` and `SOURCE_H1_FVG_M15` along with their scoring branches
- [x] 4.3 Wire the three triggers at +1 each with sources `FVG D1`, `OB D1` and `MACD`
- [x] 4.4 Wire the distance component so it is evaluated only when at least one trigger fired, under a
      single stable source label (`distance`) whichever branch supplied the target
- [x] 4.5 Write the distance component's recorded rule wording so it names its branch — "D1 pivot
      distance" or "30d high distance"
- [x] 4.6 Update `markCount` to the new buckets: 1 → 1, 2–3 → 2, 4–5 → 3, 6 → 4
- [x] 4.7 Keep the insufficient-history and not-screened paths intact, and confirm a legitimately-zero
      score is returned as `screened` with score 0 rather than as either failure state
- [x] 4.8 Recheck the minimum-bars guard now that no rule reads H1 or M15 bars: it must still require
      what the D1 rules need (FVG, MACD and pivot warm-ups) and must not reject an instrument for a
      short H1 or M15 series that nothing reads

## 5. Cache and rendering

- [x] 5.1 Bump `SCAN_CACHE_VERSION` in `web/screener/scan.js` so results cached under the old rules
      are recomputed rather than displayed
- [x] 5.2 Update `web/screener/render.js` for the new mark buckets and source labels
- [x] 5.3 Remove any rendering assumption that a screened instrument carries at least one mark or
      names at least one source, and confirm a zero-score row still shows its three figures and stays
      visually distinct from the not-screened and insufficient-history rows

## 6. FVG bullish-only rendering

- [x] 6.1 In `web/indicators/fvg.js`'s `registerIndicator` compute, skip bearish zones when building
      drawables, mirroring `if (zone.direction !== "demand") continue;` in `web/indicators/ob.js`
- [x] 6.2 Record the rendering deviation in the FVG file header alongside the existing sanctioned
      deviations, in the same wording style as ob.js's "Supply zones are detected but never drawn
      (rendering deviation only)"
- [x] 6.3 Confirm detection is untouched: bearish zones still appear in `fvgZones` output and the
      existing FVG fixtures pass unchanged

## 7. Dead-code cleanup

- [x] 7.1 Confirm by search that `bullishRun` has no remaining consumer outside the tests, then remove
      it from `web/screener/signals.js`
- [x] 7.2 Confirm the same for `isDoji`, `DOJI_BODY_RATIO` and `SEQUENCE_SCAN_CAP` in
      `web/screener/bars.js` — check the chart indicators as well as the screener before deleting,
      since a shared helper may have a second reader
- [x] 7.3 If either is still read by something outside the screener, keep it and note where, rather
      than deleting it
- [x] 7.4 Remove the corresponding "Doji" and "Bullish run" clauses from the shared-conventions
      requirement only if 7.1 and 7.2 confirmed they are unused — the delta spec already drops them,
      so the code and the spec must agree

## 8. Tests

- [x] 8.1 Rewrite `tests/js/run_screener.mjs`: drop the gate, bullish-run and doji cases; add cases for
      each trigger, the per-indicator-binary rule, bearish-FVG and supply-OB being ignored, expired and
      closed zones, both MACD window positions, the flat-pair and exactly-zero rejections, the distance
      band boundaries at exactly 3%, 5% and 8%, both target branches, the pending-pivot fallback, and
      distance being skipped when no trigger fired
- [x] 8.2 Add a case asserting a screened instrument with no trigger scores 0, carries no mark, names
      no source, and still reports its three figures
- [x] 8.3 Add a case for the current-day touch: a bar whose wick entered a zone and closed outside it
      still triggers, and the zone detection scan still excludes the newest bar
- [x] 8.4 Update `tests/js/run_render.mjs` for the new mark buckets, the new source labels and the
      absence of any at-least-one-mark guarantee
- [x] 8.5 Update `tests/js/run_scan_cache.mjs` for the bumped cache version, asserting an entry written
      under the previous version is not reused
- [x] 8.6 Confirm the FVG fixture tests still pass with bearish zones detected but not drawn
- [x] 8.7 Run the full JS test suite and confirm it is green

## 9. Follow-up, not part of this change

- [x] 9.1 Record as a separate future change: trimming M15 and H1 out of the screening payload now
      that no scoring rule reads them. Note in that record that the shared current-price convention
      reads the newest bar across all three timeframes, so trimming would change what "current price"
      means for both the distance component and the headroom figure — which is why it is deferred
      rather than bundled here
