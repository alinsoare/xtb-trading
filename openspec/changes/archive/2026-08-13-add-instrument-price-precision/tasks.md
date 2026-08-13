## 1. Verify the shipped behaviour against each scenario

The behaviour is already implemented (see proposal.md — Why), so this group is verification.
Any check that fails becomes implementation work under group 3.

- [x] 1.1 Confirm the decimal derivation and its fallback are covered by `node tests/js/run_measure.mjs` — point sizes `1`, `0.01`, `0.001`, `0.00001`, plus missing and zero — and that the suite passes
- [x] 1.2 On a seeded instrument (point size `0.01`), confirm the price scale, the crosshair price label, and the OHLC legend all show two decimals
- [x] 1.3 Temporarily set one catalog instrument's `point_size` to `0.00001`, reload, and confirm all three surfaces show five decimals
- [x] 1.4 With that instrument still selected, take a ruler measurement and confirm its readout uses the same precision as the legend and the price scale
- [x] 1.5 Switch from that instrument to a `0.01` one and confirm the displayed precision follows the selection instead of keeping the first instrument's
- [x] 1.6 Revert the catalog edit and confirm the app returns to two decimals
- [x] 1.7 Confirm the fallback in a local static export by removing `point_size` from one entry of the exported `catalog.json`: prices show two decimals and the chart still renders. Do not attempt this through the CSV — catalog loading rejects a non-positive point size and requires the column

## 2. Documentation

- [x] 2.1 Note in the README's instrument catalog description that `point_size` sets the displayed price precision and should reflect the instrument's real tick size, since an over-fine value surfaces floating-point artifacts in the price scale

## 3. Close any gap the verification finds

- [x] 3.1 No gap to close: every check in group 1 held against the shipped code, in both dev and static mode. The only edit was widening the precision assertions in `tests/js/run_measure.mjs` to a negative and a non-numeric point size, so the fallback the requirement states is covered for every unusable value rather than just missing and zero
