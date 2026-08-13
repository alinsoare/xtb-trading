## Why

FVG and OB zones currently use two unrelated colour pairs (FVG: blue `#1e90ff` / red `#ef5350`; OB: light green `#90EE90` / light pink `#FFB6C1`), so a chart with both indicators enabled reads as four unrelated things instead of two directional ideas. Sharing one directional palette makes bullish and bearish zones instantly legible across indicators, and the two indicators then need a non-colour cue to stay distinguishable from each other.

## What Changes

- FVG zones (rectangles and `FVG` labels) adopt the OB indicator's directional palette: the demand colour for bullish zones, the supply colour for bearish zones. The palette becomes one shared definition rather than a per-indicator constant.
- OB rectangles change from a 2px stroked outline with no fill to a 50%-transparent fill of the directional colour with no border stroke. The `OB` label keeps the full-strength directional colour so it stays readable against the fill.
- FVG rectangles keep the existing stroked-outline treatment (no fill), which is now what tells FVG apart from OB once the colours are shared.
- The indicator drawable contract gains a way for a `rect` to say how it is painted (filled at a given opacity vs. stroked outline), since a single renderer now has to produce both treatments.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `indicators`: zone rendering requirements change — a shared directional zone palette is introduced and referenced by both the FVG and OB indicator requirements, and the OB requirement's rectangle rendering changes from an outline to a borderless 50%-transparent fill while FVG keeps its outline.

## Impact

- `web/indicators/fvg.js` — `FVG_COLORS` replaced by the shared palette; drawables tagged as outlined.
- `web/indicators/ob.js` — `OB_COLORS` moved to / re-exported from the shared palette; rect drawables tagged as filled.
- `web/indicators/registry.js` — `_drawRect` gains fill support and the drawable-shape comment is updated.
- No backend, API, data-format, or storage impact; no market-data fetching involved. Existing JS fixture harnesses (`tests/js/run_fixtures.mjs`, `run_ob_fixtures.mjs`, `run_space_fixtures.mjs`) assert zone geometry rather than colours, so they are unaffected unless a colour constant they import is renamed.
