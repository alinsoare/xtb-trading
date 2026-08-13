## Context

See proposal.md — Why. What shapes the design here is that the FVG scanner is a deliberate
transcription of an MQL5 original, with one sanctioned deviation documented in three places
(spec, code comment, fixture generator). Any second deviation has to arrive the same way:
named, justified, and reflected in the fixtures, or the parity requirement quietly stops
meaning anything.

The numbers quoted below come from running the current scanner over the last 1,500 bars of six
synced series (`AAPL.US` d1, `NVD.DE` d1, `ABEA.DE` h1, `XAD6.DE` h1, `TSLA.DE` h1, `IDR.ES`
h1) with the shipped defaults, against variants of the rule.

## Goals / Non-Goals

**Goals:**

- Measure a bar's displacement by the move it made, not by where its own open happened to be
  recorded.
- Keep the change confined to the three rules that measure displacement, so the rest of the
  pattern stays comparable to the original.
- Add nothing to the data model, the storage layer, the data contract, or the chart's drawing
  inputs.

**Non-Goals:**

- Changing what a zone is or where it is drawn. The gap stays a wick-to-wick measurement
  between bar1 and bar3.
- Making the behaviour optional. No parameter, no toggle — a toggle would double the fixture
  matrix and leave two behaviours to reason about in every filter.
- Adjusting the candles themselves. The chart keeps drawing recorded OHLC.
- Applying the idea to the Order Block indicator (`add-ob-indicator`). Decided against, not
  deferred; see Decisions.

## Decisions

### The space is a predicate, not stored state

Every consumer of the space needs exactly two things: whether it exists, and the previous bar's
close. Its size and its near edge are never read — the near edge is always the bar's own open,
which the rules already have. So the implementation is a function of two adjacent bars returning
a boolean, plus arithmetic on values already in the series.

*Alternative considered*: recording an interval on each bar as an attribute. Rejected because
nothing consumes the interval; it would be state that exists only to be recomputed identically
wherever it is read. The spec still describes the space as an interval, because that is what
makes the geometry comprehensible; the implementation collapses it.

### Bodies grow, the zone does not

Two polarities were considered for what a space does to a zone. **Subtract** treats the space as
territory belonging to the bar that carries it, carving it out of the gap and shrinking the zone
onto bar2's open and close. **Add** treats it as part of the imbalance, growing the zone until it
runs body edge to body edge, from bar1's close to bar3's open.

Neither is adopted. Subtract does not survive its own argument: the FVG zone already sits inside
bar2's range — bar1 and bar3 failing to reach it is the whole pattern — so if bar2's space is
carved out for being bar2's territory, bar2's entire range would have to go with it and no zone
could ever exist. Add is a different indicator wearing the same name. Measured, subtract took 144
zones to 119 and add would grow every zone unconditionally.

The rule adopted instead confines the space to displacement measurement, where the reasoning is
sound and local: how big was this candle's move. The zone remains a statement about recorded
highs and lows, which is also what keeps the drawn rectangle anchored to visible candle features.

### All three bodies extend, not just bar2's

Rule 1 compares bar2's body against bar1's and bar3's. Extending only bar2's body would make the
comparison asymmetric and inflate bar2's win rate: 144 zones become 181, a 26% increase driven
entirely by measuring one side of an inequality differently from the other. Extending all three
gives 152, of which 30 are new and 21 are zones that exist today — the losses being triplets
where bar1 or bar3 turns out to have made the larger move once its own space is counted. The
symmetric version is the one that answers the question the rule is asking.

### Same-type and opening-beyond conditions are kept as-is

A space requires both bars to share a type and the later to open beyond the earlier's close. For
the FVG use this means bar2 gains an extended body only when bar1 is bullish too (or neutral),
since bar2's colour is already fixed by the pattern direction. That is intended: a red bar1
before a green bar2 is a reversal, not a continuation, and crediting bar2 with a move that
started inside an opposing candle would be measuring something else.

The neutral-borrows-type clause is not cosmetic — it accounts for 7 to 106 spaces per series,
up to 18% of all spaces on `IDR.ES` h1, which carries the most neutral bars.

### The existing fixtures survive untouched, and new ones cover the spaces

`tools/generate_fvg_fixtures.py` generates golden fixtures from the Python reference in
`../xtb-trading`, which has no notion of a space. It turns out none is needed: the four
committed fixtures contain **zero spaces**. The generator's random walk sets each bar's open to
the previous close exactly, and its engineered triplets have bar3 opening below bar2's close, so
no pair ever satisfies the opening-beyond condition. The rule is therefore inert on all four,
and they remain valid golden data end to end — zones included — with no regeneration and no
change to the runner's comparisons.

That makes the split clean rather than lossy: the reference-generated set keeps proving the
numeric conventions and the unchanged pattern rules, and a second, hand-checked set proves the
space rules. The new set needs the space cases placed deliberately — bullish, bearish,
overlapping bodies, opposite types, a neutral bar borrowing a type, and a triplet that qualifies
only once spaces are counted — because nothing in the reference can generate them.

*Alternative considered*: porting the rule into the Python reference so a single fixture set
covers everything. Rejected — it makes the reference stop being a reference, and the parity
requirement then has nothing independent to check against.

*Consequence to watch*: because the reference fixtures are inert, they cannot catch a regression
in the space rules. The new fixtures carry that entire burden alone, which is why they are
specified case by case rather than as one golden blob.

### The Order Block indicator does not read spaces

The same artifact argument applies to Order Blocks in principle, and the source has four places
where it would bite: the boundary filter and the shadow-overlap test (both would get stricter),
the size filter (`obSize = high - low`, also stricter), and the drawn zone itself, which spans
the candle's high to its low and would widen. That last one is a behavioural change rather than
a measurement one — a demand zone's candidate is a bearish bar, so its space sits above it and
the zone's ceiling rises, meaning price reaches the zone earlier. Notably there is no
body-dominance rule anywhere in the Order Block stage, so this change's central idea has no
direct counterpart there.

It is still ruled out. `add-ob-indicator` verifies itself by running over MT5's exported bars and
matching MT5's drawn rectangles to 1e-9, and MT5 has no notion of a space. With roughly a fifth
of bars carrying one, spaces would break that comparison by construction, and a defect in the
900 lines of pivot and break logic would become indistinguishable from the intended divergence.
FVG could absorb the same change safely only because it was already ported and verified first.

If Order Blocks should read spaces later, that is its own change, made after the port has been
verified against the oracle — the sequence this change followed.

## Risks / Trade-offs

- **A chart the author has read for months changes in both directions** → 30 zones appear and 21
  vanish. The disappearances are the non-obvious half and are the ones to eyeball on a real chart
  before archiving. The change is unconditional, so there is no toggle to fall back on; rollback
  is reverting the change.
- **The dominance rule is now measured differently from every other rule in the pattern** →
  bodies extend, but the stair-step structure, the stochastic, and the gap all still read
  recorded prices. This is deliberate and is stated in the spec so it reads as a decision rather
  than an oversight.
- **Dead padding bars manufacture spaces** → `NVD.DE` d1 holds 637 bars from 2014 with identical
  OHLC and zero volume, from before the instrument traded. Those are neutral, so a run of them
  produces no spaces internally, but the first real bar after such a run pairs with a flat bar
  and can be credited with a space measured from a stale price. The three bars a triplet needs
  make a zone there unlikely, but the fixtures should include the boundary case so the behaviour
  is pinned rather than accidental.
- **Fixture divergence hides regressions** → with two fixture sets, a bug in the space rules
  cannot be caught by the reference-generated set. The space fixtures therefore need to be
  specific about which rule each case exercises, not just golden output blobs.
- **Two indicators now measure bars differently** → FVG credits a bar with its space, Order
  Blocks do not, so the same candle is read two ways on one chart. This is accepted for the sake
  of keeping the OB port verifiable, and is stated in the OB decision above so it reads as a
  choice rather than an inconsistency.
