## MODIFIED Requirements

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

**Only demand zones SHALL be rendered.** Supply zones SHALL continue to be detected — they are
the other half of the parity comparison against the source, and their detection has no bearing
on demand output — but a supply zone SHALL produce neither a rectangle nor a label on the
chart. Every statement below about rendering therefore concerns demand zones alone.

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
supply zones, so a parity comparison can read it, even though no supply zone is drawn.

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

#### Scenario: OB rectangle is a borderless 50% fill

- **WHEN** an Order Block zone is rendered
- **THEN** its rectangle is filled with its directional colour at 10% opacity — 90% transparent —
  and shows no border stroke, while the candles beneath it read at close to full contrast
  through the fill

#### Scenario: OB label stays readable over the fill

- **WHEN** an Order Block zone's `OB` label is drawn over the zone's fill
- **THEN** the label uses the full-strength directional colour rather than the 10%-opacity fill
  colour
