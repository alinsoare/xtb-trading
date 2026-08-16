## MODIFIED Requirements

### Requirement: Screening signals and score

An instrument's score SHALL be the sum of five components, to a maximum of 8:

- **1 point** — the instrument passes the screening gate.
- **2 points** — the current price is inside a live D1 bullish fair-value gap **and** the last
  completed H1 bar is bullish.
- **1 point** — the current price is inside a live H1 bullish fair-value gap **and** the last
  completed M15 bar is bullish.
- **1 point** — the D1 MACD histogram forms a **red morning star** over the last three completed
  bars: the middle value is strictly below both neighbours — `histogram[-3] > histogram[-2]` and
  `histogram[-2] < histogram[-1]` — **and** all three values are strictly below zero, so all three
  bars are painted in the histogram's negative colour. This rewards the earliest turn of a
  down-leg, while momentum is still negative, rather than a rise that has already carried the
  histogram above zero.
- **0 to 3 points** — the distance up to the last confirmed D1 high pivot, measured as
  `(pivot high − price) / price`: no points at 2% or less, 1 point above 2% up to 5%, 2 points
  above 5% up to 10%, and 3 points above 10%. Only confirmed pivots count; a pending one is
  ignored.

The four signal components SHALL only be evaluated for an instrument that passed the gate, so a
gated-out instrument scores 0 and no component of it is reported.

The run conditions SHALL be evaluated through the shared bullish-run convention with a required
length of one, so the forming bar is still excluded and a doji immediately before it is still
neutral rather than counting as bullish.

The MACD comparisons SHALL be strict, so a flat pair anywhere in the three-bar window fails the
pattern, and the below-zero condition SHALL be strict as well, so a histogram value of exactly
zero is not a negative bar. The three bars SHALL be read through the shared forming-bar
convention, so the newest stored bar never participates.

These signals SHALL be computed by the same fair-value-gap, MACD and swing-structure logic the
chart indicators use, so a mark can always be reproduced by opening the chart. In particular the
three histogram bars a user counts as red on the chart SHALL be exactly the three the score
judged.

Alongside the score, the screener SHALL record which rules fired and how many points each
contributed, so any mark can be audited without re-deriving it. The MACD component's recorded
reason SHALL name the pattern it now detects rather than describing an ascending histogram.

#### Scenario: Full confluence

- **WHEN** an instrument passes the gate, price is inside a live D1 bullish gap with the last completed H1 bar bullish, inside a live H1 bullish gap with the last completed M15 bar bullish, the D1 MACD histogram forms a red morning star, and the last confirmed D1 high pivot is 14% above price
- **THEN** the score is 8 and the recorded reasons list all five components with 1, 2, 1, 1 and 3 points

#### Scenario: Containment without the run

- **WHEN** price is inside a live D1 bullish gap but the last completed H1 bar is bearish
- **THEN** that rule contributes nothing, because containment and the run are one combined signal

#### Scenario: One bullish bar is enough

- **WHEN** price is inside a live D1 bullish gap, the last completed H1 bar is bullish, and the two completed H1 bars before it are bearish
- **THEN** that rule contributes 2 points, because only the last completed bar is examined

#### Scenario: A doji is skipped rather than counted

- **WHEN** price is inside a live H1 bullish gap and the last completed M15 bar is a doji whose predecessor is bullish
- **THEN** that rule contributes 1 point, because the doji is skipped and the bullish bar behind it satisfies the run

#### Scenario: Pivot band boundaries

- **WHEN** the last confirmed D1 high pivot is exactly 5% above price
- **THEN** the pivot signal contributes 1 point, the band boundary belonging to the lower band

#### Scenario: A negative-territory trough counts

- **WHEN** the last three completed D1 MACD histogram values are −0.42, −0.61 and −0.35
- **THEN** the MACD signal contributes 1 point, because the middle value is the lowest of the three
  and all three are below zero

#### Scenario: A rising histogram above zero no longer counts

- **WHEN** the last three completed D1 MACD histogram values are 0.10, 0.20 and 0.30
- **THEN** the MACD signal contributes nothing, because the values are not below zero and the
  middle one is not a trough

#### Scenario: A trough that has crossed above zero does not count

- **WHEN** the last three completed D1 MACD histogram values are −0.15, −0.05 and 0.08
- **THEN** the MACD signal contributes nothing, because the newest value is not below zero, however
  well the shape fits

#### Scenario: A still-falling histogram does not count

- **WHEN** the last three completed D1 MACD histogram values are −0.20, −0.40 and −0.60
- **THEN** the MACD signal contributes nothing, because the middle value is not below the newest one

#### Scenario: A flat histogram does not count

- **WHEN** two of the last three completed D1 MACD histogram values are equal and all three are
  below zero
- **THEN** the MACD signal contributes nothing, because both comparisons must be strict

#### Scenario: Zero is not a red bar

- **WHEN** the last three completed D1 MACD histogram values are −0.10, −0.30 and exactly 0
- **THEN** the MACD signal contributes nothing, because a value of zero is not below zero

#### Scenario: A mark is auditable

- **WHEN** an instrument is marked
- **THEN** the rules that fired and their points are available to the user without opening the chart
