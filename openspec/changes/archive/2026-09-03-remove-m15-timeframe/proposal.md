## Why

M15 is the only timeframe the system cannot serve honestly. Yahoo caps sub-hourly history at
60 days, so the specs and the README already carry a documented defect: sync M15 at least
every 60 days or the series develops gaps that can never be backfilled. The published site
syncs twice a day, but a local clone that sits idle for two months acquires permanent holes
in exactly one of its four series, and nothing can repair them.

What that timeframe buys in return is small. No screening rule reads M15 bars — the three
triggers and the distance component are all D1, and M15 survives in the screening payload
only because the shared current-price convention picks the newest bar across the screened
timeframes. It is a chart timeframe a user may switch to, and a source of freshness for a
price the rest of the model derives from D1 structure. Meanwhile it costs a per-symbol series
of 1,200-plus bars in the committed snapshot, a third of the screening payload, and a
periodic-refresh story written around the one timeframe that could plausibly produce a new
bar every 15 minutes.

Removing it collapses the timeframe set to three intervals that all backfill completely, and
retires the only "this data may be permanently wrong" caveat in the project.

## What Changes

- **BREAKING** for the timeframe set: the system supports H1, D1 and W1. M15 is no longer
  fetched, stored by new syncs, served, exported, charted or screened. The finest interval
  offered becomes H1.
- **BREAKING** for the screening payload: it carries H1 and D1 per enabled instrument, not
  three timeframes. The shared current-price convention reads the newest bar across those
  two, so a price that previously came from an M15 bar now comes from H1 or D1. Scores can
  move by a fraction as a result, and cached scores from before the change must be recomputed
  rather than displayed.
- **BREAKING** for the HTTP and static surface: `m15` is rejected as an unknown timeframe by
  the candles route, `data/meta.json` no longer lists it in `timeframe_order` or
  `timeframes`, the catalog manifest carries no `m15` per-timeframe entry, and the exporter
  writes no `candles/<symbol>/m15.json`.
- The market-data requirements lose the sub-hourly trade-off entirely: no supported timeframe
  is capped by the source's sub-hourly window, so the "gap older than 60 days can never be
  backfilled" caveat and the 1,200-bar M15 fetch depth go with it. The append-only guarantee
  keeps its own requirement, restated on a timeframe that still exists.
- The periodic-refresh skip rule keeps its 15-minute interval and its behaviour, but its
  worked examples are restated on H1 rather than M15. With M15 gone, a refresh that lands
  less than an hour after the newest H1 bar skips every timeframe and fetches nothing — a
  legitimate outcome the requirement should state rather than imply.
- Bars already stored under `m15` are **not deleted**. They stop being read, fetched, served
  and exported, and become inert rows in existing databases and snapshots. This is a
  deliberate non-goal: see design for why a destructive migration is the wrong trade here,
  and what the cost of leaving them is.
- A persisted UI setting naming `m15` needs no special handling: the existing rule already
  falls an unknown stored timeframe back to the default, which is D1. This change relies on
  that rule rather than adding a migration, and states the reliance so the behaviour is
  tested rather than assumed.
- Explicitly out of scope: the 15-minute periodic-refresh interval and its **auto 15m**
  label, which describe a refresh cadence rather than a timeframe and stay as they are; the
  screening triggers, weights, bands and mark buckets, none of which read M15 bars; and any
  new timeframe to replace it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `market-data`: the "Supported timeframes" requirement drops M15 and, with it, every trace
  of the sub-hourly history cap — the supported set becomes H1, D1 and W1, all of which
  backfill completely. "Fetch depth is fixed per timeframe" loses the M15 1,200-bar depth.
  "Stored bars are never deleted" keeps its guarantee but restates its worked scenario on a
  timeframe that still exists, and gains the statement that rows stored under a retired
  timeframe are retained and never read.
- `sync`: the periodic-refresh skip rule's scenarios move off M15 onto H1, and the
  requirement states what a refresh does when every timeframe is skipped — nothing fetched,
  everything reported skipped — which was previously masked by M15 always being due.
- `charting`: the timeframe-switching requirement offers H1, D1 and W1. The
  settings-persistence requirement states explicitly that a stored timeframe the system no
  longer supports falls back to the default rather than leaving the chart on an unservable
  selection.
- `accumulation-screener`: the screening payload carries two timeframes instead of three, and
  its single-request justification is restated on that count. The current-price convention
  reads the newest bar across H1 and D1, and the clause explaining why the finer timeframes
  stay in the payload is rewritten for the set that remains. The cache requirement gains that
  a result written while M15 contributed to the current price is not reused.

## Impact

- `src/xtb_charts/config.py` — the `m15` entry in `TIMEFRAMES` and its slot in
  `TIMEFRAME_ORDER`. Everything that iterates `TIMEFRAME_ORDER` (sync, exporter, catalog
  manifest, candles route validation) follows from this one edit.
- `src/xtb_charts/contract.py` — `SCAN_TIMEFRAMES` becomes `("h1", "d1")`, and the
  `build_scan_bars` docstring stops naming M15.
- `src/xtb_charts/api.py`, `src/xtb_charts/export.py`, `src/xtb_charts/sync.py` — no
  timeframe-specific edits expected; they read the config. Worth verifying rather than
  assuming, and the exporter needs a check for stale `m15.json` files left in a reused output
  directory.
- `web/screener/bars.js` — `SCAN_TIMEFRAMES`; `web/screener/score.js` — the `m15` branch of
  `barsFromSeries`.
- `web/screener/scan.js` — `SCAN_CACHE_VERSION` bumps from 8, so no cached score computed
  with an M15-derived current price is displayed.
- `web/app.js` — the comment on `PERIODIC_REFRESH_MS` that reasons about which timeframes the
  skip rule leaves fetching. The timeframe buttons and the default-timeframe choice are
  already driven by `meta.timeframe_order` and need no edit.
- `web/indicators/ob.js` — a header comment records an intraday spot-check performed on
  XAUUSD M15. That is a historical fact about how the port was verified and stays; it does
  not imply the app offers M15.
- `web/index.html` — nothing to change: the **auto 15m** control is the refresh cadence, not
  the timeframe.
- `tests/test_fetch.py`, `tests/test_sync.py`, `tests/test_api.py`,
  `tests/js/run_screener.mjs`, `tests/js/run_render.mjs`, `tests/js/run_scan_cache.mjs`,
  `tests/js/run_settings.mjs` — every M15 fixture and assertion. Several exist to guard
  behaviour that only M15 exhibited (the incremental start outside the 60-day fetch window,
  the full refresh that keeps bars the source can no longer serve); those must be re-pointed
  at a timeframe that still exercises the rule rather than deleted with the timeframe.
- `README.md` — the timeframe table, the "sync M15 every 60 days" warning, and the
  periodic-refresh paragraph that names M15 and H1 as the two that do work.
- Existing databases and snapshots — `m15` rows remain and are ignored. The committed release
  snapshot keeps its M15 history and its size; no migration runs.
