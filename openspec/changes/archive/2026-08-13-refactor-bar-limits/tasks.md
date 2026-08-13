## 1. Fetch depth in the timeframe definitions

- [x] 1.1 Replace `default_target_bars`, `floor_bars` and `max_bars` on the timeframe definition with a single optional fetch depth: M15 `1_200`, H1/D1/W1 unlimited; keep `yahoo_max_days`, `seconds` and `bars_per_calendar_day`
- [x] 1.2 Delete `clamp_target_bars`; keep `INDICATOR_WARMUP_BARS` (still used for the insufficient-history warning) and update the module docstring, which currently explains bar-count retention
- [x] 1.3 Give `fetch.py` one entry point for "where does this timeframe's backfill start": a bar count becomes a date estimate as today, unlimited becomes the fixed 1980 start, both passed through `clamp_start`

## 2. Append-only storage

- [x] 2.1 Remove `prune_to_target`, `get_target_bars` and `set_target_bars` from the store; leave the `settings` table in the schema and update the docstring that describes it as holding bar targets
- [x] 2.2 Confirm nothing else calls the removed helpers, and that `upsert_bars` remains the only write path for bars

## 3. Sync without targets or pruning

- [x] 3.1 Drop the `targets` parameter from `SyncRunner.try_start`/`run`/`_sync_symbol`, the `targets` field from `SyncProgress`, and the `pruned` counter from `SymbolResult`
- [x] 3.2 Rewrite the start-date logic: full refresh and first sync use the timeframe's fetch start; an incremental run starts just before the newest stored bar and is **not** raised to the fetch window's start, so a series may extend deeper than the window
- [x] 3.3 Remove the deficit-aware backfill branch, which existed only to chase a raised target
- [x] 3.4 Add a per-timeframe skip decision available to a run: skip when less than one bar's duration has elapsed since the newest stored bar, never skip a timeframe holding no bars, and report a skip in the run results without touching that timeframe's recorded sync state
- [x] 3.5 Apply the skip only to periodic runs — a manual run fetches every timeframe — and carry the distinction through the sync API and the runner rather than inferring it

## 4. Contract, API, CLI and workflow surface

- [x] 4.1 Remove `target_bars`, `floor_bars` and `max_bars` from `data/meta.json`'s timeframe entries
- [x] 4.2 Remove `targets` from the sync request model and forbid unknown fields on it, so a stale caller sending a depth is refused rather than silently synced; drop the now-dead unknown-timeframe validation
- [x] 4.3 Remove `--target TF=BARS` and its parser from the CLI, and reword `--full` in terms of the fetch window
- [x] 4.4 Remove the four `target_*` `workflow_dispatch` inputs and the argument-building lines that forwarded them in the release workflow

## 5. Persisted user settings

- [x] 5.1 Add a settings module storing one versioned JSON object under a single localStorage key, with every read and write guarded so a browser that denies storage cannot stop the app from loading; take the storage object as a parameter so it can be tested outside a browser
- [x] 5.2 Restore on boot with per-field validation: instrument against the loaded catalog, timeframe against the contract's timeframe list, indicator ids against the registry, display limit against the same rule the input enforces — each unusable value falling back to its default without abandoning the rest
- [x] 5.3 Persist on change: display limit, selected instrument, selected timeframe, enabled indicators, and the sidebar filters (search text, asset class, compatible-only). Do not persist tool state or the full-refresh checkbox

## 6. Chart display limit

- [x] 6.1 Add the display-limit input to the toolbar's right-hand group, accepting a positive integer or `all`, defaulting to 5,000, with the current value visible
- [x] 6.2 Hold the loaded series and the displayed slice separately in chart state, and make the candle series, indicators, chart tools and the legend all read the slice
- [x] 6.3 Re-slice and redraw on a limit change with no refetch, and discard any drawn measurement as part of that change
- [x] 6.4 Refuse a zero, negative or non-numeric limit, keeping the last valid value in force and leaving the chart untouched

## 7. Periodic refresh

- [x] 7.1 Amend the project context in `openspec/config.yaml` to permit a user-switched periodic refresh while keeping the ban on cron, startup, on-view and streaming fetches
- [x] 7.2 Add the periodic-refresh control to the sync controls, off by default, with its active state visible and its own state excluded from persisted settings
- [x] 7.3 Drive an incremental sync every 15 minutes while it is on, marking those runs as periodic so the skip rule applies; stop the timer when it is switched off or the page unloads
- [x] 7.4 Drop a refresh whose interval elapses while a sync is running, using the existing single-run conflict rather than queueing
- [x] 7.5 Confirm the control is absent in static mode, alongside the other sync controls

## 8. Indicators against the displayed series

- [x] 8.1 Confirm indicator computation reads the displayed slice, so a limit change recomputes and a raised limit deepens the scan
- [x] 8.2 Make the insufficient-history warning count displayed bars, so a limit below an indicator's warm-up warns instead of rendering nothing while the bars sit in storage

## 9. Tests

- [x] 9.1 Replace the prune and target tests in `test_store.py` with append-only coverage: an upsert of overlapping bars revises without deleting, and a stored series never shrinks
- [x] 9.2 Rework `test_sync.py`: no targets in the run signature, the incremental start is not clamped to the fetch window, a repeat sync leaves the bar count greater than or equal to its previous value, and a full refresh keeps bars older than the window
- [x] 9.3 Cover the skip rule in `test_sync.py`: a periodic run skips W1 two days after its newest bar and fetches M15 twenty minutes after its newest, never skips a timeframe with no bars, leaves a skipped timeframe's sync state untouched, and a manual run skips nothing
- [x] 9.4 Update `test_fetch.py` for the new start-date entry point, covering M15's 1,200-bar request clamped inside 60 days, H1 clamped to the 730-day cap, and D1/W1 starting at the fixed early date
- [x] 9.5 Update `test_api.py` and `test_export.py` for the meta shape without targets, assert a sync request carrying `targets` is refused, and cover the periodic flag reaching the runner
- [x] 9.6 Add a Node harness for the settings module: round-trip, unknown/invalid values falling back, a storage stub that throws on write, and display-limit parsing including `all` and the refused values

## 10. Documentation

- [x] 10.1 Update the README's timeframe and limits section to describe fetch depth per timeframe and append-only storage, replacing the adjustable-target explanation
- [x] 10.2 Document the display limit and which settings the browser remembers, and drop the release section's mention of the target dispatch inputs
- [x] 10.3 Document the periodic refresh: opt-in, 15 minutes, session-only, which timeframes it skips and why, and that it exists only in dev mode
- [x] 10.4 Note the migration in the README: an existing database needs one full refresh to deepen, and the export grows accordingly

## 11. Verification

- [x] 11.1 Full test suite green: `uv run pytest`, `node tests/js/run_fixtures.mjs`, `node tests/js/run_measure.mjs`, and the new settings harness
- [x] 11.2 Migration rehearsal on the existing database: sync one symbol incrementally and confirm no bars are lost, then `--full` it and confirm D1 depth exceeds the old 1,000-bar cap
- [x] 11.3 Dev mode: default limit shows the newest 5,000 bars of a deepened series, `all` shows everything, lowering redraws immediately with no data request, and an invalid entry is refused
- [x] 11.4 Dev mode: enable FVG at the default limit, then set a limit below its warm-up and confirm the warning names required against available; raise it again and confirm the scan deepens
- [x] 11.5 Dev mode: set a limit, select an instrument and timeframe, enable an indicator, filter the sidebar, reload, and confirm everything is restored while no measurement is, and that both the full-refresh and periodic-refresh controls come back off
- [x] 11.6 Dev mode: with a measurement drawn, change the limit and confirm the measurement is discarded
- [x] 11.7 Dev mode: switch periodic refresh on, confirm a run starts on the interval (temporarily shortening it for the check), that W1 and D1 report as skipped while M15 fetches, and that switching it off stops further runs
- [x] 11.8 Confirm no sync happens on load or while browsing with the control off, so the offline-first guarantee still holds
- [x] 11.9 Static export: confirm the same display-limit and settings behaviour, that no sync or periodic-refresh control is present, and record the exported payload size against the ~3.6 MB baseline
- [x] 11.10 Confirm a restored selection that no longer resolves (rename an instrument in the catalog, or edit the stored settings by hand) falls back to defaults and renders normally
