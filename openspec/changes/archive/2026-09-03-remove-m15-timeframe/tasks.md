## 1. Retire the timeframe in the backend

- [x] 1.1 Delete the `m15` entry from `TIMEFRAMES` and its slot in `TIMEFRAME_ORDER` in `src/xtb_charts/config.py`, leaving `h1`, `d1`, `w1` in that order.
- [x] 1.2 Confirm `timeframe("m15")` now raises the unknown-timeframe error naming the supported set, and that the error text lists exactly H1, D1 and W1.
- [x] 1.3 Read `src/xtb_charts/sync.py`, `src/xtb_charts/export.py` and `src/xtb_charts/api.py` and confirm each derives its timeframes from the config rather than naming them; make no edit where that already holds, and record any place that does not.
- [x] 1.4 Confirm the candles route rejects `m15` with a 400 naming the supported set, via the membership check that already exists, with no new code.
- [x] 1.5 Confirm `data/meta.json` carries `timeframe_order` of three keys and no `m15` entry under `timeframes`, and that the catalog manifest's per-timeframe block carries three entries per instrument.

## 2. Narrow the screening payload

- [x] 2.1 Change `SCAN_TIMEFRAMES` in `src/xtb_charts/contract.py` to `("h1", "d1")` and update the `build_scan_bars` docstring so it stops naming M15.
- [x] 2.2 Confirm the built payload carries `h1` and `d1` per enabled instrument and no `m15` key, including for a store that still holds M15 bars.
- [x] 2.3 Check whether any Python-side count or comment assumes three screened timeframes (payload size notes, cap comments) and correct what it says.

## 3. Update the browser screener

- [x] 3.1 Change `SCAN_TIMEFRAMES` in `web/screener/bars.js` to `["h1", "d1"]`.
- [x] 3.2 Make `currentPrice` iterate the series it is handed rather than a fixed set of timeframe keys, per the design decision, so it cannot skip a timeframe it was sent or invent one it was not.
- [x] 3.3 Remove the `m15` branch from `barsFromSeries` in `web/screener/score.js`, keeping the array-or-columnar handling for the remaining two.
- [x] 3.4 Bump `SCAN_CACHE_VERSION` in `web/screener/scan.js` from 8 to 9 so no cached score computed with an M15-derived price is displayed.
- [x] 3.5 Reword the `PERIODIC_REFRESH_MS` comment in `web/app.js` so it no longer reasons about M15 and H1 being the timeframes the skip rule leaves fetching.
- [x] 3.6 Confirm the chart's timeframe buttons and the default-timeframe choice need no edit, both being driven by `meta.timeframe_order` with D1 as the default.
- [x] 3.7 Leave the **auto 15m** control in `web/index.html`, the 15-minute interval, and the M15 spot-check note in the `web/indicators/ob.js` header comment untouched, and confirm none of them was changed.

## 4. Move the tests off M15

- [x] 4.1 Re-point `tests/test_sync.py::test_incremental_start_is_not_raised_to_the_fetch_window` at H1, widening the seeded age past the 730-day window so the incremental start still sits outside the fetch window.
- [x] 4.2 Re-point `tests/test_sync.py::test_full_refresh_re_pulls_the_window_and_keeps_older_bars` at H1 with date offsets outside the 730-day window, keeping the assertion that bars the source can no longer serve stay put.
- [x] 4.3 Update the periodic-refresh skip test so its seeded fixtures and expected fetch/skip sets are stated over H1, D1 and W1, and add a case where every timeframe is too recent: nothing fetched, all three reported skipped, sync state unchanged, run successful.
- [x] 4.4 Delete `tests/test_fetch.py::TestBackfillStart::test_m15_requests_its_depth_inside_the_60_day_cap` together with the requirement it guarded, and confirm the H1 clamping test still covers the clamp path.
- [x] 4.5 Update `tests/test_api.py` so the scan-bars shape test seeds and asserts H1 and D1 only, and add a case that a candles request for `m15` returns a 400 naming the supported set.
- [x] 4.6 Add a test that a store still holding `m15` rows exports and serves without them appearing in the manifest, the candles files, or the screening payload, and that the rows are still present afterwards.
- [x] 4.7 Update the scan-series helpers and fixtures in `tests/js/run_screener.mjs`, `tests/js/run_render.mjs` and `tests/js/run_scan_cache.mjs` to two timeframes, including the current-price assertions and the short-series case that used to be named for H1 and M15.
- [x] 4.8 Update the live timeframe list in `tests/js/run_settings.mjs` to `["h1", "d1", "w1"]` and add a case that a persisted timeframe of `m15` restores the default timeframe while every other persisted setting survives.
- [x] 4.9 Add a browser-side case that a cache written under version 8 is not reused, so the recomputation the version bump forces is verified rather than assumed.

## 5. Check the export and deploy surface

- [x] 5.1 Run an export into a directory that already holds `candles/<symbol>/m15.json` files and record whether they are left behind.
- [x] 5.2 Confirm the release workflow publishes a fresh tree rather than overlaying a previous one; if it overlays, note what would be needed to clear stale files and whether it belongs in this change.
- [x] 5.3 Confirm nothing in the frontend requests a candles file for a timeframe absent from `meta.timeframe_order`, so stale files would be dead rather than reachable.

## 6. Documentation

- [x] 6.1 Drop the M15 row from the timeframe table in `README.md` and remove the "sync M15 at least every 60 days" warning, since no remaining timeframe can develop an unbackfillable gap.
- [x] 6.2 Reword the periodic-refresh paragraph so it states that only H1 can produce a new bar between ticks and that a refresh finding everything too recent fetches nothing.
- [x] 6.3 Reword the persisted-settings paragraph where it explains that **full refresh** and **auto 15m** come back off, keeping both names intact, and check no other README sentence implies a sub-hourly timeframe.

## 7. Verify

- [x] 7.1 Run `uv run pytest` and confirm it passes with no M15 reference remaining in the backend tests.
- [x] 7.2 Run the JS suites the change touches — `node tests/js/run_screener.mjs`, `run_render.mjs`, `run_scan_cache.mjs`, `run_settings.mjs` — plus `run_measure.mjs` to confirm its `4h 15m` case was not caught by a stray replacement.
- [x] 7.3 Search the tree for `m15`, `M15` and `15m` and confirm every remaining hit is deliberate: the refresh interval and its label, the elapsed-time test, the OB header note, and the archived change artifacts.
- [x] 7.4 Serve the dev app against a database that still holds M15 bars: confirm three timeframe buttons, D1 selected, the screener scoring from a recomputed cache, and no request for an M15 candles file.
- [x] 7.5 Run `openspec validate remove-m15-timeframe --strict` and confirm the change is still valid after implementation.
