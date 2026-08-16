## MODIFIED Requirements

### Requirement: Symbol browser

The UI SHALL list all catalog instruments with free-text search (matching symbol and names), an asset-class filter, a quote-currency filter, an exchange filter, a compatible-only filter, and an enabled-only filter. Each entry SHALL show its sync freshness (bar count and last sync, or "never synced") and any compatibility warnings as badges.

The quote-currency and exchange filters SHALL offer only values carried by the instruments actually loaded, plus an "all" choice that admits every instrument, so no filter choice can produce an empty list for a value the catalog does not hold. The quote-currency filter SHALL match on the same effective currency that compatibility is judged against, so an instrument flagged "not EUR" is never admitted by a EUR currency filter. The enabled-only filter SHALL exclude instruments whose catalog enabled flag is off; with it inactive, those instruments remain listed as they are today.

Every active filter SHALL narrow the list in combination with the others: an instrument is listed only if it satisfies all of them. When any filter is narrowing the list, the sidebar SHALL report how many instruments are visible out of the catalog total; when no filter is narrowing it, the sidebar SHALL report the total as it does today.

The UI SHALL offer a single control that returns every sidebar filter and the sort order to its default. That control SHALL NOT alter the selected instrument, the selected timeframe, the enabled indicators, or the chart display limit.

Every entry the filters admit SHALL identify its instrument — its symbol, its asset class and its name — and no screening outcome SHALL displace that identification. Filters may exclude an instrument from the list entirely; nothing inside a listed entry may leave it unidentified.

Each entry SHALL additionally carry its screening result: the marks its score earns inline with its symbol code, the short names of the sources that earned its score on a line beneath those marks, its 30-day range and its position in that range. The range and position figures SHALL be shown for every screened instrument, whether or not it earned a mark, so a list with no marks reads as screened-and-quiet rather than broken. An instrument that could not be screened SHALL say why — not screened, or insufficient history — in place of its figures, and only in place of its figures.

Each source name SHALL read as its own bounded label: green text within a green rectangular outline, unfilled so the row's background shows through. The outline SHALL enclose exactly one source name, so the fired sources are countable without reading the words, and adjacent labels SHALL stay visually separate rather than sharing or touching a border. Every source SHALL receive the same treatment, with no colour, weight or size distinguishing one source from another — the mark count already carries strength. The green SHALL be the green of the marks, so the labels read as belonging to the same signal, and SHALL remain distinguishable from the row's muted range, position and state text.

The marks SHALL be accompanied, on demand, by the rules that fired and the points each contributed, so a mark can be audited from the list itself. The source names are for at-a-glance scanning and SHALL NOT duplicate the per-rule points.

The list SHALL offer, alongside the filters, sorting by screening score, by symbol ascending, by instrument name ascending, and by recency of last sync — as well as the catalog's own default order. Sorting by recency of last sync SHALL place never-synced instruments after every synced one, rather than treating an absent sync as the oldest or the newest. Sorting SHALL apply to whatever the filters admit, and SHALL be stable for instruments the chosen order cannot distinguish: instruments sharing a score or a sync time SHALL keep their relative order from the catalog's default order.

Choosing a filter, a filter value, or a sort order SHALL operate on already-loaded data only: it SHALL NOT fetch market data, start a sync, or cause the screener to re-scan.

#### Scenario: Filtering the catalog

- **WHEN** the user types a search query and selects an asset class
- **THEN** the list shows only instruments matching both, and a clear message when nothing matches

#### Scenario: Filtering by quote currency

- **WHEN** the user selects EUR in the quote-currency filter
- **THEN** the list shows only instruments whose effective quote currency is EUR, and an instrument flagged "not EUR" is absent even where the catalog file claims EUR for it

#### Scenario: Filtering by exchange

- **WHEN** the user selects an exchange
- **THEN** the list shows only instruments on that exchange, and the filter's choices name only exchanges present among the loaded instruments

#### Scenario: Hiding disabled instruments

- **WHEN** the user turns on the enabled-only filter while the catalog holds instruments with the enabled flag off
- **THEN** those instruments leave the list, and turning the filter off again restores them

#### Scenario: Filters combine

- **WHEN** the user selects an asset class, a quote currency and the compatible-only filter together
- **THEN** only instruments satisfying all three are listed

#### Scenario: Reporting how much is hidden

- **WHEN** a filter narrows the list to 12 instruments out of a catalog of 80
- **THEN** the sidebar reports 12 visible out of 80, and reports the plain total again once every filter is back to its default

#### Scenario: Clearing the filters

- **WHEN** the user has a search query, an asset class, a currency, an exchange, both checkboxes and a non-default sort order in effect, and activates the clear-filters control
- **THEN** every filter and the sort order return to their defaults and the full list is shown, while the selected instrument, timeframe, indicators and display limit are unchanged

#### Scenario: Screening result in the row

- **WHEN** an instrument scores 5 in the screener from the eligibility gate, a D1 gap with an H1 run and a pivot 2 points distant
- **THEN** its row shows three marks inline with its symbol, names those three sources on the line beneath, and shows its 30-day range and its position in that range

#### Scenario: Source names read as green outlined labels

- **WHEN** a screened row names the sources that earned its score
- **THEN** each name is green text inside its own green rectangular outline with no fill behind it, and the number of outlines can be counted without reading the names

#### Scenario: Every source looks the same

- **WHEN** a row names sources drawn from different rules
- **THEN** all of its labels carry the identical green outline treatment, with nothing about a label's colour, weight or size implying that its source counted for more

#### Scenario: Labels stay apart when the line wraps

- **WHEN** a row names enough sources that the line wraps
- **THEN** every label keeps its own complete outline, and no two labels touch or appear to share a border across or within lines

#### Scenario: Rows on the same score read differently

- **WHEN** two instruments both score 4, one from a D1 gap with an H1 run and one from a distant pivot
- **THEN** both show two marks, their source lines name different sources, and the difference is visible without inspecting either row

#### Scenario: Screened but unmarked

- **WHEN** an instrument is screened and earns no mark
- **THEN** its row shows no marks, names no source, shows no empty outline, and still shows its 30-day range and position figures

#### Scenario: Auditing a mark

- **WHEN** the user inspects the marks on a row
- **THEN** the rules that fired and their points are shown

#### Scenario: Sorting by score

- **WHEN** the user sorts by score with an asset-class filter active
- **THEN** the instruments that filter admits are ordered by score, highest first, and instruments sharing a score keep a stable relative order

#### Scenario: Sorting alphabetically

- **WHEN** the user sorts by symbol, then by instrument name
- **THEN** the admitted instruments are ordered ascending by that field in each case, independently of the catalog's own order

#### Scenario: Never-synced instruments when sorting by sync recency

- **WHEN** the user sorts by recency of last sync and some admitted instruments have never been synced
- **THEN** the synced instruments come first, most recent first, and the never-synced ones follow in their default relative order

#### Scenario: Filtering and sorting fetch nothing

- **WHEN** the user changes any filter or the sort order
- **THEN** the list re-renders from already-loaded data with no market-data fetch, no sync run, and no screener re-scan

#### Scenario: Unscreenable instrument

- **WHEN** a disabled instrument, or one with too little stored history, appears in the list
- **THEN** its row shows its symbol, asset class and name exactly as a screened row does, and states that it was not screened, or that its history is insufficient, where its range and position figures would otherwise be

#### Scenario: Identifying an instrument with insufficient history

- **WHEN** the user reads a row whose instrument has too little stored history
- **THEN** the instrument's symbol and name are legible in that row without selecting it or opening its chart

#### Scenario: Filters still hide rows

- **WHEN** the search query, asset-class filter, quote-currency filter, exchange filter, compatible-only filter or enabled-only filter excludes an unscreenable instrument
- **THEN** that instrument has no row at all, rather than a row missing its name

### Requirement: User settings persist across reloads

The UI SHALL remember the user's settings on the same browser and restore them on the next load: the chart display limit, the selected instrument, the selected timeframe, the enabled indicators, and the sidebar filters (search text, asset class, quote currency, exchange, compatible-only, enabled-only, sort order). Persistence SHALL be local to the browser and SHALL NOT travel with the exported data or be shared between browsers. Only these settings persist; transient chart state SHALL NOT — neither an in-progress or completed measurement, nor the current zoom and scroll position, which start from the default framing on every load. Neither SHALL the sync controls' own state — the full-refresh option and the periodic-refresh control both start off on every load, so a reload can never resume fetching. A stored setting that is unusable — an instrument no longer in the catalog, an unknown timeframe, an unparseable limit, an unknown sort order, an asset class, quote currency or exchange no longer carried by any loaded instrument — SHALL be replaced by its default without blocking the rest of the restore. Restoring a filter SHALL NOT be able to hide the whole catalog behind a value the user cannot see in the filter's own choices. Where the browser denies persistent storage, the app SHALL operate normally with default settings.

#### Scenario: Settings survive a reload

- **WHEN** the user selects an instrument and timeframe, enables an indicator, sets a display limit, filters and sorts the sidebar, and reloads the page
- **THEN** the same instrument, timeframe, indicator state, display limit, filters and sort order are in effect after the reload

#### Scenario: Zoom is not restored

- **WHEN** the user zooms out to span the whole slice and reloads the page
- **THEN** the restored instrument and timeframe open framed on the default zoom, not the zoom in force before the reload

#### Scenario: Stored instrument is gone from the catalog

- **WHEN** the persisted instrument is no longer in the catalog on the next load
- **THEN** the app falls back to its default selection, keeps the other restored settings, and renders normally

#### Scenario: Stored filter value is gone from the catalog

- **WHEN** the persisted asset class, exchange or quote currency is no longer carried by any loaded instrument
- **THEN** that filter falls back to admitting every instrument, the other restored settings are kept, and the list is not left empty

#### Scenario: Storage is unavailable

- **WHEN** the browser blocks persistent storage
- **THEN** the app loads with default settings and continues to work, without an error state

#### Scenario: Settings are not part of the published data

- **WHEN** two different browsers load the same published site
- **THEN** each keeps its own settings, and neither is affected by the other's
