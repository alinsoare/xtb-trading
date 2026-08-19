## Why

The `OB` indicator was ported from `SMCTrading.mq5` and pins its parity claim to a
recorded source hash (`065e9560…`, version 3.23). The file at that path has since changed
while keeping the same version string (it now hashes to `484d821d…`), and its companion
invariants document — `.cursor/rules/smctrading-indicator.mdc` — describes a structural-break
model the port only half carries: the port still holds the *same-type collapse* guard the
source has since removed and rejected by name, and it has no equivalent of the source's
consumed-level guard. So the port's recorded provenance no longer matches what is on disk,
and its parity claim cannot be verified against the source it names. Separately, the chart
now shows both demand and supply rectangles, while what is wanted here is the demand
(green) side only.

## What Changes

- **Re-align the port with the current source.** Audit `web/indicators/ob.js` and
  `web/indicators/ob-structure.js` function-by-function against `SMCTrading.mq5` as it
  stands and against every OB-relevant invariant in `smctrading-indicator.mdc`, and fix
  each divergence found. Re-record the source hash so the port names the file it was
  actually derived from, and regenerate the MT5 oracle fixture from that same file so
  parity is verified rather than asserted.
- **Adopt the source's current structural-break model.** One entry point classifies a
  break from the break direction against the live pre-break trend, updates the trend, and
  advances the break-bar marker before any label guard — so a break whose label is
  suppressed still clamps the Order Block scan. The rejected same-type collapse guard and
  the state behind it go away; the port keeps only the break state its own output depends
  on (the most recent break bar and whether a break is active) and stops carrying the
  source's label bookkeeping, which it never renders.
- **Close the latent pending-swing fidelity gaps.** A pending swing extreme that fails
  structure containment is invalidated rather than kept, and the open-ended validity fast
  path for pending-swing zones requires an active break, both as the source does. Neither
  is reachable through today's search path; they are the source's contract at those points
  and the port should not disagree with it.
- **Render demand rectangles only. BREAKING** for what the chart shows: no supply/bearish
  Order Block rectangle and no supply `OB` label are drawn any more. Demand zones, their
  labels, and the confirmed-pivot `H`/`L` labels are unchanged.
- **Three source behaviours stay out, explicitly.** The skip-bar time-of-day interval is
  not added on any timeframe; there is no show-history switch, because full history is
  always displayed here; and the source's trend-bias display filter is not added. These
  remain recorded as sanctioned deviations, and the parity scope they imply (H4 and above)
  is unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `indicators`: the *OB indicator* requirement drops supply zones from what is rendered
  (detection is unchanged); *OB rests on internal-only swing structure* gains the break
  model's specifics — single classification point, break-bar marker advanced on every
  break, pending-swing invalidation on containment failure; *OB omits the MQL5 source's
  other SMC features* additionally forbids the label/trend bookkeeping the port cannot
  render; and *OB signal parity with the MT5 original* is restated against the current
  source hash, adds the show-history and trend-bias filters to its sanctioned-deviation
  list, and scopes the rendering comparison to demand zones while keeping the structural
  and detected-zone comparisons whole.

## Impact

- `web/indicators/ob-structure.js` — break-state shape and `handleStructuralBreak`
  signature (the broken level travels with the break); pending-pivot invalidation on
  containment failure; recorded source hash.
- `web/indicators/ob.js` — demand-only drawable emission; pending-swing validity fast path
  gated on an active break; recorded source hash and deviation list in the header comment.
- `tests/fixtures/ob/xauusd-d1.json` — regenerated from the current `SMCTrading.mq5` via
  `tools/mql5/ExportOBOracle.mq5` and `tools/generate_ob_fixtures.py`, so the fixture's
  `source.hash` matches the file on disk. `tests/js/run_ob_fixtures.mjs` keeps comparing
  the full pivot sequence and all detected zones, including supply zones, since detection
  is unchanged and only rendering narrows.
- `README.md` — the OB section's zone-colour description and its deviation list.
- No change to the palette, the FVG or MACD indicators, the chart UI, or any Python or
  server component. Regenerating the fixture needs a manual MT5 export, so the audit must
  be able to proceed against the existing fixture and flag it as stale until the export is
  done.
- **Assumption**: supply zones remain *detected* and are dropped only at the drawing step.
  Keeping detection preserves the parity comparison against MT5 (which draws both) and
  leaves demand output untouched, where deleting supply detection would make half the
  oracle unusable.
- **Assumption**: the exclusion covers rectangles, not the pivot labels — both `H` and `L`
  labels stay, since a pivot low is what a demand swing starts from.
