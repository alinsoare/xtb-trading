## MODIFIED Requirements

### Requirement: Shared directional zone palette

Zone-drawing indicators SHALL colour their output from one shared directional palette rather than per-indicator colours, so that a bullish/demand zone reads the same whichever indicator produced it and a bearish/supply zone likewise. The palette SHALL define exactly two colours — one for the bullish/demand direction, one for the bearish/supply direction — and SHALL be the Order Block indicator's original pair (a light green for demand, a light pink for supply), so the colour an OB demand zone is drawn in is unchanged by the unification and FVG adopts those colours.

The palette SHALL keep both entries even though neither indicator now draws in the bearish/supply direction: the entry is the definition of that direction's colour, it is read by anything that describes a detected zone by direction, and removing it would leave a future bearish-drawing indicator to reinvent a colour that already has an agreed value.

Because colour no longer distinguishes one indicator from another, each zone-drawing indicator SHALL be distinguishable by the way its rectangle is painted, and every zone SHALL keep a text label naming its indicator.

#### Scenario: Both indicators enabled use one palette

- **WHEN** the user enables both the FVG and OB indicators on the same chart
- **THEN** every bullish FVG zone and every demand OB zone are drawn in the same colour, no rectangle in the supply colour is drawn by either indicator, and the two indicators remain distinguishable by how their rectangles are painted and by their labels

#### Scenario: OB colours unchanged by the unification

- **WHEN** an OB demand zone is rendered after the palette is shared
- **THEN** it uses the same colour it used before, since the shared palette adopts OB's original pair

#### Scenario: Supply entry survives for FVG

- **WHEN** the FVG indicator detects a bearish zone that it does not draw
- **THEN** the palette's supply entry remains defined, so the zone's direction still has an agreed colour even though no indicator paints one

### Requirement: FVG indicator

The first registered indicator SHALL be a Fair Value Gap scanner over three consecutive closed bars (bar1, bar2, bar3 in chronological order, bar3 newest), reproducing the original MQL5 indicator's rules with its default parameters, all of which SHALL be defined in one place. Three deliberate deviations: the original's recent-bars scan cap (`bar_limit`, 120) is dropped — the scan SHALL cover every displayed bar from the slow EMA warm-up boundary through the second-newest displayed bar, and all detected zones SHALL be drawn at once; the rules that measure a bar's displacement SHALL read space-extended values, as noted below; and bearish zones SHALL be detected but never drawn, as stated below. The pattern rules:

- an EMA 13/89/377 regime ladder evaluated at bar3 decides which pattern directions are searched;
- the middle bar's space-extended body SHALL be at least as large as bar1's and bar3's space-extended bodies, so that a bar which opened away from its predecessor's close is credited with the whole move it made rather than its drawn body alone;
- swing structure: strictly stair-stepping highs and lows in the pattern direction (relaxable by parameter);
- the price gap (bullish: bar3 low above bar1 high; bearish: bar1 low above bar3 high) SHALL exceed a configured ratio of bar2's space-extended range;
- bar3's wick opposite the pattern direction SHALL NOT exceed a configured multiple of bar3's space-extended body;
- a stochastic filter (%K 21, slowing 9) SHALL reject bullish patterns in overbought and bearish patterns in oversold territory;
- the zone height in instrument points SHALL fall within configured floor and ceiling values, using the catalog's point size.

**Only bullish zones SHALL be rendered.** Bearish zones SHALL continue to be detected — they are the other half of the parity comparison against the MQL5 source, and their detection has no bearing on bullish output — but a bearish zone SHALL produce neither a rectangle nor a label on the chart. This mirrors the treatment the OB indicator already gives its supply zones, and SHALL be recorded alongside the FVG parameters as a rendering deviation only. Every statement below about rendering therefore concerns bullish zones alone.

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

- **WHEN** a qualifying pattern sits 700 bars back in a 1,000-bar series, well outside the original indicator's 120-bar cap
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

### Requirement: FVG signal parity with the MT5 original

The FVG computation SHALL preserve the numeric conventions the original depends on, because deviations change signals: the EMA SHALL be seeded with the SMA of the first period's values (not a first-value seed — with EMA 377 the difference persists long enough to alter signals); the stochastic SHALL use rolling low/high extremes with SMA slowing per MT5's STO_LOWHIGH mode; the newest stored bar SHALL play MT5's forming bar and be excluded from pattern matching; and no signal SHALL be emitted at all until the slow EMA has enough data.

Three deviations from the original are sanctioned, and no others: the dropped recent-bars scan cap, space-extended displacement measurement, and bearish zones being detected but never drawn. The second changes which triplets qualify in both directions — it admits patterns the original rejects and rejects patterns the original admits — so parity against the original SHALL be verified on the numeric conventions above rather than on the resulting zone set, and the fixtures SHALL keep a raw-bar set that exercises those conventions independently of the space rules.

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
