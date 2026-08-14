## MODIFIED Requirements

### Requirement: Screening gate

An instrument SHALL only be eligible for a score when both conditions hold over its 30-day
window:

- the range, measured as `(highest high − lowest low) / lowest low`, is at least 3%; and
- the current price is below the window's highest high discounted by 2%, that is
  `price < highest high × (1 − 0.02)`.

The second condition SHALL be judged against the peak alone, not against where price sits
between the window's extremes, so an instrument that has pulled back from its 30-day peak is
eligible however far above the window's low it still trades.

Passing the gate SHALL itself contribute 1 point to the instrument's score, recorded as a rule
that fired like any other scored component. The gate SHALL remain a hard gate as well: an
instrument failing either condition SHALL score nothing and carry no mark, however many signals
would otherwise fire. Its range and position figures SHALL still be reported, so a missing mark
is legible rather than looking like an absent computation. The position figure is reported for
context only and SHALL NOT decide eligibility.

#### Scenario: Too quiet to be worth flagging

- **WHEN** an instrument's 30-day range is 1.5% and price sits at the bottom of it
- **THEN** it carries no mark, and its range and position figures are still shown

#### Scenario: Not far enough below the peak

- **WHEN** an instrument's 30-day range is 12% and price is 1% below the window's highest high
- **THEN** it carries no mark, and its range and position figures are still shown

#### Scenario: Not low in its range

- **WHEN** an instrument's 30-day range is 12% and price sits at 60% of it
- **THEN** it is scored against the screening signals, because where price sits between the
  window's extremes no longer decides eligibility

#### Scenario: Pulled back from the peak but high in its range

- **WHEN** an instrument's 30-day highest high is 19.31 and the current price is 18.21, which is
  5.7% below the peak and 37.7% of the way up the range
- **THEN** it is scored against the screening signals, because only the discount from the peak
  is judged

#### Scenario: Discount boundary

- **WHEN** the current price is exactly the window's highest high minus 2% of that high
- **THEN** it carries no mark, because the price must be strictly below the discounted peak

#### Scenario: Eligible

- **WHEN** an instrument's 30-day range is 8% and price is 6% below the window's highest high
- **THEN** it is scored against the screening signals

#### Scenario: Passing the gate is worth a point

- **WHEN** an instrument passes the gate and no other screening signal fires
- **THEN** its score is 1, and the recorded reasons name the eligibility gate with 1 point

### Requirement: Screening signals and score

An instrument's score SHALL be the sum of five components, to a maximum of 8:

- **1 point** — the instrument passes the screening gate.
- **2 points** — the current price is inside a live D1 bullish fair-value gap **and** the last
  completed H1 bar is bullish.
- **1 point** — the current price is inside a live H1 bullish fair-value gap **and** the last
  completed M15 bar is bullish.
- **1 point** — the D1 MACD histogram is rising over the last three completed bars, each value
  strictly greater than the one before it.
- **0 to 3 points** — the distance up to the last confirmed D1 high pivot, measured as
  `(pivot high − price) / price`: no points at 2% or less, 1 point above 2% up to 5%, 2 points
  above 5% up to 10%, and 3 points above 10%. Only confirmed pivots count; a pending one is
  ignored.

The four signal components SHALL only be evaluated for an instrument that passed the gate, so a
gated-out instrument scores 0 and no component of it is reported.

The run conditions SHALL be evaluated through the shared bullish-run convention with a required
length of one, so the forming bar is still excluded and a doji immediately before it is still
neutral rather than counting as bullish.

These signals SHALL be computed by the same fair-value-gap, MACD and swing-structure logic the
chart indicators use, so a mark can always be reproduced by opening the chart.

Alongside the score, the screener SHALL record which rules fired and how many points each
contributed, so any mark can be audited without re-deriving it.

#### Scenario: Full confluence

- **WHEN** an instrument passes the gate, price is inside a live D1 bullish gap with the last completed H1 bar bullish, inside a live H1 bullish gap with the last completed M15 bar bullish, the D1 MACD histogram is rising, and the last confirmed D1 high pivot is 14% above price
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

#### Scenario: A flat histogram does not count

- **WHEN** two of the last three completed D1 MACD histogram values are equal
- **THEN** the MACD signal contributes nothing, because the values must strictly rise

#### Scenario: A mark is auditable

- **WHEN** an instrument is marked
- **THEN** the rules that fired and their points are available to the user without opening the chart

### Requirement: Marks are graded, not ranked

A score SHALL be presented as a count of identical marks: one mark for 1 to 2 points, two for
3 to 4, three for 5 to 6, and four for 7 to 8. All marks SHALL be the same size and colour, so
the count is the only thing that carries meaning. An instrument that is gated out, cannot be
screened, or scores zero SHALL carry no mark; because passing the gate is worth a point, a
screened instrument always carries at least one mark.

The screener SHALL NOT present a target, an entry, a stop, a position size, or any ranking
beyond the mark count and the score it stands for.

#### Scenario: Bucket boundaries

- **WHEN** four instruments score 2, 3, 6 and 7
- **THEN** they carry one, two, three and four marks respectively

#### Scenario: A gated-in instrument with no signal still shows one mark

- **WHEN** an instrument passes the gate and no signal component fires
- **THEN** it carries one mark, standing for its score of 1

#### Scenario: Nothing recommended

- **WHEN** an instrument carries four marks
- **THEN** the UI reports its score, its reasons, its range and its position, and offers no entry, target or size
