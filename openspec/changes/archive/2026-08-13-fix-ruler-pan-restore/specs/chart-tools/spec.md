## MODIFIED Requirements

### Requirement: Tools do not disturb normal chart interaction

When no chart tool is active, chart behavior SHALL be exactly as it is without the tools
feature: crosshair with the OHLC readout, panning, zooming, and indicator rendering all
unaffected. While a tool is active, the crosshair OHLC readout and indicator rendering SHALL
continue to work. A tool that suppresses a chart interaction while it is active SHALL restore
that interaction exactly as it was when the tool deactivates, however the deactivation was
triggered. Restoration SHALL depend only on what the tool recorded before it made its change,
never on reading the setting back from the chart afterwards, and SHALL survive repeated
activation. A user SHALL never need to reload the page to recover an interaction a tool
suppressed.

#### Scenario: Inactive tools

- **WHEN** no chart tool is active
- **THEN** clicking, dragging, and scrolling on the chart pan, zoom, and move the crosshair as usual, and no measurement is created

#### Scenario: Indicators remain visible while measuring

- **WHEN** an indicator is enabled and the user takes a measurement
- **THEN** the indicator's drawings and the measurement are both visible, and the OHLC readout still follows the crosshair

#### Scenario: Panning resumes after the ruler is switched off

- **WHEN** the user activates the ruler, takes a measurement, and switches the tool off from its toolbar button
- **THEN** dragging the chart body pans it again immediately, with no page reload

#### Scenario: Repeated use does not degrade interaction

- **WHEN** the user activates and deactivates the ruler several times in a row
- **THEN** dragging the chart body pans it after every deactivation, exactly as it did before the tool was first used

#### Scenario: Panning resumes after switching to another tool and off again

- **WHEN** the ruler is active and the user activates a different chart tool, then switches that tool off
- **THEN** dragging the chart body pans it again, because each tool restored what it suppressed

### Requirement: Tool state is per-view and not persisted

Chart tool activation and any drawn measurement SHALL be discarded when the user switches
instrument or timeframe, because a measurement refers to specific bars. Neither the active
tool nor any measurement SHALL be persisted across page loads. Discarding the tool this way
SHALL restore chart interaction exactly as switching the tool off by hand does, because the
user did not ask for a degraded chart by changing selection.

#### Scenario: Switching timeframe

- **WHEN** a measurement is drawn and the user selects a different timeframe
- **THEN** the measurement is removed and the chart reloads normally

#### Scenario: Reloading the page

- **WHEN** the user activates the ruler, takes a measurement, and reloads the page
- **THEN** no tool is active and no measurement is drawn

#### Scenario: Panning resumes after a symbol switch deactivates the tool

- **WHEN** the ruler is active and the user selects a different instrument
- **THEN** the tool is deactivated, its measurement is removed, and dragging the chart body pans the newly loaded series
