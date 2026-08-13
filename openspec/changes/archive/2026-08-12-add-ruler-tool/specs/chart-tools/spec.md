## Purpose

Covers interactive, pointer-driven tools that act on the rendered chart rather than computing values from bar data — how a tool is activated from the toolbar, how it captures pointer input, and what it draws. The ruler measurement tool is the first such tool.

## ADDED Requirements

### Requirement: Chart tool toolbar controls

Each chart tool SHALL have a toggle button in the chart toolbar, presented in the same visual style as the indicator toggle buttons and grouped on the right-hand side of the toolbar row that holds the timeframe buttons and indicator toggles. A button SHALL show clearly whether its tool is currently active.

#### Scenario: Ruler button placement

- **WHEN** the chart view is displayed
- **THEN** a "Ruler" toggle button appears in the same toolbar row as the timeframe buttons and indicator toggles, positioned to the right of them, styled like an indicator toggle

#### Scenario: Active state is visible

- **WHEN** the user activates the ruler
- **THEN** the ruler button renders in its active state, and returns to its inactive state when the tool is deactivated

#### Scenario: Toggling the tool off

- **WHEN** the ruler is active and the user presses its toolbar button again
- **THEN** the tool deactivates, any measurement on the chart is removed, and normal chart interaction resumes

### Requirement: At most one chart tool is active

Activating a chart tool SHALL deactivate any other active chart tool, so that pointer input is never claimed by two tools at once.

#### Scenario: Activating a second tool

- **WHEN** a chart tool is active and the user activates a different chart tool
- **THEN** the first tool deactivates and discards its in-progress input, and only the newly activated tool responds to pointer input

### Requirement: Two-click ruler measurement with live preview

While the ruler is active, the user SHALL define a measurement with two clicks on the chart: the first click sets the start anchor, and the second click sets the end anchor and completes the measurement. Between the two clicks, moving the pointer SHALL continuously update a preview of the measurement, so the user sees the values before committing. Each anchor SHALL take its time from the stored bar nearest the pointer and its price from the exact pointer position, so that a measurement always spans whole bars.

#### Scenario: Completing a measurement

- **WHEN** the ruler is active and the user clicks a start point, moves the pointer, and clicks a second point
- **THEN** the measurement is drawn between the two anchors with its final values, and further pointer movement no longer changes it

#### Scenario: Live preview while measuring

- **WHEN** the user has set the start anchor and moves the pointer without clicking
- **THEN** the measurement region and its readout update on every pointer move to reflect the pointer's current price and bar

#### Scenario: Cancelling an in-progress measurement

- **WHEN** the user has set the start anchor and presses Escape before the second click
- **THEN** the in-progress measurement is discarded, nothing is drawn, and the ruler remains active and ready for a new measurement

### Requirement: Ruler measurement readout

A ruler measurement SHALL report all of the following between its two anchors: the price change, the percent change relative to the start anchor's price, the number of bars spanned, and the elapsed time. Price values SHALL use the same decimal precision as the chart's price scale for the selected instrument. The percent change SHALL be signed. The bar count SHALL be the number of stored bars in the range between the anchors, inclusive of both. The measurement SHALL be visually distinguishable by direction, so an upward measurement is not mistaken for a downward one.

#### Scenario: Measuring an upward move

- **WHEN** the user measures from a lower price to a higher price
- **THEN** the readout shows a positive price change, a positive percent change, the bar count, the elapsed time, and the measurement is styled as an upward move

#### Scenario: Measuring a downward move

- **WHEN** the user measures from a higher price to a lower price
- **THEN** the readout shows a negative price change and negative percent change, and the measurement is styled as a downward move

#### Scenario: Measuring backwards in time

- **WHEN** the user sets the end anchor at a bar earlier than the start anchor
- **THEN** the measurement is still drawn, with the bar count and elapsed time reported as non-negative magnitudes, and the price change reported relative to the first anchor clicked

#### Scenario: Measuring a single bar

- **WHEN** both anchors fall on the same bar
- **THEN** the readout reports a bar count of 1 and an elapsed time of zero without error

### Requirement: Completed measurements persist until dismissed

A completed ruler measurement SHALL remain drawn on the chart until the user dismisses it, so it can be read while the chart is examined. It SHALL be dismissed by pressing Escape, by starting a new measurement, or by deactivating the ruler. Starting a new measurement SHALL replace the previous one rather than accumulating measurements.

#### Scenario: Measurement stays on screen

- **WHEN** a measurement has been completed and the user moves the pointer around the chart
- **THEN** the measurement remains drawn with unchanged values

#### Scenario: Replacing a measurement

- **WHEN** a measurement is on the chart and the user clicks to start a new one
- **THEN** the previous measurement is removed and only the new measurement is present

#### Scenario: Dismissing with Escape

- **WHEN** a completed measurement is on the chart and the user presses Escape
- **THEN** the measurement is removed and the ruler remains active

### Requirement: Measurement anchors stay pinned to price and time

A drawn measurement SHALL stay anchored to the prices and bars it was taken against while the user pans and zooms the chart, so the measured region continues to mark the same candles.

#### Scenario: Panning and zooming with a measurement on screen

- **WHEN** a measurement is drawn and the user pans or zooms the chart
- **THEN** the measurement moves and rescales with the candles it was taken against, keeping its reported values unchanged

### Requirement: Tools do not disturb normal chart interaction

When no chart tool is active, chart behavior SHALL be exactly as it is without the tools feature: crosshair with the OHLC readout, panning, zooming, and indicator rendering all unaffected. While a tool is active, the crosshair OHLC readout and indicator rendering SHALL continue to work.

#### Scenario: Inactive tools

- **WHEN** no chart tool is active
- **THEN** clicking, dragging, and scrolling on the chart pan, zoom, and move the crosshair as usual, and no measurement is created

#### Scenario: Indicators remain visible while measuring

- **WHEN** an indicator is enabled and the user takes a measurement
- **THEN** the indicator's drawings and the measurement are both visible, and the OHLC readout still follows the crosshair

### Requirement: Tool state is per-view and not persisted

Chart tool activation and any drawn measurement SHALL be discarded when the user switches instrument or timeframe, because a measurement refers to specific bars. Neither the active tool nor any measurement SHALL be persisted across page loads.

#### Scenario: Switching timeframe

- **WHEN** a measurement is drawn and the user selects a different timeframe
- **THEN** the measurement is removed and the chart reloads normally

#### Scenario: Reloading the page

- **WHEN** the user activates the ruler, takes a measurement, and reloads the page
- **THEN** no tool is active and no measurement is drawn

### Requirement: Tools work without a backend and fetch no data

Chart tools SHALL operate purely on already-loaded bar data. They SHALL behave identically whether the frontend is served by the local dev backend or as a static export, and SHALL never trigger a market data fetch or sync.

#### Scenario: Measuring in static mode

- **WHEN** the frontend is loaded as a static site without a backend and the user takes a measurement
- **THEN** the measurement works exactly as in dev mode and no network request for market data is made

#### Scenario: No bars to measure

- **WHEN** the selected instrument and timeframe have no stored bars
- **THEN** the ruler cannot start a measurement and the chart's existing empty-state message is shown unchanged
