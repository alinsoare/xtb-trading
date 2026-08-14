## MODIFIED Requirements

### Requirement: Static data export

The system SHALL export the local data store to static files consumable by the frontend without a backend: a catalog manifest (instruments with compatibility flags and sync freshness), per-symbol, per-timeframe bar files, and the screening payload covering enabled instruments, plus metadata recording when the snapshot was generated. The exported shapes SHALL match what the dev backend serves, so the same frontend code reads both.

#### Scenario: Export round-trip

- **WHEN** the exporter runs against a synced data store
- **THEN** loading the static site from the exported files shows the same instruments, bars, and warnings as the dev app showed

#### Scenario: Screening on the published site

- **WHEN** the user loads the published static site
- **THEN** the catalog is screened from the exported screening payload, producing the same marks the dev app produced from the same data store
