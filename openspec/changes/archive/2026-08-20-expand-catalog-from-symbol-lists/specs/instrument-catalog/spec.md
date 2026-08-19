## ADDED Requirements

### Requirement: Curated symbol shortlists are a source of catalog candidates

The system SHALL treat the hand-kept symbol shortlists in the reports directory — a plain-text file per instrument family, one instrument per line, beginning with its XTB ticker — as a source of candidate instruments for the catalog, on the same footing as broker statements. Every distinct ticker named across the shortlists SHALL be considered exactly once, however many files or lines name it. A ticker the catalog already carries SHALL NOT be proposed again and its existing row SHALL be left untouched, including its enabled flag, its Yahoo ticker, and its verbatim XTB name.

The descriptive fields a shortlist carries beside the ticker — provider, UCITS wrapper, accumulating or distributing, currency, or a short instrument label — are hints for the maintainer completing a row. They SHALL NOT be written to the entry's verbatim XTB name field, which continues to hold the name exactly as xStation shows it.

#### Scenario: A ticker named by a shortlist and absent from the catalog

- **WHEN** a shortlist names a ticker the catalog does not carry
- **THEN** it is reported once as a candidate, with the shortlist's descriptive fields shown as hints

#### Scenario: A ticker named by a shortlist and already catalogued

- **WHEN** a shortlist names a ticker the catalog already carries
- **THEN** no candidate is proposed for it and the existing row's fields, including its enabled flag, are unchanged

#### Scenario: The same ticker in more than one shortlist

- **WHEN** two shortlists name the same ticker, or one shortlist names it twice
- **THEN** it yields a single candidate, and the catalog gains at most one row for it

#### Scenario: Shortlist attributes are not the xStation name

- **WHEN** a shortlist line reads `VVSM.DE, VanEck, UCITS, ACC, EUR`
- **THEN** the resulting entry's verbatim XTB name is the name xStation shows, not a string assembled from the shortlist's attributes

### Requirement: A catalogued instrument has verified historical data at the data source

The system SHALL admit an instrument to the catalog only when its data-source ticker has been verified to both resolve at the market data source and return historical daily bars. Verification SHALL be evidence from the data source itself — a request for daily bars over a lookback window that comes back with at least one bar — and SHALL NOT be inferred from the ticker's shape, its suffix, or the fact that a related ticker works.

A candidate that resolves but returns no bars, and a candidate whose ticker cannot be resolved at all, SHALL NOT be added to the catalog. Each rejected candidate SHALL be recorded with the ticker tried and the reason it failed, so a later attempt starts from what was already ruled out rather than repeating it.

A candidate that passes verification SHALL be added with its enabled flag on, because the only stated reason to add it off — an unconfirmed data-source ticker — no longer applies once the ticker has returned bars.

#### Scenario: Candidate returns bars

- **WHEN** a candidate's data-source ticker returns daily bars over the lookback window
- **THEN** it is added to the catalog with its enabled flag on and is included in the next sync run

#### Scenario: Candidate resolves but has no bars

- **WHEN** a candidate's ticker is recognised by the data source but returns no bars over the lookback window
- **THEN** no catalog row is created for it and it is recorded as rejected with that reason

#### Scenario: Candidate ticker cannot be resolved

- **WHEN** no data-source ticker can be found for a candidate's XTB ticker
- **THEN** no catalog row is created for it and it is recorded as rejected with the tickers that were tried

#### Scenario: A plausible ticker is not evidence

- **WHEN** a candidate's data-source ticker is derived from its XTB ticker by the exchange suffix mapping but has never been requested from the data source
- **THEN** it is not treated as verified and no catalog row is created until bars come back

### Requirement: Catalog entries whose data source returns nothing are removed

The system SHALL hold every existing catalog entry to the same data-availability bar as a new one, and SHALL remove an entry whose data-source ticker returns no historical bars and cannot be corrected to a ticker that does. Removal SHALL be the outcome only of a failed data-source probe: an entry that returns bars SHALL be kept regardless of its enabled flag or its portfolio-compatibility flags, because being switched off or being flagged incompatible says nothing about whether data exists.

Where a failing entry's instrument is still available at the data source under a different ticker, correcting the entry's ticker SHALL be preferred over removing the entry.

#### Scenario: Existing entry has no data

- **WHEN** a catalogued instrument's data-source ticker returns no bars and no working replacement ticker is found
- **THEN** its row is removed from the catalog and it no longer appears in the symbol browser

#### Scenario: Disabled entry that still has data

- **WHEN** an entry's enabled flag is off but its data-source ticker returns bars
- **THEN** the entry is kept, still disabled, and is not removed

#### Scenario: Incompatible entry that still has data

- **WHEN** an entry is flagged portfolio-incompatible for being a CFD or quoted outside EUR but its ticker returns bars
- **THEN** the entry is kept and the flag remains a warning only

#### Scenario: Entry recoverable under another ticker

- **WHEN** a catalogued instrument's recorded ticker returns nothing but the instrument is found at the data source under a different ticker that returns bars
- **THEN** the entry's data-source ticker is corrected and the entry is kept

### Requirement: Exchange suffix mapping covers the venues the candidate lists name

The system's mapping from an XTB ticker suffix to an exchange, an expected quote currency, and a data-source ticker suffix SHALL cover every venue named by the candidate sources it reads, including Euronext Brussels, BME Madrid, Oslo Børs, and Nasdaq Stockholm alongside the venues already mapped. A suffix the mapping does not know SHALL leave the derived fields empty for the maintainer to fill rather than producing a guessed ticker.

#### Scenario: A newly mapped venue

- **WHEN** a candidate's XTB ticker ends in the suffix for Euronext Brussels
- **THEN** the proposed row carries that exchange, its expected quote currency, and a data-source ticker built with that venue's data-source suffix

#### Scenario: An unmapped venue

- **WHEN** a candidate's XTB ticker ends in a suffix the mapping does not cover
- **THEN** the exchange and quote currency fields are left empty and no data-source suffix is invented

### Requirement: Verification reports, it does not edit the catalog

The system SHALL provide a way to run data-availability verification over a set of symbols — the catalog, a candidate list, or an explicit selection — and report per symbol whether the ticker resolved and whether bars came back. Running verification SHALL leave the catalog file untouched on disk; acting on the report is the maintainer's edit to make.

#### Scenario: Verification run over the catalog

- **WHEN** a maintainer verifies the whole catalog
- **THEN** each entry is reported as having data or not, and the catalog file is byte-for-byte unchanged afterwards

#### Scenario: Verification run over candidates

- **WHEN** a maintainer verifies the candidates drawn from the shortlists
- **THEN** each candidate is reported with the ticker tried and its outcome, and no rows are written to the catalog

## MODIFIED Requirements

### Requirement: An instrument whose data source ticker is unresolved is added disabled

A catalog entry SHALL NOT be committed with a guessed data-source ticker. Where the
maintainer cannot confirm the instrument's ticker at the market data source, the entry
SHALL NOT be committed at all: an unverifiable candidate is recorded as rejected rather
than parked in the catalog as a disabled row, so that every row present is a row with
data behind it.

An entry already in the catalog with its enabled flag off SHALL remain supported: the
flag marks an instrument the maintainer has chosen to exclude from sync runs, and such an
entry SHALL still hold a data-source ticker that returns bars.

#### Scenario: Ticker cannot be confirmed

- **WHEN** an instrument from a candidate source has no confirmed ticker at the data source
- **THEN** no catalog entry is created for it, and the rejection is recorded with the reason

#### Scenario: Ticker root differs from the XTB ticker

- **WHEN** an instrument's data-source ticker shares neither root nor suffix with its XTB ticker
- **THEN** the confirmed data-source ticker is recorded and the entry is enabled, rather than the XTB ticker being reused as a guess

#### Scenario: Maintainer excludes a working instrument

- **WHEN** a maintainer switches off an entry whose ticker returns bars
- **THEN** the entry stays in the catalog, is skipped by sync runs, and remains visible in the symbol browser
