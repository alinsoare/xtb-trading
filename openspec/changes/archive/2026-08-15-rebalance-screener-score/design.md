## Context

See proposal.md — Why. All of the machinery this change touches already exists in
`web/screener/`: `scoreInstrument()` evaluates the gate and then four signals, each weight is
already an exported named constant, `bullishRun(bars, required)` already takes the required run
length as a parameter, and `markCount(score)` maps a score to a bullet count that `web/app.js`
renders as N identical spans. So this is a re-parameterisation of existing logic plus one new
scored component, not new signal machinery.

Two existing constraints shape the work:

- The scan cache in `web/screener/scan.js` is keyed on per-instrument sync freshness alone, with
  a separate `SCAN_CACHE_VERSION` as the only lever for invalidating scores when the scoring
  rules themselves change.
- The gate currently short-circuits with `emptyResult("screened", …)`, which returns a zero score
  and an empty reasons array. Awarding a point for passing means the gate's success branch has to
  start the score and the reasons list rather than only falling through.

## Goals / Non-Goals

**Goals:**

- Express every changed number as a named constant, so a later reweighting is another
  one-line edit rather than a logic change.
- Keep the gate's dual role legible in the code: a hard gate that still short-circuits on
  failure, and a scored component on success.
- Discard scores cached under the old weights on the next load, without requiring a sync.

**Non-Goals:**

- No change to `bullishRun()`, `inLiveBullishFvg()`, `macdAscending()` or the pivot logic in
  `web/screener/signals.js`. The run length is a call-site parameter.
- No change to the screening payload, its bar caps, or the exporter.
- No change to mark markup, styling, or the score sort order in `web/app.js`.
- No new user-facing figure. Range and position keep being displayed exactly as they are.
- The canvas at `screener-bullet-rules.canvas.tsx` is a personal scratch document, not a project
  artifact, and is out of scope for the implementation.

## Decisions

**Score the gate inside `scoreInstrument()`'s existing gate branch, not as a fifth signal
function.** The gate is already computed there from `rangePct` and the 30-day `high`; when it is
open, seed `score` with a new `WEIGHT_GATE_PASS` constant and push a reason before evaluating the
signals. The alternative — modelling it as a signal with an `ok` flag alongside the other four —
would need the gate to be evaluated twice or its result threaded through, and would blur the fact
that a failing gate short-circuits while a failing signal merely contributes nothing.

**Name the run lengths as constants (`H1_RUN_BARS`, `M15_RUN_BARS`), both 1.** The current code
passes a literal `3` to `bullishRun()` at two call sites. The spec requires every threshold to be
a named constant, and naming them keeps the two run lengths independently tunable even though
both are 1 today.

**Keep the insufficient-history checks as they are.** They are driven by the FVG, MACD and pivot
warm-up minimums, not by the run length, so shortening the runs does not shorten the required
history. A run of one still needs at least two bars in the series, which every warm-up minimum
already exceeds. Leaving the minimums untouched also keeps the "insufficient history" reporting
stable, which matters because it is a distinct user-visible status.

**Re-derive `markCount()` as explicit band boundaries rather than arithmetic.** Two points per
band is tempting to write as a division, but the 0 band is not two wide and the top band must
clamp at four. An explicit chain of comparisons against named band edges reads the same way the
spec does and cannot silently produce a fifth bullet if the maximum ever grows.

**Bump `SCAN_CACHE_VERSION` from 2 to 3.** Cached entries carry the score, mark count and reasons
computed under the old weights; nothing about sync freshness changes when the rules do, so
without a version bump a user who does not sync keeps seeing stale marks indefinitely.

**Assert the maximum in tests rather than deriving it in code.** The maximum of 8 is a
consequence of the weights, not an input to them. A test that sums the weight constants and
asserts 8, plus a full-confluence fixture asserting a score of 8 and four marks, catches an
inconsistent reweighting without adding a redundant constant.

## Risks / Trade-offs

- **Every gated-in instrument now carries at least one bullet, so a single bullet stops meaning
  "some confluence" and starts meaning "eligible, nothing more".** → Intended, and made explicit
  in the spec's mark-band scenarios. The mitigation is legibility rather than avoidance: the
  recorded reasons name the eligibility gate as the rule that fired, so a one-bullet instrument
  is auditable as gate-only.
- **The sidebar becomes busier: instruments that previously showed nothing now show a bullet.** →
  Accepted. The gate is already a meaningful filter, and the mark count still separates
  gate-only from genuine confluence.
- **A one-bar run is much noisier than a three-bar run, so the two containment rules will fire
  far more often.** → Deliberately compensated by cutting their weights from 3 and 2 to 2 and 1,
  so the higher hit rate does not dominate the total.
- **Scores are not comparable across this change; anything a user remembers from before will look
  different.** → The cache version bump makes the transition immediate and total rather than
  gradual and mixed, which is easier to reason about than a store where some instruments still
  carry old marks.

## Migration Plan

No data migration. Ship the scoring change and the cache version bump together; on the next load
every instrument is re-scored from bars already stored. Rollback is reverting the constants and
the `markCount()` bands and bumping the cache version again, since a revert must also invalidate
scores cached under the new weights.
