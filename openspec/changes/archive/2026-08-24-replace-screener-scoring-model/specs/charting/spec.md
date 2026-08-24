## MODIFIED Requirements

### Requirement: Symbol browser

The UI SHALL list all catalog instruments with free-text search (matching symbol and names), an asset-class filter, a quote-currency filter, an exchange filter, a compatible-only filter, and an enabled-only filter. Each entry SHALL show its sync freshness (bar count and last sync, or "never synced") and any compatibility warnings as badges.

The quote-currency and exchange filters SHALL offer only values carried by the instruments actually loaded, plus an "all" choice that admits every instrument, so no filter choice can produce an empty list for a value the catalog does not hold. The quote-currency filter SHALL match on the same effective currency that compatibility is judged against, so an instrument flagged "not EUR" is never admitted by a EUR currency filter. The enabled-only filter SHALL exclude instruments whose catalog enabled flag is off; with it inactive, those instruments remain listed as they are today.

Every active filter SHALL narrow the list in combination with the others: an instrument is listed only if it satisfies all of them. When any filter is narrowing the list, the sidebar SHALL report how many instruments are visible out of the catalog total; when no filter is narrowing it, the sidebar SHALL report the total as it does today.

The UI SHALL offer a single control that returns every sidebar filter and the sort order to its default. That control SHALL NOT alter the selected instrument, the selected timeframe, the enabled indicators, or the chart display limit.

Every entry the filters admit SHALL identify its instrument — its symbol, its asset class and its name — and no screening outcome SHALL displace that identification. Filters may exclude an instrument from the list entirely; nothing inside a listed entry may leave it unidentified.

Each entry SHALL additionally carry its screening result: the marks its score earns inline with its symbol code, the short names of the sources that earned its score on a line beneath those marks, its 30-day range, its position in that range, and its headroom to the high of that range. The three figures SHALL be shown together on one line, in that order, each labelled so it cannot be mistaken for another, and each formatted as a percentage to the same precision — the headroom is a third figure added beside the existing two, and SHALL NOT replace, reword or reformat either of them. The figures SHALL be shown for every screened instrument, whether or not it earned a mark, so a list with no marks reads as screened-and-quiet rather than broken. An instrument that could not be screened SHALL say why — not screened, or insufficient history — in place of its figures, and only in place of its figures. A screened instrument for which the screener reports no headroom SHALL show its remaining figures and mark the headroom as unavailable, in the same way an absent range or position already reads.

A screened row that earns no mark and names no source SHALL be treated as an ordinary, expected row rather than an exceptional one. No part of the row SHALL promise that a screened instrument carries at least one mark, because the screener's scoring model awards no automatic point: on a typical day most rows are marked-and-sourced nowhere while still showing their three figures. Such a row SHALL remain visually distinct from a row that states it was not screened or that its history is insufficient, so a blank mark area is never read as a failed or missing computation.

The headroom figure SHALL read as the screener reports it, including when it is zero or negative, and the row SHALL NOT hide, clamp or re-sign it. It SHALL be presented as a fact about the 30-day window like the other two, with no styling that suggests a recommendation, a target or a ranking.

Each source name SHALL read as its own bounded label: green text within a green rectangular outline, unfilled so the row's background shows through. The outline SHALL enclose exactly one source name, so the fired sources are countable without reading the words, and adjacent labels SHALL stay visually separate rather than sharing or touching a border. Every source SHALL receive the same treatment, with no colour, weight or size distinguishing one source from another — the mark count already carries strength. The green SHALL be the green of the marks, so the labels read as belonging to the same signal, and SHALL remain distinguishable from the row's muted range, position, headroom and state text.

The marks SHALL be accompanied, on demand, by the rules that fired and the points each contributed, so a mark can be audited from the list itself. The source names are for at-a-glance scanning and SHALL NOT duplicate the per-rule points.

The list SHALL offer, alongside the filters, sorting by screening score, by symbol ascending, by instrument name ascending, and by headroom to the 30-day high — as well as the catalog's own default order. It SHALL NOT offer sorting by recency of last sync. Sorting by headroom SHALL place the largest headroom first, and SHALL place every instrument with no headroom figure — one not screened, one with insufficient history, one whose window yields no figure — after every instrument that has one, rather than treating an absent figure as the largest or as zero. Sorting SHALL apply to whatever the filters admit, and SHALL be stable for instruments the chosen order cannot distinguish: instruments sharing a score or a headroom figure, and instruments alike in having none, SHALL keep their relative order from the catalog's default order.

Choosing a filter, a filter value, or a sort order SHALL operate on already-loaded data only: it SHALL NOT fetch market data, start a sync, or cause the screener to re-scan. In particular, sorting by headroom SHALL read the screening results the list already holds.

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

- **WHEN** an instrument scores 4 in the screener from a bullish D1 gap trigger, a demand D1 order-block trigger and a distance worth 2 points
- **THEN** its row shows three marks inline with its symbol, names those three sources on the line beneath, and shows its 30-day range, its position in that range and its headroom to the high of that range

#### Scenario: Three figures on one line

- **WHEN** a screened instrument's 30-day range is 40.0%, its position is 90.0% and its headroom is 2.9%
- **THEN** its row shows all three figures on the figures line, each labelled and each to one decimal place, with the range and the position reading exactly as they did before the headroom was added

#### Scenario: A negative headroom is shown as such

- **WHEN** the screener reports a negative headroom for an instrument, its current price having run above its 30-day high
- **THEN** the row shows that negative figure rather than zero or a blank, and its range and position figures are unaffected

#### Scenario: A screened row with no headroom figure

- **WHEN** an instrument is screened but the screener reports no headroom for it
- **THEN** the row marks the headroom unavailable and still shows whatever range and position figures the screener reported, rather than dropping the figures line

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

- **WHEN** two instruments both score 3, one from a single trigger with a distance worth 2 points and one from all three triggers with a near target
- **THEN** both show two marks, their source lines name different sources, and the difference is visible without inspecting either row

#### Scenario: Screened but unmarked

- **WHEN** an instrument is screened and earns no mark
- **THEN** its row shows no marks, names no source, shows no empty outline, and still shows its 30-day range, position and headroom figures

#### Scenario: Most rows carry no mark on a quiet day

- **WHEN** the catalog is screened on a day when few instruments trigger anything
- **THEN** the many rows showing no marks and no sources read as screened-and-quiet, each still showing its three figures, and none of them is styled or worded as a failure or as an instrument that could not be screened

#### Scenario: Auditing a mark

- **WHEN** the user inspects the marks on a row
- **THEN** the rules that fired and their points are shown

#### Scenario: Sorting by score

- **WHEN** the user sorts by score with an asset-class filter active
- **THEN** the instruments that filter admits are ordered by score, highest first, and instruments sharing a score keep a stable relative order

#### Scenario: Sorting alphabetically

- **WHEN** the user sorts by symbol, then by instrument name
- **THEN** the admitted instruments are ordered ascending by that field in each case, independently of the catalog's own order

#### Scenario: Sorting by headroom

- **WHEN** the user sorts by headroom with an asset-class filter active
- **THEN** the instruments that filter admits are ordered by headroom, largest first, independently of their scores, and instruments sharing a headroom figure keep a stable relative order

#### Scenario: Instruments without a headroom figure sort last

- **WHEN** the user sorts by headroom and some admitted instruments were not screened or have insufficient history
- **THEN** the instruments with a headroom figure come first, largest first, and those without one follow in their default relative order

#### Scenario: A negative headroom still sorts by value

- **WHEN** the user sorts by headroom and one admitted instrument's headroom is negative
- **THEN** it is ordered below every instrument with a larger headroom and above every instrument with no figure at all

#### Scenario: Never-synced instruments when sorting by sync recency

- **WHEN** the user looks for an order by recency of last sync, as the order that placed never-synced instruments last
- **THEN** the selector offers no such order — it offers the catalog's default order, score, symbol, name and headroom — and each row's own sync freshness, including "never synced", remains readable where it always was

#### Scenario: Filtering and sorting fetch nothing

- **WHEN** the user changes any filter or the sort order
- **THEN** the list re-renders from already-loaded data with no market-data fetch, no sync run, and no screener re-scan

#### Scenario: Unscreenable instrument

- **WHEN** a disabled instrument, or one with too little stored history, appears in the list
- **THEN** its row shows its symbol, asset class and name exactly as a screened row does, and states that it was not screened, or that its history is insufficient, where its range, position and headroom figures would otherwise be

#### Scenario: A zero score is not an unscreenable state

- **WHEN** a disabled instrument, an instrument with insufficient history, and an instrument screened with a score of zero appear in the list together
- **THEN** the first two state why they were not scored in place of their figures, while the third shows its three figures with no marks, and the three rows cannot be mistaken for one another

#### Scenario: Identifying an instrument with insufficient history

- **WHEN** the user reads a row whose instrument has too little stored history
- **THEN** the instrument's symbol and name are legible in that row without selecting it or opening its chart

#### Scenario: Filters still hide rows

- **WHEN** the search query, asset-class filter, quote-currency filter, exchange filter, compatible-only filter or enabled-only filter excludes an unscreenable instrument
- **THEN** that instrument has no row at all, rather than a row missing its name
