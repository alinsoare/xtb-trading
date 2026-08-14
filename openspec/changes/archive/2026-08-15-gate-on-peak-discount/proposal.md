## Why

The screener's position condition — current price at most 33% of the way up the 30-day range —
rejects instruments that are genuinely pulled back but sit in a range whose low is far below
anything recent. JMLP.DE is the motivating case: it trades at 18.21 against a 30-day peak of
19.31, a 5.7% discount from the peak, yet its position in the range is 37.7%, so it earns no
mark however many signals fire. Judging a pullback by where price sits between the range's
extremes makes the verdict depend on the low, which is the wrong reference point for a
mean-reversion pullback; the distance below the peak is the thing the screener actually cares
about.

## What Changes

- Replace the position condition of the screening gate. Instead of requiring the position of
  price inside the 30-day range to be at most 33%, require the current price to be strictly
  below the 30-day peak discounted by 2% — that is, `price < high × (1 − 0.02)`, so any price
  at least 2% under the 30-day highest high passes.
- Keep the other gate condition unchanged: the 30-day range must still be at least 3%.
- Keep reporting the 30-day range and position figures in the sidebar exactly as they are
  today. The position percentage becomes purely informational — it no longer decides
  eligibility — and no new figure is introduced.
- **BREAKING** for screening output: instruments gate in and out differently than before. Some
  previously gated-out instruments (JMLP.DE among them) now score, and an instrument sitting
  low in a wide range but within 2% of its 30-day peak — possible when the peak was set by the
  newest bars — now gates out.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `accumulation-screener`: the "Screening gate" requirement's second condition changes from a
  maximum position inside the 30-day range to a minimum discount below the 30-day peak.

## Impact

- `web/screener/score.js`: `GATE_MAX_POSITION_PCT` is replaced by a peak-discount constant, and
  the gate check in `scoreInstrument()` reads the 30-day high instead of the position figure.
- `web/screener/range.js`: already returns the 30-day `high`; the gate now consumes it, so the
  value must be carried through where the gate is evaluated. `positionPct` stays, since it is
  still displayed.
- `tests/js/run_screener.mjs`: the gate constant assertions and the gated-out fixture change;
  new fixtures cover the discount boundary.
- `web/app.js`: unchanged — the sidebar keeps rendering "30d range X% · position Y%".
- `web/screener/scan.js`: the scan cache version is bumped, because cached scores are keyed on
  sync freshness alone and would otherwise keep showing marks computed under the old gate until
  something syncs.
- No data, payload or exporter change: the gate is recomputed from bars already served.
