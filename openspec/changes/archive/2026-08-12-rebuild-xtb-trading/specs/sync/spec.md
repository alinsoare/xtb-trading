# Delta Spec: sync

## Purpose

Covers the orchestration of a sync run: it happens only on explicit user action, isolates per-symbol failures, respects the data source's rate limits, and exposes progress the UI can follow.

## ADDED Requirements

### Requirement: Sync runs only on explicit user action

A sync SHALL start only because the user explicitly triggered one. The system SHALL NOT schedule syncs, run them on a timer, auto-sync at startup, or fetch market data as a side effect of loading or viewing a chart. In CI, the release workflow's manual dispatch counts as the explicit user action.

#### Scenario: Viewing a chart is offline

- **WHEN** the user opens the app and browses charts without pressing a sync control
- **THEN** no request is made to the market data source

### Requirement: One sync at a time

At most one sync SHALL run at a time. A trigger arriving while a sync is running SHALL be rejected with a clear conflict signal rather than queued.

#### Scenario: Concurrent trigger rejected

- **WHEN** the user triggers a sync while one is already running
- **THEN** the request is rejected with a conflict response and the running sync is unaffected

### Requirement: Sync scope selection

The user SHALL be able to sync all enabled instruments or a chosen subset, and to choose between an incremental run and a full refresh that re-pulls each timeframe's whole retention window. A sync run MAY additionally adjust the per-timeframe bar-count target; adjustments are clamped to the configured floor and per-timeframe hard maxima, and the adjusted value persists as the effective target for subsequent runs until changed again — so deeper history fetched under a raised target is not pruned away by the next plain sync.

#### Scenario: Sync a single symbol

- **WHEN** the user triggers a sync for one selected symbol
- **THEN** only that symbol is fetched and updated

#### Scenario: Full refresh

- **WHEN** the user triggers a sync with the full-refresh option
- **THEN** each timeframe is re-requested from the start of its retention window rather than incrementally

#### Scenario: Bar-target adjustment persists

- **WHEN** the user triggers a sync with a D1 target of 2,000 bars
- **THEN** the run backfills and retains up to 2,000 D1 bars, and 2,000 remains the effective D1 target for later runs until the user changes it again

### Requirement: Per-symbol failure isolation

A failure while syncing one symbol SHALL NOT abort the run. The error SHALL be recorded against that symbol and the run SHALL continue with the remaining symbols.

#### Scenario: One bad ticker among many

- **WHEN** one symbol's fetch fails during a multi-symbol sync
- **THEN** the remaining symbols still sync, and the run's results show that symbol with an error status and message

### Requirement: Rate-limit resilience

The system SHALL retry rate-limited fetches with increasing backoff, and SHALL pause between batches of symbols during a multi-symbol run to stay under the source's limits.

#### Scenario: Rate-limited fetch recovers

- **WHEN** the data source responds with a rate-limit error
- **THEN** the fetch is retried after a backoff delay, and only after the retry budget is exhausted is the symbol marked failed

### Requirement: Observable progress

While a sync runs, the system SHALL expose its progress: whether a run is active, totals and completed counts, the symbol currently being processed, and per-symbol results (status, bars written, messages). The UI SHALL be able to poll this state; polling progress is not a market-data fetch.

#### Scenario: UI follows a running sync

- **WHEN** the user triggers a sync from the UI
- **THEN** the UI shows a progress indicator advancing per symbol and a completion summary including any per-symbol errors

### Requirement: Sync state recorded per symbol and timeframe

After each symbol/timeframe is processed, the system SHALL record the sync time, outcome status, message, newest bar timestamp, and observed quote currency, and SHALL surface this state alongside the catalog so the user can see what is fresh and what failed.

#### Scenario: Catalog shows sync freshness

- **WHEN** the user views the symbol browser after a sync
- **THEN** each instrument shows its bar counts and last successful sync time, and failed timeframes show their error state
