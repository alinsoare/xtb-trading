## MODIFIED Requirements

### Requirement: MACD parity with the MT5 original

The MACD computation SHALL preserve the numeric conventions `SimpleMACD.mq5` depends on, because deviations shift every value:

- both price EMAs SHALL be seeded with the SMA of the first `period` applied-price values, so the fast EMA's first defined value sits at index `fastPeriod − 1` and the slow EMA's at index `slowPeriod − 1`;
- the main line SHALL be defined from index `slowPeriod − 1` onward and undefined before it;
- the signal EMA SHALL be seeded with the SMA of the first `signalPeriod` **defined** main-line values — that is, its SMA window starts at the main line's own first defined index, not at the start of the series — so the signal line's and the histogram's first defined value sits at index `slowPeriod − 1 + signalPeriod − 1`;
- the histogram SHALL be undefined wherever the signal line is undefined.

With the configured 13/34/9, this places the main line's first defined value at index 33 and the histogram's at index 41.

Parity SHALL be verified numerically against the reference computation over a deterministic bar series rather than by review, comparing the main, signal and histogram arrays value by value within a floating-point tolerance, and comparing the first defined index of each array exactly.

The reference values SHALL come from the MT5 original itself, exported from a terminal running `SimpleMACD` at the configured periods and applied price, and SHALL be committed to the repository as a fixture alongside the bar window they were computed over. Running the parity check SHALL therefore require nothing beyond a clone of the repository: no MT5 install, no terminal, and no regeneration step. This is the same arrangement the OB indicator's parity check already uses, and it is what makes the check available to a contributor or a CI run that has no access to MT5.

The exported bar window SHALL be bounded to a fixed recent count of bars rather than the terminal's entire history, and the window actually used — its bar count and its oldest and newest bar times — SHALL be recorded inside the fixture. The bound keeps the committed artifact small enough to live in the repository, and the recorded window makes a later regeneration comparable to the one it replaces.

When no committed fixture is present, the parity check SHALL fail with a message naming the directory it looked in and the regeneration path, rather than aborting with an unhandled error. A fixture that has gone missing is a defect in the test suite's packaging and SHALL read as one.

Two departures from the source SHALL be sanctioned, and no others: the applied price is fixed to typical price and the periods to 13/34/9 rather than being user inputs, and the signal line is never drawn rather than being toggleable.

#### Scenario: EMA seeding

- **WHEN** the slow EMA is computed over the applied-price series
- **THEN** its first defined value at index 33 equals the arithmetic mean of the first 34 typical prices, and values before that index are undefined

#### Scenario: Signal EMA seeds from the main line's first defined value

- **WHEN** the signal EMA is computed over the main line
- **THEN** its first defined value at index 41 equals the arithmetic mean of the main line's values at indices 33 through 41, and values before index 41 are undefined

#### Scenario: Arrays compared against the reference

- **WHEN** the fixtures are regenerated from the reference computation
- **THEN** the main, signal and histogram arrays match value by value within tolerance and their first defined indices match exactly

#### Scenario: Parity check runs from a clean clone

- **WHEN** the parity check is run in a checkout that has never had an MT5 terminal available
- **THEN** it finds at least one committed fixture, compares against it, and reports a pass or a numeric failure — it does not report the fixture as unavailable

#### Scenario: Fixture records its bar window

- **WHEN** the committed fixture is inspected
- **THEN** it states the bar count and the oldest and newest bar times it was exported over, and that count is the bounded export count rather than the terminal's full history

#### Scenario: Missing fixture reads as a fixture problem

- **WHEN** the parity check runs with no fixture directory or an empty one
- **THEN** it fails with a message naming the expected fixture location and how to regenerate, and not with an unhandled file-system error
