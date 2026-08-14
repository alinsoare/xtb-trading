## Why

The screener's confluence rules are too strict at the timeframe-run level and too coarse at the
bullet level. Requiring three consecutive completed bullish bars on H1 and on M15 means the two
fair-value-gap rules almost never fire together: by the time three H1 bars have closed bullish,
the pullback the screener is looking for is usually already resolving, so the containment rules
that carry the most weight contribute nothing. At the same time the gate itself — a 30-day range
of at least 3% with price strictly below 98% of the 30-day peak — is a genuinely informative
condition, yet it earns no credit: an instrument that has pulled back into the zone the screener
cares about looks identical to one that was never eligible when no other signal fires.

Rebalancing the weights so the gate contributes a point, the run conditions ask for a single
completed bar, and the total spreads over four bullet bands makes the mark count express how much
confluence is present rather than collapsing most eligible instruments into one bullet or none.

## What Changes

- Award **1 point** for passing the eligibility gate. The gate condition itself is unchanged —
  30-day range at least 3% and current price strictly below the 30-day peak discounted by 2% —
  and it remains a hard gate: failing it still means no score and no mark. Passing it now also
  contributes a scored component with its own recorded reason.
- Change the **D1 FVG + H1 bullish run** rule to require the current price inside a live bullish
  D1 fair-value gap and only the **last 1 completed H1 bar** bullish, and reweight it from 3
  points to **2 points**.
- Change the **H1 FVG + M15 bullish run** rule to require the current price inside a live bullish
  H1 fair-value gap and only the **last 1 completed M15 bar** bullish, and reweight it from 2
  points to **1 point**.
- Keep the **D1 MACD ascending** rule at 1 point and the **D1 pivot distance** rule at 0 to 3
  points, both with their current conditions and band boundaries.
- Change the maximum score from 9 to **8** (1 + 2 + 1 + 1 + 3).
- Replace the three-band mark scale with four bands: 0 points is no bullet, 1 to 2 points is one
  bullet, 3 to 4 is two bullets, 5 to 6 is three bullets, 7 to 8 is four bullets.
- **BREAKING** for screening output: every score and mark count changes. Because the gate now
  contributes a point, every gated-in, sufficiently-historied instrument carries at least one
  bullet, and a zero score means only that the instrument was gated out. Cached scores computed
  under the old weights must be discarded.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `accumulation-screener`: the "Screening gate" requirement gains a point for passing while
  keeping its conditions; the "Screening signals and score" requirement changes its component
  set, run lengths, weights and maximum; the "Marks are graded, not ranked" requirement changes
  from three bands over 9 points to four bands over 8 points.

## Impact

- `web/screener/score.js`: a new gate-pass weight constant, changed weights for the two
  containment rules, named constants for the H1 and M15 run lengths, the gate branch now
  contributing a point and a reason instead of only opening the door, and a four-band
  `markCount()`.
- `web/screener/signals.js`: unchanged — `bullishRun()` already takes the required count as a
  parameter, so a run of one is expressible without touching the signal logic.
- `web/screener/scan.js`: the scan cache version must be bumped, since cached scores are keyed on
  sync freshness alone and would otherwise keep rendering marks computed under the old weights
  until something syncs.
- `web/app.js` and `web/styles.css`: unchanged — marks are rendered from the count, so a fourth
  identical bullet needs no new markup or style. Score sorting still reads the score field.
- `tests/js/run_screener.mjs`: the weight-constant, mark-bucket, full-confluence and
  partial-score assertions all change; new fixtures cover a gated-in instrument with no other
  signal scoring 1 and the new bucket boundaries.
- No data, payload or exporter change: every input is already served in the screening payload.
