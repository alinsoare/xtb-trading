# charting Specification

## Purpose

Covers the user-facing chart application: browsing the instrument catalog, viewing candlestick charts across timeframes, seeing compatibility warnings, and operating sync controls — all against locally stored data only.

## Requirements

### Requirement: Symbol browser

The UI SHALL list all catalog instruments with free-text search (matching symbol and names), an asset-class filter, and a compatible-only filter. Each entry SHALL show its sync freshness (bar count and last sync, or "never synced") and any compatibility warnings as badges.

Every entry the filters admit SHALL identify its instrument — its symbol, its asset class and its name — and no screening outcome SHALL displace that identification. Filters may exclude an instrument from the list entirely; nothing inside a listed entry may leave it unidentified.

Each entry SHALL additionally carry its screening result: the marks its score earns inline with its symbol code, the short names of the sources that earned its score on a line beneath those marks, its 30-day range and its position in that range. The range and position figures SHALL be shown for every screened instrument, whether or not it earned a mark, so a list with no marks reads as screened-and-quiet rather than broken. An instrument that could not be screened SHALL say why — not screened, or insufficient history — in place of its figures, and only in place of its figures.

Each source name SHALL read as its own bounded label: green text within a green rectangular outline, unfilled so the row's background shows through. The outline SHALL enclose exactly one source name, so the fired sources are countable without reading the words, and adjacent labels SHALL stay visually separate rather than sharing or touching a border. Every source SHALL receive the same treatment, with no colour, weight or size distinguishing one source from another — the mark count already carries strength. The green SHALL be the green of the marks, so the labels read as belonging to the same signal, and SHALL remain distinguishable from the row's muted range, position and state text.

The marks SHALL be accompanied, on demand, by the rules that fired and the points each contributed, so a mark can be audited from the list itself. The source names are for at-a-glance scanning and SHALL NOT duplicate the per-rule points.

The list SHALL offer sorting by screening score alongside the existing filters. Sorting SHALL apply to whatever the filters admit, and SHALL be stable for instruments sharing a score.

#### Scenario: Filtering the catalog

- **WHEN** the user types a search query and selects an asset class
- **THEN** the list shows only instruments matching both, and a clear message when nothing matches

#### Scenario: Screening result in the row

- **WHEN** an instrument scores 5 in the screener from the eligibility gate, a D1 gap with an H1 run and a pivot 2 points distant
- **THEN** its row shows three marks inline with its symbol, names those three sources on the line beneath, and shows its 30-day range and its position in that range

#### Scenario: Source names read as green outlined labels

- **WHEN** a screened row names the sources that earned its score
- **THEN** each name is green text inside its own green rectangular outline with no fill behind it, and the number of outlines can be counted without reading the names

#### Scenario: Every source looks the same

- **WHEN** a row names sources drawn from different rules
- **THEN** all of its labels carry the identical green outline treatment, with nothing about a label's colour, weight or size implying that its source counted for more

#### Scenario: Labels stay apart when the line wraps

- **WHEN** a row names enough sources that the line wraps
- **THEN** every label keeps its own complete outline, and no two labels touch or appear to share a border across or within lines

#### Scenario: Rows on the same score read differently

- **WHEN** two instruments both score 4, one from a D1 gap with an H1 run and one from a distant pivot
- **THEN** both show two marks, their source lines name different sources, and the difference is visible without inspecting either row

#### Scenario: Screened but unmarked

- **WHEN** an instrument is screened and earns no mark
- **THEN** its row shows no marks, names no source, shows no empty outline, and still shows its 30-day range and position figures

#### Scenario: Auditing a mark

- **WHEN** the user inspects the marks on a row
- **THEN** the rules that fired and their points are shown

#### Scenario: Sorting by score

- **WHEN** the user sorts by score with an asset-class filter active
- **THEN** the instruments that filter admits are ordered by score, highest first, and instruments sharing a score keep a stable relative order

#### Scenario: Unscreenable instrument

- **WHEN** a disabled instrument, or one with too little stored history, appears in the list
- **THEN** its row shows its symbol, asset class and name exactly as a screened row does, and states that it was not screened, or that its history is insufficient, where its range and position figures would otherwise be

#### Scenario: Identifying an instrument with insufficient history

- **WHEN** the user reads a row whose instrument has too little stored history
- **THEN** the instrument's symbol and name are legible in that row without selecting it or opening its chart

#### Scenario: Filters still hide rows

- **WHEN** the search query, asset-class filter or compatible-only filter excludes an unscreenable instrument
- **THEN** that instrument has no row at all, rather than a row missing its name

### Requirement: Candlestick chart with timeframe switching

Selecting an instrument SHALL display an interactive OHLC candlestick chart (pan, zoom, crosshair) of its locally stored bars. The user SHALL be able to switch between M15, H1, D1, and W1. Bar timestamps arriving as UTC epoch seconds SHALL be rendered without unit confusion against millisecond-based date arithmetic.

#### Scenario: Switching timeframes

- **WHEN** the user selects a different timeframe button
- **THEN** the chart reloads with that timeframe's stored bars, and shows an empty-state message when no bars are stored

#### Scenario: OHLC readout

- **WHEN** the user moves the crosshair over a candle
- **THEN** a legend shows that bar's open, high, low, and close values

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

### Requirement: Price display precision follows the instrument

The number of decimals used to display prices SHALL be derived from the selected instrument's point size in the catalog: a point size of `0.01` displays two decimals, a point size of `0.00001` displays five. Every price the UI shows for that instrument SHALL use that same precision — the price scale, the crosshair's price label, the crosshair OHLC legend, and any chart tool readout — so that two readings of the same price never disagree. Where the UI is given no usable point size for the selected instrument, it SHALL fall back to two decimals and continue rendering, rather than failing or displaying an unbounded number of decimals.

#### Scenario: Instrument quoted in hundredths

- **WHEN** the user charts an instrument whose point size is `0.01`
- **THEN** the price scale, the crosshair price label, and the OHLC legend each show two decimals

#### Scenario: Instrument quoted more finely

- **WHEN** the user charts an instrument whose point size is `0.00001`
- **THEN** the price scale, the crosshair price label, and the OHLC legend each show five decimals

#### Scenario: Readings of the same price agree

- **WHEN** a chart tool reports a price or a price difference for the selected instrument
- **THEN** it is shown with the same number of decimals as the OHLC legend and the price scale

#### Scenario: Switching to an instrument with different precision

- **WHEN** the user switches from an instrument quoted in five decimals to one quoted in two
- **THEN** the displayed precision changes to match the newly selected instrument

#### Scenario: Precision cannot be determined

- **WHEN** the UI is served an instrument with no usable point size, which a valid catalog cannot produce but a hand-edited or truncated data file can
- **THEN** prices are displayed with two decimals and the chart renders normally

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

When a backend is available, the UI SHALL offer sync-all, sync-selected, a full-refresh option, and a periodic-refresh control, with a progress display while a run is active. These controls SHALL be the only way the UI causes market data to be fetched.

#### Scenario: Sync from the chart

- **WHEN** the user presses sync-selected with an instrument chosen
- **THEN** a sync starts for that instrument, progress is shown until completion, and the list and chart refresh from local storage afterwards

#### Scenario: Periodic refresh is presented as a sync control

- **WHEN** the sync controls are shown
- **THEN** the periodic-refresh control appears among them, off, and its state is visible while it is on

### Requirement: The frontend runs with or without a backend

The frontend SHALL operate in two modes against the same data contract: served by the local dev backend with sync available, and as a static site reading exported data files with sync controls absent or disabled. Chart browsing behavior SHALL be identical in both modes.

#### Scenario: Static mode

- **WHEN** the frontend is loaded as a static site without a backend
- **THEN** browsing, charting, and indicators work from the exported data files, and no sync can be triggered
