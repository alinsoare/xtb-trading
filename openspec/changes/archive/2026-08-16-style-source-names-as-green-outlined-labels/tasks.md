## 1. Style the source-name labels

- [x] 1.1 In `web/styles.css`, give `.screener-source` green text (`#4ac08a`, the mark green), a `1px solid #4ac08a` border, `background: transparent` and a 2–3px radius, keeping its existing `white-space: nowrap`
- [x] 1.2 Add minimal padding to `.screener-source` (about 1px vertical, 4px horizontal) so the border clears the glyphs without inflating the label
- [x] 1.3 Widen `.screener-sources`'s `gap` so no two outlines touch, on the same line or across a wrap, and leave its flex wrapping and muted colour declaration in place
- [x] 1.4 Trim `.screener-sources`'s `margin-top` and, if needed, its `line-height` so the source line's height stays close to what it is today
- [x] 1.5 Confirm `.screener-mark`, `.screener-marks`, `.screener-figures`, `.screener-state` and `.badge*` rules are untouched

## 2. Verify

- [x] 2.1 Run `tests/js/run_render.mjs` and confirm it still passes unchanged — the markup and `web/screener/render.js` must not have changed
- [x] 2.2 In the browser, check a row with several sources: each name sits in its own green unfilled rectangle, the outlines are countable at a glance, and the row background shows through
- [x] 2.3 Check a row whose source line wraps: every label keeps a complete outline and none touch or appear to share a border
- [x] 2.4 Check a screened row that earned no mark: no labels and no empty outline, with its range and position figures intact
- [x] 2.5 Check a "not screened" and an "insufficient history" row: unchanged, with no source line
- [x] 2.6 Confirm the labels stay distinguishable from the muted range, position and state text, and that the marks and their tooltip audit are unchanged
- [x] 2.7 Compare sidebar row height against the current build and confirm the number of visible instruments has not meaningfully dropped
