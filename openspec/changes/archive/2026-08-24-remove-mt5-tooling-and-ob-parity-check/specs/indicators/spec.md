## ADDED Requirements

### Requirement: OB deviations from the SMCTrading source

The Order Block port SHALL follow the same algorithm as `SMCTrading.mq5` apart from the
deviations listed below, and no others. A divergence from the source that is not on this list
SHALL be treated as a defect in the port rather than accepted as a difference. This is a
statement about the port's own behaviour: it holds whether or not any comparison against the
source is ever run.

The port SHALL record the exact source it was derived from — path, version and content hash —
where its parameters are defined, so a reader can tell which file the port transcribes. The
current source is version 3.23 at sha256
`484d821dff2081a56c081331e9897fc1837e21cff800c4e74930266a35faf8a7`. This record SHALL be kept
current with the file the port is derived from; it does not by itself assert that any output
has been compared against that file.

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
- **The newest stored bar plays MT5's forming bar** and SHALL be excluded from acting as a
  candidate Order Block bar or a confirmed pivot, matching the convention the FVG indicator
  already follows.
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

- **WHEN** the port's zones on a timeframe below H4 differ from the MT5 chart's zones on the
  same instrument
- **THEN** the difference is not a defect on that basis alone, because the source excludes
  skip-window bars there and the port does not

#### Scenario: Output depends only on the displayed series

- **WHEN** the same displayed series is computed after arriving as one batch and after
  arriving bar by bar
- **THEN** the structure and the zones are identical, because only the full-recalculation path
  is reproduced

#### Scenario: Source provenance is recorded

- **WHEN** a reader inspects where the Order Block parameters are defined
- **THEN** the source path, its version and its content hash are recorded there alongside the
  deviations above

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

## REMOVED Requirements

### Requirement: OB signal parity with the MT5 original

**Reason**: The requirement specifies a verification procedure the repository can no longer
perform. It requires the JS output to be compared against an MT5 export of the same symbol and
timeframe, and requires that export to carry the same source hash the port records — a
condition that can only be re-established by a human at one MT5 terminal with `SMCTrading.mq5`
installed. The tooling it depended on (the MQL5 export script, the fixture generator, the
intraday spot-check) and the single committed fixture recorded once at one instrument and
timeframe are all removed by this change, so the requirement would mandate a comparison with
nothing to compare against and no way to produce one.

**Migration**: No behaviour is lost. The six sanctioned deviations and their observable
consequences are carried forward by the new "OB deviations from the SMCTrading source"
requirement, which states them as behaviour the port SHALL exhibit rather than as terms of a
comparison, and which keeps the source provenance record — path, version and content hash —
that the removed requirement introduced. What is given up is the claim to re-verify the port
against a running terminal: the port's agreement with `SMCTrading.mq5` was established once
against the original and is now upheld by the algorithm and deviations the `OB indicator`,
`OB rests on internal-only swing structure`, `OB omits the MQL5 source's other SMC features`
and `OB deviations from the SMCTrading source` requirements state, not by a fixture. A future
change that wants a numeric OB check should provide expected values producible from a clone,
as it would for any other indicator, rather than restore an MT5-only export path.
