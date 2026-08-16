## Context

See proposal.md — Why. Three existing facts shape the work:

- `web/screener/signals.js` exposes `macdAscending(bars)`, which reads the histogram from the same
  `macdArrays()` the chart indicator uses and compares the three values ending at
  `lastCompletedIndex(bars)`. Only the comparison changes; the reading conventions already match
  what the new rule needs.
- The chart paints a histogram bar with the negative colour when its value is `< 0` and with the
  positive colour when it is `>= 0` (`web/indicators/macd.js`). "Red" therefore has an exact,
  already-shipped meaning in this codebase.
- The scan cache in `web/screener/scan.js` is keyed on per-instrument sync freshness alone, with
  `SCAN_CACHE_VERSION` as the only lever for discarding scores when the scoring rules change.

## Goals / Non-Goals

**Goals:**

- Express the new pattern as one signal function with the same result shape as the current one
  (`{ ok, insufficient }`), so `scoreInstrument()`'s orchestration and its `signalOverrides` test
  seam are untouched.
- Keep "red" defined by the chart's own colour rule, so the score and the chart cannot disagree.
- Discard scores cached under the old rule on the next load, without requiring a sync.

**Non-Goals:**

- Re-weighting any component, changing the maximum score, or changing the mark buckets.
- Touching the screening gate in any way.
- Changing the MACD indicator, its parameters, or its rendering.
- Adding a second MACD component; the trough replaces the rising rule rather than joining it.

## Decisions

**Red means `histogram < 0`, matching the chart's colour rule.** The alternative readings — "below
the signal line" or "below its own previous value" — either restate what the histogram already is or
duplicate the trough comparisons. Using the chart's `v >= 0 ? up : down` boundary makes the
requirement auditable by eye: the user counts three red bars and gets the same answer the score did.
Zero is consequently not red, which the spec states explicitly because it is the one boundary a
reader could reasonably get wrong.

**The pattern is a strict local trough, with no comparison between the outer two bars.** The rule is
`h[-3] > h[-2] < h[-1]` exactly as requested; the newest value is not required to exceed the oldest.
Requiring `h[-1] > h[-3]` as well would demand a fully recovered leg and reject the shallow first
turn this change exists to catch — the opposite of the intent. Both comparisons stay strict, so a
flat pair fails, which preserves the spirit of the "flat histogram does not count" scenario the old
rule carried.

**Replace the function rather than parameterise it.** `macdAscending()` becomes a differently named
function (for example `macdRedMorningStar()`); the ascending test is not kept behind a flag. Nothing
else in the codebase asks for the ascending shape, and a dead alternative in a scoring path is a
liability at the next tuning pass. The weight constant and the recorded reason string are renamed
alongside it so nothing in the code or the audit trail still says "ascending".

**Bump `SCAN_CACHE_VERSION` from 3 to 4.** Cached entries carry scores, mark counts and reasons
computed under the old rule; nothing about sync freshness changes when the rules do, so without the
bump a user who does not sync keeps seeing stale marks — and stale reason labels — indefinitely.
This follows the precedent set when the score was last rebalanced.

**Test the shape against hand-built histogram sequences, not synthetic bars.** The existing MACD
tests feed generated bars and assert only that the result is a boolean, because deriving a specific
histogram shape from OHLC input is fragile. Reaching the new rule's boundaries — a trough that
crosses zero, an exact-zero value, a flat pair — needs the comparison logic to be reachable with
histogram values supplied directly, so the trough test is written to be exercisable independently of
bar generation, with the existing bar-driven checks kept as an integration guard.

## Risks / Trade-offs

- **The new rule fires much less often than the old one** — it requires both a specific shape and
  negative territory, so scores will drop for many instruments and fewer will carry high mark counts.
  → This is the intended selectivity, not a regression; the cache bump makes the transition immediate
  and total rather than a mix of old and new marks.
- **A trough is a two-comparison pattern read on a warm-up-sensitive series, so it is easy to fire
  one bar early or late.** → The three values come from the shared forming-bar convention, and the
  spec pins the exact triple so a scenario can catch an off-by-one.
- **Momentum can trough and keep falling; a red morning star is not a reversal.** → The screener
  reports facts and reasons only, never a recommendation, and this component is worth 1 point of 8.
- **Scores are not comparable across this change; anything a user remembers from before will look
  different.** → Same mitigation as the last rebalance: the version bump means every instrument is
  re-scored at once from bars already stored.

## Migration Plan

No data migration. Ship the signal change, the renames and the cache version bump together; on the
next load every instrument is re-scored from stored bars, with no sync and no network call beyond
the screening payload itself. Rollback is reverting the signal, the constant and the reason label,
and bumping the cache version again, since a revert must also discard scores cached under the new
rule.
