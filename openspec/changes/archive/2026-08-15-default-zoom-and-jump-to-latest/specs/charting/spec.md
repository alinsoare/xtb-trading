## ADDED Requirements

### Requirement: Default chart zoom frames the most recent bars

When the chart is presented afresh — an instrument selected, a timeframe switched, the display limit changed, or the series reloaded after a sync — the initial view SHALL frame the 200 most recent bars of the displayed slice rather than the whole slice. The default SHALL be the same on every timeframe and SHALL NOT be a user-facing setting. Bars in the displayed slice that fall outside the initial view SHALL remain loaded and reachable by panning and zooming, so the default zoom bounds only what is visible and never what is available. Where the displayed slice holds 200 bars or fewer, the whole slice SHALL be framed, with no empty space reserved for bars that do not exist. Framing the view SHALL NOT cause any market-data fetch.

#### Scenario: Opening a deep series

- **WHEN** the user charts a timeframe holding 5,000 displayed bars
- **THEN** the initial view frames the 200 most recent of those bars, at a zoom where individual candles are legible

#### Scenario: Older bars remain reachable

- **WHEN** the user pans left from the initial view of a 5,000-bar slice
- **THEN** the earlier bars of the slice scroll into view, without any request to the data source

#### Scenario: Switching timeframe re-frames the view

- **WHEN** the user zooms out to see the whole slice and then selects a different timeframe
- **THEN** the new timeframe opens framed on its 200 most recent bars rather than at the zoom the user had left behind

#### Scenario: Slice shorter than the default zoom

- **WHEN** the selected series holds 80 bars
- **THEN** all 80 bars are framed in the view and no empty space is reserved for the missing ones

#### Scenario: Reload after a sync

- **WHEN** a sync completes and the chart reloads its series
- **THEN** the view is framed on the 200 most recent bars, now including any newly stored bars

### Requirement: Jump to latest data without changing zoom

The chart SHALL offer a control that returns the view to the newest bar of the displayed slice, scrolling so that the newest bar sits at the leading edge of the view while leaving the current zoom — the number of bars the view spans — unchanged. The control SHALL be available whenever a series is charted, including when the view is already at the newest bar, in which case pressing it SHALL leave the view as it is. "Latest" SHALL mean the newest bar already loaded; the control SHALL NOT trigger a market-data fetch or a sync, and SHALL behave identically whether the frontend is served by the local dev backend or as a static export. Because the jump is an ordinary change of view, chart tools and indicators SHALL be unaffected: a drawn measurement SHALL stay anchored to its own bars rather than being discarded.

#### Scenario: Returning to the newest bars at a chosen zoom

- **WHEN** the user zooms in to roughly 40 bars, pans far back into history, and presses the jump-to-latest control
- **THEN** the view returns to the newest bar with the same span of roughly 40 bars still in view

#### Scenario: Zoomed out further than the default

- **WHEN** the user zooms out to span 1,000 bars, pans back, and presses the jump-to-latest control
- **THEN** the view returns to the newest bar still spanning 1,000 bars, rather than snapping back to the 200-bar default

#### Scenario: Already at the newest bar

- **WHEN** the user presses the jump-to-latest control immediately after a chart opens
- **THEN** the view is unchanged and no error is shown

#### Scenario: No data to jump to

- **WHEN** the selected instrument and timeframe have no stored bars and the user presses the jump-to-latest control
- **THEN** nothing is drawn, the existing empty-state message remains, and no request is made to the data source

#### Scenario: Jumping in static mode

- **WHEN** the frontend is loaded as a static site without a backend and the user presses the jump-to-latest control
- **THEN** the view returns to the newest exported bar and no market-data request is made

#### Scenario: A measurement survives the jump

- **WHEN** a ruler measurement is drawn and the user presses the jump-to-latest control
- **THEN** the measurement stays anchored to the bars it was taken against, exactly as it does when the user pans by hand

## MODIFIED Requirements

### Requirement: Chart display limit

The chart SHALL make available at most a bounded number of the most recent bars of the selected series, bounded by a limit the user controls. The default SHALL be 5,000 bars, the same on every timeframe, and the user SHALL be able to raise or lower it or set it to show every stored bar. The limit bounds the slice the chart draws and the user can pan and zoom across; it is distinct from the zoom, which bounds how much of that slice is visible at once. Changing the limit SHALL take effect immediately on the current chart and SHALL NOT cause any market-data fetch, because the bars are already loaded. Where the series holds fewer bars than the limit, the whole series SHALL be available. A limit value that is not a positive whole number SHALL be refused, leaving the previous effective limit in force.

#### Scenario: Default limit on a deep series

- **WHEN** the user charts a timeframe holding 12,000 stored bars with the default limit
- **THEN** the 5,000 most recent bars are available to pan and zoom across, and the older bars are absent from the chart entirely

#### Scenario: Showing everything

- **WHEN** the user sets the display limit to show all bars
- **THEN** every stored bar of the selected series is available to pan and zoom across

#### Scenario: Lowering the limit

- **WHEN** the user lowers the display limit while a chart is open
- **THEN** the chart immediately redraws with only that many most-recent bars, framed on the default zoom, with no request to the data source

#### Scenario: Series shorter than the limit

- **WHEN** the selected series holds 300 bars and the limit is 5,000
- **THEN** all 300 bars are available and no empty space is reserved for the missing ones

#### Scenario: Changing the limit discards a measurement

- **WHEN** a chart tool measurement is drawn and the user changes the display limit
- **THEN** the measurement is discarded, because its anchors refer to bars the view may no longer contain

#### Scenario: Invalid limit is refused

- **WHEN** the user enters a display limit of zero, a negative number, or text that is not a number
- **THEN** the value is refused and the chart continues using the last valid limit

### Requirement: User settings persist across reloads

The UI SHALL remember the user's settings on the same browser and restore them on the next load: the chart display limit, the selected instrument, the selected timeframe, the enabled indicators, and the sidebar filters (search text, asset class, compatible-only, sort order). Persistence SHALL be local to the browser and SHALL NOT travel with the exported data or be shared between browsers. Only these settings persist; transient chart state SHALL NOT — neither an in-progress or completed measurement, nor the current zoom and scroll position, which start from the default framing on every load. Neither SHALL the sync controls' own state — the full-refresh option and the periodic-refresh control both start off on every load, so a reload can never resume fetching. A stored setting that is unusable — an instrument no longer in the catalog, an unknown timeframe, an unparseable limit, an unknown sort order — SHALL be replaced by its default without blocking the rest of the restore. Where the browser denies persistent storage, the app SHALL operate normally with default settings.

#### Scenario: Settings survive a reload

- **WHEN** the user selects an instrument and timeframe, enables an indicator, sets a display limit, filters and sorts the sidebar, and reloads the page
- **THEN** the same instrument, timeframe, indicator state, display limit, filters and sort order are in effect after the reload

#### Scenario: Zoom is not restored

- **WHEN** the user zooms out to span the whole slice and reloads the page
- **THEN** the restored instrument and timeframe open framed on the default zoom, not the zoom in force before the reload

#### Scenario: Stored instrument is gone from the catalog

- **WHEN** the persisted instrument is no longer in the catalog on the next load
- **THEN** the app falls back to its default selection, keeps the other restored settings, and renders normally

#### Scenario: Storage is unavailable

- **WHEN** the browser blocks persistent storage
- **THEN** the app loads with default settings and continues to work, without an error state

#### Scenario: Settings are not part of the published data

- **WHEN** two different browsers load the same published site
- **THEN** each keeps its own settings, and neither is affected by the other's
