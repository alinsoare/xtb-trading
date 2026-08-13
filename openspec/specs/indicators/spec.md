# indicators Specification

## Purpose

Defines the client-side indicator framework — a registry of indicators the user can enable and disable individually — and its first implementation, a working Fair Value Gap (FVG) scanner with signal parity to the original MQL5 indicator.

## Requirements

### Requirement: Pluggable indicator registry

Indicators SHALL be registered in a client-side registry. Each registration declares an identifier, a display label, the minimum number of bars it needs, and how its output is rendered on the chart. The UI SHALL derive its indicator controls from the registry, so adding a new indicator requires only registering it — no changes to the chart UI or any server component.

#### Scenario: New indicator appears automatically

- **WHEN** a developer registers a second indicator in the registry
- **THEN** the UI shows a toggle for it alongside existing indicators without further UI changes

### Requirement: Per-indicator enable and disable

Each registered indicator SHALL be individually toggleable. Toggling SHALL take effect immediately on the current chart, and enabled state SHALL persist across symbol and timeframe switches and across page reloads on the same browser. Multiple indicators MAY be enabled at once.

#### Scenario: Toggling an indicator

- **WHEN** the user enables an indicator and then switches to another symbol
- **THEN** the indicator remains enabled and recomputes for the newly selected symbol's bars

#### Scenario: Enabled state survives a reload

- **WHEN** the user enables an indicator and reloads the page
- **THEN** the indicator is still enabled and computes for the restored selection

### Requirement: Indicators compute client-side from stored bars

Indicator values SHALL be computed in the browser from the bars already loaded for the chart. Enabling, disabling, or recomputing an indicator SHALL NOT trigger any market-data fetch or require a server-side computation endpoint, so indicators behave identically in dev mode and on the static site.

#### Scenario: Indicator on the static site

- **WHEN** the user enables an indicator on the published static site
- **THEN** it computes and renders from the already-loaded bars with no additional network requests beyond the data files

### Requirement: Indicators scan the full loaded history

An enabled indicator SHALL compute over the entire series the chart is displaying — everything the display limit admits, excluding only regions its own warm-up leaves undefined — rather than a recent-bars window inside it, and ALL of its detected outputs SHALL be rendered on the chart simultaneously. A signal SHALL never disappear merely because newer bars arrived or a newer signal was detected.

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

When an enabled indicator cannot compute because the displayed series holds too few bars, the UI SHALL show a warning stating how many bars are needed versus available, because a chart with no indicator output is otherwise indistinguishable from a chart with no qualifying signals. A display limit set below an indicator's warm-up SHALL produce this warning rather than silent emptiness, even when far more bars are stored.

#### Scenario: Too few bars

- **WHEN** an indicator needing 380 bars is enabled on a displayed series of 250 bars
- **THEN** the chart shows a warning naming the required and available counts instead of silently rendering nothing

#### Scenario: Display limit below the warm-up

- **WHEN** the user sets a display limit of 100 bars with an indicator needing 380 enabled
- **THEN** the warning names 380 required against 100 available, and raising the limit clears it

### Requirement: Close-to-open-space

The indicators SHALL recognise a **close-to-open-space** between two adjacent bars: the price interval between the earlier bar's close and the later bar's open, belonging to the later bar. A space SHALL exist only when both conditions hold:

- **Same type**: the two bars are both bullish (close above open) or both bearish (close below open). A bar whose close equals its open is neutral and SHALL take the other bar's type; two neutral bars SHALL produce no space.
- **Opening beyond**: the later bar opens beyond the earlier bar's close in that type's direction — above it for a bullish pair, below it for a bearish pair.

Because the later bar's open is one endpoint of the space, a bullish bar's space SHALL sit flush beneath its body and a bearish bar's flush above it. The **space-extended body** of a bar carrying a space SHALL therefore equal the distance from the previous bar's close to its own close; a bar with no space SHALL keep its recorded body. Likewise a carrying bar's **space-extended range** SHALL cover both its recorded range and its space. The first bar of a series has no predecessor and SHALL never carry a space.

The space is a property of the bar series, not of any pattern: it SHALL be determined the same way on every adjacent pair, with no exception for session or weekend boundaries.

#### Scenario: Space beneath a bullish bar

- **WHEN** two consecutive bullish bars are evaluated and the second opens above the first's close
- **THEN** the second bar carries a space running from the first bar's close up to its own open, and its space-extended body runs from the first bar's close to its own close

#### Scenario: Opposite types produce no space

- **WHEN** a bullish bar is followed by a bearish bar that opens away from its close
- **THEN** no space is recorded, and the second bar's body and range are its recorded ones

#### Scenario: Overlapping bodies produce no space

- **WHEN** two consecutive bullish bars are evaluated and the second opens below the first's close
- **THEN** no space is recorded, because the second bar did not open beyond the first's close in the pair's direction

#### Scenario: Neutral bar takes its neighbour's type

- **WHEN** a bar whose close equals its open is followed by a bullish bar opening above it
- **THEN** the pair is treated as bullish and the space is recorded

### Requirement: Shared directional zone palette

Zone-drawing indicators SHALL colour their output from one shared directional palette rather than per-indicator colours, so that a bullish/demand zone reads the same whichever indicator produced it and a bearish/supply zone likewise. The palette SHALL define exactly two colours — one for the bullish/demand direction, one for the bearish/supply direction — and SHALL be the Order Block indicator's existing pair (a light green for demand, a light pink for supply), so OB's appearance is unchanged by the unification and FVG adopts those colours.

Because colour no longer distinguishes one indicator from another, each zone-drawing indicator SHALL be distinguishable by the way its rectangle is painted, and every zone SHALL keep a text label naming its indicator.

#### Scenario: Both indicators enabled use one palette

- **WHEN** the user enables both the FVG and OB indicators on the same chart
- **THEN** every bullish FVG zone and every demand OB zone are drawn in the same colour, every bearish FVG zone and every supply OB zone are drawn in the same colour, and the two indicators remain distinguishable by how their rectangles are painted and by their labels

#### Scenario: OB colours unchanged by the unification

- **WHEN** the OB indicator is rendered after the palette is shared
- **THEN** its demand and supply zones use the same two colours they used before, since the shared palette adopts OB's pair

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

### Requirement: FVG signal parity with the MT5 original

The FVG computation SHALL preserve the numeric conventions the original depends on, because deviations change signals: the EMA SHALL be seeded with the SMA of the first period's values (not a first-value seed — with EMA 377 the difference persists long enough to alter signals); the stochastic SHALL use rolling low/high extremes with SMA slowing per MT5's STO_LOWHIGH mode; the newest stored bar SHALL play MT5's forming bar and be excluded from pattern matching; and no signal SHALL be emitted at all until the slow EMA has enough data.

Two deviations from the original's signals are sanctioned, and no others: the dropped recent-bars scan cap, and space-extended displacement measurement. The latter changes which triplets qualify in both directions — it admits patterns the original rejects and rejects patterns the original admits — so parity against the original SHALL be verified on the numeric conventions above rather than on the resulting zone set, and the fixtures SHALL keep a raw-bar set that exercises those conventions independently of the space rules.

#### Scenario: EMA seeding

- **WHEN** the EMA 377 is computed over a bar series
- **THEN** its first defined value at index 376 equals the arithmetic mean of the first 377 closes, and values before that index are undefined

#### Scenario: Forming bar excluded

- **WHEN** the newest stored bar would complete a pattern as bar3
- **THEN** no zone is emitted for it; the newest bar never acts as bar3

#### Scenario: Numeric conventions still verified against the reference

- **WHEN** the fixtures are regenerated from the reference implementation
- **THEN** the EMA arrays, the stochastic array, and the warm-up warning still match it exactly, even though the zone sets diverge where spaces apply

### Requirement: FVG works on every timeframe after a full sync

With per-timeframe fetch depth in place, a fully synced symbol SHALL hold enough history on every timeframe for the FVG indicator to scan (its warm-up plus a scannable region beyond it), so that at the default display limit the indicator produces zones or a genuine no-signals result — never a warm-up warning. Two exceptions stand: source scarcity the system cannot fix, where an instrument's listed lifetime is shorter than the warm-up depth on a timeframe (e.g. fewer than 380 weeks of existence for W1); and a display limit the user has set below the warm-up. Both show the standard insufficient-history warning.

#### Scenario: Default timeframe scans successfully

- **WHEN** the user enables FVG on the default timeframe of a fully synced symbol
- **THEN** the scan runs over every displayed bar past the warm-up instead of reporting insufficient history

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

### Requirement: OB rests on internal-only swing structure

Order Block detection SHALL compute swing structure internally, and that structure SHALL NOT
be rendered on the chart or exposed as a separate indicator. It comprises:

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
  previous low.
- **Structural break tracking.** A close beyond the previous same-type pivot level SHALL count
  as a break; a break in the direction of the prevailing swing direction is a continuation
  (BOS) and a break against it is a reversal (SMS). The most recent break bar SHALL clamp the
  right edge of the Order Block scan.
- **Impulse/pullback classification.** Each confirmed pivot SHALL be classified as an impulse
  when its extreme exceeds that of the previous pivot of the same type, and a pullback
  otherwise; the first pivot of its type in the series SHALL count as an impulse. This is the
  classification the Order Block impulse filter consumes.
- **The live, unconfirmed swing.** While a structural break is active, the swing running from
  the newest confirmed pivot to the current unconfirmed extreme SHALL also be scanned for
  Order Blocks and SHALL be treated as an impulse, because the break itself establishes it as
  one. This is what makes the newest — and most actionable — zones appear before the swing's
  pivot has confirmed.

#### Scenario: Structure is computed but never drawn

- **WHEN** the `OB` indicator is enabled on a chart
- **THEN** only Order Block rectangles and their labels appear; no pivot markers, swing lines,
  break labels, confirmation levels or pending-pivot markers are drawn

#### Scenario: Pivot relocated to the true extreme

- **WHEN** a bar is a typical-price pivot high but a neighbouring bar inside the detection
  window has a higher high
- **THEN** the pivot is recorded at the neighbouring bar and carries that bar's high

#### Scenario: Unretraced pivot is not used

- **WHEN** a candidate pivot high is never followed by a typical price the configured points
  distance below it
- **THEN** no confirmed pivot exists at that bar, so no swing pair and no Order Block derives
  from it

#### Scenario: Live swing contributes zones

- **WHEN** the newest close has broken the previous same-type pivot level while the swing's own
  pivot is still unconfirmed
- **THEN** Order Blocks from that live swing are detected and drawn

### Requirement: OB omits the MQL5 source's other SMC features

The port SHALL be limited to Order Block detection and rendering. The following behaviour
present in `SMCTrading.mq5` SHALL NOT be reproduced as user-visible output: swing-pivot
`H`/`L` labels, arrowed lines between pivots, BOS and SMS break labels, pivot confirmation
level lines, pending-pivot markers, the trend readout, price-return arrow markers on bars that
re-enter a zone, and the slow-RSI momentum block. The slow RSI SHALL NOT be computed at all,
since nothing consumes it even in the source.

#### Scenario: No trend readout

- **WHEN** the `OB` indicator is enabled
- **THEN** the chart shows no trend text, arrows or break labels, only Order Block zones

### Requirement: OB signal parity with the MT5 original

The Order Block computation SHALL follow the same algorithm as `SMCTrading.mq5`. Parity SHALL
be claimed and verified on timeframes of H4 and above, where the source's dropped skip-bar
filter cannot fire and both implementations therefore read the same bars; on timeframes below
H4 the port's output SHALL NOT be required to match MT5. Verification SHALL compare the JS
output against the MT5 indicator's own output over the same bars for the same symbol and
timeframe, not merely by review, and SHALL cover both the internal swing structure and the
resulting zones:

- pivot bar times, pivot types, confirmation bar times, and impulse/pullback classification
  SHALL match exactly, because a single divergent pivot changes every downstream zone;
- Order Block bar times and directions SHALL match exactly, and zone prices SHALL match within
  a floating-point tolerance, since they are copies of stored bar extremes rather than derived
  values;
- zone validity end times SHALL match exactly for zones already closed in the MT5 export;
  zones still open at export time SHALL be compared as open rather than by end time.

Only these deviations from the source SHALL be sanctioned, and each SHALL be recorded where
the parameters are defined:

- **The lookback cap is dropped.** The source scans a bounded recent window; the port SHALL
  scan every displayed bar, so that older zones stay visible per the full-history requirement.
- **All detected zones are rendered.** The source's live view hides zones that oppose the
  current trend and zones from any swing but the newest; the port SHALL render every detected
  zone at once, matching the source's history mode.
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

Any divergence found during verification that is not on this list SHALL be treated as a defect
in the port rather than accepted as a difference.

#### Scenario: Structure compared before zones

- **WHEN** the JS output and an MT5 export of the same symbol and timeframe are compared
- **THEN** the pivot sequence, including confirmation times and impulse classification, is
  compared first, so a structural divergence is reported as such instead of surfacing as
  mismatched zones

#### Scenario: Zone deep in history is still drawn

- **WHEN** a qualifying Order Block sits well outside the source's lookback window in a long
  displayed series
- **THEN** the zone is detected and drawn alongside newer zones

#### Scenario: Counter-trend zone is still drawn

- **WHEN** a detected demand zone belongs to a swing that opposes the newest swing direction
- **THEN** it is drawn, because the port does not apply the source's trend-bias display filter

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

### Requirement: OB reports when structure is missing

The `OB` indicator SHALL declare a minimum bar count sufficient for pivot detection and
confirmation, so that the framework's insufficient-history warning covers it. When the
displayed series is long enough but yields fewer than two confirmed swing pivots, the
indicator SHALL warn that no confirmed swing structure was found, because an absence of zones
is otherwise indistinguishable from an absence of qualifying candidates.

#### Scenario: No confirmed structure

- **WHEN** `OB` is enabled on a series long enough to scan but too featureless to confirm two
  pivots
- **THEN** the chart shows a warning that no confirmed swing structure was found rather than
  silently rendering nothing

#### Scenario: Series below the warm-up

- **WHEN** the displayed series holds fewer bars than the indicator's declared minimum
- **THEN** the standard insufficient-history warning names the required and available counts
