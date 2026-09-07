## MODIFIED Requirements

### Requirement: Static data export

The system SHALL export the local data store to static files consumable by the frontend without a backend: a catalog manifest (instruments with compatibility flags and sync freshness), per-symbol, per-timeframe bar files, the screening payload covering enabled instruments, and the screener-scores artifact covering every catalog instrument, plus metadata recording when the snapshot was generated. The exported shapes SHALL match what the dev backend serves, so the same frontend code — and any external consumer reading the published site directly — reads both identically.

#### Scenario: Export round-trip

- **WHEN** the exporter runs against a synced data store
- **THEN** loading the static site from the exported files shows the same instruments, bars, and warnings as the dev app showed

#### Scenario: Screening on the published site

- **WHEN** the user loads the published static site
- **THEN** the catalog is screened from the exported screening payload, producing the same marks the dev app produced from the same data store

#### Scenario: Screener scores are exported and served identically

- **WHEN** the exporter runs against a synced data store, and the dev backend is queried against the same store
- **THEN** both produce a `data/screener-scores.json` with identical content, covering every catalog symbol

#### Scenario: A published screener-scores file is fetchable directly

- **WHEN** a script issues a plain HTTP GET for `data/screener-scores.json` against the published GitHub Pages site
- **THEN** it receives a valid JSON document without needing to fetch `scan-bars.json` or any candle file
