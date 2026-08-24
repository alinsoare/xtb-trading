## MODIFIED Requirements

### Requirement: MACD parity with the MT5 original

The MACD computation SHALL preserve the numeric conventions `SimpleMACD.mq5` depends on, because deviations shift every value:

- both price EMAs SHALL be seeded with the SMA of the first `period` applied-price values, so the fast EMA's first defined value sits at index `fastPeriod − 1` and the slow EMA's at index `slowPeriod − 1`;
- the main line SHALL be defined from index `slowPeriod − 1` onward and undefined before it;
- the signal EMA SHALL be seeded with the SMA of the first `signalPeriod` **defined** main-line values — that is, its SMA window starts at the main line's own first defined index, not at the start of the series — so the signal line's and the histogram's first defined value sits at index `slowPeriod − 1 + signalPeriod − 1`;
- the histogram SHALL be undefined wherever the signal line is undefined.

With the configured 13/34/9, this places the main line's first defined value at index 33 and the histogram's at index 41.

Parity SHALL be verified numerically against the reference computation over a deterministic bar series rather than by review, comparing the main, signal and histogram arrays value by value within a floating-point tolerance, and comparing the first defined index of each array exactly.

The reference values SHALL be produced entirely within this repository: a reference computation of the conventions above, over a deterministic bar series the repository itself constructs, committed as a fixture. Producing them SHALL require no MT5 install, no terminal, no market data and no network access, so that regenerating the fixture is a command any contributor or CI run can execute rather than a manual step at one machine. Running the parity check SHALL likewise require nothing beyond a clone of the repository.

The reference computation SHALL be written independently of the indicator's own implementation and SHALL NOT call into it, so that the comparison has two implementations to disagree. Because both are transcriptions of the same source, the check SHALL additionally assert values derivable from the conventions above without either implementation — the SMA-seeded first defined value of each array, and the first defined indices exactly — so that a shared misreading of the seeding or of the warm-up boundaries cannot pass. What this establishes SHALL be understood as: the port's numeric conventions are pinned against regression and against the stated seeding arithmetic. It SHALL NOT be claimed to re-derive agreement with a running MT5 terminal; that agreement was established once against the original and is upheld by the conventions this requirement states, not by the fixture.

The fixture SHALL record everything needed to reproduce it — the generator inputs that determine the bar series, the bar window it covers (its bar count and its oldest and newest bar times), and the periods used — and regenerating it against an unchanged implementation SHALL reproduce the committed file exactly, so that a fixture appearing in a diff means something the check covers has changed.

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

#### Scenario: Fixture is regenerated without a terminal

- **WHEN** a contributor with no MT5 install, no market-data access and no network connection regenerates the fixture
- **THEN** the generation succeeds from the repository alone, producing the same fixture the repository already holds

#### Scenario: Fixture records its bar window

- **WHEN** the committed fixture is inspected
- **THEN** it states the bar count and the oldest and newest bar times it was computed over, together with the generator inputs and periods that reproduce that series, so a later regeneration can be shown to describe the same window

#### Scenario: Regeneration is a no-op against an unchanged port

- **WHEN** the fixture is regenerated with neither the reference computation, the generator inputs nor the indicator changed
- **THEN** the committed file is unchanged, so the working tree stays clean

#### Scenario: Reference is not the port under test

- **WHEN** the reference values are produced
- **THEN** they come from a computation that does not call into the indicator's own implementation, and the fixture additionally carries first defined indices and SMA-seeded first values that follow from the stated conventions alone

#### Scenario: Seeding regression is caught

- **WHEN** the indicator is changed to seed either price EMA from its first value instead of the SMA of the first `period` values
- **THEN** the parity check fails, naming a differing index rather than passing on a shifted series

#### Scenario: Missing fixture reads as a fixture problem

- **WHEN** the parity check runs with no fixture directory or an empty one
- **THEN** it fails with a message naming the expected fixture location and how to regenerate it in-repo, and not with an unhandled file-system error
