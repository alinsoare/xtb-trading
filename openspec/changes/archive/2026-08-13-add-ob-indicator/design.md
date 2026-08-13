## Context

See proposal.md — Why. What shapes the approach is the shape of the source. `SMCTrading.mq5`
v3.23 (2,729 lines, at `~/daytrading/mt5/indicators/SMCTrading.mq5`, outside this repo) is not
an Order Block detector with some extras bolted on; Order Blocks are the last stage of a
pipeline. `DetectOrderBlocks` walks pairs of confirmed swing pivots, and its filters read
`secondPivot.moveType` (buffer 12: impulse or pullback), `pivotBoundary` (an earlier pivot's
extreme), `secondPivot.confirmationTime`, and `g_lastBreakBarTime` (the most recent BOS/SMS
bar). Every one of those comes out of the pivot and structure-break machinery. So "port Order
Blocks only" means porting roughly 900 lines of pivot detection, confirmation, relocation and
break classification that will never draw a pixel.

Two smaller findings narrow the job. The slow-RSI block is dead: `CalculateSlowRSI` fills
`g_slowRSIValues`, and the only reader, `GetSlowRSIExtreme`, is never called — it can be
dropped outright rather than ported and hidden. And the source's own live view already hides
most of what it detects (`InpShowHistory = false` keeps only the newest swing's zones, and only
those aligned with the current trend); its history mode draws everything, which is what this
port needs, so the "render all zones" deviation is really "always behave like history mode".

The existing indicator contract is the other constraint: `compute(bars, instrument) ->
{ drawables, warning }` over an oldest-first bar array, no chart or DOM access, so the Node
harness can import it. MT5 is series-indexed with the newest bar at 0 and a forming bar 0.

## Goals / Non-Goals

**Goals:**

- One faithful transcription of the source pipeline, with the index convention flipped once at
  the boundary rather than in every loop.
- Swing structure that can be compared against MT5 on its own, so a structural divergence is
  diagnosed as such instead of appearing as three missing zones.
- A verification path whose oracle is the running MT5 indicator, not a second implementation
  of the same algorithm by the same author (which would agree with its own misreadings).

**Non-Goals:**

- A reusable SMC structure library. The pivot module exists to serve the OB indicator and its
  parity harness; nothing else consumes it, and it need not be generalised for that.
- Emulating MT5's incremental `OnCalculate` (tick branches, redraw caching, object lifetimes).
  Those exist for CPU and chart-object hygiene, not for signal semantics.
- Matching MT5's pixel output — fill style, exact colour constants, object z-order and the
  price-return arrow markers are out.
- Any change to the FVG indicator, the registry's drawable vocabulary, or the toolbar.

## Decisions

**Split the port into a structure module and a zone module.** `web/indicators/ob-structure.js`
computes the pivot sequence, the impulse/pullback classification, the break history and the
live unconfirmed swing; `web/indicators/ob.js` turns pivot pairs into zones, registers the
indicator, and holds the parameter block. The split is not cosmetic: the spec requires parity
to be checked on the structure before the zones, and that check needs the pivot sequence as a
first-class exported value. Considered and rejected: one file (the harness would then reach
into what is really an internal, and the file would be the largest in `web/` by a wide
margin), and pushing pivots into `mt5math.js` (that module is for MT5's *numeric* conventions —
EMA seeding, stochastic modes — and structural SMC logic does not belong beside them).

**Work oldest-first and flip the index convention once.** Every MQL5 loop here is written over
series indices, where `bar--` moves forward in time and `bar + n` moves backward; a mechanical
transcription that keeps that convention would be unreadable next to `fvg.js` and would make
the fixtures the only defence against sign errors. So each loop is re-derived in chronological
terms, and the derived form is what gets reviewed. The trade-off is real: re-derivation is
where porting bugs are born, which is precisely why parity is a requirement and why the
structure is compared pivot-by-pivot rather than only at the zone level.

**Reconstruct the whole series in one pass; do not emulate the incremental path.** The port
runs the equivalent of `InitializeBasePivots` — seed the first opposite-type pivot pair, then
walk break-to-break adding confirmed pivots — over the series up to the second-newest bar, then
runs the pending-pivot search, its confirmation check, and the structure-break check once, with
the newest stored bar standing in for MT5's forming bar 0. This is exactly the state MT5 itself
reaches on a fresh recalculation (`prev_calculated == 0`). It is *not* necessarily the state a
long-running MT5 chart holds, because pivot relocation and the break-label dedup carry state
across ticks. Parity is therefore defined against MT5's recalculated state, and the export is
taken right after forcing a recalculation (reload the indicator, or switch timeframe and back).
Considered and rejected: replaying the series bar-by-bar through a port of the incremental
branches — an order of magnitude more code and more risk, to reproduce a state the source
itself discards on every reload.

**Use the running MT5 indicator as the oracle, and export its bars along with its output.**
The verification exports three things from MT5 for one symbol and timeframe: the OHLC rates,
the structure from the 14 published buffers via `iCustom` (`PivotHigh`, `PivotLow`, `Confirm`,
`MoveType`, `ConfirmPrice` are the ones that matter), and the drawn Order Block rectangles read
back from the chart objects (`SMC_RECT_*` — name, both times, both prices), with
`InpShowHistory = true` so nothing is filtered out. The JS then runs over **the exported bars**,
not over the app's own stored bars. This is not a shortcut, it is the only sound comparison:
the app's bars come from Yahoo and the MT5 bars come from XTB, and they differ in session
boundaries, timestamps and prices, so running the two implementations on their own data would
compare nothing. Considered and rejected: modifying a copy of the indicator to print its
internal arrays (the oracle would then be a fork that can drift from the indicator the user
actually runs — reading published buffers and drawn objects keeps the oracle honest), and
hand-checking zones against screenshots (not repeatable, and useless for the structure check).

**Fixtures follow the FVG path, with an MT5 exporter in place of a Python reference.**
`tests/fixtures/ob/*.json` hold bars, expected pivots, expected zones and the parameters, and
`tests/js/run_ob_fixtures.mjs` imports the two modules directly under Node, exactly as
`run_fixtures.mjs` does. The generator differs: `tools/generate_ob_fixtures.py` reads the MT5
CSV exports and assembles fixtures, rather than importing a reference implementation the way
`tools/generate_fvg_fixtures.py` imports `xtb_trading.indicators`. There is no Python OB
implementation and there should not be one — a second port by the same hand would agree with
its own misreadings of the MQL5.

**Parity tolerance: exact where values are copied, floating-point tolerance where they are
arithmetic.** Bar timestamps, pivot types and impulse classification are discrete and SHALL
match exactly. Zone prices and pivot extremes are verbatim copies of bar highs and lows, so
they match to the harness's existing `1e-9` absolute/relative tolerance — anything looser would
hide a genuine off-by-one-bar error, since neighbouring bars' extremes are close but not equal.
Zone end times match exactly for closed zones; zones still open when the export was taken are
compared as "open" rather than by end time, because MT5 writes `TimeCurrent() + PeriodSeconds()`
there and the port ends them at the newest bar's time.

**Drop the skip-bar interval; take every bar as real data, and scope parity to H4 and above.**
The source refuses to treat a bar opening in `[23:30, 01:00)` *server* time as a pivot, on
timeframes below H4 only. Porting it would require a broker server clock the port does not
have: the exported bar timestamps carry whatever the terminal wrote, and the app's own bars come
from Yahoo, so the window could only be aligned by an assumed UTC offset. The port applies no
time-of-day filter at all — every bar in the series is eligible. Because that changes which bars
can be pivots below H4, parity is claimed only at H4 and above, where the source's filter is
inert by construction and the two implementations read the same bars; `d1` and `w1` are two of
the app's four timeframes, and both qualify. Considered and rejected: porting the filter with an
explicit UTC-offset parameter (it buys intraday parity at the cost of a permanent assumed
constant, and of silently discarding bars the user can see on the chart), and inferring the
offset from the data (silent and fragile). The accepted cost is stated plainly rather than
hidden: on `m15` and `h1` the port's zones may differ from the MT5 chart's, and that difference
is sanctioned rather than a defect.

**Do not vendor the MQL5 source; pin its identity instead.** The module header names the source
file, its version (3.23) and a content hash, and the fixtures record the same, so a future
reader can tell whether the source has moved on since the port was verified. Copying 2,700
lines of MQL5 into `web/` or `tools/` to document 900 of them would be noise, and the
provenance-in-the-header convention is what `fvg.js` already does for the `FVGSignal.mq5`
lineage.

**One parameter block, MT5's defaults.** `OB_PARAMS` carries `pivotBars: 3`,
`confirmPoints: 50` (instrument points, via the catalog's `point_size`, as `_Point` is used in
the source), and the `500`-bar cap on the zone-validity scan. The dropped lookback cap
(`InpLookbackBars`, 2000), the dropped display filters, and the dropped skip-bar interval —
with the note that parity is therefore scoped to H4 and above — are recorded there as comments,
mirroring how `FVG_PARAMS` records the dropped `bar_limit`. The skip interval contributes no
parameters precisely because it is not implemented; a disabled-by-default setting would invite
someone to turn it on and reintroduce the clock problem.

**Colours from MT5, stroked by the existing renderer.** Demand zones take light green and
supply zones light pink, the source's own choices, which stay distinct from FVG's blue and red
on the same chart. The registry's rectangle renderer strokes rather than fills; the port
accepts that rather than adding a fill mode, since fill is a rendering concern and adding it
would touch shared rendering code for every indicator. This is a visual difference from MT5,
not a signal one.

**`minBars` mirrors the source's own guard.** `OnCalculate` refuses to run below
`pivotBars * 3 + 1` bars, so that is the declared minimum; refusing to compute where MT5
computes would be a gratuitous divergence. The realistic short-series case — enough bars, too
little structure — is covered by the "no confirmed swing structure" warning instead, which is
the honest message in that situation.

## Risks / Trade-offs

**The largest part of this change is invisible.** Nine hundred lines of pivot and break logic
render nothing, so a defect in it surfaces only as zones that are missing, misplaced, or
subtly wrong — the kind of thing that looks plausible on a chart. → Mitigation: the structure
is compared against MT5's published buffers on its own, before any zone comparison, and the
harness reports a structural divergence as such. This is the reason the spec makes parity a
requirement rather than a review note.

**MT5's live state can differ from its recalculated state**, so an export taken from a chart
that has been open for days may not match a fresh recalculation of the same bars. → Mitigation:
the export procedure forces a recalculation first, and the fixture records that it did. A
mismatch that disappears after forcing a recalculation is a symptom of this, not of the port.

**Two of the app's four timeframes carry unverified zones.** Dropping the skip-bar interval puts
`m15` and `h1` outside the parity claim, so a user comparing the web chart to an MT5 intraday
chart can find zones that do not correspond, with no fixture to say whether the port or the
reading is at fault. → Mitigation: a one-time intraday spot-check confirms the divergences trace
to bars inside the source's skip window and to nothing else, which turns a future intraday
mismatch from a suspicion into an explained consequence. The finding is recorded next to the
parameter block. If the spot-check instead shows divergences on bars outside the window, that is
a port defect and is fixed as one.

**The oracle lives outside the repo and can change.** The source file is a working indicator
the author edits. → Mitigation: version and content hash recorded in the module header and in
the fixtures; a hash mismatch means "re-verify", not "the port is broken".

**Performance over long series.** Pivot confirmation and the zone-validity scan are nested
loops per candidate, and the full-history scan requirement means they run over everything
displayed on each recompute. → Mitigation: the source's own bounds carry over (the validity
scan is capped at 500 bars, candidates are bounded by swing length), and the cost is measured
against the existing FVG recompute, whose stochastic already does nested per-bar work over the
same series. If it proves too slow, the answer is memoising per bar array, not trimming the
scan — trimming would break the full-history requirement.

**Overlapping zones may clutter the chart** once every detected zone is drawn, which the source
never shows at once in live view. → Mitigation: this is the deliberate consequence of the
full-history requirement the capability already imposes on every indicator, and the shadow
filter already collapses overlapping candidates within a swing. If it proves unreadable, the
fix is a later change to rendering, not to detection.

## Migration Plan

None required. Additive frontend change: a new indicator appears in the toolbar and is off
until enabled, and the enabled-set persistence already tolerates unknown ids. Reverting the
commit removes the toggle and leaves FVG untouched. No data, API, storage or contract changes.

## Open Questions

- Whether a second parity fixture at another qualifying timeframe (W1) is worth committing
  alongside the D1 one, or whether D1 plus the intraday spot-check is enough coverage. This is a
  question about fixture breadth, answerable once the first comparison run shows where the
  divergences cluster. The intraday export is deliberately not a parity fixture — it exists only
  for the spot-check, since below H4 the two implementations read different bar sets.
- Whether zones should eventually be filled rather than stroked, matching MT5's look. Deferred
  because it is a rendering change affecting all indicators and does not touch detection,
  the specs, or the task breakdown.
