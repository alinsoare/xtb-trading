## MODIFIED Requirements

### Requirement: Candlestick chart with timeframe switching

Selecting an instrument SHALL display an interactive OHLC candlestick chart (pan, zoom, crosshair) of its locally stored bars. The user SHALL be able to switch between H1, D1, and W1. Bar timestamps arriving as UTC epoch seconds SHALL be rendered without unit confusion against millisecond-based date arithmetic.

The timeframe controls the UI offers SHALL be exactly the supported set the backend or the exported snapshot declares, in the order it declares them, so a timeframe the system no longer supports cannot be selected from the chart at all.

#### Scenario: Switching timeframes

- **WHEN** the user selects a different timeframe button
- **THEN** the chart reloads with that timeframe's stored bars, and shows an empty-state message when no bars are stored

#### Scenario: No control for a retired timeframe

- **WHEN** the user opens the chart against a store that still holds M15 bars
- **THEN** the timeframe controls offer H1, D1 and W1 only, and no control exists that would chart the retired timeframe

#### Scenario: OHLC readout

- **WHEN** the user moves the crosshair over a candle
- **THEN** a legend shows that bar's open, high, low, and close values

### Requirement: User settings persist across reloads

The UI SHALL remember the user's settings on the same browser and restore them on the next load: the chart display limit, the selected instrument, the selected timeframe, the enabled indicators, and the sidebar filters (search text, asset class, quote currency, exchange, compatible-only, enabled-only, sort order). Persistence SHALL be local to the browser and SHALL NOT travel with the exported data or be shared between browsers. Only these settings persist; transient chart state SHALL NOT — neither an in-progress or completed measurement, nor the current zoom and scroll position, which start from the default framing on every load. Neither SHALL the sync controls' own state — the full-refresh option and the periodic-refresh control both start off on every load, so a reload can never resume fetching. A stored setting that is unusable — an instrument no longer in the catalog, an unknown timeframe, an unparseable limit, an unknown sort order, an asset class, quote currency or exchange no longer carried by any loaded instrument — SHALL be replaced by its default without blocking the rest of the restore. A sort order the list no longer offers SHALL be treated as unknown, so a browser holding the withdrawn sync-recency order restores the default order and keeps its other settings, without a migration step and without an error. A timeframe the system no longer supports SHALL likewise be treated as unknown, so a browser holding a withdrawn timeframe restores the default timeframe and keeps its other settings, again without a migration step and without an error. Restoring a filter SHALL NOT be able to hide the whole catalog behind a value the user cannot see in the filter's own choices. Where the browser denies persistent storage, the app SHALL operate normally with default settings.

#### Scenario: Settings survive a reload

- **WHEN** the user selects an instrument and timeframe, enables an indicator, sets a display limit, filters and sorts the sidebar, and reloads the page
- **THEN** the same instrument, timeframe, indicator state, display limit, filters and sort order are in effect after the reload

#### Scenario: The headroom order survives a reload

- **WHEN** the user sorts the sidebar by headroom and reloads the page
- **THEN** the list is still sorted by headroom after the reload

#### Scenario: A withdrawn sort order falls back

- **WHEN** the browser holds a persisted sort order of sync recency, which the list no longer offers
- **THEN** the list restores the catalog's default order, every other persisted setting is restored as usual, and no error is shown

#### Scenario: A withdrawn timeframe falls back

- **WHEN** the browser holds a persisted timeframe of M15, which the system no longer supports
- **THEN** the chart opens on the default timeframe, every other persisted setting — instrument, indicators, display limit, filters and sort order — is restored as usual, and no error is shown

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
