## Why

The accumulation screener's current scoring model was built around a hard eligibility gate and two
cross-timeframe gap-plus-run signals. In practice the gate both awarded a free point and silenced
instruments before any structure was examined, so a blank row could mean either "nothing fired" or
"never scored", and every screened instrument carried at least one mark whether or not anything of
interest had happened. The model also asked whether the *current price* sat inside a zone, which
misses the common case of a day's bar reaching into a zone and leaving again.

The replacement scores what is actually being looked for: is today's bar interacting with live D1
demand structure, is D1 momentum turning up from below zero, and is there room above to move into.
Everything else is removed rather than reweighted.

## What Changes

**BREAKING** — every instrument's score, mark count and source labels change. Cached results
computed under the old rules must be recomputed rather than displayed.

Part 1 — replace the instrument scoring model:

- **Remove the screening gate entirely** — both its 1 point and its role as a hard gate. Instruments
  are no longer gated out before scoring. The 30-day window survives only to feed the displayed
  range/position/headroom figures and the distance fallback below.
- **Remove** the "D1 FVG + H1 bullish run" (2 points) and "H1 FVG + M15 bullish run" (1 point)
  components.
- **Remove** the old exact-three-bar MACD red-morning-star shape test and the old pivot bands
  (2% / 5% / 10%).
- **Add three D1 triggers**, each worth +1: `FVG D1` (the current day's bar overlaps a live bullish
  D1 fair-value-gap zone), `OB D1` (the current day's bar overlaps a live demand D1 order-block
  zone), and `MACD` (the D1 histogram has turned up from a negative trough within the last 2
  completed bars).
- **Add a conditional distance term** worth 0 to 3 points, evaluated only if at least one trigger
  fired. Its target is the last confirmed D1 high pivot's high when that pivot's bar falls inside the
  30-day window, and otherwise the window's highest high. Bands: above 3% → +1, above 5% → +2,
  above 8% → +3.
- **Maximum score becomes 6**, so the graded mark buckets change: 1 → one mark, 2–3 → two,
  4–5 → three, 6 → four.
- **Remove the "a screened instrument always carries at least one mark" guarantee.** With no
  automatic point, scoring 0 with no marks is the normal outcome for most instruments on a typical
  day, and a blank row no longer implies "gated out" or "could not be screened". The existing
  distinction between *not screened* and *insufficient history* survives unchanged and stays
  distinguishable from a legitimately-zero score.
- **Document a deliberate exception to the forming-bar convention**: the touch test reads the current
  day's (newest stored) D1 bar, because the question is whether price is interacting with the zone
  right now. Zone detection still excludes the newest bar, so the model is "zones from completed
  history, touch from today". The honest consequence is that a score drifts intraday as the current
  day's bar develops.
- **Bump `SCAN_CACHE_VERSION`** so results cached under the old rules are recomputed.

Part 2 — small display change:

- **Bearish FVG zones are no longer drawn.** They are still *detected*, preserving parity with the
  MQL5 source and the existing fixtures, but produce neither a rectangle nor a label — exactly how
  the OB indicator already treats supply zones.

Explicitly out of scope: trimming M15 and H1 series out of the screening payload. No scoring rule
reads them any more, but the shared current-price convention deliberately reads the newest bar
across all three timeframes, so removing them would change what "current price" means. That is a
separate change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `accumulation-screener`: the screening gate requirement is removed; the shared bar conventions,
  the signals-and-score requirement, the graded-marks requirement, the source-names requirement and
  the cache-freshness requirement all change.
- `charting`: the symbol-browser row's screening guarantees change, specifically the promise that a
  screened instrument always carries at least one mark and names at least one source.
- `indicators`: FVG rendering becomes bullish-only, with bearish zones detected but never drawn.

## Impact

- `web/screener/score.js` — the whole scoring model: gate constants and logic removed, new trigger
  weights, the conditional distance term, new mark buckets, new source labels.
- `web/screener/signals.js` — new touch-overlap tests against live bullish FVG and demand OB zones
  on the current day's bar, a windowed MACD trough test, a distance-target selector; the old
  containment test, three-bar MACD test and `bullishRun` become unused.
- `web/screener/range.js` — must expose the 30-day window's bar-time bounds (or an equivalent) so the
  distance term can decide whether the last confirmed pivot falls inside the window.
- `web/screener/bars.js` — `isDoji`, `DOJI_BODY_RATIO` and `SEQUENCE_SCAN_CAP` become unused once
  `bullishRun` goes; the forming-bar convention gains a named exception for the touch test.
- `web/screener/scan.js` — `SCAN_CACHE_VERSION` bump.
- `web/screener/render.js` — mark-bucket and source-label rendering, and the removal of the
  at-least-one-mark assumption.
- `web/indicators/fvg.js` — `registerIndicator` compute skips bearish zones at render time; the file
  header records the new rendering deviation.
- `web/indicators/ob.js`, `web/indicators/ob-structure.js` — read by the screener for demand zones
  and confirmed pivots; not modified.
- `tests/js/run_screener.mjs`, `tests/js/run_render.mjs`, `tests/js/run_scan_cache.mjs` — all three
  need updating for the new model, buckets and cache version.
