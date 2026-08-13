## ADDED Requirements

### Requirement: Shared directional zone palette

Zone-drawing indicators SHALL colour their output from one shared directional palette rather than per-indicator colours, so that a bullish/demand zone reads the same whichever indicator produced it and a bearish/supply zone likewise. The palette SHALL define exactly two colours — one for the bullish/demand direction, one for the bearish/supply direction — and SHALL be the Order Block indicator's existing pair (a light green for demand, a light pink for supply), so OB's appearance is unchanged by the unification and FVG adopts those colours.

Because colour no longer distinguishes one indicator from another, each zone-drawing indicator SHALL be distinguishable by the way its rectangle is painted, and every zone SHALL keep a text label naming its indicator.

#### Scenario: Both indicators enabled use one palette

- **WHEN** the user enables both the FVG and OB indicators on the same chart
- **THEN** every bullish FVG zone and every demand OB zone are drawn in the same colour, every bearish FVG zone and every supply OB zone are drawn in the same colour, and the two indicators remain distinguishable by how their rectangles are painted and by their labels

#### Scenario: OB colours unchanged by the unification

- **WHEN** the OB indicator is rendered after the palette is shared
- **THEN** its demand and supply zones use the same two colours they used before, since the shared palette adopts OB's pair

## MODIFIED Requirements

### Requirement: FVG indicator

The first registered indicator SHALL be a Fair Value Gap scanner over three consecutive closed bars (bar1, bar2, bar3 in chronological order, bar3 newest), reproducing the original MQL5 indicator's rules with its default parameters, all of which SHALL be defined in one place. Two deliberate deviations: the original's recent-bars scan cap (`bar_limit`, 120) is dropped — the scan SHALL cover every displayed bar from the slow EMA warm-up boundary through the second-newest displayed bar, and all detected zones SHALL be drawn at once — and the rules that measure a bar's displacement SHALL read space-extended values, as noted below. The pattern rules:

- an EMA 13/89/377 regime ladder evaluated at bar3 decides which pattern directions are searched;
- the middle bar's space-extended body SHALL be at least as large as bar1's and bar3's space-extended bodies, so that a bar which opened away from its predecessor's close is credited with the whole move it made rather than its drawn body alone;
- swing structure: strictly stair-stepping highs and lows in the pattern direction (relaxable by parameter);
- the price gap (bullish: bar3 low above bar1 high; bearish: bar1 low above bar3 high) SHALL exceed a configured ratio of bar2's space-extended range;
- bar3's wick opposite the pattern direction SHALL NOT exceed a configured multiple of bar3's space-extended body;
- a stochastic filter (%K 21, slowing 9) SHALL reject bullish patterns in overbought and bearish patterns in oversold territory;
- the zone height in instrument points SHALL fall within configured floor and ceiling values, using the catalog's point size.

The gap and the zone SHALL be measured from recorded prices alone: spaces SHALL NOT move either edge of a zone. Detected zones SHALL render as rectangles spanning from bar1's time forward a configured number of bars, drawn behind the candles, with a direction-coloured label at bar3. Both the rectangle and the label SHALL take their colour from the shared directional zone palette: the bullish/demand colour for a bullish zone, the bearish/supply colour for a bearish zone. The rectangle SHALL be painted as an unfilled outline — a stroked border at full colour strength with no interior fill — which is what distinguishes an FVG zone from an Order Block zone now that the two share a palette.

#### Scenario: Bullish FVG detected

- **WHEN** three bars form a bullish stair-step with a qualifying gap between bar1's high and bar3's low, the EMA regime allows bullish patterns, and no filter rejects it
- **THEN** a bullish zone spanning that gap is drawn from bar1's time with an FVG label at bar3

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

- **WHEN** a bullish FVG zone and a bearish FVG zone are drawn
- **THEN** the bullish rectangle and label use the palette's demand colour and the bearish ones use the palette's supply colour, not a separate FVG-only colour pair

#### Scenario: FVG rectangle stays an outline

- **WHEN** an FVG zone is rendered
- **THEN** its rectangle shows a stroked border with no interior fill, so candles inside the zone remain fully visible

### Requirement: OB indicator

A second registered indicator SHALL be an Order Block scanner, registry id `ob` and toolbar
label `OB`, reproducing the Order Block detection of the MQL5 `SMCTrading.mq5` indicator
(v3.23) with its default parameters, all of which SHALL be defined in one place.

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

Each surviving Order Block SHALL render as a rectangle spanning its own bar's low to high,
from that bar's time forward to the end of the zone's validity, drawn behind the candles,
with a direction-coloured `OB` label. The rectangle and the label SHALL take their colour from
the shared directional zone palette. The rectangle SHALL be painted as a **filled** area at
50% opacity of that colour and SHALL have **no border stroke**, which is what distinguishes an
Order Block zone from an FVG zone's outline; the `OB` label SHALL stay at full colour strength
so it remains legible over the fill. A zone's validity SHALL end at the
first close that breaks the swing that produced it — for a demand zone, a close below the
first pivot's low or above the second pivot's high; for a supply zone, a close above the first
pivot's high or below the second pivot's low — and zones belonging to the newest swing SHALL
remain open-ended through the newest bar.

#### Scenario: Demand zone detected

- **WHEN** a confirmed low-then-high swing is classified an impulse, and one bearish bar in it
  sits below the previous swing high, is not overlapped by a later bearish bar in the same
  swing, and is small relative to its distance from the swing's high
- **THEN** a demand zone spanning that bar's low to high is drawn from that bar's time with an
  `OB` label

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

#### Scenario: OB rectangle is a borderless 50% fill

- **WHEN** an Order Block zone is rendered
- **THEN** its rectangle is filled with its directional colour at 50% opacity and shows no
  border stroke, while the candles beneath it stay visible through the fill

#### Scenario: OB label stays readable over the fill

- **WHEN** an Order Block zone's `OB` label is drawn over the zone's fill
- **THEN** the label uses the full-strength directional colour rather than the 50%-opacity fill
  colour
