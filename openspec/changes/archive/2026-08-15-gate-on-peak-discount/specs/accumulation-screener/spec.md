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

An instrument failing either condition SHALL score nothing and carry no mark, however many
signals would otherwise fire. Its range and position figures SHALL still be reported, so a
missing mark is legible rather than looking like an absent computation. The position figure is
reported for context only and SHALL NOT decide eligibility.

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
