## Why

The `OB` indicator computes a full swing structure — confirmed pivot highs and lows — but deliberately renders none of it, so the zones appear on the chart with no visible sign of the swings that produced them. Reading why a zone exists (or why an expected one does not) currently means reasoning about invisible pivots. Marking the pivots the scan actually used makes the indicator's own structure legible without turning it into a second indicator.

## What Changes

- The `OB` indicator draws a text label at each **confirmed** swing pivot it detected: `H` above the bar carrying a pivot high, `L` below the bar carrying a pivot low. Positioned at the pivot's own extreme — its high for an `H`, its low for an `L` — so the label sits clear of the candle rather than over it.
- No lines of any kind are drawn: no swing lines between pivots, no horizontal pivot levels, no rays, no confirmation-level lines, no zones. Labels only.
- The pending, still-unconfirmed swing extreme is **not** labelled, even though the Order Block scan reads it, because it moves from bar to bar until it confirms and a label that jumps is misleading. See the assumption noted under Impact.
- Pivot labels are made readable rather than reusing the small zone-label treatment: horizontally centred over their bar, separated from the wick tip by a small gap, in a larger emphasised type and a neutral high-contrast colour distinct from the demand/supply palette, so an `H` is never mistaken for a zone marker.
- The generic label drawable gains the optional horizontal alignment, pixel offset and emphasis it needs to render that way. Defaults preserve the current appearance of every existing `OB` and `FVG` zone label exactly.
- Everything else about the indicator is unchanged: pivot detection and confirmation, Order Block detection, zone geometry, validity, colours, MT5 parity, the pane layout and the toolbar toggle.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `indicators`: a new requirement makes pivot `H`/`L` labels required `OB` output, and the two requirements that currently forbid drawing swing structure — *OB rests on internal-only swing structure* (its "structure is computed but never drawn" scenario) and *OB omits the MQL5 source's other SMC features* (which lists swing-pivot `H`/`L` labels among the omissions) — are narrowed so that everything structural except those labels stays forbidden.

## Impact

- `web/indicators/ob.js` — the registry `compute` already receives the swing structure from `obZones`; it starts emitting a label drawable per confirmed pivot alongside the existing zone drawables.
- `web/indicators/registry.js` — the canvas primitive's `_drawLabel` grows optional centring, a pixel offset and an emphasised font; the drawable-shape comment block is updated.
- No change to `web/indicators/ob-structure.js`, the detection algorithm, the OB fixtures, or any Python/server component. `tests/js/run_ob_fixtures.mjs` compares pivots and zones from `obZones`, which is untouched, so it must keep passing unmodified.
- **Assumption to confirm**: only confirmed pivots are labelled. The scan does derive zones from the live unconfirmed swing, so a reader may expect its extreme marked too; if it should be, that is a follow-up (likely a distinct, visibly provisional marker) rather than an extra `H`/`L`.
