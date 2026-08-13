## Context

See proposal.md — Why. Current state, verified in the code:

- `web/indicators/fvg.js` exports `FVG_COLORS = { bullish: "#1e90ff", bearish: "#ef5350" }`; `web/indicators/ob.js` exports `OB_COLORS = { demand: "#90EE90", supply: "#FFB6C1" }`. Each indicator's `compute()` looks its own colour up by the zone's `direction` string and puts it on both the `rect` and the `label` drawable. The two direction vocabularies differ: FVG uses `bullish`/`bearish`, OB uses `demand`/`supply`.
- `web/indicators/registry.js` renders every `rect` drawable identically in `_drawRect`: `ctx.strokeStyle = rect.color; ctx.lineWidth = 2; ctx.strokeRect(...)`. There is no fill path and no per-drawable style, so today both indicators are outline-only and are told apart by colour alone.
- Nothing else consumes these constants — no settings UI colour picker, and the JS fixture harnesses (`tests/js/run_fixtures.mjs`, `run_ob_fixtures.mjs`, `run_space_fixtures.mjs`) assert zone geometry, not colours.
- Frontend constraint: no build step, no bundler, plain ES modules loaded by the browser.

## Goals / Non-Goals

**Goals:**

- One place defines the two directional zone colours; both indicators read it.
- The `rect` drawable carries how it is painted, so the single renderer in `registry.js` can produce both an outline (FVG) and a borderless 50% fill (OB).
- OB's rendered colours are unchanged by the unification — the shared palette adopts OB's existing pair, so only FVG's colours move.

**Non-Goals:**

- No user-configurable colours or opacity; the palette stays a code constant.
- No change to zone detection, geometry, validity, or label placement.
- No change to the `label` drawable's rendering, and no new drawable types.
- Not unifying the two direction vocabularies (`bullish`/`bearish` vs `demand`/`supply`) — each indicator keeps the wording its domain uses and maps to the palette at the drawable-construction site.

## Decisions

**Where the palette lives: a new `web/indicators/palette.js`.**
A tiny module exporting the two directional colours, imported by both indicators. The alternative — keeping the constant in `ob.js` and importing it into `fvg.js` — would make FVG depend on the OB module for a purely presentational value and imply an ownership that does not exist. `palette.js` is also where a third zone indicator would look. `ob.js` and `fvg.js` may re-export their existing constant names as aliases if that keeps the harnesses and any external importer working; the canonical definition is in `palette.js`.

**Direction mapping stays at the call site.**
The palette exposes neutral keys (a bullish/demand colour and a bearish/supply colour). Each indicator's `compute()` maps its own direction string to a palette key. Alternative considered: renaming OB's `direction` values to `bullish`/`bearish` so both index the palette directly — rejected because those strings appear in the OB parity fixtures and in the spec's demand/supply vocabulary, and this change should not touch detection output.

**Rect paint style: an explicit `style` field on the drawable, not a colour with baked-in alpha.**
`rect` gains something like `style: "fill" | "stroke"` (stroke as the default so an unmarked rect keeps today's behaviour). `_drawRect` branches: for `"stroke"` it keeps `strokeRect` at `lineWidth` 2; for `"fill"` it sets `globalAlpha = 0.5`, calls `fillRect`, restores alpha, and issues no stroke at all. Alternatives considered:

- *Pass an `rgba()`/8-digit-hex colour and always fill.* Rejected: it would force the label to carry a second, full-strength colour and would encode presentation policy into the colour constants, so the palette could no longer be a plain pair of hex strings.
- *Give the rect an `opacity` number instead of a style enum.* Rejected as under-specified — opacity alone does not say whether a border is drawn, and "no border" is the load-bearing half of the OB treatment.

Using `globalAlpha` (saved and restored around the fill) rather than an alpha-baked fill colour keeps the label's full-strength colour a straight reuse of the same palette value. The ruler tool already fills with a pre-baked `rgba()` string in `web/chart-tools/ruler.js`; that is a separate module with its own colours and is deliberately left alone.

## Risks / Trade-offs

- **A 50% fill over candles can reduce candle legibility inside a zone, especially where OB zones overlap.** → The fill is 50% and drawn behind the candles by the existing primitive's paint order, so candle bodies stay visible; overlapping zones will compound, which is accepted as the price of the requested treatment. If it proves unreadable in practice, the opacity is a one-constant change.
- **Losing OB's border makes small zones (a single narrow bar) fainter than before.** → The `OB` label at full colour strength still marks every zone, so no zone becomes invisible.
- **Sharing a palette means FVG and OB zones of the same direction can no longer be told apart at a glance when they overlap.** → That is the intended trade; the fill-vs-outline distinction plus the `FVG`/`OB` labels carry the difference.
- **`globalAlpha` leaking into later drawables if not restored.** → Save/restore (or reset to 1) around the fill; the primitive draws all drawables in one pass over a shared context.

## Migration Plan

Not applicable — a client-side rendering change with no persisted state, no data format, and no API surface. Reverting the commit restores the previous appearance.
