## RENAMED Requirements

- FROM: `### Requirement: FVG signal parity with the MT5 original`
- TO: `### Requirement: FVG signal parity with the source indicator`

- FROM: `### Requirement: OB omits the MQL5 source's other SMC features`
- TO: `### Requirement: OB omits the source's other SMC features`

- FROM: `### Requirement: MACD parity with the MT5 original`
- TO: `### Requirement: MACD parity with the source indicator`

## MODIFIED Requirements

### Requirement: FVG indicator

The first registered indicator SHALL be a Fair Value Gap scanner over three consecutive closed bars (bar1, bar2, bar3 in chronological order, bar3 newest), reproducing the rules of the external source indicator it is ported from, with that source's default parameters, all of which SHALL be defined in one place. Three deliberate deviations: the source's recent-bars scan cap (`bar_limit`, 120) is dropped — the scan SHALL cover every displayed bar from the slow EMA warm-up boundary through the second-newest displayed bar, and all detected zones SHALL be drawn at once; the rules that measure a bar's displacement SHALL read space-extended values, as noted below; and bearish zones SHALL be detected but never drawn, as stated below. The pattern rules:

- an EMA 13/89/377 regime ladder evaluated at bar3 decides which pattern directions are searched;
- the middle bar's space-extended body SHALL be at least as large as bar1's and bar3's space-extended bodies, so that a bar which opened away from its predecessor's close is credited with the whole move it made rather than its drawn body alone;
- swing structure: strictly stair-stepping highs and lows in the pattern direction (relaxable by parameter);
- the price gap (bullish: bar3 low above bar1 high; bearish: bar1 low above bar3 high) SHALL exceed a configured ratio of bar2's space-extended range;
- bar3's wick opposite the pattern direction SHALL NOT exceed a configured multiple of bar3's space-extended body;
- a stochastic filter (%K 21, slowing 9) SHALL reject bullish patterns in overbought and bearish patterns in oversold territory;
- the zone height in instrument points SHALL fall within configured floor and ceiling values, using the catalog's point size.

**Only bullish zones SHALL be rendered.** Bearish zones SHALL continue to be detected — they are the other half of the parity comparison against the source indicator, and their detection has no bearing on bullish output — but a bearish zone SHALL produce neither a rectangle nor a label on the chart. This mirrors the treatment the OB indicator already gives its supply zones, and SHALL be recorded alongside the FVG parameters as a rendering deviation only. Every statement below about rendering therefore concerns bullish zones alone.

The gap and the zone SHALL be measured from recorded prices alone: spaces SHALL NOT move either edge of a zone. Detected bullish zones SHALL render as rectangles spanning from bar1's time forward a configured number of bars, drawn behind the candles, with a label at bar3. Both the rectangle and the label SHALL take the bullish/demand colour from the shared directional zone palette. The rectangle SHALL be painted as an unfilled outline — a stroked border at full colour strength with no interior fill — which is what distinguishes an FVG zone from an Order Block zone now that the two share a palette.

#### Scenario: Bullish FVG detected

- **WHEN** three bars form a bullish stair-step with a qualifying gap between bar1's high and bar3's low, the EMA regime allows bullish patterns, and no filter rejects it
- **THEN** a bullish zone spanning that gap is drawn from bar1's time with an FVG label at bar3

#### Scenario: Bearish FVG is detected but not drawn

- **WHEN** three bars form a bearish pattern that passes every filter
- **THEN** the zone appears in the indicator's detected zones with its direction, prices and validity window, and nothing for it is drawn on the chart — no rectangle and no label

#### Scenario: Chart carries no bearish FVG rectangles at all

- **WHEN** the user enables FVG on a series holding both bullish and bearish qualifying patterns
- **THEN** every FVG rectangle and label on the chart belongs to a bullish zone in the palette's demand colour, and FVG draws nothing in the supply colour

#### Scenario: Filter rejection

- **WHEN** a pattern matches structurally but the stochastic is overbought for a bullish candidate
- **THEN** no zone is emitted for that candidate

#### Scenario: Zone deep in history is still drawn

- **WHEN** a qualifying pattern sits 700 bars back in a 1,000-bar series, well outside the source indicator's 120-bar cap
- **THEN** its zone is detected and drawn alongside any newer zones

#### Scenario: Middle bar dominates only once its space is counted

- **WHEN** bar2's drawn body is smaller than bar3's, but bar2 carries a space that makes its space-extended body the largest of the three
- **THEN** the dominance test passes and the triplet is evaluated against the remaining rules

#### Scenario: Space does not move the zone

- **WHEN** bar3 carries a space and the triplet qualifies as a bullish FVG
- **THEN** the zone still runs from bar1's high to bar3's recorded low, unchanged by that space

#### Scenario: FVG zone takes the shared palette colour

- **WHEN** a bullish FVG zone is drawn
- **THEN** its rectangle and label use the palette's demand colour rather than a separate FVG-only colour, and no FVG output takes the supply colour

#### Scenario: FVG rectangle stays an outline

- **WHEN** an FVG zone is rendered
- **THEN** its rectangle shows a stroked border with no interior fill, so candles inside the zone remain fully visible

### Requirement: FVG signal parity with the source indicator

The FVG computation SHALL preserve the numeric conventions the source indicator depends on, because deviations change signals: the EMA SHALL be seeded with the SMA of the first period's values (not a first-value seed — with EMA 377 the difference persists long enough to alter signals); the stochastic SHALL use the source's low/high stochastic mode — rolling low/high extremes with SMA slowing; the newest stored bar SHALL stand in for the source's forming bar — the still-open newest bar of a live chart — and be excluded from pattern matching; and no signal SHALL be emitted at all until the slow EMA has enough data.

Three deviations from the source are sanctioned, and no others: the dropped recent-bars scan cap, space-extended displacement measurement, and bearish zones being detected but never drawn. The second changes which triplets qualify in both directions — it admits patterns the source rejects and rejects patterns the source admits — so parity against the source SHALL be verified on the numeric conventions above rather than on the resulting zone set, and the fixtures SHALL keep a raw-bar set that exercises those conventions independently of the space rules.

The third is a **rendering deviation alone** and SHALL NOT change which zones are detected. Parity comparisons and fixtures SHALL therefore continue to read **detected** zones in both directions rather than what is drawn, so hiding the bearish side cannot weaken or alter a parity claim, and the existing fixtures SHALL keep passing unchanged.

#### Scenario: EMA seeding

- **WHEN** the EMA 377 is computed over a bar series
- **THEN** its first defined value at index 376 equals the arithmetic mean of the first 377 closes, and values before that index are undefined

#### Scenario: Forming bar excluded

- **WHEN** the newest stored bar would complete a pattern as bar3
- **THEN** no zone is emitted for it; the newest bar never acts as bar3

#### Scenario: Numeric conventions still verified against the reference

- **WHEN** the fixtures are regenerated from the reference implementation
- **THEN** the EMA arrays, the stochastic array, and the warm-up warning still match it exactly, even though the zone sets diverge where spaces apply

#### Scenario: Bearish zones are still compared

- **WHEN** the fixtures and any parity comparison run against a series containing both bullish and bearish qualifying patterns
- **THEN** the bearish zones are compared as detected zones and must match, even though none of them is drawn

### Requirement: OB indicator

A second registered indicator SHALL be an Order Block scanner, registry id `ob` and toolbar
label `OB`, reproducing the Order Block detection of the external source indicator it is ported
from, with that source's default parameters, all of which SHALL be defined in one place.

An Order Block is the last candle opposing a structural swing, taken from the bars of that
swing. For every consecutive pair of confirmed swing pivots of opposite type (see the
swing-structure requirement), the scan SHALL:

- treat a low-then-high pair as an up-move producing **demand (BUY)** zones and search it for
  bearish bars (close below open); a high-then-low pair as a down-move producing **supply
  (SELL)** zones and search it for bullish bars (close above open);
- derive a **structural boundary** from the nearest earlier pivot of the same type as the
  second pivot — the previous high for a demand move, the previous low for a supply move — and
  SHALL skip the pair entirely when no such pivot exists, because the move has no structural
  context;
- scan the swing's bars offset one bar earlier: from the bar immediately preceding the first
  pivot's bar through the bar immediately preceding the swing's end bar, where the swing's end
  bar is the second pivot's bar clamped so that no candidate sits at or after the most recent
  structural break bar;
- reject any candidate that violates the boundary: a demand candidate's high SHALL lie below
  the boundary high, a supply candidate's low SHALL lie above the boundary low;
- reject, among the candidates of one swing, any candidate whose price range overlaps a
  **later** candidate of the same direction, so an overlapping run collapses to its newest
  member;
- reject any candidate whose swing is classified a pullback rather than an impulse;
- reject any candidate that is not small relative to the distance price travelled from the
  second pivot's extreme to the candidate's near edge: twice the candidate's high-to-low
  height SHALL be less than that distance, and a non-positive distance SHALL reject.

**Only demand zones SHALL be rendered.** Supply zones SHALL continue to be detected — the
detection is direction-symmetric and covers both directions, and hiding one has no bearing on
demand output — but a supply zone SHALL produce neither a rectangle nor a label on the chart.
Every statement below about rendering therefore concerns demand zones alone.

Each rendered Order Block SHALL render as a rectangle spanning its own bar's low to high,
from that bar's time forward to the end of the zone's validity, drawn behind the candles,
with a demand-coloured `OB` label. The rectangle and the label SHALL take the demand colour
from the shared directional zone palette. The rectangle SHALL be painted as a **filled** area
at 10% opacity of that colour — 90% transparent — and SHALL have **no border stroke**, which is
what distinguishes an Order Block zone from an FVG zone's outline; the `OB` label SHALL stay at
full colour strength so it remains legible over the fill. A zone's validity SHALL end at the
first close that breaks the swing that produced it — for a demand zone, a close below the
first pivot's low or above the second pivot's high — and zones belonging to the newest swing
SHALL remain open-ended through the newest bar. The same validity rule SHALL be computed for
supply zones even though no supply zone is drawn, so that the two directions differ in
rendering and in nothing else.

#### Scenario: Demand zone detected

- **WHEN** a confirmed low-then-high swing is classified an impulse, and one bearish bar in it
  sits below the previous swing high, is not overlapped by a later bearish bar in the same
  swing, and is small relative to its distance from the swing's high
- **THEN** a demand zone spanning that bar's low to high is drawn from that bar's time with an
  `OB` label

#### Scenario: Supply zone is detected but not drawn

- **WHEN** a confirmed high-then-low swing yields a supply Order Block that passes every filter
- **THEN** the zone appears in the indicator's detected zones with its direction, prices and
  validity end, and nothing for it is drawn on the chart — no rectangle and no label

#### Scenario: Chart carries no bearish rectangles at all

- **WHEN** the user enables `OB` on a series holding both demand and supply Order Blocks
- **THEN** every rectangle on the chart is a demand rectangle in the palette's demand colour,
  and no rectangle or label in the supply colour is drawn by `OB`

#### Scenario: Pullback swing yields nothing

- **WHEN** a swing's second pivot fails to exceed the previous pivot of its own type, making
  the swing a pullback
- **THEN** no Order Block is emitted for that swing, however many candidate bars it contains

#### Scenario: Oversized candidate rejected

- **WHEN** a candidate bar's height is half or more of the distance from the swing's extreme
  to that bar's near edge
- **THEN** the candidate is discarded rather than drawn

#### Scenario: Overlapping candidates collapse

- **WHEN** two same-direction candidate bars in one swing have overlapping high-to-low ranges
- **THEN** only the newer of the two is drawn

#### Scenario: Zone closes at the structural break

- **WHEN** a close after the swing breaks either the first pivot's extreme or the second
  pivot's extreme
- **THEN** the zone's rectangle ends at that bar rather than extending to the newest bar

#### Scenario: OB rectangle is a borderless 90%-transparent fill

- **WHEN** an Order Block zone is rendered
- **THEN** its rectangle is filled with its directional colour at 10% opacity — 90% transparent —
  and shows no border stroke, while the candles beneath it read at close to full contrast
  through the fill

#### Scenario: OB label stays readable over the fill

- **WHEN** an Order Block zone's `OB` label is drawn over the zone's fill
- **THEN** the label uses the full-strength directional colour rather than the 10%-opacity fill
  colour

### Requirement: OB omits the source's other SMC features

The port SHALL be limited to Order Block detection and rendering, plus the confirmed-pivot
`H`/`L` labels. The following behaviour present in the source indicator SHALL NOT be reproduced
as user-visible output: arrowed lines between pivots, BOS and SMS break labels, pivot
confirmation level lines, pending-pivot markers, the trend readout, price-return arrow markers
on bars that re-enter a zone, and the slow-RSI momentum block. The slow RSI SHALL NOT be
computed at all, since nothing consumes it even in the source.

Because no break label is drawn, the port SHALL NOT carry the source's break-label
bookkeeping either — the recorded event list and the guards that decide which break earns a
label, including any rule that collapses a run of same-classification breaks. Of the source's
break state the port SHALL keep only what its own output depends on: the most recent break bar
that clamps the scan, whether a break is currently active, and the swing direction that
classifies a break. Nothing else about a break SHALL be retained, so no dead state can drift
away from the source's model unnoticed.

The pivot labels SHALL be labels alone: reproducing them SHALL NOT bring back the source's
lines between pivots or any other line, level or ray attached to a pivot.

#### Scenario: No trend readout

- **WHEN** the `OB` indicator is enabled
- **THEN** the chart shows no trend text, arrows or break labels, only Order Block zones and the
  pivot `H`/`L` labels

#### Scenario: Pivot labels bring no lines with them

- **WHEN** consecutive pivot highs and lows are labelled on the chart
- **THEN** no line connects them, no horizontal level is drawn at a pivot's price, and no ray
  extends from a pivot

#### Scenario: No break-label bookkeeping is kept

- **WHEN** the structure computation processes a series of structural breaks
- **THEN** it retains only the most recent break bar, whether a break is active, and the swing
  direction; it keeps no list of break events and applies no rule that would decide which break
  earns a label

### Requirement: MACD indicator

A registered indicator with registry id `macd` and toolbar label `MACD` SHALL reproduce the external source indicator it is ported from, using pane output. Its parameters SHALL be defined in one place and SHALL be fast period 13, slow period 34, signal period 9, and typical price `(high + low + close) / 3` as the applied price — the periods and applied price the user asked for.

The computation over the displayed bars, oldest first, SHALL be:

- an **applied price** series, one value per bar, where each value is `(high + low + close) / 3`;
- a **fast EMA** and a **slow EMA** of that series over the fast and slow periods;
- the **main line** = fast EMA − slow EMA;
- the **signal line** = an EMA of the main line over the signal period;
- the **histogram** = main line − signal line.

The pane SHALL draw the main line, the histogram, and a horizontal reference line at zero. Each histogram bar SHALL be coloured by the sign of its own value: the chart's bullish colour when the value is greater than or equal to zero, the bearish colour when it is below zero — the same rule the source's coloured histogram applies. The main line SHALL use a single colour distinct from both histogram colours, since it crosses zero freely and its colour carries no meaning.

Unlike the FVG and OB indicators, the newest stored bar SHALL carry MACD values like any other bar: the source plots the MACD on its forming bar, and a MACD value is a per-bar reading rather than a confirmed pattern, so there is nothing to withhold.

#### Scenario: MACD renders in its own pane

- **WHEN** the user enables `MACD` on a chart with enough bars
- **THEN** a pane below the candles shows the main line, the coloured histogram and a zero line, and no MACD output appears on the price pane

#### Scenario: Histogram colour follows its own sign

- **WHEN** the histogram crosses from positive to negative between two adjacent bars
- **THEN** the earlier bar is drawn in the bullish colour and the later one in the bearish colour, the flip happening at the sign change and not at a turn in the main line

#### Scenario: Newest bar carries a value

- **WHEN** the displayed series ends on the newest stored bar
- **THEN** that bar has a main-line and histogram value like every other bar past the warm-up

### Requirement: MACD parity with the source indicator

The MACD computation SHALL preserve the numeric conventions its source indicator depends on, because deviations shift every value:

- both price EMAs SHALL be seeded with the SMA of the first `period` applied-price values, so the fast EMA's first defined value sits at index `fastPeriod − 1` and the slow EMA's at index `slowPeriod − 1`;
- the main line SHALL be defined from index `slowPeriod − 1` onward and undefined before it;
- the signal EMA SHALL be seeded with the SMA of the first `signalPeriod` **defined** main-line values — that is, its SMA window starts at the main line's own first defined index, not at the start of the series — so the signal line's and the histogram's first defined value sits at index `slowPeriod − 1 + signalPeriod − 1`;
- the histogram SHALL be undefined wherever the signal line is undefined.

With the configured 13/34/9, this places the main line's first defined value at index 33 and the histogram's at index 41.

Parity SHALL be verified numerically against the reference computation over a deterministic bar series rather than by review, comparing the main, signal and histogram arrays value by value within a floating-point tolerance, and comparing the first defined index of each array exactly.

The reference values SHALL be produced entirely within this repository: a reference computation of the conventions above, over a deterministic bar series the repository itself constructs, committed as a fixture. Producing them SHALL require no trading terminal, no market data and no network access, so that regenerating the fixture is a command any contributor or CI run can execute rather than a manual step at one machine. Running the parity check SHALL likewise require nothing beyond a clone of the repository.

The reference computation SHALL be written independently of the indicator's own implementation and SHALL NOT call into it, so that the comparison has two implementations to disagree. Because both are transcriptions of the same source, the check SHALL additionally assert values derivable from the conventions above without either implementation — the SMA-seeded first defined value of each array, and the first defined indices exactly — so that a shared misreading of the seeding or of the warm-up boundaries cannot pass. What this establishes SHALL be understood as: the port's numeric conventions are pinned against regression and against the stated seeding arithmetic. It SHALL NOT be claimed to re-derive agreement with the source indicator running on a live terminal; that agreement was established once against the source and is upheld by the conventions this requirement states, not by the fixture.

The fixture SHALL record everything needed to reproduce it — the generator inputs that determine the bar series, the bar window it covers (its bar count and its oldest and newest bar times), and the periods used — and regenerating it against an unchanged implementation SHALL reproduce the committed file exactly, so that a fixture appearing in a diff means something the check covers has changed.

When no committed fixture is present, the parity check SHALL fail with a message naming the directory it looked in and the regeneration path, rather than aborting with an unhandled error. A fixture that has gone missing is a defect in the test suite's packaging and SHALL read as one.

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

#### Scenario: Parity check runs from a clean clone

- **WHEN** the parity check is run in a checkout that has never had a trading terminal available
- **THEN** it finds at least one committed fixture, compares against it, and reports a pass or a numeric failure — it does not report the fixture as unavailable

#### Scenario: Fixture is regenerated without a terminal

- **WHEN** a contributor with no trading terminal, no market-data access and no network connection regenerates the fixture
- **THEN** the generation succeeds from the repository alone, producing the same fixture the repository already holds

#### Scenario: Fixture records its bar window

- **WHEN** the committed fixture is inspected
- **THEN** it states the bar count and the oldest and newest bar times it was computed over, together with the generator inputs and periods that reproduce that series, so a later regeneration can be shown to describe the same window

#### Scenario: Regeneration is a no-op against an unchanged port

- **WHEN** the fixture is regenerated with neither the reference computation, the generator inputs nor the indicator changed
- **THEN** the committed file is unchanged, so the working tree stays clean

#### Scenario: Reference is not the port under test

- **WHEN** the reference values are produced
- **THEN** they come from a computation that does not call into the indicator's own implementation, and the fixture additionally carries first defined indices and SMA-seeded first values that follow from the stated conventions alone

#### Scenario: Seeding regression is caught

- **WHEN** the indicator is changed to seed either price EMA from its first value instead of the SMA of the first `period` values
- **THEN** the parity check fails, naming a differing index rather than passing on a shifted series

#### Scenario: Missing fixture reads as a fixture problem

- **WHEN** the parity check runs with no fixture directory or an empty one
- **THEN** it fails with a message naming the expected fixture location and how to regenerate it in-repo, and not with an unhandled file-system error

## ADDED Requirements

### Requirement: OB deviations from the source indicator

The Order Block port SHALL follow the same algorithm as its external source indicator apart
from the deviations listed below, and no others. A divergence from the source that is not on
this list SHALL be treated as a defect in the port rather than accepted as a difference. This is
a statement about the port's own behaviour: it holds whether or not any comparison against the
source is ever run.

Each deviation SHALL be recorded alongside the parameters:

- **The lookback cap is dropped.** The source scans a bounded recent window; the port SHALL
  scan every displayed bar, so that older zones stay visible per the full-history requirement.
- **All detected zones of the drawn direction are rendered.** The source's live view hides
  zones that oppose the current trend and zones from any swing but the newest; the port SHALL
  render every detected demand zone at once, matching the source's history mode. The source's
  show-history switch SHALL NOT be carried as a parameter or a control: full history is always
  displayed. Its trend-bias display filter SHALL NOT be carried either, so a demand zone is
  never hidden because the prevailing swing direction is down.
- **Supply zones are detected but never drawn.** The source draws both directions; the port
  SHALL draw demand zones only. This is a rendering deviation alone and SHALL NOT change which
  zones are detected, so the two directions differ in rendering and in nothing else.
- **The newest stored bar stands in for the source's forming bar** — the still-open newest bar
  of a live chart — and SHALL be excluded from acting as a candidate Order Block bar or a
  confirmed pivot, matching the convention the FVG indicator already follows.
- **The skip-bar interval is dropped.** The source refuses to treat a bar whose open time falls
  in a configured server-time window as a pivot or an Order Block candidate, on timeframes
  below H4. The port SHALL treat every bar in the displayed series as real data, skipping and
  modifying none, and SHALL NOT carry the window, its bounds, or a server-time offset as a
  parameter. Because this changes which bars are eligible below H4, the port's output on
  timeframes below H4 SHALL NOT be expected to agree with the source's; at H4 and above the
  filter is inert in the source, so this deviation has no effect there.
- **Only the source's fresh-load path is reproduced.** The port SHALL recompute the whole
  structure from the displayed series in one pass, which corresponds to the source's
  full-recalculation path; the source's per-tick and per-bar incremental refinements SHALL NOT
  be modelled. Output therefore SHALL NOT depend on the order in which bars arrived, only on
  the displayed series.

#### Scenario: Zone deep in history is still drawn

- **WHEN** a qualifying demand Order Block sits well outside the source's lookback window in a
  long displayed series
- **THEN** the zone is detected and drawn alongside newer zones

#### Scenario: Counter-trend zone is still drawn

- **WHEN** a detected demand zone belongs to a swing that opposes the newest swing direction
- **THEN** it is drawn, because the port applies neither the source's trend-bias display filter
  nor its newest-swing-only filter

#### Scenario: Hiding supply does not change detection

- **WHEN** a series holds both demand and supply Order Blocks
- **THEN** every supply zone is present among the detected zones with its direction, prices and
  validity end, and the set of detected demand zones is exactly what it would be if supply
  zones were drawn

#### Scenario: Newest bar is not an order block

- **WHEN** the newest stored bar would qualify as an Order Block candidate
- **THEN** no zone is emitted for it

#### Scenario: Every bar is eligible regardless of its open time

- **WHEN** a bar whose open time falls in the source's skip window would qualify as a pivot or
  an Order Block candidate
- **THEN** it is treated as real data and qualifies, because the port applies no time-of-day
  filter on any timeframe

#### Scenario: Intraday output is not expected to match the source

- **WHEN** the port's zones on a timeframe below H4 differ from the zones the source indicator
  draws on a live chart of the same instrument
- **THEN** the difference is not a defect on that basis alone, because the source excludes
  skip-window bars there and the port does not

#### Scenario: Output depends only on the displayed series

- **WHEN** the same displayed series is computed after arriving as one batch and after
  arriving bar by bar
- **THEN** the structure and the zones are identical, because only the full-recalculation path
  is reproduced

#### Scenario: Deviations are recorded where the parameters are

- **WHEN** a reader inspects where the Order Block parameters are defined
- **THEN** every deviation above is recorded there, so the port's departures from its source are
  readable next to the values they apply to

## REMOVED Requirements

### Requirement: OB deviations from the SMCTrading source

**Reason**: The requirement named its source file and made a provenance record normative — the
port SHALL record the source's path, version and content hash where its parameters are defined,
with a scenario asserting it. This change removes every literal reference to that source from the
active tree, so the requirement is replaced by `OB deviations from the source indicator`, which
carries the identical deviation list and every scenario except `Source provenance is recorded`.
It is expressed as a removal plus an addition rather than a rename because content is genuinely
dropped, and a MODIFIED requirement may not silently lose a scenario.

**Migration**: None for behaviour — the port's algorithm, its six deviations and their scenarios
are unchanged. The record itself (`~/daytrading/mt5/indicators/SMCTrading.mq5`, version 3.23,
sha256 `484d821dff2081a56c081331e9897fc1837e21cff800c4e74930266a35faf8a7`) is deleted from
`web/indicators/ob-structure.js` along with the `OB_STRUCTURE_SOURCE` constant, and remains
readable only in `openspec/changes/archive/**`. Anyone needing to re-verify which revision the
port transcribes must recover it from there.
