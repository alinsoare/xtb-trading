## ADDED Requirements

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

The gap and the zone SHALL be measured from recorded prices alone: spaces SHALL NOT move either edge of a zone. Detected zones SHALL render as rectangles spanning from bar1's time forward a configured number of bars, drawn behind the candles, with a direction-colored label at bar3.

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
