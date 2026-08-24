## MODIFIED Requirements

### Requirement: Prices are stored unadjusted

Bars SHALL be stored with unadjusted prices (no dividend/split adjustment), matching what a broker's trading platform displays rather than a back-adjusted history. When the catalog declares a price divisor for an instrument (e.g. pence-quoted tickers), it SHALL be applied on ingest.

#### Scenario: Pence-quoted instrument

- **WHEN** an instrument's catalog entry declares a price divisor of 100
- **THEN** stored prices are the fetched values divided by 100
