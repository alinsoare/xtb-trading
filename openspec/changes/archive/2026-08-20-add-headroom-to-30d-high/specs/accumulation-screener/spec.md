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
would otherwise fire. Its range, position and headroom figures SHALL still be reported, so a
missing mark is legible rather than looking like an absent computation. The position and headroom
figures are reported for context only and SHALL NOT decide eligibility.

Alongside the range and the position, the screener SHALL report a third figure for the same
30-day window — the **headroom** to the window's high, measured as
`(highest high − current price) / current price`. It states how far the current price would have
to rise, as a percentage of that price, to reach the highest high of the window. It SHALL be
derived from the same 30-day window's highest high and the same shared current-price convention
the gate is judged against, so the three figures can never disagree about the window or the price
they describe.

The headroom SHALL be reported as it computes and SHALL NOT be clamped, floored or withheld
because of its sign: where the current price is at or above the window's highest high — which the
current-price convention permits, since the price may come from a finer timeframe than the window
is measured on — the figure is zero or negative, and that is the honest reading.

The headroom SHALL be reported for every instrument whose range and position are reported, and
SHALL be absent exactly where those two are absent — an instrument whose window yields no usable
range has no headroom figure either, rather than a figure derived from a partial window. It SHALL
NOT contribute to the score, alter any weight, or appear among the recorded reasons.

The range and the position SHALL keep their existing meanings unchanged: adding the headroom
SHALL NOT redefine, replace or reformat either of them.

#### Scenario: Too quiet to be worth flagging

- **WHEN** an instrument's 30-day range is 1.5% and price sits at the bottom of it
- **THEN** it carries no mark, and its range, position and headroom figures are still shown

#### Scenario: Not far enough below the peak

- **WHEN** an instrument's 30-day range is 12% and price is 1% below the window's highest high
- **THEN** it carries no mark, and its range, position and headroom figures are still shown

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

#### Scenario: Headroom from the range and the position

- **WHEN** an instrument's 30-day window has a lowest low of 100 and a highest high of 140, so its
  range is 40%, and the current price is 136, so its position is 90% of the range
- **THEN** its headroom is 2.9%, being `(140 − 136) / 136`, and its range and position figures are
  still 40% and 90%

#### Scenario: Headroom at the bottom of the range

- **WHEN** the current price is exactly the window's lowest low and the range is 40%
- **THEN** the headroom equals the range, 40%, because the whole range still lies above the price

#### Scenario: Headroom is not clamped at the top

- **WHEN** the current price, taken from the most recent bar across the screened timeframes, is
  above the 30-day window's highest high
- **THEN** the headroom is reported as the negative figure it computes to, rather than as zero,
  as absent, or as an error

#### Scenario: Headroom does not affect the score

- **WHEN** two instruments pass the gate with identical signals but very different headroom
- **THEN** their scores, marks and recorded reasons are identical, and neither reason list mentions
  the headroom

#### Scenario: No window, no headroom

- **WHEN** an instrument's 30-day window yields no usable range, so neither a range nor a position
  figure is reported
- **THEN** no headroom figure is reported for it either

### Requirement: Scores are cached against sync freshness

Computed scores SHALL be cached locally in the browser and reused on the next load when every
instrument's last sync time is unchanged from when the cache was written. When nothing has
synced since the previous visit, the screening payload SHALL NOT be requested at all.

A cache SHALL be invalidated when any instrument's last sync time differs from the cached one,
and the cache SHALL be local to the browser: it SHALL NOT travel with the exported data and
SHALL NOT be shared between browsers. Where the browser denies persistent storage, screening
SHALL still work, simply recomputing on every load.

A cached result SHALL NOT be displayed when it predates a change to what a result reports: a
result written before the headroom figure existed SHALL be recomputed before it is shown, rather
than rendered with that figure missing, and this SHALL NOT require the user to sync.

#### Scenario: Nothing synced since last visit

- **WHEN** the user reloads the page and no instrument has synced since the previous load
- **THEN** the marks render from the cache and the screening payload is not requested

#### Scenario: A sync invalidates the cache

- **WHEN** one instrument has synced since the cache was written
- **THEN** the payload is fetched and the catalog is re-screened

#### Scenario: Storage unavailable

- **WHEN** the browser blocks persistent storage
- **THEN** screening runs normally on every load, with no error state

#### Scenario: A cache written before the headroom figure is not reused

- **WHEN** the user opens the list with a cache written before results reported headroom, and no
  instrument has synced since
- **THEN** the catalog is re-screened and every screened row shows a headroom figure, with no row
  showing range and position alone
