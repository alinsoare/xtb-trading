## 1. Rename the labels

- [x] 1.1 In `web/screener/score.js`, change the value of `SOURCE_D1_FVG_H1` from `"D1 FVG+H1"` to
  `"FVG D1"` and the value of `SOURCE_H1_FVG_M15` from `"H1 FVG+M15"` to `"FVG H1"`. Leave the
  identifiers, `SOURCE_GATE`, `SOURCE_MACD` and `SOURCE_PIVOT` untouched.
- [x] 1.2 Add a one-line comment at those two constants noting that the label deliberately names only
  the timeframe of the gap, and that the confirming run stays in the `rule` wording.
- [x] 1.3 Confirm nothing else in the file changed: the weight constants, the `rule` strings
  (`"D1 FVG + H1 bullish run"`, `"H1 FVG + M15 bullish run"`), the gate, `markCount`, the pivot bands
  and the order reasons are pushed in are all as they were.
- [x] 1.4 Grep the repo for the literals `D1 FVG+H1` and `H1 FVG+M15` and confirm the only remaining
  hits are in archived change documents, which are historical records and must not be edited.

## 2. Cache invalidation

- [x] 2.1 Bump `SCAN_CACHE_VERSION` in `web/screener/scan.js` from `5` to `6`, so results cached under
  the former source names are discarded on the next load without requiring a sync.

## 3. Tests

- [x] 3.1 In `tests/js/run_screener.mjs`, in the block that asserts constants by value, add assertions
  that `SOURCE_D1_FVG_H1` is `"FVG D1"` and `SOURCE_H1_FVG_M15` is `"FVG H1"`, so the label text is
  pinned rather than only referenced through the constants.
- [x] 3.2 In `tests/js/run_screener.mjs`, confirm the existing full-confluence reason assertions,
  distinct-source assertion and source-order assertion still pass unchanged — they go through the
  constants, so the rename must not require editing them.
- [x] 3.3 In `tests/js/run_render.mjs`, confirm the source-span, order and equal-score-rows assertions
  still pass unchanged, and that the marks tooltip assertions still find the full rule wording
  including the confirming run (`"D1 FVG + H1 bullish run: 2"`).
- [x] 3.4 In `tests/js/run_scan_cache.mjs`, confirm the stale-cache test still exercises a version
  mismatch against `SCAN_CACHE_VERSION` after the bump and does not hard-code `5`; adjust only if it
  hard-codes the old number.
- [x] 3.5 Run `node tests/js/run_screener.mjs`, `node tests/js/run_render.mjs` and
  `node tests/js/run_scan_cache.mjs` and confirm all pass.

## 4. Verification

- [x] 4.1 Load the symbol browser and confirm a row with a gap component names `FVG D1` or `FVG H1`
  on the source line, that `gate`, `MACD` and `pivot` read exactly as before, and that the source
  line's styling and wrapping are unchanged.
- [x] 4.2 With a cache written before the change present in browser storage, reload without syncing
  and confirm no row shows a former label — the scan recomputes and no network request is made to
  fetch bars.
- [x] 4.3 Hover the marks on a row naming `FVG H1` and confirm the audit still reads
  `H1 FVG + M15 bullish run: 1`, and that the row's score, mark count and position in the
  score-sorted list are unchanged from before the rename.
