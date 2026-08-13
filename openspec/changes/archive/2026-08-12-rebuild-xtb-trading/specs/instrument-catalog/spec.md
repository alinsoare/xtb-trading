# Delta Spec: instrument-catalog

## Purpose

Defines the hand-curated list of XTB instruments the app charts, the mapping from XTB symbols to Yahoo Finance tickers, and the portfolio-compatibility rules that warn about instruments unsuitable for a EUR-based real-asset portfolio.

## ADDED Requirements

### Requirement: Catalog is the single source of truth for instruments

The system SHALL define all instruments in a single hand-maintained catalog file. Each entry SHALL carry at minimum: the XTB symbol, the XTB display name copied verbatim from xStation, the Yahoo Finance ticker, a human-readable name, asset class, instrument type, exchange, expected quote currency, point size, an optional price divisor, and an enabled flag. No other part of the system SHALL define or hardcode instruments.

#### Scenario: Adding an instrument

- **WHEN** a maintainer adds a row to the catalog file and reloads the app
- **THEN** the new instrument appears in the symbol browser and is included in the next sync, with no code changes required

#### Scenario: Disabled instrument

- **WHEN** an entry's enabled flag is off
- **THEN** the instrument is excluded from sync runs while remaining visible in the catalog

### Requirement: CFD detection from the XTB name

The system SHALL classify an instrument as a CFD by inspecting the verbatim XTB name, since Yahoo has no concept of a CFD and the name is the only distinguishing signal.

#### Scenario: CFD and non-CFD variants of the same underlying

- **WHEN** the catalog contains "Alphabet Inc CFD - class A" and "Alphabet Inc - class A"
- **THEN** the first is classified as a CFD and the second is not

### Requirement: Portfolio compatibility flags

The system SHALL flag an instrument as portfolio-incompatible when its quote currency is not EUR or when it is a CFD. The flag SHALL be a visible warning only: incompatible instruments still sync and chart normally.

#### Scenario: Non-EUR instrument

- **WHEN** an instrument's effective quote currency is GBP
- **THEN** the instrument is flagged with a "not EUR" warning and its chart remains fully functional

#### Scenario: CFD instrument

- **WHEN** an instrument is classified as a CFD
- **THEN** it is flagged with a CFD warning and its chart remains fully functional

### Requirement: Quote currency verified against the data source

The system SHALL prefer the quote currency observed from Yahoo during a sync over the hand-typed catalog value when evaluating compatibility, and SHALL surface a discrepancy between the two as a warning.

#### Scenario: Catalog value is wrong

- **WHEN** the catalog declares EUR but Yahoo reports USD for the instrument
- **THEN** compatibility is evaluated against USD, the instrument is flagged as not EUR, and the catalog/observed mismatch is reported as a warning
