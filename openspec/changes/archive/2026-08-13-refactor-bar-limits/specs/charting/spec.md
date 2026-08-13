## ADDED Requirements

### Requirement: Chart display limit

The chart SHALL display at most a bounded number of the most recent bars of the selected
series, bounded by a limit the user controls. The default SHALL be 5,000 bars, the same on
every timeframe, and the user SHALL be able to raise or lower it or set it to show every
stored bar. Changing the limit SHALL take effect immediately on the current chart and SHALL
NOT cause any market-data fetch, because the bars are already loaded. Where the series holds
fewer bars than the limit, the whole series SHALL be displayed. A limit value that is not a
positive whole number SHALL be refused, leaving the previous effective limit in force.

#### Scenario: Default limit on a deep series

- **WHEN** the user charts a timeframe holding 12,000 stored bars with the default limit
- **THEN** the chart shows the 5,000 most recent bars, and the older bars are absent from the view

#### Scenario: Showing everything

- **WHEN** the user sets the display limit to show all bars
- **THEN** the chart shows every stored bar of the selected series

#### Scenario: Lowering the limit

- **WHEN** the user lowers the display limit while a chart is open
- **THEN** the chart immediately redraws with only that many most-recent bars, with no request to the data source

#### Scenario: Series shorter than the limit

- **WHEN** the selected series holds 300 bars and the limit is 5,000
- **THEN** all 300 bars are displayed and no empty space is reserved for the missing ones

#### Scenario: Changing the limit discards a measurement

- **WHEN** a chart tool measurement is drawn and the user changes the display limit
- **THEN** the measurement is discarded, because its anchors refer to bars the view may no longer contain

#### Scenario: Invalid limit is refused

- **WHEN** the user enters a display limit of zero, a negative number, or text that is not a number
- **THEN** the value is refused and the chart continues using the last valid limit

### Requirement: User settings persist across reloads

The UI SHALL remember the user's settings on the same browser and restore them on the next
load: the chart display limit, the selected instrument, the selected timeframe, the enabled
indicators, and the sidebar filters (search text, asset class, compatible-only). Persistence
SHALL be local to the browser and SHALL NOT travel with the exported data or be shared
between browsers. Only these settings persist; transient chart state such as an in-progress
or completed measurement SHALL NOT, and neither SHALL the sync controls' own state — the
full-refresh option and the periodic-refresh control both start off on every load, so a
reload can never resume fetching. A stored setting that is unusable — an instrument no
longer in the catalog, an unknown timeframe, an unparseable limit — SHALL be replaced by its
default without blocking the rest of the restore. Where the browser denies persistent
storage, the app SHALL operate normally with default settings.

#### Scenario: Settings survive a reload

- **WHEN** the user selects an instrument and timeframe, enables an indicator, sets a display limit, filters the sidebar, and reloads the page
- **THEN** the same instrument, timeframe, indicator state, display limit, and filters are in effect after the reload

#### Scenario: Stored instrument is gone from the catalog

- **WHEN** the persisted instrument is no longer in the catalog on the next load
- **THEN** the app falls back to its default selection, keeps the other restored settings, and renders normally

#### Scenario: Storage is unavailable

- **WHEN** the browser blocks persistent storage
- **THEN** the app loads with default settings and continues to work, without an error state

#### Scenario: Settings are not part of the published data

- **WHEN** two different browsers load the same published site
- **THEN** each keeps its own settings, and neither is affected by the other's

## MODIFIED Requirements

### Requirement: Sync controls in the UI

When a backend is available, the UI SHALL offer sync-all, sync-selected, a full-refresh
option, and a periodic-refresh control, with a progress display while a run is active. These
controls SHALL be the only way the UI causes market data to be fetched.

#### Scenario: Sync from the chart

- **WHEN** the user presses sync-selected with an instrument chosen
- **THEN** a sync starts for that instrument, progress is shown until completion, and the list and chart refresh from local storage afterwards

#### Scenario: Periodic refresh is presented as a sync control

- **WHEN** the sync controls are shown
- **THEN** the periodic-refresh control appears among them, off, and its state is visible while it is on
