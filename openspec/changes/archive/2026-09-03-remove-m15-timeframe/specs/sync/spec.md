## MODIFIED Requirements

### Requirement: A periodic refresh skips timeframes that cannot have a new bar

A periodic refresh SHALL skip any symbol/timeframe where less than one bar's duration has elapsed since its newest stored bar, because the source cannot yet have a bar the system does not already hold: a weekly series is left alone until seven days have passed, a daily series until 24 hours have, an hourly series until an hour has. A skipped timeframe SHALL be reported as skipped in the run's results and SHALL leave its recorded sync state unchanged, so freshness continues to reflect the last run that actually fetched. A manual sync SHALL NOT apply this rule: pressing a sync control always fetches.

Because the finest supported timeframe is hourly while the refresh interval is shorter than an hour, a refresh that finds every timeframe too recent SHALL complete having fetched nothing, reporting every timeframe as skipped. That is a successful run, not a failure or a no-op to be hidden: it SHALL be reported like any other run, and it SHALL NOT leave a symbol looking stale or errored.

#### Scenario: Weekly series left alone

- **WHEN** a periodic refresh runs two days after a symbol's newest stored W1 bar, and more than an hour after its newest stored H1 bar
- **THEN** its W1 timeframe is skipped and reported as skipped, while H1 is still fetched

#### Scenario: Intraday series still refreshed

- **WHEN** a periodic refresh runs 70 minutes after a symbol's newest stored H1 bar
- **THEN** its H1 timeframe is fetched incrementally

#### Scenario: Every timeframe too recent

- **WHEN** a periodic refresh runs 15 minutes after a run that fetched a symbol's H1, D1 and W1 series successfully
- **THEN** all three timeframes are reported skipped, no market-data request is made for that symbol, its recorded sync state is unchanged, and the run reports success

#### Scenario: Never-synced timeframe is not skipped

- **WHEN** a periodic refresh runs for a symbol/timeframe that holds no bars
- **THEN** it is fetched rather than skipped, because there is no newest bar to measure against

#### Scenario: Manual sync ignores the rule

- **WHEN** the user presses a sync control moments after a successful sync
- **THEN** every timeframe is fetched, with no timeframe skipped for being too recent
