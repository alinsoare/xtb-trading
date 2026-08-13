## Why

Every price the chart displays is currently formatted by a rule that no spec states. The
`add-ruler-tool` change needed one — its readout requirement pins the ruler's precision to
"the same decimal precision as the chart's price scale", which is only meaningful if the
price scale itself follows the instrument — so the behaviour was implemented and verified
there: precision is derived from the catalog's `point_size`, and the price scale, the
crosshair price label, the crosshair OHLC legend and the ruler readout all agree.

That leaves the repository in an awkward state. A reader of `openspec/specs/charting`
cannot tell how many decimals a price should have, and a future change could plausibly
"fix" the price scale back to a hardcoded two decimals without contradicting any
requirement — silently breaking the ruler requirement that depends on it. This change
writes the rule down where it belongs.

## What Changes

- Add a `charting` requirement stating that displayed price precision is derived from the
  selected instrument's `point_size`, and that every place the UI shows a price for that
  instrument uses the same precision.
- State the fallback: an instrument with a missing or non-positive `point_size` falls back
  to a fixed default rather than rendering an unbounded number of decimals.
- Document in the README that `point_size` drives displayed precision, so the column's
  purpose is discoverable by whoever next edits the seed catalog.
- No behaviour change is planned. The implementation already satisfies the requirement;
  this change ratifies it and verifies each scenario against the running app. If
  verification uncovers a gap, closing it belongs to this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `charting`: adds a requirement for instrument-derived price precision. No existing
  requirement changes — the `OHLC readout` scenario already says the legend shows the
  bar's values, and this only constrains how those values are formatted.

## Impact

- Specs: `openspec/specs/charting/spec.md` gains one requirement. The existing
  `chart-tools` requirement that defers to the price scale becomes well-founded rather
  than pointing at undocumented behaviour.
- Code: none expected. The behaviour lives in `web/chart/format.js` (`priceDecimals`,
  `formatPrice`) and its two call sites — the series price format and the legend in
  `web/app.js`, plus the ruler readout via `web/chart-tools/measure.js`.
- Docs: `README.md` gains a sentence in the instrument catalog description.
- Verification: the seeded catalog uses `point_size` `0.01` for every instrument, so a
  finer precision cannot be observed without a temporary catalog edit. That constrains how
  the scenarios are checked, not what they require.
