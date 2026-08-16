## Why

The D1 MACD scoring component currently fires on any strictly rising three-bar histogram sequence,
which includes late-stage rises already well above zero — momentum that has finished turning rather
than momentum turning now. For a mean-reversion accumulation screener the interesting shape is the
earliest turn: a histogram trough still in negative territory, where the down-leg has just stopped
extending. Rewarding that shape instead points the score at instruments that are turning, not ones
that have already run.

## What Changes

- The D1 MACD scoring component is replaced. Instead of a strictly rising histogram over the last
  three completed bars, it fires on a "red morning star" trough: `histogram[-3] > histogram[-2]`,
  `histogram[-2] < histogram[-1]`, and all three values below zero (all three bars painted in the
  histogram's negative colour).
- The recorded reason for that component is renamed, since "ascending" no longer describes what
  fired.
- Everything else about the score is unchanged: the component is still worth 1 point, the maximum
  score is still 8, the mark buckets are unchanged, and the **screening gate is untouched** — same
  two conditions, same 1 point for passing, same hard-gate behaviour.
- Not a breaking change to any interface; the same screener inputs produce a different score for
  some instruments, which is the point.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `accumulation-screener`: the MACD component of the "Screening signals and score" requirement
  changes from a strictly rising histogram to a three-bar negative-territory trough, and its
  flat-histogram scenario is replaced by scenarios covering the trough shape and the below-zero
  condition.

## Impact

- `web/screener/signals.js` — the `macdAscending` signal function is replaced by a trough test.
- `web/screener/score.js` — the component's weight constant and recorded reason label are renamed;
  weights and bucket logic keep their current values.
- `web/screener/scan.js` — `SCAN_CACHE_VERSION` must be bumped, since cached scores are keyed on
  sync freshness alone and would otherwise keep rendering marks computed under the old rule until
  something syncs.
- `tests/js/run_screener.mjs` — the MACD signal and reason-label assertions change.
- No change to the MACD indicator itself (`web/indicators/macd.js`), the screening payload, the
  screening gate, or any server-side surface.
