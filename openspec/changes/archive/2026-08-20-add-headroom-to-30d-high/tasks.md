## 1. Settle the formula before writing code

- [x] 1.1 Confirm with the user which headroom formula to implement: the chosen
  `(high − price) / price` (2.9% for the request's example of a 40% range at 90% position), or the
  alternative `range × (1 − position)` measured over the window's low (4.0% for the same example). See
  `proposal.md` — Open question. Every task below is written for the chosen one; if the alternative is
  confirmed instead, only the expression in task 2.1 and the expected values in tasks 5.1–5.3 change.
- [x] 1.2 Record the confirmed answer in `proposal.md` by replacing the Open question section with the
  settled decision, so the artifact does not stay ambiguous after the fact.

## 2. Compute the figure

- [x] 2.1 In `web/screener/range.js`, add `headroomPct` to what `computeRange` returns:
  `(high − price) / price`, computed on the same guarded path as `rangePct` and `positionPct` so it is
  `null` in exactly the cases they are `null` — no bars, no price, no bar inside the 30-day window, and a
  non-positive span. Do not clamp its sign.
- [x] 2.2 Confirm the three early-return shapes in that function all carry `headroomPct: null`, so no
  caller can receive an object missing the key.
- [x] 2.3 Add a short comment stating that the headroom is measured over the current price, not over the
  window's low, and that it matches the pivot-distance convention in `score.js`.

## 3. Carry it through the screening result

- [x] 3.1 In `web/screener/score.js`, destructure `headroomPct` from `computeRange` and include it in the
  `screened` result returned by `scoreInstrument`.
- [x] 3.2 Extend `emptyResult` to take and return the headroom alongside `rangePct` and `positionPct`, and
  update every call site — `not-screened`, `insufficient-history` (all four of them), and the gate failure —
  so each returns the figure it has, or `null` for `not-screened`.
- [x] 3.3 Confirm no scoring behaviour moved: the gate conditions, the weight constants, `markCount`, the
  pivot bands, the reason objects and the order they are pushed in are untouched, and `headroomPct` appears
  in no `reasons` entry and in no score arithmetic.
- [x] 3.4 Bump `SCAN_CACHE_VERSION` in `web/screener/scan.js` from `6` to `7`, so results cached before the
  figure existed are discarded and recomputed on the next load without a sync.
- [x] 3.5 Confirm the `insufficient-history` fallback object in `runScan`'s `catch` also carries
  `headroomPct: null`, matching the shape `scoreInstrument` returns.

## 4. Show it and sort by it

- [x] 4.1 In `web/screener/render.js`, add the headroom to the figures line so a screened row reads
  `30d range 40.0% · position 90.0% · headroom 2.9%`, reusing `formatPct` so a `null` renders as the same
  `—` the other two figures use, and leaving the range and position text exactly as it is.
- [x] 4.2 Confirm the `not-screened` and `insufficient-history` branches still replace the whole figures
  line with their state text rather than showing a partial line.
- [x] 4.3 In `web/symbol-list.js`, replace `compareSynced` with a headroom comparator: descending by
  `screenerScores[symbol]?.headroomPct`, with a null-last branch modelled on the existing never-synced
  handling, and no numeric default substituted for a missing figure. Remove the `synced` entry from
  `COMPARATORS` and the now-unused `last_sync_utc` reads.
- [x] 4.4 In `web/settings.js`, replace `"synced"` with `"headroom"` in `VALID_SORT_ORDERS`. Leave
  `SETTINGS_VERSION` at 1 and `DEFAULT_SORT_ORDER` at `"default"`; the existing per-field fallback is what
  handles a stored `synced`.
- [x] 4.5 In `web/index.html`, replace the sort selector's `<option value="synced">Recently synced</option>`
  with `<option value="headroom">Most headroom</option>`, keeping it in the same position in the list.
- [x] 4.6 Grep the repo for `synced` as a sort value and for `compareSynced` and confirm the only remaining
  hits are the row's own sync-freshness text, the scan cache key, and archived change documents, which are
  historical records and must not be edited.

## 5. Tests

- [x] 5.1 In `tests/js/run_screener.mjs`, add range coverage: a window with low 100 and high 140 and a price
  of 136 yields a range of 40%, a position of 90% and a headroom of 2.9% (assert against
  `(140 − 136) / 136` rather than a rounded literal); a price at the low yields a headroom equal to the
  range; a price above the window's high yields a negative headroom that is not clamped.
- [x] 5.2 In `tests/js/run_screener.mjs`, assert the figure is `null` where the range and position are
  `null` — no bars, no price, no bar in the window, zero span — and that it is carried on the
  `insufficient-history` and gate-failure results but absent (null) on `not-screened`.
- [x] 5.3 In `tests/js/run_screener.mjs`, assert that two instruments with identical signals and different
  headroom get identical scores, marks and reasons, so the figure provably does not feed scoring.
- [x] 5.4 In `tests/js/run_render.mjs`, assert a screened row's figures line carries all three figures in
  order with the range and position text unchanged, that a null headroom renders as `—` beside real range
  and position figures, and that a negative headroom is rendered with its sign.
- [x] 5.5 In `tests/js/run_symbol_list.mjs`, replace the sync-recency ordering tests with headroom ones:
  largest first; instruments with no figure last in default relative order; equal figures stable; a
  negative figure below every larger figure and above every missing one; and sorting applied only to what
  the filters admit.
- [x] 5.6 In `tests/js/run_settings.mjs`, assert that `"headroom"` restores as a valid sort order and that a
  stored `"synced"` falls back to `"default"` while every other stored setting survives the restore.
- [x] 5.7 In `tests/js/run_scan_cache.mjs`, confirm the stale-cache test exercises a version mismatch
  against `SCAN_CACHE_VERSION` rather than hard-coding `6`; adjust only if it hard-codes the old number.
- [x] 5.8 Run `node tests/js/run_screener.mjs`, `run_render.mjs`, `run_symbol_list.mjs`,
  `run_settings.mjs` and `run_scan_cache.mjs` and confirm all pass. Run the Python suite to confirm nothing
  server-side was touched.

## 6. Verification in the app

- [x] 6.1 Load the symbol browser and confirm every screened row shows three labelled figures, that a
  gated-out row shows them too, and that a not-screened or insufficient-history row still shows its state
  text in place of the line.
  > Fixed: insufficient-history rows with a computable 30-day window now show the three figures (matching
  > sortable headroom data); only insufficient-history without a window, and not-screened, keep state text.
- [x] 6.2 Pick one instrument, read its range and position off the row, and confirm the displayed headroom
  matches `r(1 − p) / (1 + r·p)` computed by hand from those two figures.
- [X] 6.3 Check the figures line at the sidebar's current width: confirm it wraps cleanly with the third
  figure added and that no figure is clipped or run together with the source labels above it.
- [x] 6.4 Choose **Most headroom** and confirm the order is largest first, that unscreened instruments sit
  at the bottom, that the selector no longer offers a sync-recency order, and that no network request is
  made when the order changes.
- [x] 6.5 With a sort order of `synced` and a scan cache written before this change both present in browser
  storage, reload without syncing: confirm the list opens in the default order, the scan recomputes, every
  row shows a headroom figure, and the selected instrument, timeframe, indicators and display limit are all
  still restored.
- [x] 6.6 Reload with **Most headroom** selected and confirm the order persists.
