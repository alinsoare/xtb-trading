# Delta Spec: indicators

## Purpose

Defines the client-side indicator framework — a registry of indicators the user can enable and disable individually — and its first implementation, a working Fair Value Gap (FVG) scanner with signal parity to the original MQL5 indicator.

## ADDED Requirements

### Requirement: Pluggable indicator registry

Indicators SHALL be registered in a client-side registry. Each registration declares an identifier, a display label, the minimum number of bars it needs, and how its output is rendered on the chart. The UI SHALL derive its indicator controls from the registry, so adding a new indicator requires only registering it — no changes to the chart UI or any server component.

#### Scenario: New indicator appears automatically

- **WHEN** a developer registers a second indicator in the registry
- **THEN** the UI shows a toggle for it alongside existing indicators without further UI changes

### Requirement: Per-indicator enable and disable

Each registered indicator SHALL be individually toggleable. Toggling SHALL take effect immediately on the current chart, and enabled state SHALL persist across symbol and timeframe switches within a session. Multiple indicators MAY be enabled at once.

#### Scenario: Toggling an indicator

- **WHEN** the user enables an indicator and then switches to another symbol
- **THEN** the indicator remains enabled and recomputes for the newly selected symbol's bars

### Requirement: Indicators compute client-side from stored bars

Indicator values SHALL be computed in the browser from the bars already loaded for the chart. Enabling, disabling, or recomputing an indicator SHALL NOT trigger any market-data fetch or require a server-side computation endpoint, so indicators behave identically in dev mode and on the static site.

#### Scenario: Indicator on the static site

- **WHEN** the user enables an indicator on the published static site
- **THEN** it computes and renders from the already-loaded bars with no additional network requests beyond the data files

### Requirement: Indicators scan the full loaded history

An enabled indicator SHALL compute over the entire loaded bar series (excluding only regions its own warm-up leaves undefined), not a recent-bars window, and ALL of its detected outputs SHALL be rendered on the chart simultaneously. A signal SHALL never disappear merely because newer bars arrived or a newer signal was detected.

#### Scenario: Old and new signals visible together

- **WHEN** an indicator detects signals both near the newest bars and hundreds of bars earlier in the loaded series
- **THEN** all of them are drawn on the chart at once, each at its own location

#### Scenario: New bars do not evict old signals

- **WHEN** a sync appends new bars and the indicator recomputes
- **THEN** signals in the retained portion of the series remain visible; signals leave the chart only when their bars are pruned from storage

### Requirement: Insufficient-history warning

When an enabled indicator cannot compute because too few bars are stored, the UI SHALL show a warning stating how many bars are needed versus available, because a chart with no indicator output is otherwise indistinguishable from a chart with no qualifying signals.

#### Scenario: Too few bars

- **WHEN** an indicator needing 380 bars is enabled on a series with 250 bars
- **THEN** the chart shows a warning naming the required and available counts instead of silently rendering nothing

### Requirement: FVG indicator

The first registered indicator SHALL be a Fair Value Gap scanner over three consecutive closed bars (bar1, bar2, bar3 in chronological order, bar3 newest), reproducing the original MQL5 indicator's rules with its default parameters, all of which SHALL be defined in one place. One deliberate deviation: the original's recent-bars scan cap (`bar_limit`, 120) is dropped — the scan SHALL cover every stored bar from the slow EMA warm-up boundary through the second-newest bar, and all detected zones SHALL be drawn at once. The pattern rules:

- an EMA 13/89/377 regime ladder evaluated at bar3 decides which pattern directions are searched;
- the middle bar's body SHALL be at least as large as bar1's and bar3's bodies;
- swing structure: strictly stair-stepping highs and lows in the pattern direction (relaxable by parameter);
- the price gap (bullish: bar3 low above bar1 high; bearish: bar1 low above bar3 high) SHALL exceed a configured ratio of bar2's range;
- bar3's wick opposite the pattern direction SHALL NOT exceed a configured multiple of its body;
- a stochastic filter (%K 21, slowing 9) SHALL reject bullish patterns in overbought and bearish patterns in oversold territory;
- the zone height in instrument points SHALL fall within configured floor and ceiling values, using the catalog's point size.

Detected zones SHALL render as rectangles spanning from bar1's time forward a configured number of bars, drawn behind the candles, with a direction-colored label at bar3.

#### Scenario: Bullish FVG detected

- **WHEN** three bars form a bullish stair-step with a qualifying gap between bar1's high and bar3's low, the EMA regime allows bullish patterns, and no filter rejects it
- **THEN** a bullish zone spanning that gap is drawn from bar1's time with an FVG label at bar3

#### Scenario: Filter rejection

- **WHEN** a pattern matches structurally but the stochastic is overbought for a bullish candidate
- **THEN** no zone is emitted for that candidate

#### Scenario: Zone deep in history is still drawn

- **WHEN** a qualifying pattern sits 700 bars back in a 1,000-bar series, well outside the original indicator's 120-bar cap
- **THEN** its zone is detected and drawn alongside any newer zones

### Requirement: FVG signal parity with the MT5 original

The FVG computation SHALL preserve the numeric conventions the original depends on, because deviations change signals: the EMA SHALL be seeded with the SMA of the first period's values (not a first-value seed — with EMA 377 the difference persists long enough to alter signals); the stochastic SHALL use rolling low/high extremes with SMA slowing per MT5's STO_LOWHIGH mode; the newest stored bar SHALL play MT5's forming bar and be excluded from pattern matching; and no signal SHALL be emitted at all until the slow EMA has enough data.

#### Scenario: EMA seeding

- **WHEN** the EMA 377 is computed over a bar series
- **THEN** its first defined value at index 376 equals the arithmetic mean of the first 377 closes, and values before that index are undefined

#### Scenario: Forming bar excluded

- **WHEN** the newest stored bar would complete a pattern as bar3
- **THEN** no zone is emitted for it; the newest bar never acts as bar3

### Requirement: FVG works on every timeframe after a full sync

With the bar-count retention targets in place, a fully synced symbol SHALL have enough history on every timeframe for the FVG indicator to scan (its warm-up plus a scannable region beyond it), so the indicator produces zones or a genuine no-signals result — never a warm-up warning. The only exception is source scarcity the system cannot fix: an instrument whose listed lifetime is shorter than the warm-up depth on a timeframe (e.g. fewer than 380 weeks of existence for W1) shows the standard insufficient-history warning instead.

#### Scenario: Default timeframe scans successfully

- **WHEN** the user enables FVG on the default timeframe of a fully synced symbol
- **THEN** the scan runs over every stored bar past the warm-up instead of reporting insufficient history
