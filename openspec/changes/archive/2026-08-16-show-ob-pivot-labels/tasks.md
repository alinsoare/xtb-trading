## 1. Extend the label drawable

- [x] 1.1 In `web/indicators/registry.js`, add optional `align` (`"left"` default, `"center"`), `offset` (pixels, default `0`) and `emphasis` (default off) to the label drawable's documented shape in the header comment
- [x] 1.2 In `_drawLabel`, honour `align: "center"` by shifting the draw x by half the measured text width; leave `textAlign = "left"` and the x unchanged when `align` is absent
- [x] 1.3 In `_drawLabel`, honour `offset` by moving y away from the price coordinate in the direction opposite the baseline — up for `baseline: "bottom"`, down for `baseline: "top"` — with `0` reproducing today's placement exactly
- [x] 1.4 In `_drawLabel`, select the emphasised font (about `11px bold Arial, sans-serif`) when `emphasis` is set and keep `9px Arial, sans-serif` otherwise, restoring `ctx.font`, `ctx.textAlign` and `ctx.fillStyle` expectations for the drawables that follow
- [x] 1.5 Confirm `_drawRect` and the pane rendering path are untouched

## 2. Emit pivot labels from the OB indicator

- [x] 2.1 In `web/indicators/palette.js`, add a named export for the neutral pivot-label colour (a bright near-white per design.md), separate from `ZONE_PALETTE`'s two directional entries
- [x] 2.2 In `web/indicators/ob.js`, destructure `structure` from the `obZones(...)` result in the registered `compute`, alongside `zones` and `warning`
- [x] 2.3 Emit one label drawable per entry in `structure.pivots`: text `H` at `pivot.high` with `baseline: "bottom"` for a pivot high, text `L` at `pivot.low` with `baseline: "top"` for a pivot low, both at `pivot.barTime`, all with `align: "center"`, a small pixel `offset` and `emphasis` set, in the neutral colour
- [x] 2.4 Guard the emission for the paths where `obZones` returns early — `structure` is `null` on the insufficient-history return and carries a warning with no usable pivots on the others — so a warning case emits no labels and no error
- [x] 2.5 Do not read `structure.pending`; leave the live unconfirmed extreme unlabelled
- [x] 2.6 Leave the existing zone rect and `OB` label drawables exactly as they are, setting none of the new label fields on them

## 3. Verify

- [x] 3.1 Run `node tests/js/run_ob_fixtures.mjs` unmodified and confirm it still passes — `obZones` and `computeSwingStructure` must not have changed
- [x] 3.2 Run the other JS test scripts under `tests/js/` and the Python test suite, and confirm nothing regressed
- [x] 3.3 In the browser with `OB` enabled on a D1 chart, confirm every confirmed pivot high carries a centred `H` above its wick and every pivot low a centred `L` below, with a visible gap and no overlap of the candle
- [x] 3.4 Confirm labels appear across the whole displayed history, not only near the newest bars, and that raising the display limit brings labels into the newly admitted region
- [x] 3.5 Cross-check a few labelled bars against the pivots the OB zones derive from (for example via `obZones(...).structure.pivots` in the console) and confirm the labels sit on the relocated extreme bars
- [x] 3.6 Confirm no `H`/`L` appears at the live unconfirmed extreme while zones from that swing are drawn
- [x] 3.7 Compare `OB` and `FVG` zone labels against the current build and confirm their size, position and directional colour are unchanged
- [x] 3.8 Confirm the pivot labels are legible on the dark background, distinct from the zone labels, and that no line, level or ray was introduced anywhere
- [x] 3.9 Toggle `OB` off and confirm the labels disappear with the zones and the price pane's layout and scaling are unchanged
- [x] 3.10 Check a symbol on M15 and on W1, and a series short enough to trigger the insufficient-history and "no confirmed swing structure" warnings, confirming the warning still shows and no labels are drawn
