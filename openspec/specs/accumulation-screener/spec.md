# accumulation-screener Specification

## Purpose

Scores every enabled instrument against its stored bars to flag mean-reversion accumulation candidates, reporting the 30-day range, the position inside it, and a confluence score with the reasons behind it — facts only, never a recommendation.

## Requirements

### Requirement: Screening runs on load against stored data only

The screener SHALL score every enabled instrument when the app loads, without the user asking
for it, and SHALL do so entirely from locally stored bars. Screening SHALL NOT trigger any
market-data fetch, so it changes nothing about how fresh the data is: scores are exactly as
stale as the last sync the user asked for. Screening SHALL report progress while it runs, and
the sidebar SHALL remain usable — searchable, filterable and clickable — throughout.

A scan SHALL NOT be re-run merely because the user filtered the list, selected an instrument,
switched timeframe, or toggled an indicator.

#### Scenario: Scores appear without a fetch

- **WHEN** the app loads and screens the catalog
- **THEN** the only market-data request made is for the screening payload itself, no sync runs, and no instrument's stored bars change

#### Scenario: The list works while the scan runs

- **WHEN** the user types a search query while screening is still in progress
- **THEN** the list filters immediately and the scan continues, filling in marks as they are computed

#### Scenario: Progress is visible

- **WHEN** screening is running over the catalog
- **THEN** the UI reports its progress, and the report ends when the last instrument is scored

### Requirement: Screening payload

A screening payload SHALL be served by the dev backend and written by the exporter as one
file with identical content, so screening behaves the same with a backend and on the static
site. It SHALL carry, for each **enabled** instrument, the most recent bars of M15, H1 and D1
up to a fixed per-timeframe cap, with each bar's timestamp, open, high, low and close.

The cap SHALL be 420 bars per timeframe — enough for every signal's warm-up with room for a
zone detected before the warm-up boundary to still be live at the newest bar — and a series
holding fewer bars SHALL be served in full rather than padded.

The payload SHALL be retrievable in a single request for the whole catalog, because screening
44 instruments across 3 timeframes through the per-symbol chart files would cost over a
hundred requests and roughly 15 MB. Volume SHALL be omitted, since no screening signal uses
it. Disabled instruments SHALL be absent from the payload.

#### Scenario: One request covers the catalog

- **WHEN** the app screens the catalog
- **THEN** it retrieves the bars for every enabled instrument and all three timeframes in a single request

#### Scenario: Bars are capped

- **WHEN** an instrument's stored D1 series holds 4,000 bars
- **THEN** the payload carries its 420 most recent D1 bars and none older

#### Scenario: A short series is served whole

- **WHEN** an instrument's stored H1 series holds 90 bars
- **THEN** the payload carries all 90 of them

#### Scenario: Disabled instruments are excluded

- **WHEN** an instrument is disabled in the catalog
- **THEN** it is absent from the payload

#### Scenario: The static site screens identically

- **WHEN** the same data store is served by the dev backend and exported to the static site
- **THEN** both produce the same payload content and therefore the same scores

### Requirement: Screening reads shared bar conventions

Every screening signal SHALL read bars through one shared set of conventions, defined once, so
two signals can never disagree about what "the last bar" or "the current price" means:

- **Forming bar.** The newest stored bar of any timeframe is treated as still forming. The last
  completed bar is the one before it, and every rule about completed bars SHALL start there.
- **Current price.** The close of the most recent bar across the three screened timeframes,
  chosen by timestamp, so a timeframe that failed to sync cannot supply a stale price.
- **Doji.** A bar whose body is at most 10% of its high-to-low range, and any bar with zero
  range. A doji is neutral: it neither counts toward a bullish run nor breaks it.
- **Bullish run.** Counted backwards from the last completed bar, counting bullish bars and
  skipping dojis, stopping at the first bearish bar or after a fixed cap of bars examined.
- **Live zone.** A detected zone is live when it still extends to the newest stored bar;
  containment means the current price lies within the zone's price bounds inclusive.
- **30-day window.** The D1 bars whose timestamps fall within 30 calendar days of the newest D1
  bar, read by bar high and bar low rather than by close.

Every numeric threshold in these conventions and in the scoring rules SHALL be a named
constant, so weights and boundaries can be tuned without editing logic.

#### Scenario: The forming bar is excluded

- **WHEN** a signal evaluates the last three completed bars of a timeframe
- **THEN** it reads the three bars ending one bar before the newest stored bar

#### Scenario: A doji does not break a run

- **WHEN** the bars before the forming bar are, newest first, bullish, doji, bullish, bullish
- **THEN** the run counts three bullish bars

#### Scenario: A bearish bar breaks a run

- **WHEN** the bars before the forming bar are, newest first, bullish, bearish, bullish
- **THEN** the run counts one bullish bar

#### Scenario: Current price ignores a stale timeframe

- **WHEN** one screened timeframe's newest bar is days older than another's
- **THEN** the current price comes from the timeframe holding the most recent bar

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

### Requirement: Instruments that cannot be screened say so

An instrument the screener cannot score for a structural reason SHALL be distinguished from one
that was scored and produced no signal:

- an instrument absent from the payload because it is disabled SHALL be reported as **not
  screened**;
- an instrument whose stored history is too short for the signals' warm-up SHALL be reported as
  **insufficient history**.

Neither SHALL be shown as an unmarked, screened instrument, and neither SHALL prevent the rest
of the catalog from being scored.

#### Scenario: Disabled instrument

- **WHEN** a disabled instrument is listed in the sidebar
- **THEN** it is reported as not screened rather than as scored with no signal

#### Scenario: Too little history

- **WHEN** an instrument holds fewer stored D1 bars than the signals' warm-up needs
- **THEN** it is reported as having insufficient history, and the remaining instruments are still scored

#### Scenario: One bad instrument does not stop the scan

- **WHEN** one instrument's bars cannot be screened
- **THEN** every other instrument is still scored and marked

### Requirement: Scores are cached against sync freshness

Computed scores SHALL be cached locally in the browser and reused on the next load when every
instrument's last sync time is unchanged from when the cache was written. When nothing has
synced since the previous visit, the screening payload SHALL NOT be requested at all.

A cache SHALL be invalidated when any instrument's last sync time differs from the cached one,
and the cache SHALL be local to the browser: it SHALL NOT travel with the exported data and
SHALL NOT be shared between browsers. Where the browser denies persistent storage, screening
SHALL still work, simply recomputing on every load.

#### Scenario: Nothing synced since last visit

- **WHEN** the user reloads the page and no instrument has synced since the previous load
- **THEN** the marks render from the cache and the screening payload is not requested

#### Scenario: A sync invalidates the cache

- **WHEN** one instrument has synced since the cache was written
- **THEN** the payload is fetched and the catalog is re-screened

#### Scenario: Storage unavailable

- **WHEN** the browser blocks persistent storage
- **THEN** screening runs normally on every load, with no error state
