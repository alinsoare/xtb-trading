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
at 50% opacity of that colour and SHALL have **no border stroke**, which is what distinguishes
an Order Block zone from an FVG zone's outline; the `OB` label SHALL stay at full colour
strength so it remains legible over the fill. A zone's validity SHALL end at the
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
- **THEN** its rectangle is filled with its directional colour at 50% opacity and shows no
  border stroke, while the candles beneath it stay visible through the fill

#### Scenario: OB label stays readable over the fill

- **WHEN** an Order Block zone's `OB` label is drawn over the zone's fill
- **THEN** the label uses the full-strength directional colour rather than the 50%-opacity fill
  colour

### Requirement: Shared directional zone palette

Zone-drawing indicators SHALL colour their output from one shared directional palette rather than per-indicator colours, so that a bullish/demand zone reads the same whichever indicator produced it and a bearish/supply zone likewise. The palette SHALL define exactly two colours — one for the bullish/demand direction, one for the bearish/supply direction — and SHALL be the Order Block indicator's original pair (a light green for demand, a light pink for supply), so the colour an OB demand zone is drawn in is unchanged by the unification and FVG adopts those colours. The palette SHALL keep both entries even though the OB indicator now draws only its demand side, because FVG draws in both directions.

Because colour no longer distinguishes one indicator from another, each zone-drawing indicator SHALL be distinguishable by the way its rectangle is painted, and every zone SHALL keep a text label naming its indicator.

#### Scenario: Both indicators enabled use one palette

- **WHEN** the user enables both the FVG and OB indicators on the same chart
- **THEN** every bullish FVG zone and every demand OB zone are drawn in the same colour, every bearish FVG zone is drawn in the supply colour, and the two indicators remain distinguishable by how their rectangles are painted and by their labels

#### Scenario: OB colours unchanged by the unification

- **WHEN** an OB demand zone is rendered after the palette is shared
- **THEN** it uses the same colour it used before, since the shared palette adopts OB's original pair

#### Scenario: Supply entry survives for FVG

- **WHEN** a bearish FVG zone is drawn while `OB` draws only demand zones
- **THEN** the bearish FVG zone still takes the palette's supply colour, which remains defined

### Requirement: OB rests on internal-only swing structure

Order Block detection SHALL compute swing structure internally. Of that structure, only the
confirmed pivots SHALL be rendered, and only as the `H`/`L` labels the pivot-marking requirement
defines; nothing else about the structure SHALL be drawn on the chart, and the structure SHALL
NOT be exposed as a separate indicator. It comprises:

- **Swing pivots** over typical price (the mean of high, low and close). A candidate bar is a
  pivot high when its typical price strictly exceeds that of each of the configured number of
  bars on either side, and a pivot low when it is strictly below them. The pivot SHALL then be
  relocated to the bar carrying the most extreme high (for a high) or low (for a low) within
  that same window, so the pivot's price is a real extreme rather than a typical-price artifact.
- **Points-based confirmation.** A pivot SHALL be confirmed only once a later bar's typical
  price has retraced a configured distance, expressed in instrument points using the catalog's
  point size, away from the pivot's typical price; confirmation SHALL be rejected if any bar
  between the pivot and that retracement is more extreme than the pivot itself.
- **Structure containment.** A new pivot SHALL be rejected unless it exceeds the previous
  confirmed pivot of its own type — a new high above the previous high, a new low below the
  previous low. This applies to the live, unconfirmed swing extreme as well: an extreme that
  fails containment SHALL be discarded rather than kept, so no live swing is scanned and no
  break is registered from it.
- **Structural break tracking.** A close beyond the previous same-type pivot level SHALL count
  as a break. Every break SHALL be classified at a single point, from one comparison: the break
  direction against the swing direction prevailing immediately before it. A break in that
  direction is a continuation (BOS) and leaves the direction unchanged; a break against it is a
  reversal (SMS) and flips the direction to the break direction; a break with no direction yet
  established sets it. The swing direction SHALL NOT be recomputed from the confirmed pivots
  while a break is active, because that would overwrite the break-derived direction with stale
  pivot arithmetic.
- **The break-bar marker.** The most recent break bar SHALL clamp the right edge of the Order
  Block scan, and SHALL advance on **every** break, independently of any rule that would
  suppress a break from being reported. A marker left at a stale bar truncates later Order
  Blocks, so its advance SHALL NOT be conditional on anything but the break being newer than
  the marker.
- **Impulse/pullback classification.** Each confirmed pivot SHALL be classified as an impulse
  when its extreme exceeds that of the previous pivot of the same type, and a pullback
  otherwise; the first pivot of its type in the series SHALL count as an impulse. This is the
  classification the Order Block impulse filter consumes.
- **The live, unconfirmed swing.** While a structural break is active, the swing running from
  the newest confirmed pivot to the current unconfirmed extreme SHALL also be scanned for
  Order Blocks and SHALL be treated as an impulse, because the break itself establishes it as
  one. This is what makes the newest — and most actionable — zones appear before the swing's
  pivot has confirmed. Zones from that swing SHALL be the only ones treated as open-ended on
  account of the live swing, and only while a break is in fact active.

#### Scenario: Structure is computed but never drawn

- **WHEN** the `OB` indicator is enabled on a chart
- **THEN** the chart shows Order Block rectangles, their labels, and an `H` or `L` at each
  confirmed pivot; no swing lines, break labels, confirmation levels or pending-pivot markers
  are drawn

#### Scenario: Pivot relocated to the true extreme

- **WHEN** a bar is a typical-price pivot high but a neighbouring bar inside the detection
  window has a higher high
- **THEN** the pivot is recorded at the neighbouring bar and carries that bar's high

#### Scenario: Unretraced pivot is not used

- **WHEN** a candidate pivot high is never followed by a typical price the configured points
  distance below it
- **THEN** no confirmed pivot exists at that bar, so no swing pair and no Order Block derives
  from it, and no label is drawn there

#### Scenario: Live swing contributes zones

- **WHEN** the newest close has broken the previous same-type pivot level while the swing's own
  pivot is still unconfirmed
- **THEN** Order Blocks from that live swing are detected and drawn

#### Scenario: Live extreme inside structure is discarded

- **WHEN** the live, unconfirmed extreme does not exceed the previous confirmed pivot of its own
  type
- **THEN** it is discarded: no live swing is scanned, no zone is emitted from it, and no break
  is registered from it

#### Scenario: Break-bar marker advances on a suppressed break

- **WHEN** a structural break occurs that a reporting rule would suppress, and a later swing's
  Order Block candidates sit before it
- **THEN** the marker still advances to that break bar, so the scan is clamped there rather than
  at an earlier break

#### Scenario: Reversal flips the swing direction, continuation does not

- **WHEN** a close breaks structure against the prevailing swing direction and a later close
  breaks it again in the new direction
- **THEN** the first break is classified a reversal and flips the direction, and the second is
  classified a continuation and leaves it unchanged

### Requirement: OB omits the MQL5 source's other SMC features

The port SHALL be limited to Order Block detection and rendering, plus the confirmed-pivot
`H`/`L` labels. The following behaviour present in `SMCTrading.mq5` SHALL NOT be reproduced as
user-visible output: arrowed lines between pivots, BOS and SMS break labels, pivot confirmation
level lines, pending-pivot markers, the trend readout, price-return arrow markers on bars that
re-enter a zone, and the slow-RSI momentum block. The slow RSI SHALL NOT be computed at all,
since nothing consumes it even in the source.

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

### Requirement: OB signal parity with the MT5 original

The Order Block computation SHALL follow the same algorithm as `SMCTrading.mq5`. The port SHALL
record the exact source it was derived from — path, version and content hash — and that record
SHALL identify the file the parity comparison was actually run against, so a source that has
changed under the same version string cannot pass unnoticed. The current source is version
3.23 at sha256 `484d821dff2081a56c081331e9897fc1837e21cff800c4e74930266a35faf8a7`. The MT5
export the comparison reads SHALL carry the same hash as the port records; a mismatch SHALL be
treated as an unverified parity claim rather than a passing one.

Parity SHALL be claimed and verified on timeframes of H4 and above, where the source's dropped
skip-bar filter cannot fire and both implementations therefore read the same bars; on
timeframes below H4 the port's output SHALL NOT be required to match MT5. Verification SHALL
compare the JS output against the MT5 indicator's own output over the same bars for the same
symbol and timeframe, not merely by review, and SHALL cover both the internal swing structure
and the resulting zones. Because the port draws only demand zones while the source draws both,
the comparison SHALL be made on **detected** zones in both directions rather than on what is
drawn:

- pivot bar times, pivot types, confirmation bar times, and impulse/pullback classification
  SHALL match exactly, because a single divergent pivot changes every downstream zone;
- Order Block bar times and directions SHALL match exactly for demand and supply zones alike,
  and zone prices SHALL match within a floating-point tolerance, since they are copies of
  stored bar extremes rather than derived values;
- zone validity end times SHALL match exactly for zones already closed in the MT5 export;
  zones still open at export time SHALL be compared as open rather than by end time.

Only these deviations from the source SHALL be sanctioned, and each SHALL be recorded where
the parameters are defined:

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
  zones are detected, so it cannot affect a comparison made on detected zones.
- **The newest stored bar plays MT5's forming bar** and SHALL be excluded from acting as a
  candidate Order Block bar or a confirmed pivot, matching the convention the FVG indicator
  already follows.
- **The skip-bar interval is dropped.** The source refuses to treat a bar whose open time falls
  in a configured server-time window as a pivot or an Order Block candidate, on timeframes
  below H4. The port SHALL treat every bar in the displayed series as real data, skipping and
  modifying none, and SHALL NOT carry the window, its bounds, or a server-time offset as a
  parameter. Because this changes which bars are eligible below H4, parity below H4 is out
  of scope per the scope above; at H4 and above the filter is inert in the source, so this
  deviation cannot affect a verified comparison.
- **Only the source's fresh-load path is reproduced.** The port recomputes the whole structure
  from the displayed series, which corresponds to the source's full-recalculation path; the
  source's per-tick and per-bar incremental refinements are not modelled. Verification SHALL
  therefore be made against an export taken after forcing a full recalculation in MT5.

Any divergence found during verification that is not on this list SHALL be treated as a defect
in the port rather than accepted as a difference.

#### Scenario: Structure compared before zones

- **WHEN** the JS output and an MT5 export of the same symbol and timeframe are compared
- **THEN** the pivot sequence, including confirmation times and impulse classification, is
  compared first, so a structural divergence is reported as such instead of surfacing as
  mismatched zones

#### Scenario: Stale source record fails the claim

- **WHEN** the recorded source hash differs from the hash of `SMCTrading.mq5` on disk or from
  the hash the MT5 export was taken with
- **THEN** the parity claim counts as unverified until the export and the record are refreshed
  against the same file

#### Scenario: Supply zones are still compared

- **WHEN** the comparison runs against an MT5 export containing both demand and supply zones
- **THEN** the supply zones are compared as detected zones and must match, even though the port
  draws none of them

#### Scenario: Zone deep in history is still drawn

- **WHEN** a qualifying demand Order Block sits well outside the source's lookback window in a
  long displayed series
- **THEN** the zone is detected and drawn alongside newer zones

#### Scenario: Counter-trend zone is still drawn

- **WHEN** a detected demand zone belongs to a swing that opposes the newest swing direction
- **THEN** it is drawn, because the port applies neither the source's trend-bias display filter
  nor its newest-swing-only filter

#### Scenario: Newest bar is not an order block

- **WHEN** the newest stored bar would qualify as an Order Block candidate
- **THEN** no zone is emitted for it

#### Scenario: Every bar is eligible regardless of its open time

- **WHEN** a bar whose open time falls in the source's skip window would qualify as a pivot or
  an Order Block candidate
- **THEN** it is treated as real data and qualifies, because the port applies no time-of-day
  filter on any timeframe

#### Scenario: Intraday output is not held to parity

- **WHEN** the port's zones on a timeframe below H4 differ from the MT5 chart's zones on the
  same instrument
- **THEN** the difference is not a defect on that basis alone, because the source excludes
  skip-window bars there and the port does not
