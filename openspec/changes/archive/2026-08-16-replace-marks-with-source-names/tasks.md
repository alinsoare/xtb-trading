## 1. Source names on the recorded reasons

- [x] 1.1 In `web/screener/score.js`, give every `reasons.push(...)` a `source` field alongside its
  existing `rule` and `points`, using the terse names from design.md: `gate`, `D1 FVG+H1`,
  `H1 FVG+M15`, `MACD`, `pivot`. Keep the existing `rule` wording and `points` untouched, since the
  audit tooltip still reads them.
- [x] 1.2 Define the five names as named constants next to the existing `WEIGHT_*` constants rather
  than inline literals, so a rule rename touches the name in one place.
- [x] 1.3 Confirm nothing else in `scoreInstrument()` changes: the gate block and its short-circuit,
  the four signal components and their weights, `signalOverrides`, the pivot bands, `markCount`,
  `marks`, the insufficiency early return, the order reasons are appended in, the returned `score`,
  and sort-by-score (which reads `result.score` and is untouched by this change).
- [x] 1.4 Confirm a gated-out or unscreenable result still returns `reasons: []`, so it names no
  source.

## 2. Extract row rendering into a pure module

- [x] 2.1 Create `web/screener/render.js`. Move `renderMarks(marks, reasons)` and
  `renderScreenerRow(symbol)` out of `web/app.js` into it unchanged in behavior, and add
  `renderSourceNames(reasons)` there too, emitting one `<span class="screener-source">` per reason
  with its `source` as text, inside a `<div class="screener-sources">`.
- [x] 2.2 Change `renderScreenerRow`'s signature from reading `state.screenerScores` internally to
  `renderScreenerRow(symbol, result)`, taking the result explicitly so the function has no
  dependency on app state or the DOM and can be called directly from a Node test.
- [x] 2.3 In `web/app.js`, import `renderScreenerRow` from `web/screener/render.js` and update its
  call site to pass `state.screenerScores[symbol.xtb_symbol]` explicitly. Remove the now-moved
  function definitions from `web/app.js`.
- [x] 2.4 Escape the source text on output, matching how the tooltip title is already escaped.
- [x] 2.5 Within `renderScreenerRow`, place the source-names line after `symbol-top` and before
  `symbol-name` for screened rows with reasons. Confirm marks stay inline with the symbol code, and
  the `30d range … · position …` figures, the `not screened` / `insufficient history` states, the
  symbol code, asset class and name are all rendered exactly as before.
- [x] 2.6 In `web/styles.css`, add compact styling for `.screener-sources` and `.screener-source` —
  uniform size and colour for every name, wrapping on narrow widths — and leave `.screener-mark` /
  `.screener-marks` unchanged.
- [x] 2.7 Verify the source line keeps the symbol code legible on the widest case (all five names) at
  the narrowest sidebar width.

## 3. Cache invalidation

- [x] 3.1 Bump `SCAN_CACHE_VERSION` in `web/screener/scan.js` from `4` to `5`, so results cached with
  nameless reasons are discarded on the next load without requiring a sync.

## 4. Tests

- [x] 4.1 In `tests/js/run_screener.mjs`, extend the full-confluence and gate-only reasons assertions
  so each entry carries its expected `source` alongside `rule` and `points`, and confirm the expected
  score and mark count are still 8 and 4 / 1 and 1 respectively.
- [x] 4.2 Keep the `markCount` import and bucket-boundary assertions; add a check that the five
  source names on a full-confluence result are distinct and recorded in the documented order.
- [x] 4.3 Add a check that a gated-out result records no reasons and carries no `source` fields.
- [x] 4.4 Create `tests/js/run_render.mjs`, importing `renderMarks`, `renderSourceNames` and
  `renderScreenerRow` directly from `web/screener/render.js` (plain Node import, no DOM, no browser).
  Cover:
  - `renderMarks` for 0, 1 and 4 marks, asserting the dot count and that the tooltip `title`
    attribute carries the full `rule: points` lines, HTML-escaped.
  - `renderSourceNames` for an empty reasons array (renders nothing) and a multi-reason array
    (one escaped `<span class="screener-source">` per reason, in order).
  - `renderScreenerRow` for a fabricated `result` covering: full confluence (marks inline with the
    symbol code, 5 ordered source names on the line beneath, range/position figures shown);
    gate-only (one mark, source name `gate` alone); gated-out (no marks, no source-names element,
    range/position figures still shown); `not-screened` and `insufficient-history` statuses (no
    marks or sources, the corresponding state text shown instead of figures).
- [x] 4.5 In `tests/js/run_screener.mjs` or a new `tests/js/run_scan_cache.mjs`, unit test
  `runScan` from `web/screener/scan.js` with a mock storage object (plain JS object implementing
  `getItem`/`setItem`) and a mock `getJSON`: seed a cache written under a stale version whose reasons
  lack `source`, confirm `runScan` does not reuse it once `SCAN_CACHE_VERSION` is 5, that `getJSON`
  is called to recompute, and that the recomputed reasons carry `source`. No browser or network
  needed — `getJSON` is a plain async function returning fixture data.
- [x] 4.6 Run `node tests/js/run_screener.mjs`, `node tests/js/run_render.mjs` and the cache test from
  4.5, and confirm every check passes.
- [x] 4.7 Run the remaining JS test entrypoints under `tests/js/` and confirm none of them break.

## 5. Automated verification

All of the following are Node-script assertions against `web/screener/render.js` and
`web/screener/score.js` with fabricated inputs — no manual browser session, no external app.

- [x] 5.1 Assert a full-confluence row's rendered HTML contains 4 mark spans and 5 source spans in
  the documented order, and that the marks wrapper's `title` attribute still contains the full rule
  wording with each rule's points (covered by 4.4; confirm it's in place).
- [x] 5.2 Assert two fabricated results sharing the same score but firing different components
  produce rendered rows with an identical mark-span count but different source-span text.
- [x] 5.3 Assert a gate-only result renders one mark and names `gate` alone; a gated-out result
  renders no marks and no source-names element while still rendering its range and position figures;
  a `not-screened` / `insufficient-history` result renders its state text and no marks or sources.
- [x] 5.4 Assert `runScan` recomputes rather than reusing a stale-version cache, per 4.5, and that no
  code path in `scan.js` calls anything beyond the provided `getJSON` mock (i.e. no assumption of a
  real network or browser storage).
