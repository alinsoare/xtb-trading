## Why

The two gap-based source names in the screener row read `D1 FVG+H1` and `H1 FVG+M15` — the widest
and least legible labels on the line. Each packs two timeframes and a `+` into one token, so the
timeframe that matters (the one the gap is on) sits next to a second timeframe that only names the
confirming run, and the eye has to parse the label instead of recognising it. The other names on the
line (`gate`, `MACD`, `pivot`) are single words. Naming the gap sources `FVG D1` and `FVG H1` puts
the indicator first and the timeframe second, makes the two of them read as a pair, and narrows the
line — while the full rule wording, including the confirming run, stays one hover away on the marks.

## What Changes

- Rename the source name of the D1-gap component from `D1 FVG+H1` to `FVG D1`.
- Rename the source name of the H1-gap component from `H1 FVG+M15` to `FVG H1`.
- Establish the label shape for gap sources: the indicator name followed by the timeframe of the gap
  itself, with the confirming run's timeframe dropped from the label and left to the audit tooltip.
- Leave `gate`, `MACD` and `pivot` exactly as they are — they are already terse and carry no
  timeframe pair to untangle.
- Keep everything else about the source line untouched: the same one name per recorded reason, the
  same order, the same derivation from `reasons`, and the same green outlined label treatment.
- Keep scoring untouched: the same weights, the same gate, the same mark buckets, the same rule
  wording in the on-demand audit, and the same sort order. Only the `source` field's value changes.
- Bump `SCAN_CACHE_VERSION` so cached results holding the old `source` strings are recomputed rather
  than rendering the old labels to a returning user who has not synced.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `accumulation-screener`: the "Sources are named beneath the marks" requirement gains a naming
  convention for the gap-based sources — each names the indicator and the timeframe of the gap it
  found, and does not name the timeframe of the run that confirmed it.

## Impact

- `web/screener/score.js` — the string values of `SOURCE_D1_FVG_H1` and `SOURCE_H1_FVG_M15` change.
  The constant identifiers, the weights, the `rule` wording, the reason order and every scoring
  branch stay as they are.
- `web/screener/scan.js` — `SCAN_CACHE_VERSION` bump from `5` to `6`.
- `tests/js/run_screener.mjs`, `tests/js/run_render.mjs` — assert through the exported constants, so
  they keep passing; a value assertion is added so the two new labels are pinned somewhere.
- `web/screener/render.js`, `web/styles.css` — no change; the source line renders whatever string the
  reason carries, and the green outlined label treatment is independent of the text.
- No change to `web/screener/signals.js`, `web/app.js`, the sync surface, the stored bars, or any
  server-side code.
