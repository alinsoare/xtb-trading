## MODIFIED Requirements

### Requirement: Per-indicator enable and disable

Each registered indicator SHALL be individually toggleable. Toggling SHALL take effect
immediately on the current chart, and enabled state SHALL persist across symbol and
timeframe switches and across page reloads on the same browser. Multiple indicators MAY be
enabled at once.

#### Scenario: Toggling an indicator

- **WHEN** the user enables an indicator and then switches to another symbol
- **THEN** the indicator remains enabled and recomputes for the newly selected symbol's bars

#### Scenario: Enabled state survives a reload

- **WHEN** the user enables an indicator and reloads the page
- **THEN** the indicator is still enabled and computes for the restored selection

### Requirement: Indicators scan the full loaded history

An enabled indicator SHALL compute over the entire series the chart is displaying —
everything the display limit admits, excluding only regions its own warm-up leaves undefined
— rather than a recent-bars window inside it, and ALL of its detected outputs SHALL be
rendered on the chart simultaneously. A signal SHALL never disappear merely because newer
bars arrived or a newer signal was detected.

#### Scenario: Old and new signals visible together

- **WHEN** an indicator detects signals both near the newest bars and hundreds of bars earlier in the displayed series
- **THEN** all of them are drawn on the chart at once, each at its own location

#### Scenario: New bars do not evict old signals

- **WHEN** a sync appends new bars and the indicator recomputes
- **THEN** signals in the displayed portion of the series remain visible; a signal leaves the chart only when its bars fall outside the display limit

#### Scenario: Raising the display limit deepens the scan

- **WHEN** the user raises the display limit so that older stored bars enter the view
- **THEN** the indicator recomputes over the wider series and signals in the newly admitted region appear

### Requirement: Insufficient-history warning

When an enabled indicator cannot compute because the displayed series holds too few bars, the
UI SHALL show a warning stating how many bars are needed versus available, because a chart
with no indicator output is otherwise indistinguishable from a chart with no qualifying
signals. A display limit set below an indicator's warm-up SHALL produce this warning rather
than silent emptiness, even when far more bars are stored.

#### Scenario: Too few bars

- **WHEN** an indicator needing 380 bars is enabled on a displayed series of 250 bars
- **THEN** the chart shows a warning naming the required and available counts instead of silently rendering nothing

#### Scenario: Display limit below the warm-up

- **WHEN** the user sets a display limit of 100 bars with an indicator needing 380 enabled
- **THEN** the warning names 380 required against 100 available, and raising the limit clears it

### Requirement: FVG indicator

The first registered indicator SHALL be a Fair Value Gap scanner over three consecutive
closed bars (bar1, bar2, bar3 in chronological order, bar3 newest), reproducing the original
MQL5 indicator's rules with its default parameters, all of which SHALL be defined in one
place. One deliberate deviation: the original's recent-bars scan cap (`bar_limit`, 120) is
dropped — the scan SHALL cover every displayed bar from the slow EMA warm-up boundary through
the second-newest displayed bar, and all detected zones SHALL be drawn at once. The pattern
rules:

- an EMA 13/89/377 regime ladder evaluated at bar3 decides which pattern directions are searched;
- the middle bar's body SHALL be at least as large as bar1's and bar3's bodies;
- swing structure: strictly stair-stepping highs and lows in the pattern direction (relaxable by parameter);
- the price gap (bullish: bar3 low above bar1 high; bearish: bar1 low above bar3 high) SHALL exceed a configured ratio of bar2's range;
- bar3's wick opposite the pattern direction SHALL NOT exceed a configured multiple of its body;
- a stochastic filter (%K 21, slowing 9) SHALL reject bullish patterns in overbought and bearish patterns in oversold territory;
- the zone height in instrument points SHALL fall within configured floor and ceiling values, using the catalog's point size.

Detected zones SHALL render as rectangles spanning from bar1's time forward a configured
number of bars, drawn behind the candles, with a direction-colored label at bar3.

#### Scenario: Bullish FVG detected

- **WHEN** three bars form a bullish stair-step with a qualifying gap between bar1's high and bar3's low, the EMA regime allows bullish patterns, and no filter rejects it
- **THEN** a bullish zone spanning that gap is drawn from bar1's time with an FVG label at bar3

#### Scenario: Filter rejection

- **WHEN** a pattern matches structurally but the stochastic is overbought for a bullish candidate
- **THEN** no zone is emitted for that candidate

#### Scenario: Zone deep in history is still drawn

- **WHEN** a qualifying pattern sits 700 bars back in a 1,000-bar series, well outside the original indicator's 120-bar cap
- **THEN** its zone is detected and drawn alongside any newer zones

### Requirement: FVG works on every timeframe after a full sync

With per-timeframe fetch depth in place, a fully synced symbol SHALL hold enough history on
every timeframe for the FVG indicator to scan (its warm-up plus a scannable region beyond
it), so that at the default display limit the indicator produces zones or a genuine
no-signals result — never a warm-up warning. Two exceptions stand: source scarcity the system
cannot fix, where an instrument's listed lifetime is shorter than the warm-up depth on a
timeframe (e.g. fewer than 380 weeks of existence for W1); and a display limit the user has
set below the warm-up. Both show the standard insufficient-history warning.

#### Scenario: Default timeframe scans successfully

- **WHEN** the user enables FVG on the default timeframe of a fully synced symbol
- **THEN** the scan runs over every displayed bar past the warm-up instead of reporting insufficient history
