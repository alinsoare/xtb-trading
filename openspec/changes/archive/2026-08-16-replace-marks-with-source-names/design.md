## Context

See proposal.md — Why.

Current state, for the parts this design has to move:

- `scoreInstrument` in `web/screener/score.js` returns `{ status, score, marks, reasons, rangePct,
  positionPct }`. `reasons` is an ordered array of `{ rule, points }`, appended in a fixed order:
  eligibility gate, D1 FVG + H1 run, H1 FVG + M15 run, MACD, pivot distance.
- `markCount(score)` maps the score onto 1–4 buckets; `renderMarks(marks, reasons)` in `web/app.js`
  emits that many empty `<span class="screener-mark">` elements inside a wrapper whose `title`
  attribute holds the `rule: points` lines. The tooltip is the only place a reason is visible today.
- `web/screener/scan.js` caches whole result objects in `localStorage` under `SCAN_CACHE_VERSION`,
  so a result read from cache is whatever shape the previous release wrote.
- The row is narrow: marks sit inline with the symbol code; range and position figures sit below the
  name on a third line.
- A pending change, `replace-macd-scoring-rule`, is implemented in code but not yet synced into the
  main spec; it renamed the MACD rule wording. This design must not depend on that wording.

## Goals / Non-Goals

**Goals:**

- One display name per fired rule, derived from the same record the audit is derived from, so the
  row and the audit can never disagree about which sources fired.
- Names short enough that a five-source row still fits the sidebar width on their own line.
- Keep graded marks unchanged so users retain the at-a-glance bucket count.
- A migration that cannot show a nameless source line, including for users holding a cache written
  by the current release.
- Every behavior this change touches SHALL be verifiable by running Node test scripts alone — no
  manual browser session, no external app.

**Non-Goals:**

- Any change to scoring: the gate, the four components, their weights, the pivot bands, mark buckets
  and the resulting score stay exactly as they are.
- Replacing or removing the green bullet marks.
- Showing per-source points in the source-names line. Points stay in the on-demand audit on the marks.
- Colour-coding or ordering names by weight.
- Making the names a user-facing setting or a filter. Sorting stays score-based.

## Decisions

**Carry the display name in the reason object, not in a rule-name lookup in the view.**
Each `reasons.push(...)` gains a `source` field next to `rule` and `points`, so the label lives at
the one place that decides the rule fired. The alternative — a `rule → label` map in `web/app.js` —
keeps the cache shape unchanged, but silently degrades to a missing or raw label whenever rule
wording changes, which it just did in `replace-macd-scoring-rule`. Keeping the name at the source
makes a renamed rule a one-line, one-file edit and makes the ordering of names free: it is the
order the reasons were already recorded in.

**Bump `SCAN_CACHE_VERSION`.** Cached results hold `reasons` entries with no `source`, so a returning
user with a warm cache would render a source line with missing labels until something re-synced. The
cache is a recompute-on-miss derived artifact and the codebase already treats a version bump as the
normal migration (it is at 4 today), so a bump is cheaper and safer than tolerating both shapes in
the renderer.

**Keep `markCount`, `marks` and `renderMarks` unchanged.** The graded dots remain the primary
at-a-glance signal; the source-names line supplements them rather than replacing them. `renderMarks`
continues to emit green bullets with the existing tooltip audit.

**Names are terse and identify the source, not the score.** The intended set, one per recorded
reason: `gate`, `D1 FVG+H1`, `H1 FVG+M15`, `MACD`, `pivot`. Chosen for width on their own line.
`MACD` deliberately names the indicator rather than the pattern, so it survives the pending MACD
rule rename and any later one. The full wording remains one hover away on the marks.

**Render source names on a dedicated line beneath the marks.** Add `renderSourceNames(reasons)`
that emits one `<span class="screener-source">` per reason inside a `<div class="screener-sources">`,
placed after `symbol-top` and before `symbol-name`. The marks wrapper keeps its `rule: points`
tooltip; the source line is plain text for scanability.

**Extract the row renderers into a pure, DOM-free module.** `web/app.js` calls
`document.getElementById(...)` at module load time, so it cannot be imported by a plain Node test —
today these functions are only exercised by hand, in a browser. `renderMarks`, `renderSourceNames`
and `renderScreenerRow` do no DOM work themselves; they are string builders. Move them to a new
`web/screener/render.js`, imported by `web/app.js`, and change `renderScreenerRow`'s signature from
reading `state.screenerScores` internally to taking `(symbol, result)` explicitly. This makes the
whole row — marks, source names, figures, and every status branch — assertable from a Node test
script by passing in a fabricated `result`, with no DOM and no browser required. `web/app.js` keeps
the one line that looks up `state.screenerScores[symbol.xtb_symbol]` and passes it in.

## Risks / Trade-offs

**A five-source row overflows the sidebar.** → Names are chosen short; the source line wraps or
clips rather than displacing the symbol code, and the widest case is checked at the narrowest
sidebar width.

**Names add a line per screened row, making a long list visually busier.** → Uniform, low-contrast
label styling; marks remain the compact summary.

**Bumping the cache version discards every user's cached scores.** → Recompute is local, needs no
network call, and already runs on any sync; no market data is refetched.

**The eligibility gate is named on every screened row.** → It is a scoring component worth a point;
hiding it would make the names disagree with the score and the audit. Accepted as noise that keeps
the row honest.

## Migration Plan

No data migration and no server change. Bumping `SCAN_CACHE_VERSION` invalidates cached scores on
first load after the change; the scan recomputes from the already-stored bars. Rollback is reverting
the change — the older release's own version check discards the cache written by this one.
