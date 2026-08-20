## Why

Order Block zones are currently painted as a 50%-opaque fill, which washes out the candles
underneath them. On a chart with several overlapping demand zones the price action becomes hard
to read. Making the fill far lighter keeps the zone visible as a tint while letting the candles
read at close to full contrast.

## What Changes

- The OB rectangle fill changes from 50% opacity (50% transparent) to 10% opacity (90%
  transparent). It stays a borderless fill of the demand colour — only the alpha changes.
- The `OB` label keeps the full-strength directional colour and is unaffected.
- FVG rectangles keep their stroked-outline treatment, so the two indicators remain
  distinguishable by how their rectangles are painted.
- No detection, geometry, or zone-validity behaviour changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `indicators`: the OB indicator requirement's rendering paragraph and its
  fill-opacity scenarios change from 50% opacity to 10% opacity (90% transparent).

## Impact

- `web/indicators/registry.js` — the `globalAlpha` value used by `_drawRect`'s `"fill"` branch.
  `ob` is the only indicator that emits `style: "fill"` rectangles, so no other drawable is
  affected.
- No backend, API, data-format, or storage impact. Existing JS fixture harnesses assert zone
  geometry rather than paint, so they are unaffected.
