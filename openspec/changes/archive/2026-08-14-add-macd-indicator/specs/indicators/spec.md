## MODIFIED Requirements

### Requirement: Pluggable indicator registry

Indicators SHALL be registered in a client-side registry. Each registration declares an identifier, a display label, the minimum number of bars it needs, and how its output is rendered on the chart. The UI SHALL derive its indicator controls from the registry, so adding a new indicator requires only registering it — no changes to the chart UI or any server component.

Rendering SHALL be declared by one of exactly two output kinds, and an indicator SHALL use one of them, not both:

- **Zone output** — shapes positioned by price and time, drawn over the candles on the price pane. This is what the FVG and OB indicators produce.
- **Pane output** — one value per bar on a scale unrelated to price, drawn in the indicator's own pane below the price pane. This is what the MACD indicator produces.

Everything the registry provides around rendering — the toolbar toggle, the persisted enabled state, and the insufficient-history warning — SHALL behave identically for both kinds, so which kind an indicator uses is invisible to the user except in where its output appears.

#### Scenario: New indicator appears automatically

- **WHEN** a developer registers a second indicator in the registry
- **THEN** the UI shows a toggle for it alongside existing indicators without further UI changes

#### Scenario: Either output kind is registered the same way

- **WHEN** a developer registers a pane-output indicator
- **THEN** it gains a toolbar toggle, persisted enabled state and insufficient-history warning exactly as a zone-output indicator does, with no chart UI change beyond the registration

## ADDED Requirements

### Requirement: Pane-rendered indicator output

An indicator declaring pane output SHALL render into a pane of its own, below the price pane, and that pane SHALL exist only while the indicator is enabled: enabling it SHALL create the pane and disabling it SHALL remove the pane and return its vertical space to the price pane. Multiple enabled pane indicators SHALL each get their own pane rather than sharing one.

A pane's contents SHALL be one or more per-bar series, each either a **line** or a **histogram** whose bars may be coloured individually by a rule the indicator defines. A pane SHALL be able to carry a horizontal reference line at a fixed value.

The pane SHALL share the chart's time scale, so panning, zooming and the crosshair move the price pane and every indicator pane together and a bar sits at the same horizontal position in all of them. The pane SHALL scale its own vertical axis to its own values, independently of price.

A pane series SHALL cover the same displayed slice of bars as the candles, leaving a value undefined only where the indicator's own warm-up leaves it undefined; an undefined value SHALL produce a gap rather than a zero or a straight line across it.

#### Scenario: Pane appears and disappears with the toggle

- **WHEN** the user enables a pane-output indicator and then disables it
- **THEN** a pane appears below the price pane while it is enabled and is gone afterwards, with the price pane reclaiming the space

#### Scenario: Panes stay aligned with the candles

- **WHEN** the user pans or zooms the chart with a pane indicator enabled
- **THEN** the pane's series moves with the candles and the same bar stays at the same horizontal position in both panes

#### Scenario: Warm-up region is a gap, not a zero

- **WHEN** a pane indicator's values are undefined over its warm-up bars
- **THEN** the pane draws nothing over that region rather than plotting zeros or joining across it

#### Scenario: Two pane indicators do not share a pane

- **WHEN** two pane-output indicators are enabled at once
- **THEN** each renders in its own pane, each scaled to its own values

### Requirement: MACD indicator

A registered indicator with registry id `macd` and toolbar label `MACD` SHALL reproduce the MQL5 `SimpleMACD.mq5` indicator (v1.02), using pane output. Its parameters SHALL be defined in one place and SHALL be fast period 13, slow period 34, signal period 9, and typical price `(high + low + close) / 3` as the applied price — the periods and applied price the user asked for.

The computation over the displayed bars, oldest first, SHALL be:

- an **applied price** series, one value per bar, where each value is `(high + low + close) / 3`;
- a **fast EMA** and a **slow EMA** of that series over the fast and slow periods;
- the **main line** = fast EMA − slow EMA;
- the **signal line** = an EMA of the main line over the signal period;
- the **histogram** = main line − signal line.

The pane SHALL draw the main line, the histogram, and a horizontal reference line at zero. Each histogram bar SHALL be coloured by the sign of its own value: the chart's bullish colour when the value is greater than or equal to zero, the bearish colour when it is below zero — the same rule the source's coloured histogram applies. The main line SHALL use a single colour distinct from both histogram colours, since it crosses zero freely and its colour carries no meaning.

Unlike the FVG and OB indicators, the newest stored bar SHALL carry MACD values like any other bar: MT5 plots the MACD on its forming bar, and a MACD value is a per-bar reading rather than a confirmed pattern, so there is nothing to withhold.

#### Scenario: MACD renders in its own pane

- **WHEN** the user enables `MACD` on a chart with enough bars
- **THEN** a pane below the candles shows the main line, the coloured histogram and a zero line, and no MACD output appears on the price pane

#### Scenario: Histogram colour follows its own sign

- **WHEN** the histogram crosses from positive to negative between two adjacent bars
- **THEN** the earlier bar is drawn in the bullish colour and the later one in the bearish colour, the flip happening at the sign change and not at a turn in the main line

#### Scenario: Newest bar carries a value

- **WHEN** the displayed series ends on the newest stored bar
- **THEN** that bar has a main-line and histogram value like every other bar past the warm-up

### Requirement: MACD signal line is computed but never drawn

The signal line SHALL be computed, because the histogram is defined as the main line minus it, and SHALL NOT be rendered — matching the source's own `InpHideSignalLine` default. Hiding it SHALL NOT be a user-facing option: there is no control to reveal it, and no other output changes on account of it being hidden.

#### Scenario: No signal line on the chart

- **WHEN** the `MACD` pane is rendered
- **THEN** it shows the main line, the histogram and the zero line only; no signal line is drawn and no control offers to show one

#### Scenario: Histogram still reflects the signal line

- **WHEN** the main line and the signal line diverge
- **THEN** the histogram grows accordingly, proving the signal line is computed even though it is not drawn

### Requirement: MACD parity with the MT5 original

The MACD computation SHALL preserve the numeric conventions `SimpleMACD.mq5` depends on, because deviations shift every value:

- both price EMAs SHALL be seeded with the SMA of the first `period` applied-price values, so the fast EMA's first defined value sits at index `fastPeriod − 1` and the slow EMA's at index `slowPeriod − 1`;
- the main line SHALL be defined from index `slowPeriod − 1` onward and undefined before it;
- the signal EMA SHALL be seeded with the SMA of the first `signalPeriod` **defined** main-line values — that is, its SMA window starts at the main line's own first defined index, not at the start of the series — so the signal line's and the histogram's first defined value sits at index `slowPeriod − 1 + signalPeriod − 1`;
- the histogram SHALL be undefined wherever the signal line is undefined.

With the configured 13/34/9, this places the main line's first defined value at index 33 and the histogram's at index 41.

Parity SHALL be verified numerically against the reference computation over a deterministic bar series rather than by review, comparing the main, signal and histogram arrays value by value within a floating-point tolerance, and comparing the first defined index of each array exactly.

Two departures from the source SHALL be sanctioned, and no others: the applied price is fixed to typical price and the periods to 13/34/9 rather than being user inputs, and the signal line is never drawn rather than being toggleable.

#### Scenario: EMA seeding

- **WHEN** the slow EMA is computed over the applied-price series
- **THEN** its first defined value at index 33 equals the arithmetic mean of the first 34 typical prices, and values before that index are undefined

#### Scenario: Signal EMA seeds from the main line's first defined value

- **WHEN** the signal EMA is computed over the main line
- **THEN** its first defined value at index 41 equals the arithmetic mean of the main line's values at indices 33 through 41, and values before index 41 are undefined

#### Scenario: Arrays compared against the reference

- **WHEN** the fixtures are regenerated from the reference computation
- **THEN** the main, signal and histogram arrays match value by value within tolerance and their first defined indices match exactly

### Requirement: MACD declares its own warm-up

The `macd` indicator SHALL declare a minimum bar count of `slowPeriod + signalPeriod` — 43 with the configured periods — which is the same guard the source applies before it computes anything, so the framework's insufficient-history warning covers it. Below that count the indicator SHALL produce the standard warning and no pane output rather than a partly-defined pane.

#### Scenario: Series below the warm-up

- **WHEN** `MACD` is enabled on a displayed series of fewer than 43 bars
- **THEN** the standard insufficient-history warning names 43 required against the number displayed, and no MACD pane content is drawn
