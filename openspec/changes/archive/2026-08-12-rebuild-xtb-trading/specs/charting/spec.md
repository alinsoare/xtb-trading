# Delta Spec: charting

## Purpose

Covers the user-facing chart application: browsing the instrument catalog, viewing candlestick charts across timeframes, seeing compatibility warnings, and operating sync controls — all against locally stored data only.

## ADDED Requirements

### Requirement: Symbol browser

The UI SHALL list all catalog instruments with free-text search (matching symbol and names), an asset-class filter, and a compatible-only filter. Each entry SHALL show its sync freshness (bar count and last sync, or "never synced") and any compatibility warnings as badges.

#### Scenario: Filtering the catalog

- **WHEN** the user types a search query and selects an asset class
- **THEN** the list shows only instruments matching both, and a clear message when nothing matches

### Requirement: Candlestick chart with timeframe switching

Selecting an instrument SHALL display an interactive OHLC candlestick chart (pan, zoom, crosshair) of its locally stored bars. The user SHALL be able to switch between M15, H1, D1, and W1. Bar timestamps arriving as UTC epoch seconds SHALL be rendered without unit confusion against millisecond-based date arithmetic.

#### Scenario: Switching timeframes

- **WHEN** the user selects a different timeframe button
- **THEN** the chart reloads with that timeframe's stored bars, and shows an empty-state message when no bars are stored

#### Scenario: OHLC readout

- **WHEN** the user moves the crosshair over a candle
- **THEN** a legend shows that bar's open, high, low, and close values

### Requirement: Displayed data always matches the selection

When the user switches instruments or timeframes rapidly, the chart SHALL never display data belonging to a previously selected instrument or timeframe, even if that earlier response arrives late.

#### Scenario: Slow response for a stale selection

- **WHEN** the user selects symbol A and then symbol B before A's data arrives
- **THEN** the chart shows B's data; A's late response is discarded

### Requirement: Compatibility warnings at the chart

Compatibility warnings for the selected instrument SHALL be visible next to the chart itself, not only in the sidebar list.

#### Scenario: Charting a CFD

- **WHEN** the user selects an instrument flagged as a CFD
- **THEN** a CFD badge appears in the chart header while the chart renders normally

### Requirement: Sync controls in the UI

When a backend is available, the UI SHALL offer sync-all, sync-selected, and a full-refresh option, with a progress display while a run is active. These controls SHALL be the only way the UI causes market data to be fetched.

#### Scenario: Sync from the chart

- **WHEN** the user presses sync-selected with an instrument chosen
- **THEN** a sync starts for that instrument, progress is shown until completion, and the list and chart refresh from local storage afterwards

### Requirement: The frontend runs with or without a backend

The frontend SHALL operate in two modes against the same data contract: served by the local dev backend with sync available, and as a static site reading exported data files with sync controls absent or disabled. Chart browsing behavior SHALL be identical in both modes.

#### Scenario: Static mode

- **WHEN** the frontend is loaded as a static site without a backend
- **THEN** browsing, charting, and indicators work from the exported data files, and no sync can be triggered
