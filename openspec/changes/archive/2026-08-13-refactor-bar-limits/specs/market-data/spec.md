## ADDED Requirements

### Requirement: Fetch depth is fixed per timeframe

Each timeframe SHALL define how deep an initial backfill reaches, as a property of the
timeframe and the source's limits rather than a value the user tunes per run. M15 SHALL
target 1,200 bars, a depth that stays inside Yahoo's 60-day sub-hourly window. H1 SHALL
fetch as deep as the source serves that interval (about 730 days). D1 and W1, which the
source does not cap, SHALL fetch the instrument's full available history. Fetch depth
SHALL NOT be adjustable at sync time; a run either extends the series incrementally or
re-pulls the timeframe's whole fetch window.

#### Scenario: Initial D1 backfill takes the whole history

- **WHEN** a symbol listed since the 1990s is synced for the first time
- **THEN** its D1 series holds every daily bar the source has for it, not a fixed count

#### Scenario: M15 is bounded by the source's sub-hourly window

- **WHEN** a symbol's initial M15 backfill runs
- **THEN** it requests at most 1,200 bars and never a window deeper than the 60-day cap, so the request cannot come back empty for being over-deep

#### Scenario: H1 reaches the source's limit

- **WHEN** a symbol's initial H1 backfill runs
- **THEN** it reaches as far back as the 730-day window allows and stops there

#### Scenario: Depth cannot be set per run

- **WHEN** a sync is triggered from the UI, the command line, or CI
- **THEN** no bar-count target can be supplied, and each timeframe uses its own fetch depth

### Requirement: Stored bars are never deleted

A sync SHALL only add bars and overwrite bars it re-fetched. It SHALL NOT delete stored
bars, so a series only ever grows and history the source can no longer serve is preserved
indefinitely. Consequently a series MAY hold more bars than its fetch depth, and MAY span
further back than the source's own history window.

#### Scenario: M15 accumulates past the source's window

- **WHEN** a symbol is synced regularly over several months
- **THEN** its M15 series retains bars older than 60 days, which the source would no longer return, and keeps growing with each sync

#### Scenario: Repeat syncs never shrink a series

- **WHEN** an incremental sync completes for a symbol
- **THEN** its stored bar count is greater than or equal to what it was before the run, for every timeframe

#### Scenario: A full refresh does not discard older bars

- **WHEN** a full refresh re-pulls a timeframe's fetch window
- **THEN** bars inside the window are refreshed and bars older than the window are left in place

## MODIFIED Requirements

### Requirement: Backfill respects the data source's history limits

Initial backfill SHALL request the depth its timeframe defines, and requests SHALL be
clamped to how far back Yahoo serves the interval (e.g. `1h` is served for at most ~730
days). A request SHALL never ask for more history than the source can return, because
Yahoo answers over-deep requests with an empty frame that is indistinguishable from a dead
symbol.

#### Scenario: H1 backfill stays inside the 730-day cap

- **WHEN** the initial H1 backfill would reach further back than Yahoo serves `1h` data
- **THEN** the request start is clamped inside the cap and the sync succeeds with the bars that are available

#### Scenario: Full-history request avoids the epoch pitfall

- **WHEN** a full refresh requests maximum available history for an unlimited interval
- **THEN** the request start is a fixed early date after 1970, never the Unix epoch itself, which Yahoo treats as unset

### Requirement: Incremental fetches with revision overlap

An incremental sync SHALL request only bars from slightly before the newest stored bar
onward (a small fixed overlap of recent bars), so Yahoo's late revisions to recent candles
overwrite stored values, and repeat syncs stay fast. Only the first sync of a symbol, or an
explicit full refresh, performs the deep backfill pull. The incremental start SHALL NOT be
pushed forward to the fetch window's start, because a series is allowed to extend further
back than that window.

#### Scenario: Repeat sync is small

- **WHEN** a symbol was synced recently and is synced again incrementally
- **THEN** the request covers only the overlap window plus new bars, not the timeframe's full fetch depth

#### Scenario: Revised bar is overwritten

- **WHEN** Yahoo has revised a recent bar that is already stored
- **THEN** after the next sync the stored bar reflects the revised values

#### Scenario: A sync never re-downloads the whole series

- **WHEN** an already-synced symbol is synced without full refresh, however deep its stored series has grown
- **THEN** the request window runs from just before its newest stored bar to the present, and the size of the request does not grow with the stored depth

## REMOVED Requirements

### Requirement: Retention is a fixed bar count per timeframe

**Reason**: The single bar-count target conflated three separate concerns — how deep to
fetch, how much to keep, and (because the chart drew whatever was stored) how much the user
could see. It is replaced by a fixed per-timeframe fetch depth, append-only storage, and a
user-controlled chart display limit. Pruning in particular destroyed bars the source can
never serve again, defeating the purpose of the persisted data snapshot.

**Migration**: No data migration is required — no bars are lost by removing pruning. A
database synced under the old target holds roughly 1,000 bars per timeframe; one full
refresh per symbol deepens it to the new fetch depth. Persisted target settings become
inert and are ignored. Anything that used to raise the target to see more history now sets
the chart's display limit instead, with no refetch.
