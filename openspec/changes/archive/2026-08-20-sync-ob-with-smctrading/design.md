## Context

See proposal.md — Why. Two facts shape the approach.

**The port models one path, not the whole indicator.** `SMCTrading.mq5` maintains its
structure incrementally: `OnCalculate` runs `InitializeBasePivots` once (the
`prev_calculated == 0` path), then refines on every new bar through `ProcessPivots` →
`SearchForPendingPivot` / `CheckPendingPivotRelocation` /
`CheckPendingPivotBreakConfirmation`. `web/indicators/ob-structure.js` reproduces the
fresh-load path only: base pivots, then one pending-extreme search, one confirmation check,
one structure-break check. That is deliberate and is what an MT5 export taken after a forced
recalculation shows, so it is the correct comparison target — but it means source functions
that only run on the incremental path are legitimately absent, and an audit must not "fix"
their absence. The parity spec now states this as a sanctioned deviation so the boundary is
written down rather than inferred.

**Most of the source's break machinery has no consumer in the port.** Walking the source's
state through the port's own output shows only two live dependencies: `lastBreakBarTime`
(clamps the OB scan's right edge) and `bosOccurred` (admits the live swing). `currentTrend`
feeds only the BOS/SMS classification, which feeds only the label bookkeeping, which the port
never renders — the port draws no break labels, applies no trend-bias filter, and shows no
trend readout. That is why the port's stale `hasLastStructEvent` / `lastStructEventIsBOS`
same-type collapse guard produced no visible bug: it gates dead state. It also explains the
divergence's real cost, which is not wrong pixels today but a rejected model sitting in the
code where the next reader will take it for the source's design.

Two further gaps are real but latent for the same kind of reason: the port keeps a live
extreme that fails structure containment (the source discards it), and its open-ended validity
fast path for the live swing does not require a break to be active (the source does). Neither
is reachable through the port's current search path — the pending search only accepts extremes
that already pass containment, and live-swing zones only exist when a break is active — so
neither changes output today. They are the source's contract at those points, and a port that
disagrees with it silently becomes wrong the moment the surrounding code moves.

## Goals / Non-Goals

**Goals:**

- Make the port's recorded provenance true: recorded hash, fixture hash, and the file on disk
  all name one `SMCTrading.mq5`, with the parity comparison actually run against it.
- Bring the break model in line with the source's current one and delete what the port cannot
  render, so the remaining state is exactly what output depends on.
- Draw demand rectangles only, without touching detection.
- Leave the audit's boundaries written down — what is compared, what is deliberately not
  modelled — so the next drift is cheap to find.

**Non-Goals:**

- Modelling the source's incremental (per-tick, per-bar) refinement path. Out of scope; the
  spec records it as a sanctioned deviation.
- Porting anything the source draws besides Order Block rectangles and the pivot `H`/`L`
  labels.
- Re-tuning `OB_PARAMS`. The defaults are the source's and stay as they are.
- Any change to FVG, MACD, the palette's shape, the chart UI, or any server component.

## Decisions

**Audit against the invariants document, function by function, before changing anything.**
`.cursor/rules/smctrading-indicator.mdc` is the source's own statement of which behaviours are
load-bearing and which have been tried and rejected; it names the failures each rule prevents
(the duplicate-BOS-label pairs, the collapsed same-type runs, the OB truncated by a stale
break marker). Reading the two files together section by section catches divergences that a
diff of the `.mq5` alone would not explain, and there is no old copy of the source to diff
against anyway — the previously recorded hash cannot be reconstructed. Alternative considered:
skip straight to the known divergences. Rejected: the hash moved for reasons we cannot
enumerate, so "known" is exactly the wrong assumption, and the audit is the deliverable that
makes the parity claim mean something again.

**Keep `lastBreakBarTime`, `bosOccurred` and the swing direction; drop the label
bookkeeping.** The break-bar marker and the active-break flag have consumers. The swing
direction is kept even though nothing downstream reads it, because it is the input to the
single comparison that classifies a break, and that classification is the invariants
document's central rule — dropping it would leave the port unable to express the source's
model, and re-deriving it later is exactly how the current drift happened. Everything about
labels goes: the event list, the pivot-context guard, the consumed-level guard, and the
same-type collapse guard the source has removed and forbidden by name. The alternative —
porting the guards faithfully, consumed-level included — was rejected because it adds three
pieces of state whose only purpose is to decide which of two labels the port does not draw,
and a guard nothing exercises is a guard nothing keeps correct.

**Order the break handler so the marker advances first.** The marker moves as soon as a break
is seen and before any other decision, which is what the source does and what its notes
identify as load-bearing: a break whose label is suppressed must still clamp the scan, or a
later valid Order Block is silently truncated. With the label guards gone this ordering is
trivially satisfied, but it is stated in the spec because it is the property that matters, not
an artefact of how few guards remain.

**Carry the broken level into the break handler.** The source's handler signature takes the
level, and its break sites each pass the specific level they broke (the last confirmed high
for an up break, the last low for a down break). The port's handler currently takes only the
bar time and direction. Threading the level through costs nothing, keeps every break site
readable next to its source counterpart, and means a future rule that needs the level does not
have to re-plumb five call sites. It is unused by any guard the port keeps, and the code should
say so where it is passed.

**Filter supply zones at the drawable step, not in detection.** Detection stays whole so the
MT5 export — which draws both directions — remains a usable oracle for the full zone set, and
so the demand path is provably untouched by this change. The drop therefore lands in the
indicator's `compute`, which already turns zones into drawables. Alternatives considered:
(a) stop detecting supply zones, which would make half the oracle unusable and turn a
rendering preference into an algorithm change; (b) filter in the chart layer, which would put
indicator-specific policy in generic rendering code. Both rejected.

**Regenerate the fixture from the current source, and let the audit proceed without it.**
Regenerating needs a manual MT5 export (attach `SMCTrading`, force a full recalculation, run
`ExportOBOracle`), so it cannot be automated inside the change. The code work is therefore
sequenced to run against the existing fixture — which must keep passing, since the demand
algorithm is not meant to change — and the export closes the change by proving parity against
the file the port now names. If the regenerated fixture disagrees with the port, that is the
audit's real finding and it is a defect in the port unless it lands on the sanctioned list.

**Say demand-only in the spec, not "hide the pink ones".** The requirement is written as
"supply zones are detected and never drawn" rather than as a display filter, because a display
filter is exactly the source behaviour the port has always refused (the trend-bias filter),
and the two must not be confused by a later reader. The distinction is testable: a supply zone
still appears in the computed zone list and still gets a validity end time.

## Risks / Trade-offs

- **The regenerated fixture may not match the port, and the cause may be a source change we
  cannot attribute** (no history exists for `SMCTrading.mq5`) → Treat any mismatch as a port
  defect and fix the port to the current source; if a mismatch turns out to be a deliberate
  new source behaviour we do not want, add it to the sanctioned-deviation list with its
  reason, so the next reader sees a decision rather than a discrepancy.
- **The MT5 export is manual, so the parity claim can silently age again** → The recorded hash
  is now part of the requirement, and the fixture carries the hash it was exported with, so a
  drifted source is detectable by comparing two strings instead of by re-reading 2,700 lines.
- **Dropping the label bookkeeping loses the option of drawing BOS/SMS labels later** → It is
  a rejected feature, not a deferred one (the omissions requirement forbids it); if it is ever
  wanted, it comes back as its own change, re-derived from the source then rather than kept
  half-alive now.
- **Keeping supply detection means keeping code with no user-visible output** → Accepted: it
  is the parity oracle's other half, and the parity requirement now names it explicitly so it
  does not read as dead code.
- **Removing bearish rectangles removes context a reader may have been using** → It is the
  requested behaviour and is reversible at the drawable step alone; the pivot `L` labels stay,
  so the down-swings that demand zones start from remain visible on the chart.
