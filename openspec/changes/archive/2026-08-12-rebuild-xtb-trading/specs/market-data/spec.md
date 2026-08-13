# Delta Spec: market-data

## Purpose

Covers fetching OHLC bars from Yahoo Finance, persisting and querying them locally, and the bar-count-based retention rules that guarantee indicators always have enough history.

## ADDED Requirements

### Requirement: Supported timeframes

The system SHALL store bars for four timeframes, all fetched directly from the source: M15 (Yahoo interval `15m`), H1 (`1h`), D1 (`1d`), and W1 (`1wk`). No timeframe is derived locally. M15 is the only sub-hourly timeframe and carries a documented trade-off: Yahoo caps sub-hourly history at 60 days, so a gap older than 60 days can never be backfilled. No interval finer than M15 SHALL be offered.

#### Scenario: M15 gap risk is accepted, not hidden

- **WHEN** a symbol is synced more than 60 days after its previous M15 sync
- **THEN** the M15 series has a permanent gap for the uncovered period, while H1, D1, and W1 backfill completely

### Requirement: Retention is a fixed bar count per timeframe

Each timeframe SHALL define retention as a fixed number of bars per symbol, not a number of calendar days. The default target SHALL be 1,000 bars on every timeframe — the largest indicator warm-up currently required (EMA 377 needs 380 bars) plus a deep scannable region. The target SHALL be adjustable at sync time and persist as the effective target until changed again, clamped to a range the source can honor: never below the 1,000-bar floor, and never above a per-timeframe hard maximum that respects Yahoo's limits (M15 capped by the 60-day sub-hourly window, H1 by the 730-day window; D1 and W1, which Yahoo does not cap, get generous fixed ceilings). Because indicators scan the entire stored series, the retention target directly determines how deep indicator signals reach. After each sync, bars beyond the effective target SHALL be pruned oldest-first.

#### Scenario: D1 holds enough bars for EMA 377

- **WHEN** a symbol has completed its initial sync with default settings
- **THEN** its D1 series contains 1,000 bars, clearing the 380-bar EMA 377 warm-up that day-based retention (~260 trading bars per year) could not

#### Scenario: Requested target exceeds the source's limit

- **WHEN** a sync run is requested with an M15 target of 5,000 bars
- **THEN** the target is clamped to M15's hard maximum (what the 60-day window can supply) and the run proceeds rather than failing

#### Scenario: Raising the target on a later sync

- **WHEN** a sync runs with a larger bar target than an already-synced symbol holds
- **THEN** the backfill extends past the incremental window to fetch the deficit, within the source's history caps

#### Scenario: M15 is best-effort toward its target

- **WHEN** a symbol's initial M15 backfill runs against the 60-day source cap
- **THEN** the series holds every bar the cap allows (roughly 1,000–1,400 depending on session length), which clears the FVG warm-up even when it falls short of the 1,000-bar target

#### Scenario: Pruning beyond the target

- **WHEN** a sync leaves a symbol/timeframe with more bars than its retention target
- **THEN** the oldest excess bars are removed and the newest target-count bars are kept

### Requirement: Backfill respects the data source's history limits

Initial backfill SHALL request enough history to reach each timeframe's bar-count target, and requests SHALL be clamped to how far back Yahoo serves the interval (e.g. `1h` is served for at most ~730 days). A request SHALL never ask for more history than the source can return, because Yahoo answers over-deep requests with an empty frame that is indistinguishable from a dead symbol.

#### Scenario: H1 backfill stays inside the 730-day cap

- **WHEN** the initial H1 backfill would need to reach further back than Yahoo serves `1h` data
- **THEN** the request start is clamped inside the cap and the sync succeeds with the bars that are available

#### Scenario: Full-history request avoids the epoch pitfall

- **WHEN** a full refresh requests maximum available history for an unlimited interval
- **THEN** the request start is a fixed early date after 1970, never the Unix epoch itself, which Yahoo treats as unset

### Requirement: Timestamps are UTC epoch seconds with session-date pinning

All stored bar timestamps SHALL be UTC epoch seconds. Intraday bars keep their true UTC instant. Daily and weekly bars SHALL be pinned to UTC midnight of the exchange-local session date, because Yahoo stamps them at local midnight (22:00 UTC the prior day for Xetra), which would label every daily candle with the previous day's date.

#### Scenario: Xetra daily bar

- **WHEN** Yahoo returns a daily bar for a Xetra-listed instrument stamped 2026-03-09 22:00 UTC (local midnight 2026-03-10)
- **THEN** the bar is stored at 2026-03-10 00:00 UTC

### Requirement: Prices are stored unadjusted

Bars SHALL be stored with unadjusted prices (no dividend/split adjustment), matching what XTB and MT5 display. When the catalog declares a price divisor for an instrument (e.g. pence-quoted tickers), it SHALL be applied on ingest.

#### Scenario: Pence-quoted instrument

- **WHEN** an instrument's catalog entry declares a price divisor of 100
- **THEN** stored prices are the fetched values divided by 100

### Requirement: Incremental fetches with revision overlap

An incremental sync SHALL request only bars from slightly before the newest stored bar onward (a small fixed overlap of recent bars), so Yahoo's late revisions to recent candles overwrite stored values, and repeat syncs stay fast. Only the first sync of a symbol performs the long backfill pull.

#### Scenario: Repeat sync is small

- **WHEN** a symbol was synced recently and is synced again incrementally
- **THEN** the request covers only the overlap window plus new bars, not the full retention depth

#### Scenario: Revised bar is overwritten

- **WHEN** Yahoo has revised a recent bar that is already stored
- **THEN** after the next sync the stored bar reflects the revised values

### Requirement: Empty responses are disambiguated

When a fetch returns no bars, the system SHALL distinguish a dead or mistyped ticker from a live instrument with no new bars, using instrument metadata from the same response, and SHALL report the dead-ticker case as an error naming the symbol.

#### Scenario: Delisted or wrong ticker

- **WHEN** a fetch returns no bars and the source has no metadata for the ticker
- **THEN** the sync records an error for that symbol suggesting the ticker may be wrong or delisted

#### Scenario: No new bars

- **WHEN** a fetch returns no bars but the source knows the instrument
- **THEN** the sync records success with a "no new bars" note and the observed currency
