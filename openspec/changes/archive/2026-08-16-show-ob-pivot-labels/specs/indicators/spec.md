## ADDED Requirements

### Requirement: OB marks its confirmed swing pivots

The `OB` indicator SHALL mark on the price pane every confirmed swing pivot its own structure
computation produced, so a reader can see the swings the zones were derived from. The mark
SHALL be a text label and nothing else:

- a pivot high SHALL carry the single character `H`, placed **above** the bar recorded as that
  pivot, anchored at that pivot's high;
- a pivot low SHALL carry the single character `L`, placed **below** the bar recorded as that
  pivot, anchored at that pivot's low;
- the label SHALL sit clear of the candle rather than overlapping its wick, separated from the
  anchoring extreme by a small visible gap, and SHALL be horizontally centred on its bar so it
  reads as belonging to that bar and not to a neighbour.

Because the pivot is relocated to the bar carrying the true extreme (see the swing-structure
requirement), the labelled bar SHALL be that relocated bar, so the label always sits at a real
high or low of the series.

Labels SHALL be drawn for every confirmed pivot in the displayed series at once, not only the
newest ones, matching the full-history rule the zones already follow. The live, unconfirmed
swing extreme SHALL NOT be labelled, even though the Order Block scan reads it, because it can
move to a different bar on every new bar until it confirms.

Pivot labels SHALL be legible against the chart background and SHALL be visually distinct from
the zone labels: they SHALL use a larger, emphasised type than the `OB` and `FVG` zone labels
and a neutral colour taken from neither side of the directional zone palette, so an `H` or `L`
is never read as a demand or supply marker. The zone labels' own appearance SHALL be unchanged
by this.

Pivot labels SHALL appear only while the `OB` indicator is enabled and SHALL disappear with it,
and they SHALL NOT alter the pane layout: no new pane, no change to the price pane's scaling,
and no change to the chart's vertical range.

#### Scenario: Confirmed pivots are labelled

- **WHEN** the user enables `OB` on a series whose structure holds several confirmed pivot highs
  and lows
- **THEN** each pivot-high bar carries an `H` above it and each pivot-low bar carries an `L`
  below it, every one of them drawn at once rather than only the most recent

#### Scenario: Label clears the candle

- **WHEN** an `H` is drawn for a pivot high
- **THEN** it sits above that bar's high with a visible gap, centred on the bar, and does not
  overlap the wick or the neighbouring candles

#### Scenario: Label follows the relocated pivot

- **WHEN** a typical-price pivot high is relocated to a neighbouring bar with a higher high
- **THEN** the `H` is drawn above that neighbouring bar at its high, not above the original
  candidate bar

#### Scenario: Unconfirmed extreme is not labelled

- **WHEN** the live swing's extreme is still unconfirmed while Order Blocks from that swing are
  already drawn
- **THEN** no `H` or `L` appears at that extreme; only confirmed pivots are labelled

#### Scenario: Pivot labels are not zone labels

- **WHEN** pivot labels and zone labels are on the chart together
- **THEN** the `H` and `L` labels are larger, emphasised and drawn in a neutral colour belonging
  to neither the demand nor the supply palette entry, while the `OB` and `FVG` zone labels keep
  the size and directional colour they had before

#### Scenario: Labels leave with the indicator

- **WHEN** the user disables `OB`
- **THEN** the pivot labels disappear along with the zones, and the price pane's layout and
  scaling are exactly as they were before the indicator was enabled

## MODIFIED Requirements

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

### Requirement: OB omits the MQL5 source's other SMC features

The port SHALL be limited to Order Block detection and rendering, plus the confirmed-pivot
`H`/`L` labels. The following behaviour present in `SMCTrading.mq5` SHALL NOT be reproduced as
user-visible output: arrowed lines between pivots, BOS and SMS break labels, pivot confirmation
level lines, pending-pivot markers, the trend readout, price-return arrow markers on bars that
re-enter a zone, and the slow-RSI momentum block. The slow RSI SHALL NOT be computed at all,
since nothing consumes it even in the source.

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
