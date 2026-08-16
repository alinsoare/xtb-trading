## Why

A screened instrument today carries one to four identical green dots. The dots stand for a bucket
of the confluence score, so two instruments wearing three dots each can have earned them from
entirely different signals — one from a D1 gap with an H1 run, the other from a distant pivot. The
user has to hover a row to learn which sources fired, which makes the list unusable for scanning:
the information the user actually wants is which sources contributed, and that is exactly what the
dots hide.

## What Changes

- Keep the existing graded green bullet marks exactly as they are today — same buckets, same count,
  same styling, same tooltip audit on the marks wrapper.
- Add a short display name per fired rule on a new line beneath the marks, derived from the same
  `reasons` record the audit already uses, so the row states which signals earned its score without
  removing the at-a-glance bucket count.
- Give every recorded reason a `source` field alongside its existing `rule` wording and `points`.
- Keep sorting by score, the 30-day range and position figures, and the "not screened" /
  "insufficient history" states exactly as they are.
- Bump `SCAN_CACHE_VERSION` so cached results without `source` on their reasons are recomputed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `accumulation-screener`: each recorded reason gains a short display name; the graded mark buckets
  are unchanged; a screened row names its contributing sources on a line beneath the marks.
- `charting`: the symbol browser row keeps marks inline with the symbol code and shows named sources
  on the line below; the on-demand audit via the marks tooltip is unchanged.

## Impact

- `web/screener/score.js` — reasons gain a short `source` field; `markCount`, `marks`, scoring, gate
  and weights are untouched.
- `web/screener/render.js` (new) — `renderMarks`, `renderSourceNames` and `renderScreenerRow` move
  here as pure, DOM-free string builders, so they're testable from Node without a browser.
- `web/app.js` — imports and calls `web/screener/render.js` instead of defining these functions
  itself; no other behavior changes.
- `web/styles.css` — compact styling for the new source-names line; `.screener-mark` is unchanged.
- `tests/js/run_screener.mjs` — reason assertions extend to `source`; mark-count assertions stay.
- `tests/js/run_render.mjs` (new) — Node-only tests against `web/screener/render.js` covering marks,
  source names and every row status.
- `web/screener/scan.js` — `SCAN_CACHE_VERSION` bump from `4` to `5`.
- No change to scoring, the gate, signal computation, the screening payload, or sync behavior.
