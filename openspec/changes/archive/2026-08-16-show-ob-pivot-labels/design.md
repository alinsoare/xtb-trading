## Context

See proposal.md — Why.

Three facts about the current code shape the approach:

- `obZones()` already returns `{ zones, structure, warning }`, and the registered `compute()` in `web/indicators/ob.js` destructures only `zones` and `warning`. The confirmed pivots are therefore already in hand at the point where drawables are built; nothing in `web/indicators/ob-structure.js` needs to change, which keeps the OB fixture comparison untouched.
- The structure separates confirmed pivots (`structure.pivots`, each with `barTime`, `isHigh`, `high`, `low`) from the live unconfirmed extreme (`structure.pending`). Labelling confirmed pivots is a read of an existing array.
- The zone-output label drawable is minimal: `{ type: "label", time, price, text, color, baseline }`, rendered by `_drawLabel` in `web/indicators/registry.js` at a hard-coded `9px Arial`, `textAlign = "left"`, with the glyph box's edge exactly on the price coordinate. Used as-is for a pivot, an `H` would start at the bar's centre and run rightwards over the next candle, with its baseline touching the wick tip. That is the whole reason this change touches the primitive at all.

## Goals / Non-Goals

**Goals:**

- Pivot labels that are readable at a glance and unmistakably not zone labels.
- Zone labels (`OB`, `FVG`) pixel-identical to today.
- No change to detection, parity fixtures, or anything server-side.

**Non-Goals:**

- A general text-layout or collision-avoidance engine for the canvas primitive. Overlap is addressed only by the cheap measures below.
- Any user-facing control for the labels (no separate toggle, no styling options). They ride the `OB` toggle.
- Marking the pending pivot, or any other structural drawing.

## Decisions

**Extend the existing label drawable rather than add a new drawable type.** A pivot label is a label; the only thing it needs that zone labels do not is placement and weight. Three optional fields cover it: `align` (`"left"` default, `"center"`), `offset` (pixels pushed away from the price, in the direction opposite the baseline, default `0`), and `emphasis` (a boolean or a size, default off). Every existing call site omits all three and renders exactly as before. The alternative — a `pivotLabel` drawable type — would duplicate the same measure-and-fill code in the primitive for no behavioural gain.

**Place the label at the pivot's own extreme with a pixel gap, not at a price-space offset.** Anchoring at `pivot.high` with `baseline: "bottom"` and lifting by a few pixels puts the `H` above the wick tip at a distance that stays constant as the user zooms the price scale. A price-space offset (say, a fraction of ATR) would breathe with the vertical zoom and collide with the wick at some scales. Centring uses `ctx.measureText` on the single glyph, which is cheap and already available in the primitive's canvas context.

**Only confirmed pivots get labels.** `structure.pending` is recomputed every time a bar arrives and can jump to a different bar, so a label on it would move around and then vanish or relocate when the pivot finally confirms — the opposite of what a structure marker is for. The zones derived from the live swing already communicate that something is forming. This is the one assumption worth confirming; see proposal.md — Impact.

**A neutral colour, not a palette colour.** The demand/supply palette is `#90EE90` / `#FFB6C1` and the chart background is `#0f1216` with `#8b98a5` chrome text. Colouring `H`/`L` from the palette would imply a directional zone reading. A bright neutral near-white (in the `#dfe6ee`–`#e8eef5` region) reads clearly on the dark background, sits above the muted chrome grey in contrast, and belongs to neither zone direction. It goes next to `ZONE_PALETTE` as its own named export rather than inside it, since the palette is defined as exactly two directional colours.

**Emphasis via font size and weight, not a background plate.** Bumping the pivot label to roughly `11px bold` against the zone labels' `9px` regular makes the two kinds separable at a glance and keeps the glyph small enough to fit between candles at normal zoom. A filled background plate behind the glyph would read as a marker or zone chip and would occlude candles at dense zoom.

**Overlap is handled by placement, not by suppression.** Pivots are separated by at least `pivotBars` bars by construction and alternate high/low, so `H` and `L` labels rarely collide horizontally; when the user zooms far out, the primitive already clips to the visible range and single glyphs stay narrow. Dropping labels below some bar-spacing threshold was considered and rejected for this change: silently hiding structure is worse than briefly crowded glyphs, and there is no evidence yet of a zoom level where it actually bites. If it does, a spacing-based cull is a follow-up.

## Risks / Trade-offs

- **Crowded glyphs at extreme zoom-out on a long series** → single characters at 11px are narrow; the primitive draws only the visible range. Revisit with a spacing cull only if observed.
- **Changing the shared `_drawLabel` could regress zone labels** → the three new fields are optional with defaults matching current behaviour, and `web/indicators/fvg.js` and the zone branch of `web/indicators/ob.js` are left setting none of them; verification includes an explicit side-by-side of zone labels before and after.
- **A neutral near-white may sit close to the candle body colours on light-bodied candles** → the labels sit outside the candle, over the background, not on the body; the verification step checks a dense bullish run where an `H` lands just above a white-ish wick.
- **Readers may expect the live swing's extreme marked too** → recorded as an assumption in the proposal, and the spec states the exclusion explicitly so it is a decision on record rather than an oversight.
