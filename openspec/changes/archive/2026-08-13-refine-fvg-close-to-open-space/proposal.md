## Why

The FVG scanner sizes candle bodies from each bar's own open, which assumes bar N opens where
bar N-1 closed. On the stored data it usually does not: depending on the instrument, 57% to 98%
of adjacent bar pairs open away from the previous close, and on 11% to 42% of them the previous
close falls entirely outside the next bar's high-low range. The jump between a recorded close
and the next recorded open is an artifact of where bars are cut, not a pause in price, so the
move a candle actually made is larger than its drawn body.

That matters because the FVG pattern is decided by body size. Its first test — the middle bar's
body must dominate its neighbours' — is measuring displacement, and it currently under-measures
every bar that opened away from the previous close. Real patterns are rejected because the
dominant candle looks smaller than it was, and the wick-to-body limit on bar3 is scaled off the
same understated body.

## What Changes

- Define a **close-to-open-space**: the price interval between one bar's close and the next
  bar's open, recorded against the later bar, and only when the two bars are the same type
  (bullish, bearish, with a neutral bar borrowing the other's type) and the later bar opens
  beyond the earlier one's close in that direction. A bullish bar's space sits flush beneath
  its body; a bearish bar's sits flush above it. Consequently the space-extended body of a bar
  is exactly `|close - previous close|`.
- **Body dominance now measures body plus space**, for all three bars in the triplet, so the
  test stays symmetric. A bar without a space is measured exactly as today.
- **Bar3's wick limit scales off its space-extended body**, since it is the same displacement
  measure under a different name.
- **Bar2's range in the gap ratio rule grows to cover its space**, so the gap is compared
  against the full extent bar2 covered.
- **The gap, the zone, and the drawing are untouched.** The zone is still bar1's high to bar3's
  low (bearish: bar3's high to bar1's low), still spans 14 bars from bar1, still carries the
  `FVG` label at bar3. The EMA regime ladder, bar2's colour test, the stair-step structure, the
  stochastic filter, and the minimum zone height are all unchanged.
- **BREAKING for signal parity**: this is the second sanctioned deviation from the MQL5
  original, after the dropped 120-bar scan cap, and a far larger one. Measured over the last
  1,500 bars of six synced series, 144 zones become 153: 30 zones are new and 21 of today's
  disappear. The parity requirement and the FVG fixtures both have to account for it.

## Capabilities

### New Capabilities

None. The close-to-open-space is a measurement rule inside the FVG indicator, not a separate
user-visible capability, and every requirement it touches already lives in `indicators`.

### Modified Capabilities

- `indicators`: the FVG requirement's pattern rules change — body dominance and the bar3 wick
  limit measure space-extended bodies, and the gap ratio compares against bar2's space-extended
  range. The parity requirement gains this as a named, justified deviation alongside the
  dropped scan cap. The framework requirements (registry, per-indicator toggle, client-side
  computation, full-history scan, insufficient-history warning) are untouched.

## Impact

- **Frontend only.** `web/indicators/fvg.js` gains the space predicate and uses it in three
  places. No new module is required — the predicate reads two adjacent bars and returns a
  boolean, so nothing is stored, plumbed through the chart, or added to the data contract.
- **No new parameters.** The behaviour is unconditional; `FVG_PARAMS` is unchanged.
- **No backend changes**: no Python modules, no API endpoints, no storage or data-contract
  changes, no sync behaviour. Nothing fetches data.
- **Test fixtures split.** `tests/fixtures/fvg/` is generated from the Python reference in
  `../xtb-trading` by `tools/generate_fvg_fixtures.py`. The existing fixtures keep proving the
  MT5 numeric conventions (EMA seeding, stochastic mode, forming-bar exclusion) against raw
  bars; the space behaviour needs its own fixtures with a stated source of truth, because the
  reference implementation does not have this rule.
- **Risk to watch**: the change adds zones (30 new) and removes others (21), so a chart the
  author has read for months will look different in both directions. The losses are the
  non-obvious half — they come from bar1 and bar3 also gaining extended bodies, which makes
  dominance harder to win — and they are the ones to sanity-check on a real chart before
  archiving.
