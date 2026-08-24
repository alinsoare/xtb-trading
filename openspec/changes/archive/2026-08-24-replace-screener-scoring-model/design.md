## Context

See proposal.md — Why. The design-relevant current state:

- The screener reads bars through one shared convention module, and every rule reads the **last
  completed** bar because the newest stored bar is treated as MT5's forming bar.
- The old zone rule asked whether the *current price* — a single number, possibly taken from an M15
  bar — lay inside a live zone's price bounds.
- Zone liveness is already expressed differently by the two producing indicators: a fair-value-gap
  zone carries a validity window ending a fixed number of bars after its first bar, while an
  order-block zone carries an `open` flag meaning it extends to the newest bar.
- Zone *detection* in both indicators excludes the newest stored bar, so no zone can ever be produced
  from today's bar.
- The 30-day window already exists to produce the displayed range, position and headroom figures.
- Screening results are cached in the browser behind a version number, so a change to how a score is
  computed must invalidate old entries or stale scores will be displayed.

## Goals / Non-Goals

**Goals:**

- Express the new model in terms the existing shared conventions already provide, adding exactly one
  named exception rather than a second parallel set of bar-reading rules.
- Keep every trigger reproducible by opening the chart, so a mark can always be checked by eye.
- Make the distance component's target legible in the audit, since one of its two branches uses a
  number the row never displays.
- Invalidate cached results so nothing scored under the old model is ever displayed.

**Non-Goals:**

- Trimming the M15 and H1 series from the screening payload. No scoring rule reads them any more, but
  the shared current-price convention deliberately reads the newest bar across all three timeframes,
  so removing them would silently change what "current price" means for the distance component and the
  headroom figure. Deferred to its own change.
- Re-weighting the components. The weights below were chosen deliberately, including the one that
  creates a known imbalance.
- Changing zone detection in either indicator. Both parts of this change are consumption and rendering
  only.

## Decisions

### The touch test reads the current day's bar, as a named exception

The triggers ask "is price interacting with this zone right now", and the honest reading of that is
today's bar — the newest stored D1 bar, which the forming-bar convention otherwise excludes.

Alternative considered: read the last *completed* D1 bar, keeping the convention unbroken. Rejected
because it answers a different question — whether price interacted with the zone yesterday — and
delays every trigger by a full day.

Alternative considered: keep testing the current price alone. Rejected because a single close misses
the common case of a bar reaching into a zone and leaving, which is exactly the interaction the model
wants to catch.

The exception is written into the spec as a named convention rather than left implicit in the rule
text, because an unexplained departure from the forming-bar rule reads as a bug to the next reader.
Detection still excludes the newest bar, so the model is internally consistent: *zones from completed
history, touch from today*.

### Overlap rather than containment

The touch test is plain inclusive overlap of the day's high-to-low interval with the zone's price
interval. This is deliberately looser than the old containment test on a single price: a wick that
entered the zone and left still counts. Making it stricter (requiring the close inside the zone, or
the whole bar inside) would reintroduce the miss the overlap test exists to fix.

### Per-indicator binary, not per-zone

Each indicator contributes at most +1 however many of its zones the day's bar overlaps. Counting per
zone would let a cluster of overlapping gaps dominate the score for what is really one piece of
evidence, and the cluster size depends on detection parameters rather than on anything the reader can
see.

### Liveness is borrowed, not redefined

The eligibility rule reuses each indicator's existing liveness notion — the gap's validity window and
the order block's `open` flag — rather than defining a screening-specific one. A third definition
would be a place for the screener and the chart to disagree, which is the failure mode the shared
conventions exist to prevent.

### The MACD test is a windowed reframing, not a new test

The trough shape and its strictness are unchanged: strict comparisons on both sides, all three values
strictly below zero. Only the position is relaxed, so the trough may sit on the last completed bar or
the one before it. This admits a turn that would otherwise have been missed for having happened one
bar too early, without loosening what counts as a turn.

### The distance target has two branches with one label

Target selection prefers the last confirmed D1 high pivot's high when that pivot's bar falls inside
the 30-day window, and otherwise the window's highest high.

The two branches are exhaustive with no third case: the last confirmed high pivot is by construction
the newest one, so if it falls outside the window then no confirmed high pivot falls inside it. There
is no "search further back" branch to write.

The label beneath the marks stays a single stable name (`distance`) across both branches, because a
label that changed between scans on account of an internal branch would make two identical
instruments look like they fired different rules. The **audit wording** does distinguish them — "D1
pivot distance" versus "30d high distance" — because the pivot high is a number the row does not
display while the window high is exactly what the displayed headroom figure measures to. Without that
wording a reader cannot tell a pivot-branch score from a disagreement with the printed headroom.

### The distance component is conditional on a trigger

Distance alone is not evidence of anything; it only qualifies evidence that already exists. Making it
conditional keeps "far from its high" from producing a marked row on its own.

### Cache invalidation by version bump

`SCAN_CACHE_VERSION` is bumped rather than adding a model fingerprint to each cached entry. The
version counter already exists for exactly this purpose and has been used for the same reason before;
a per-entry fingerprint would be new machinery for a case the existing mechanism handles.

### FVG bearish zones: hidden at render, kept in detection

Bearish zones are skipped when building drawables, not when detecting. This is the pattern `ob.js`
already uses for supply zones, and it keeps parity with the MQL5 source and the existing fixtures
intact — both read detected zones, so a rendering-only change cannot affect them. The deviation is
recorded in the FVG file header alongside the existing sanctioned deviations, matching how `ob.js`
documents its own.

## Risks / Trade-offs

**[The distance component can outweigh the structure it qualifies]** → Accepted, not mitigated. The
distance term can contribute 3 of the 6 available points, so an instrument with one trigger and a
distant target scores 4 while an instrument with all three triggers and a near target scores 3. This
was surfaced explicitly and the cap was kept at 3 by decision. It is recorded here so a later reader
finds a deliberate choice rather than an oversight, and so the question is not reopened as a bug.

**[The pivot branch can only ever score at or below the fallback branch]** → Accepted, not mitigated.
When a confirmed pivot falls inside the 30-day window its high is by definition at or below the window
high, so the pivot branch always yields a target no higher than the fallback would. The structural
consequence is that an instrument with clean recent swing structure scores at most what a structureless
one would, and a chart with no recent confirmed swing high is graded against its absolute 30-day peak.
Surfaced and accepted.

**[Scores drift intraday]** → Accepted and documented rather than mitigated. Because the touch test
reads the current day's developing bar, an instrument can gain or lose a trigger during the session,
and the same instrument can score differently on two scans on the same day with no new sync. This is
the direct cost of asking "right now"; the spec states it so the behaviour is not filed as
non-determinism.

**[Most rows will be blank]** → Expected. With no automatic point, a score of zero is the normal
outcome on a typical day. The risk is that a blank row reads as broken, or as the old "gated out"
state. Mitigated by keeping the *not screened* and *insufficient history* states distinct and by
stating in both specs that a screened-and-quiet row is an ordinary result.

**[Stale cached scores]** → Mitigated by the `SCAN_CACHE_VERSION` bump. If the bump were forgotten,
users would see old-model scores, old mark counts and retired source labels with no way to force a
recompute short of syncing.

**[Dead code left behind]** → `bullishRun` and `isDoji` lose their only consumers in the screener when
the run-based components go. Left in place they invite a future rule to reuse a convention the spec no
longer defines. Mitigated by removing them together with their spec clauses, after confirming no chart
indicator reads them.
