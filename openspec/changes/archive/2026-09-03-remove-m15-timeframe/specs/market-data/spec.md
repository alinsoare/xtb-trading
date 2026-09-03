## ADDED Requirements

### Requirement: Supported timeframes are H1, D1 and W1

The system SHALL store bars for three timeframes, all fetched directly from the source: H1 (Yahoo interval `1h`), D1 (`1d`), and W1 (`1wk`). No timeframe is derived locally. No interval finer than H1 SHALL be offered.

Every supported timeframe SHALL be one the source can backfill completely within its own history window, so no supported series carries a risk of permanently unbackfillable gaps. A sub-hourly timeframe SHALL NOT be offered, because the source caps sub-hourly history at 60 days and a gap older than that could never be repaired.

A request naming a timeframe the system does not support SHALL be refused as unknown, naming the supported set, rather than answered with an empty series.

#### Scenario: The finest offered interval is hourly

- **WHEN** a caller enumerates the supported timeframes
- **THEN** it receives H1, D1 and W1, and no sub-hourly interval

#### Scenario: Every supported series backfills completely

- **WHEN** a symbol is synced for the first time after an arbitrarily long idle period
- **THEN** H1, D1 and W1 each backfill to their own fetch depth with no gap the source is unable to serve

#### Scenario: A retired timeframe is refused, not empty

- **WHEN** a candles request names the retired `m15` timeframe
- **THEN** it is refused as an unknown timeframe naming H1, D1 and W1, rather than answered with an empty bar series

### Requirement: Fetch depth is a property of the timeframe

Each timeframe SHALL define how deep an initial backfill reaches, as a property of the timeframe and the source's limits rather than a value the user tunes per run. H1 SHALL fetch as deep as the source serves that interval (about 730 days). D1 and W1, which the source does not cap, SHALL fetch the instrument's full available history. Fetch depth SHALL NOT be adjustable at sync time; a run either extends the series incrementally or re-pulls the timeframe's whole fetch window.

No timeframe's fetch depth SHALL be expressed as a fixed bar count, because every supported timeframe is bounded either by the source's own history window or by the instrument's full history.

#### Scenario: Initial D1 backfill takes the whole history

- **WHEN** a symbol listed since the 1990s is synced for the first time
- **THEN** its D1 series holds every daily bar the source has for it, not a fixed count

#### Scenario: H1 reaches the source's limit

- **WHEN** a symbol's initial H1 backfill runs
- **THEN** it reaches as far back as the 730-day window allows and stops there

#### Scenario: No timeframe carries a bar-count depth

- **WHEN** a caller reads how deep each timeframe backfills
- **THEN** every timeframe's depth is either the source's history window for its interval or the instrument's full history, and none is a fixed number of bars

#### Scenario: Depth cannot be set per run

- **WHEN** a sync is triggered from the UI, the command line, or CI
- **THEN** no bar-count target can be supplied, and each timeframe uses its own fetch depth

### Requirement: Stored bars are never deleted, retired timeframes included

A sync SHALL only add bars and overwrite bars it re-fetched. It SHALL NOT delete stored bars, so a series only ever grows and history the source can no longer serve is preserved indefinitely. Consequently a series MAY hold more bars than its fetch depth, and MAY span further back than the source's own history window.

Bars stored under a timeframe the system no longer supports SHALL likewise be retained rather than deleted, and SHALL be inert: never fetched, never served, never exported, and never read by any screening or charting path. Retiring a timeframe SHALL NOT require a destructive migration of an existing store or a published snapshot.

#### Scenario: H1 accumulates past the source's window

- **WHEN** a symbol is synced regularly over several years
- **THEN** its H1 series retains bars older than 730 days, which the source would no longer return, and keeps growing with each sync

#### Scenario: Repeat syncs never shrink a series

- **WHEN** an incremental sync completes for a symbol
- **THEN** its stored bar count is greater than or equal to what it was before the run, for every timeframe

#### Scenario: A full refresh does not discard older bars

- **WHEN** a full refresh re-pulls a timeframe's fetch window
- **THEN** bars inside the window are refreshed and bars older than the window are left in place

#### Scenario: Rows of a retired timeframe survive and stay unread

- **WHEN** a store that already holds `m15` bars is synced, served and exported after M15 was retired
- **THEN** those rows are still present afterwards, no request fetched them, and no catalog manifest, candles file, screening payload or chart reports them

## REMOVED Requirements

### Requirement: Supported timeframes

**Reason**: It defines the supported set as four timeframes including M15, and carries the sub-hourly trade-off — Yahoo's 60-day cap on `15m` history and the permanent gap that follows from it — as an accepted property of the system. With M15 retired there is no sub-hourly timeframe and therefore no such trade-off to accept.

**Migration**: Replaced by "Supported timeframes are H1, D1 and W1", which states the three-timeframe set, requires every supported timeframe to be completely backfillable, and rules out a sub-hourly interval for the reason the old requirement merely tolerated. Callers that requested `m15` receive an unknown-timeframe refusal naming the supported set.

### Requirement: Fetch depth is fixed per timeframe

**Reason**: Its depth table opens with M15's 1,200-bar target, and its worked scenario exists to show that target staying inside the source's 60-day sub-hourly window. Both describe a timeframe the system no longer supports, and no remaining timeframe expresses its depth as a bar count.

**Migration**: Replaced by "Fetch depth is a property of the timeframe", which keeps the H1, D1 and W1 depths and the refusal of per-run depth parameters unchanged, and states that no timeframe's depth is a bar count.

### Requirement: Stored bars are never deleted

**Reason**: The append-only guarantee itself is unchanged, but the requirement's worked scenario demonstrates it on M15 accumulating past the source's 60-day window, and the requirement says nothing about bars already stored under a timeframe that is later retired — the case this change creates.

**Migration**: Replaced by "Stored bars are never deleted, retired timeframes included", which restates the same guarantee on H1 and adds that rows of a retired timeframe are retained and inert, so no destructive migration of an existing store or published snapshot is needed.
