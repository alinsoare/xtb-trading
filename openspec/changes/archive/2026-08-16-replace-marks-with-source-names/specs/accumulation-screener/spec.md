## ADDED Requirements

### Requirement: Sources are named beneath the marks

A screened instrument SHALL name the short source label for every rule the screener recorded as
fired, on a line beneath its graded marks, in the order the rules were recorded. Two instruments on
the same score SHALL be distinguishable by which sources they name even when their mark count matches.

Each recorded reason SHALL carry a short `source` name alongside the rule wording and the points
already recorded for it. The names SHALL be distinct from one another and stable across scans. A name
SHALL NOT restate the points it earned; the points remain part of the on-demand audit on the marks.

The source names SHALL be presented uniformly: no name SHALL be sized, coloured or ordered to suggest
it weighs more than another. An instrument that is gated out, cannot be screened, or scores zero
SHALL name no source and carry no mark; because passing the gate is worth a point and is recorded as
a reason, a screened instrument always names at least its eligibility gate and carries at least one
mark.

The graded mark buckets and the "Marks are graded, not ranked" requirement SHALL remain unchanged.

#### Scenario: Equal scores, different sources

- **WHEN** one instrument scores 4 from the eligibility gate and a D1 gap with an H1 run, and another scores 4 from the eligibility gate and a pivot 3 points distant
- **THEN** both carry two marks, the first names the gate and the D1 gap source, the second names the gate and the pivot source, and neither row can be mistaken for the other

#### Scenario: Full confluence names every source

- **WHEN** an instrument passes the gate and all four signal components fire
- **THEN** it carries four marks and names five sources — the eligibility gate, the D1 gap with H1 run, the H1 gap with M15 run, the MACD pattern and the pivot distance — in the order the reasons were recorded

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
