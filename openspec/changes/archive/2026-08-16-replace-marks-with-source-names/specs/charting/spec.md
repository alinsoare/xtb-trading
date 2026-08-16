## MODIFIED Requirements

### Requirement: Symbol browser

The UI SHALL list all catalog instruments with free-text search (matching symbol and names), an asset-class filter, and a compatible-only filter. Each entry SHALL show its sync freshness (bar count and last sync, or "never synced") and any compatibility warnings as badges.

Every entry the filters admit SHALL identify its instrument — its symbol, its asset class and its name — and no screening outcome SHALL displace that identification. Filters may exclude an instrument from the list entirely; nothing inside a listed entry may leave it unidentified.

Each entry SHALL additionally carry its screening result: the marks its score earns inline with its symbol code, the short names of the sources that earned its score on a line beneath those marks, its 30-day range and its position in that range. The range and position figures SHALL be shown for every screened instrument, whether or not it earned a mark, so a list with no marks reads as screened-and-quiet rather than broken. An instrument that could not be screened SHALL say why — not screened, or insufficient history — in place of its figures, and only in place of its figures.

The marks SHALL be accompanied, on demand, by the rules that fired and the points each contributed, so a mark can be audited from the list itself. The source names are for at-a-glance scanning and SHALL NOT duplicate the per-rule points.

The list SHALL offer sorting by screening score alongside the existing filters. Sorting SHALL apply to whatever the filters admit, and SHALL be stable for instruments sharing a score.

#### Scenario: Filtering the catalog

- **WHEN** the user types a search query and selects an asset class
- **THEN** the list shows only instruments matching both, and a clear message when nothing matches

#### Scenario: Screening result in the row

- **WHEN** an instrument scores 5 in the screener from the eligibility gate, a D1 gap with an H1 run and a pivot 2 points distant
- **THEN** its row shows three marks inline with its symbol, names those three sources on the line beneath, and shows its 30-day range and its position in that range

#### Scenario: Rows on the same score read differently

- **WHEN** two instruments both score 4, one from a D1 gap with an H1 run and one from a distant pivot
- **THEN** both show two marks, their source lines name different sources, and the difference is visible without inspecting either row

#### Scenario: Screened but unmarked

- **WHEN** an instrument is screened and earns no mark
- **THEN** its row shows no marks, names no source, and still shows its 30-day range and position figures

#### Scenario: Auditing a mark

- **WHEN** the user inspects the marks on a row
- **THEN** the rules that fired and their points are shown

#### Scenario: Sorting by score

- **WHEN** the user sorts by score with an asset-class filter active
- **THEN** the instruments that filter admits are ordered by score, highest first, and instruments sharing a score keep a stable relative order

#### Scenario: Unscreenable instrument

- **WHEN** a disabled instrument, or one with too little stored history, appears in the list
- **THEN** its row shows its symbol, asset class and name exactly as a screened row does, and states that it was not screened, or that its history is insufficient, where its range and position figures would otherwise be

#### Scenario: Identifying an instrument with insufficient history

- **WHEN** the user reads a row whose instrument has too little stored history
- **THEN** the instrument's symbol and name are legible in that row without selecting it or opening its chart

#### Scenario: Filters still hide rows

- **WHEN** the search query, asset-class filter or compatible-only filter excludes an unscreenable instrument
- **THEN** that instrument has no row at all, rather than a row missing its name
