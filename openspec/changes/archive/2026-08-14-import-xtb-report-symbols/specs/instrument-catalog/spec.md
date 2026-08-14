## ADDED Requirements

### Requirement: Broker reports are a source of candidates, not of catalog rows

The system SHALL provide a way to read the XTB account statements kept in the reports
directory, collect every distinct instrument ticker they name, and report which of those
tickers the catalog does not yet cover. Reading the reports SHALL NOT modify the catalog:
the tool SHALL emit proposed rows for a maintainer to review, complete, and commit by
hand, leaving the catalog file untouched when it runs. Every report file in the directory
SHALL be considered, and a ticker named in more than one file or sheet SHALL be reported
once.

A statement names an instrument in several places with different layouts — closed
positions, cash operations, open positions — and the open-positions listing repeats a
holding's ticker on per-lot rows whose instrument cell holds a numeric position
identifier rather than a name. The system SHALL take the instrument name from a row that
carries one and SHALL NOT treat a position identifier as an instrument name.

#### Scenario: Reporting what the catalog is missing

- **WHEN** a maintainer runs the import against a reports directory naming instruments the catalog does not list
- **THEN** each missing ticker is reported once with the instrument name found in the report, and the catalog file is unchanged on disk

#### Scenario: Instruments already catalogued

- **WHEN** a report names a ticker the catalog already carries
- **THEN** that ticker is not proposed as an addition and the existing entry's fields are left alone

#### Scenario: Several reports in the directory

- **WHEN** the directory holds more than one statement and a ticker appears in both
- **THEN** it is reported once, not once per file

#### Scenario: Per-lot rows of an open position

- **WHEN** a statement's open-positions sheet lists a holding followed by per-lot rows whose instrument cell is a numeric position identifier
- **THEN** the ticker is reported once with the holding's instrument name, and no entry is created from a position identifier

#### Scenario: A row with no ticker

- **WHEN** a statement row has no ticker, as a cash operation such as a tax or deposit entry does
- **THEN** it contributes no instrument to the import

### Requirement: Report labels do not substitute for the verbatim XTB name

The instrument label printed in a broker report is a shortened display string and SHALL
NOT be written to the catalog's verbatim XTB name field. That field SHALL continue to
hold the name exactly as xStation shows it, because CFD classification reads it and a
shortened or abbreviated label can omit the token that identifies a CFD. An import MAY
show the report's label as a hint for the maintainer completing the row.

#### Scenario: Report label differs from the xStation name

- **WHEN** a report labels an instrument "DB Physical Silver" while xStation names it "Xtrackers Physical Silver ETC"
- **THEN** the catalog entry's verbatim XTB name is the xStation name, and the report label is not written to that field

#### Scenario: Classification survives the import

- **WHEN** an imported instrument is a CFD whose report label omits the CFD token
- **THEN** the completed catalog entry still classifies as a CFD, because its verbatim XTB name came from xStation

### Requirement: An instrument whose data source ticker is unresolved is added disabled

A catalog entry SHALL NOT be committed with a guessed data-source ticker. Where the
maintainer cannot confirm the instrument's ticker at the market data source, the entry
SHALL be added with its enabled flag off, so it stays visible in the catalog as known but
unresolved while being excluded from sync runs.

#### Scenario: Ticker cannot be confirmed

- **WHEN** an instrument from a report has no confirmed ticker at the data source
- **THEN** its catalog entry is added with the enabled flag off and it is skipped by sync runs while remaining listed in the symbol browser

#### Scenario: Ticker root differs from the XTB ticker

- **WHEN** an instrument's data-source ticker shares neither root nor suffix with its XTB ticker
- **THEN** the confirmed data-source ticker is recorded and the entry is enabled, rather than the XTB ticker being reused as a guess
