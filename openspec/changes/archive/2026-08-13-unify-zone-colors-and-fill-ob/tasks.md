## 1. Shared palette

- [x] 1.1 Create `web/indicators/palette.js` exporting the two directional zone colours, seeded with OB's existing pair (`#90EE90` for bullish/demand, `#FFB6C1` for bearish/supply), with a brief comment that both zone indicators read it.
- [x] 1.2 Update `web/indicators/ob.js` to take its colours from `palette.js` instead of defining `OB_COLORS` locally, keeping any existing export name working as an alias so importers and harnesses do not break.
- [x] 1.3 Update `web/indicators/fvg.js` the same way: drop the `#1e90ff`/`#ef5350` pair, map `bullish`/`bearish` onto the palette, and keep the label colour identical to the rectangle's colour.

## 2. Rect paint styles in the renderer

- [x] 2.1 Extend the `rect` drawable contract in `web/indicators/registry.js` with a paint style (`"stroke"` default, `"fill"`), and update the drawable-shape comment at the top of the file to document it.
- [x] 2.2 Implement the two branches in `_drawRect`: `"stroke"` keeps today's `strokeRect` at `lineWidth` 2; `"fill"` sets `globalAlpha` to 0.5, calls `fillRect`, restores `globalAlpha`, and draws no border. Verify no later drawable inherits the reduced alpha.

## 3. Wire the indicators to their styles

- [x] 3.1 Tag OB rect drawables in `web/indicators/ob.js` as filled; leave the `OB` label at full colour strength.
- [x] 3.2 Confirm FVG rect drawables in `web/indicators/fvg.js` are stroked (explicitly or by the default) so FVG keeps its outline treatment.

## 4. Verify

- [x] 4.1 Run the existing JS fixture harnesses (`tests/js/run_fixtures.mjs`, `tests/js/run_ob_fixtures.mjs`, `tests/js/run_space_fixtures.mjs`) and confirm they still pass — detection output must be untouched by this change.
- [x] 4.2 Load the chart with both indicators enabled on an instrument that produces zones of both kinds, and visually confirm: FVG and OB share one directional palette; OB zones are borderless 50% fills with candles visible through them; FVG zones are outlines with no fill; `OB` and `FVG` labels are readable.
- [x] 4.3 Confirm nothing outside `web/indicators/` changed appearance — in particular the ruler tool's own fill in `web/chart-tools/ruler.js` is untouched.
