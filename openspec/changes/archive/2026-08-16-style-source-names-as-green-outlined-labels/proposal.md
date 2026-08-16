## Why

The source names beneath a row's marks (`gate`, `pivot`, `fvg`, `macd`, …) are currently rendered
in the same muted grey as the range and position figures and run together as a plain run of words.
Nothing separates one name from the next, and nothing ties them visually to the green marks they
explain, so the line that was added to make scanning easier reads as another row of small grey text.
Giving each name the green of the marks and a visible boundary of its own makes the fired sources
countable at a glance and unmistakably part of the same signal as the marks above them.

## What Changes

- Render each source name as a discrete green-outlined label: green text, a green rectangular
  border, and no fill, so the row's background shows through.
- Treat every source identically — one green outline treatment for all names, with no per-source
  colour, weight or emphasis, since the mark count already conveys strength.
- Keep the names themselves, their order, their derivation from the same `reasons` record, and the
  line's position beneath the marks exactly as they are.
- Keep the graded green bullet marks, the on-demand tooltip audit on the marks wrapper, scoring, the
  gate, sorting by score, the range and position figures, and the "not screened" / "insufficient
  history" states untouched.
- Presentation only: no change to the screening payload, so no `SCAN_CACHE_VERSION` bump and no
  recomputation of cached results.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `charting`: the symbol browser's source names gain a required visual treatment — each name reads as
  its own green, unfilled outlined label, visually distinct from the row's muted figures and tied to
  the green marks it explains.

## Impact

- `web/styles.css` — `.screener-source` gains green text, a green border and a transparent
  background plus the padding needed for the outline to sit off the text; `.screener-sources` keeps
  its existing flex wrapping and may need its gap widened so adjacent outlines do not touch.
  `.screener-mark`, `.screener-figures` and `.screener-state` are unchanged.
- `web/screener/render.js` — no change expected; the existing `.screener-source` span per reason is
  already the right hook for the outline.
- `tests/js/run_render.mjs` — unchanged unless the markup changes; the existing assertions on the
  source-name spans must keep passing.
- No change to `web/screener/score.js`, `web/screener/signals.js`, `web/screener/scan.js`,
  `web/app.js`, the screening payload, the cache version, or sync behavior.
