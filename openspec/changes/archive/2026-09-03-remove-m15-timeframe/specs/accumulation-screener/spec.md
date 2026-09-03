## MODIFIED Requirements

### Requirement: Screening payload

A screening payload SHALL be served by the dev backend and written by the exporter as one
file with identical content, so screening behaves the same with a backend and on the static
site. It SHALL carry, for each **enabled** instrument, the most recent bars of H1 and D1
up to a fixed per-timeframe cap, with each bar's timestamp, open, high, low and close.

The payload SHALL carry exactly the timeframes the screening conventions and rules read — no
timeframe the system does not support, and none that nothing reads.

The cap SHALL be 420 bars per timeframe — enough for every signal's warm-up with room for a
zone detected before the warm-up boundary to still be live at the newest bar — and a series
holding fewer bars SHALL be served in full rather than padded.

The payload SHALL be retrievable in a single request for the whole catalog, because screening
44 instruments across 2 timeframes through the per-symbol chart files would cost dozens of
requests and several megabytes. Volume SHALL be omitted, since no screening signal uses
it. Disabled instruments SHALL be absent from the payload.

#### Scenario: One request covers the catalog

- **WHEN** the app screens the catalog
- **THEN** it retrieves the bars for every enabled instrument and both timeframes in a single request

#### Scenario: The payload carries no retired timeframe

- **WHEN** the payload is built from a store that still holds M15 bars
- **THEN** no instrument's entry carries an M15 series, and the entry carries H1 and D1 only

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

### Requirement: Screening reads shared bar conventions and the current-day touch exception

Every screening rule SHALL read bars through one shared set of conventions, defined once, so two rules
can never disagree about what "the last bar" or "the current price" means:

- **Forming bar.** The newest stored bar of any timeframe is treated as still forming. The last
  completed bar is the one before it, and every rule about completed bars SHALL start there.
- **Current price.** The close of the most recent bar across the screened timeframes, chosen by
  timestamp, so a timeframe that failed to sync cannot supply a stale price. H1 therefore remains
  part of the screening payload even though no scoring rule reads its bars directly: it is the finest
  supported timeframe, so it is where an intraday price comes from, and removing it would change what
  the current price means. The convention SHALL be defined over whichever timeframes the payload
  carries rather than over a fixed count of them, so retiring or adding a screened timeframe changes
  which bars are considered without changing the rule.
- **Live zone.** A detected zone is live when it still extends to the newest stored bar, judged by the
  liveness notion the producing indicator already carries — a fair-value-gap zone expires a fixed
  number of bars after its first bar, and an order-block zone carries a flag stating that it extends
  to the newest bar. No separate liveness rule SHALL be invented for screening.
- **Current-day touch — a named, deliberate exception to the forming-bar convention.** The touch test
  reads the **current day's D1 bar**, which is the newest stored D1 bar and the very bar the
  forming-bar convention otherwise excludes. This is intentional: the question the triggers ask is
  whether price is interacting with a zone *right now*. Zone *detection* still excludes the newest
  bar, so the model is "zones from completed history, touch from today". The consequence SHALL be
  stated rather than hidden: a score can change during the day as the current bar develops.
- **Touch geometry.** A touch is plain geometric overlap, inclusive at both ends, between the current
  day's bar high-to-low interval and the zone's price interval. It is deliberately looser than a
  containment test on a single price: a wick that entered the zone and left again still counts.
- **30-day window.** The D1 bars whose timestamps fall within 30 calendar days of the newest D1 bar,
  read by bar high and bar low rather than by close.

Every numeric threshold in these conventions and in the scoring rules SHALL be a named constant, so
weights and boundaries can be tuned without editing logic.

#### Scenario: The forming bar is excluded

- **WHEN** a rule evaluates the last completed bars of a timeframe
- **THEN** it reads bars ending one bar before the newest stored bar

#### Scenario: Current price ignores a stale timeframe

- **WHEN** one screened timeframe's newest bar is days older than another's
- **THEN** the current price comes from the timeframe holding the most recent bar

#### Scenario: The intraday price comes from the finest supported timeframe

- **WHEN** an instrument's newest H1 bar is more recent than its newest D1 bar
- **THEN** the current price is that H1 bar's close, and no finer timeframe is consulted

#### Scenario: The touch test reads today's bar

- **WHEN** a live zone is tested for a touch
- **THEN** the bar compared against it is the newest stored D1 bar, notwithstanding the forming-bar
  convention, and that exception is stated where the conventions are defined

#### Scenario: Zone detection still excludes today's bar

- **WHEN** the newest stored D1 bar would complete a zone-forming pattern
- **THEN** no zone is detected from it, so every zone the triggers test against comes from completed
  history

#### Scenario: A wick that left the zone still counts

- **WHEN** the current day's bar reached into a live zone and closed back outside it
- **THEN** the touch test passes, because the bar's high-to-low interval overlaps the zone's price
  interval

#### Scenario: A touch at the zone's edge counts

- **WHEN** the current day's bar low is exactly the zone's high
- **THEN** the touch test passes, the overlap being inclusive at both ends

#### Scenario: The score can move during the day

- **WHEN** the current day's bar extends far enough to overlap a live zone it did not overlap earlier
- **THEN** the instrument's score changes on the next scan, which is the accepted consequence of
  reading today's bar

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

A cached result SHALL likewise NOT be displayed when it predates a change to **how a result is
computed**. A result written under a superseded scoring model SHALL be recomputed before it is shown,
rather than rendered as a score, a mark count or a set of sources the current model would never
produce, and this SHALL NOT require the user to sync.

A change to **which timeframes a result was computed from** SHALL count as a change to how a result is
computed, whether or not any trigger, weight or band changed. A result written while a retired
timeframe could supply the current price SHALL be recomputed before it is shown, because the price
underneath its figures and its distance component may differ from what the current set of screened
timeframes yields, and this SHALL NOT require the user to sync.

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

#### Scenario: A cache written under the previous scoring model is not reused

- **WHEN** the user opens the list with a cache written under the superseded scoring model, and no
  instrument has synced since
- **THEN** the catalog is re-screened under the current model, and no row shows a score, a mark count
  or a source the current model cannot produce

#### Scenario: A cache written while M15 was screened is not reused

- **WHEN** the user opens the list with a cache written while M15 was one of the screened timeframes,
  and no instrument has synced since
- **THEN** the payload is fetched, the catalog is re-screened over the current timeframes, and no row
  shows a figure or a distance score derived from an M15 price
