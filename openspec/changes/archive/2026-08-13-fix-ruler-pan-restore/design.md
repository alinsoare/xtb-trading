## Context

See proposal.md — Why for the defect and its cause. Three properties of the current code decide
the shape of the fix:

- The app creates one chart at module load (`LightweightCharts.createChart` in `web/app.js`) and
  reuses it for every instrument and timeframe. Anything a tool leaves on the chart's options
  outlives every selection change, which is why the symptom is sticky until reload.
- In the pinned build (`lightweight-charts@5.0.9`), `chart.options()` returns the widget's live
  internal options object, and `applyOptions` merges into it recursively in place, assigning into
  the existing nested objects rather than replacing them. Any reference taken out of `options()`
  is therefore a window onto future mutations, not a snapshot of the present.
- `web/chart-tools/ruler.js` is deliberately thin and untested; the arithmetic that is worth
  testing already lives in `measure.js`. The bug is in exactly the untested part, so the fix
  should move the fragile step somewhere a Node harness can reach it.

The suppression itself is not in question: lightweight-charts emits a click at the end of a drag,
so a ruler that listened for clicks while drag-panning was live would drop an anchor every time
the user panned.

## Goals / Non-Goals

**Goals:**

- Make restoration depend only on a value the tool owns, so it cannot be invalidated by the chart
  mutating its own options.
- Give the save/restore pair a single owner, so the two halves cannot drift apart as tools are
  added.
- Make the aliasing itself testable without a browser.

**Non-Goals:**

- Changing what the ruler suppresses, or when. Drag-panning stays off while the tool is active.
- Any general "chart options transaction" mechanism for tools. One suppression exists; a framework
  for hypothetical future ones would be speculative.
- Auditing the library for other live-reference getters. This change fixes the one that bites.

## Decisions

**Copy the setting at capture time rather than trusting the getter.** The tool takes its own copy
of the scroll settings before it changes anything, and restores from that copy. This is correct
whether or not `options()` aliases, so it does not depend on library internals staying as they
are today.

*Alternatives considered.* Restore a hardcoded `pressedMouseMove: true` instead of saving anything:
shorter, and correct today because nothing else writes that option — but it silently converts
"restore what was there" into "assert what I believe was there", which is wrong the first time
another feature or a user preference touches scroll behavior. Read the pristine defaults back from
the library: no supported API exposes them. Recreate the chart when a tool deactivates: absurdly
expensive and would discard the user's pan and zoom.

**Ignore the option's boolean form.** `handleScroll` is typed as a boolean or an object, which
suggests the current code has two more latent bugs: spreading a boolean yields `{}` and loses the
other scroll flags, and the truthiness guard on the restore would skip a saved `false`. Neither is
reachable. The chart's `applyOptions` runs every patch through a normalizer that expands a boolean
`handleScroll` into its four flags before merging, and the built-in default is already the object
form, so the value read back from `options()` is always an object — always truthy, always safe to
spread. Handling the boolean shape would be unreachable code, and testing it would assert a state
the library cannot produce. The helper therefore assumes the object form, and the restore is
unguarded because there is nothing to guard against.

**Put the suppression behind a small module that hands back its own undo.** A function that
suppresses drag-panning and returns a `restore()` closure, rather than a saved field on the ruler
plus a matching block in `deactivate`. The captured copy then lives in the closure where nothing
else can read or overwrite it, and a second tool that needs the same suppression gets it right by
construction. The ruler keeps one handle and calls it on deactivate.

*Alternatives considered.* Fix the one line in place with a spread (`{...chart.options().handleScroll}`):
the smallest possible diff, and it does fix the reported bug — but it leaves the fragile step inside
the file the repo has deliberately left untested, and leaves the boolean case broken. Push the
suppression into the tool registry so every tool gets it automatically: wrong default, since a
future tool may want drag-panning left alone.

**Test against a chart stub that reproduces the aliasing.** The harness supplies a fake chart whose
`options()` returns its live internal object and whose `applyOptions` deep-merges in place — the two
behaviors that caused the bug — then asserts that a suppress/restore round trip leaves
`pressedMouseMove` true, that repeated round trips stay stable, and that a boolean `handleScroll` is
restored to a boolean. A stub that merely returned a copy would pass against the buggy code, so the
harness also asserts its own aliasing, keeping the test honest if someone simplifies it later.

*Alternatives considered.* A browser-driven test against the real library would be the strongest
evidence, but the repo has no browser test infrastructure and adding one for a two-line behavior is
disproportionate. Manual dev-mode verification stays in the task list as the check that the real
library still behaves as the stub claims.

## Risks / Trade-offs

- **The stub drifts from the real library, and the test passes while the bug returns.** → The stub
  asserts its own aliasing, so it cannot quietly degrade into a copying stub; a manual dev-mode
  check against the real chart is part of the change.
- **A future upgrade changes `options()` to return a copy, making the helper look unnecessary.** →
  Copying stays correct under both behaviors, so the helper is not invalidated; only its comment
  would need softening.
- **A shallow copy would alias again if a suppressed option group ever nested deeper than one
  level.** → `handleScroll` holds booleans only. The helper stays scoped to scroll handling rather
  than becoming a general option-saver, so the assumption is local and visible.
- **A future version could stop normalizing the boolean form, making the object assumption wrong.**
  → It would surface immediately as the same reported symptom rather than silently, and the helper
  is the one place to fix. Guessing at it now would mean shipping a branch no test can reach.
- **Panning is still unavailable while the ruler is active**, which some users will read as the same
  bug. → Out of scope by decision; the fix is the recovery, and the spec now pins that down.
