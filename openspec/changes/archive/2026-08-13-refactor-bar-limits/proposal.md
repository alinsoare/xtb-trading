## Why

One number decides three unrelated things today. `target_bars` sizes the initial Yahoo
window, prunes the database after every run, and — because the chart draws whatever is
stored — caps how much history the user can look at. At the default of 1,000 that makes
every D1 chart a four-year window, and the only way to see more is a setting that also
re-pulls and re-prunes every symbol. Worse, pruning deletes bars the app already fetched,
including bars Yahoo will never serve again (anything M15 older than 60 days), which is
precisely what the `data`-branch snapshot exists to prevent.

Fetch depth and display depth are different questions with different constraints: the
first is bounded by what Yahoo serves and how long a pull takes, the second by what is
useful to look at and what the browser can draw. They should be two settings.

## What Changes

- Split the single target into **fetch depth** (server-side, per timeframe) and a
  **chart display limit** (client-side, user-set).
- Fetch depth becomes a fixed per-timeframe rule rather than a tunable: M15 targets 1,200
  bars (inside Yahoo's 60-day sub-hourly cap), H1 goes as deep as the 730-day cap allows,
  and D1 and W1 pull the instrument's full available history.
- **BREAKING** Storage becomes append-only. Pruning is removed: a sync adds and revises
  bars, never deletes them. Existing databases keep whatever they hold until a full
  refresh deepens them.
- **BREAKING** The adjustable bar target is removed along with its whole surface: the
  `--target TF=BARS` CLI option, the `targets` field on the sync API, the four
  `workflow_dispatch` target inputs, and the persisted `target_bars.*` settings rows.
  "Unlimited" leaves nothing meaningful to tune.
- The chart gains a display limit the user controls, defaulting to the 5,000 most recent
  bars, applying to every timeframe, and settable to all stored bars.
- Indicators compute over the displayed slice instead of everything stored, so signals
  match what is on screen and cost tracks the display limit rather than total storage.
- User settings survive a reload (localStorage): display limit, selected instrument and
  timeframe, indicator toggles, and the sidebar filters. Sync state deliberately does not,
  so a reload can never resume fetching.
- The static export continues to export every stored bar.
- A sync is explicitly guaranteed never to re-download a series it already holds: the
  request window runs from just before the newest stored bar to the present, whatever the
  stored depth. This was already the behaviour, but nothing else clamps the window once
  retention is gone, so it becomes a stated requirement.
- New opt-in periodic refresh: a sync control that runs an incremental sync every 15
  minutes while switched on, off by default, never resumed on a later load, and absent from
  the published site, which has no backend. Each refresh skips symbol/timeframe pairs where
  less than one bar's duration has elapsed since their newest stored bar, since the source
  cannot yet have a bar we do not hold. A manual sync always fetches.

Deliberately out of scope, to be proposed separately: moving data acquisition into the
browser — caching bars locally (IndexedDB, since localStorage cannot hold megabytes) and
fetching deltas from Yahoo directly, using the server snapshot only to seed history. That
architecture has to solve access from a static origin first: Yahoo's chart endpoint returns
no `access-control-allow-origin` header and throttles clients without a browser session, so
it needs a proxy or serverless hop, and it contradicts today's requirement that the
published site never contacts the market data source.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `market-data`: retention-by-bar-count is replaced by per-timeframe fetch depth plus
  append-only storage; the pruning requirement goes away and backfill depth is restated
  in terms of source limits rather than a target.
- `sync`: a run no longer carries bar-target adjustments, full refresh is defined against
  the fetch window instead of a retention window, an opt-in periodic refresh joins the
  manual trigger as a way a sync can start, and a periodic refresh skips timeframes that
  cannot yet have a new bar.
- `charting`: adds the user-controlled display limit and the persistence of user
  settings across reloads, and adds the periodic-refresh control to the sync controls.
- `indicators`: the scan covers the displayed series rather than all stored bars; toggle
  state persists across reloads; the guarantee that FVG has enough history is restated
  against fetch depth.
- `release-publishing`: the dispatch loses its bar-target inputs, the exported payload grows
  with accumulated history, and the published site is stated to carry no periodic-refresh
  control either.

Also amended: the project context in `openspec/config.yaml`, whose blanket ban on background
timers would otherwise forbid the periodic refresh. It now permits a refresh the user
switches on for a session while keeping the ban on implicit, startup, and on-view fetching.

## Impact

- Code: `config.py` (timeframe fetch rules replace target/floor/max), `store.py`
  (`prune_to_target` and the target settings helpers removed), `sync.py` (no targets, no
  pruning, backfill start from the fetch rule, per-timeframe skipping for periodic runs),
  `fetch.py` (a "as deep as the source serves" start), `contract.py` and `api.py` (meta no
  longer publishes targets; the sync request loses `targets`), `main.py` (`--target`
  removed), `.github/workflows/release.yml` (four inputs removed), and the frontend: a
  settings module over localStorage, the display-limit control and slicing in `app.js`,
  indicators computing on the slice, and the periodic-refresh control with its timer.
- Data: no schema change; existing `settings` rows for `target_bars.*` become dead and
  are ignored. Databases synced under the old rules hold ~1,000 bars per timeframe and
  need one full refresh to reach the new depth — a slow, expected, one-time pull.
- Payload: the export grows from ~3.6 MB to roughly 20 MB for the eight seeded
  instruments (measured at ~133 bytes per bar), and keeps growing as history accumulates.
- Tests: the prune and target tests in `test_store.py`, `test_sync.py`, `test_api.py`,
  and `test_export.py` describe behaviour that is being removed and must be replaced with
  append-only and fetch-depth coverage.
- Docs: the README's timeframe/limits section and the release instructions describe the
  target knob.
