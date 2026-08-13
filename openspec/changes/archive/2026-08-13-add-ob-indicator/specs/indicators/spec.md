## ADDED Requirements

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
direction-coloured, with a direction-coloured `OB` label. A zone's validity SHALL end at the
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
