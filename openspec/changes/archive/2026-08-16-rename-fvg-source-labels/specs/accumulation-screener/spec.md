## MODIFIED Requirements

### Requirement: Sources are named beneath the marks

A screened instrument SHALL name the short source label for every rule the screener recorded as
fired, on a line beneath its graded marks, in the order the rules were recorded. Two instruments on
the same score SHALL be distinguishable by which sources they name even when their mark count matches.

Each recorded reason SHALL carry a short `source` name alongside the rule wording and the points
already recorded for it. The names SHALL be distinct from one another and stable across scans. A name
SHALL NOT restate the points it earned; the points remain part of the on-demand audit on the marks.

A source whose rule turns on a fair value gap SHALL be named by the gap indicator followed by the
timeframe of the gap itself, and SHALL NOT name the timeframe of the bullish run that confirmed it:
the D1-gap component is named `FVG D1` and the H1-gap component is named `FVG H1`. The confirming
run remains part of the rule wording reachable through the on-demand audit on the marks. The
remaining sources — the eligibility gate, the MACD pattern and the pivot distance — keep their
existing one-word names.

The source names SHALL be presented uniformly: no name SHALL be sized, coloured or ordered to suggest
it weighs more than another. An instrument that is gated out, cannot be screened, or scores zero
SHALL name no source and carry no mark; because passing the gate is worth a point and is recorded as
a reason, a screened instrument always names at least its eligibility gate and carries at least one
mark.

The graded mark buckets and the "Marks are graded, not ranked" requirement SHALL remain unchanged.
Renaming a source SHALL NOT change any component's weight, the score an instrument earns, the number
of marks it carries, the order its reasons are recorded in, or the rule wording shown in the audit.

A result carried over from before a source was renamed SHALL NOT be shown under its old name; such a
result SHALL be recomputed before it is displayed, without requiring the user to sync.

#### Scenario: Gap sources name the gap's own timeframe

- **WHEN** an instrument passes the gate, has a live D1 gap confirmed by an H1 bullish run, and has a live H1 gap confirmed by an M15 bullish run
- **THEN** its source line names `FVG D1` and `FVG H1`, neither name mentions the confirming run's timeframe, and the two names remain distinct from one another

#### Scenario: The confirming run stays in the audit

- **WHEN** the user audits the marks on a row that names `FVG H1`
- **THEN** the rule wording shown states that an H1 gap was confirmed by an M15 bullish run, and the points it contributed are unchanged

#### Scenario: Other sources are untouched

- **WHEN** the eligibility gate, the MACD pattern or the pivot distance is among the fired rules
- **THEN** each is named exactly as it was before the gap sources were renamed

#### Scenario: A carried-over result is not shown under an old name

- **WHEN** a previously computed result recorded a gap source under its former name and the user opens the list without syncing
- **THEN** that result is recomputed and its gap sources are named `FVG D1` and `FVG H1`, and no row shows a former name

#### Scenario: Equal scores, different sources

- **WHEN** one instrument scores 4 from the eligibility gate and a D1 gap with an H1 run, and another scores 4 from the eligibility gate and a pivot 3 points distant
- **THEN** both carry two marks, the first names the gate and the D1 gap source, the second names the gate and the pivot source, and neither row can be mistaken for the other

#### Scenario: Full confluence names every source

- **WHEN** an instrument passes the gate and all four signal components fire
- **THEN** it carries four marks and names five sources — the eligibility gate, the D1 gap, the H1 gap, the MACD pattern and the pivot distance — in the order the reasons were recorded

#### Scenario: A gated-in instrument with no signal still names its gate

- **WHEN** an instrument passes the gate and no signal component fires
- **THEN** it carries one mark and names the eligibility gate alone, standing for its score of 1

#### Scenario: A gated-out instrument names nothing

- **WHEN** an instrument fails the eligibility gate
- **THEN** it carries no mark, names no source, and its range and position figures are still shown

#### Scenario: Points stay in the audit

- **WHEN** the user reads a row that names the pivot source
- **THEN** the source line does not state how many points the pivot contributed, and that number is still reachable through the on-demand audit on the marks

#### Scenario: Marks unchanged

- **WHEN** four instruments score 2, 3, 6 and 7
- **THEN** they still carry one, two, three and four marks respectively, and additionally name their contributing sources on the line beneath
