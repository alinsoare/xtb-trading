# charting Specification

## Purpose

Covers the user-facing chart application: browsing the instrument catalog, viewing candlestick charts across timeframes, seeing compatibility warnings, and operating sync controls — all against locally stored data only.

## Requirements

### Requirement: Symbol browser

The UI SHALL list all catalog instruments with free-text search (matching symbol and names), an asset-class filter, and a compatible-only filter. Each entry SHALL show its sync freshness (bar count and last sync, or "never synced") and any compatibility warnings as badges.

Each entry SHALL additionally carry its screening result: the marks its score earns, its 30-day range and its position in that range. The range and position figures SHALL be shown for every screened instrument, whether or not it earned a mark, so a list with no marks reads as screened-and-quiet rather than broken. An instrument that could not be screened SHALL say why — not screened, or insufficient history — in place of its figures.

The marks SHALL be accompanied, on demand, by the rules that fired and the points each contributed, so a mark can be audited from the list itself.

The list SHALL offer sorting by screening score alongside the existing filters. Sorting SHALL apply to whatever the filters admit, and SHALL be stable for instruments sharing a score.

#### Scenario: Filtering the catalog

- **WHEN** the user types a search query and selects an asset class
- **THEN** the list shows only instruments matching both, and a clear message when nothing matches

#### Scenario: Screening result in the row

- **WHEN** an instrument scores 5 in the screener
- **THEN** its row shows two marks together with its 30-day range and its position in that range

#### Scenario: Screened but unmarked

- **WHEN** an instrument is screened and earns no mark
- **THEN** its row shows no marks and still shows its 30-day range and position figures

#### Scenario: Auditing a mark

- **WHEN** the user inspects the marks on a row
- **THEN** the rules that fired and their points are shown

#### Scenario: Sorting by score

- **WHEN** the user sorts by score with an asset-class filter active
- **THEN** the instruments that filter admits are ordered by score, highest first, and instruments sharing a score keep a stable relative order

#### Scenario: Unscreenable instrument

- **WHEN** a disabled instrument, or one with too little stored history, appears in the list
- **THEN** its row states that it was not screened, or that its history is insufficient, rather than showing an empty result

### Requirement: Candlestick chart with timeframe switching

Selecting an instrument SHALL display an interactive OHLC candlestick chart (pan, zoom, crosshair) of its locally stored bars. The user SHALL be able to switch between M15, H1, D1, and W1. Bar timestamps arriving as UTC epoch seconds SHALL be rendered without unit confusion against millisecond-based date arithmetic.

#### Scenario: Switching timeframes

- **WHEN** the user selects a different timeframe button
- **THEN** the chart reloads with that timeframe's stored bars, and shows an empty-state message when no bars are stored

#### Scenario: OHLC readout

- **WHEN** the user moves the crosshair over a candle
- **THEN** a legend shows that bar's open, high, low, and close values

### Requirement: Chart display limit

The chart SHALL display at most a bounded number of the most recent bars of the selected series, bounded by a limit the user controls. The default SHALL be 5,000 bars, the same on every timeframe, and the user SHALL be able to raise or lower it or set it to show every stored bar. Changing the limit SHALL take effect immediately on the current chart and SHALL NOT cause any market-data fetch, because the bars are already loaded. Where the series holds fewer bars than the limit, the whole series SHALL be displayed. A limit value that is not a positive whole number SHALL be refused, leaving the previous effective limit in force.

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

The UI SHALL remember the user's settings on the same browser and restore them on the next load: the chart display limit, the selected instrument, the selected timeframe, the enabled indicators, and the sidebar filters (search text, asset class, compatible-only, sort order). Persistence SHALL be local to the browser and SHALL NOT travel with the exported data or be shared between browsers. Only these settings persist; transient chart state such as an in-progress or completed measurement SHALL NOT, and neither SHALL the sync controls' own state — the full-refresh option and the periodic-refresh control both start off on every load, so a reload can never resume fetching. A stored setting that is unusable — an instrument no longer in the catalog, an unknown timeframe, an unparseable limit, an unknown sort order — SHALL be replaced by its default without blocking the rest of the restore. Where the browser denies persistent storage, the app SHALL operate normally with default settings.

#### Scenario: Settings survive a reload

- **WHEN** the user selects an instrument and timeframe, enables an indicator, sets a display limit, filters and sorts the sidebar, and reloads the page
- **THEN** the same instrument, timeframe, indicator state, display limit, filters and sort order are in effect after the reload

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
