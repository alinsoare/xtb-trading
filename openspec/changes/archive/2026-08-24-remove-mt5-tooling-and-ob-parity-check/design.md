## Context

See proposal.md — Why. The facts that shape the approach:

- `tests/js/run_ob_fixtures.mjs` reads every `*.json` under `tests/fixtures/ob/`, compares the
  pivot sequence first and only then the zones, and imports `computeSwingStructure` /
  `OB_STRUCTURE_SOURCE` from `web/indicators/ob-structure.js` and `obZones` / `OB_PARAMS` from
  `web/indicators/ob.js`. It is the only reader of `tests/fixtures/ob/`, whose single file is
  `xauusd-d1.json` (~34 KB, XAUUSD D1, 338 bars).
- The runner is dev-time only and is not wired into CI; nothing runs the Node runners
  automatically. `uv run pytest` does not touch them.
- Nothing under `web/` imports anything being deleted. `web/indicators/ob.js` and
  `web/indicators/ob-structure.js` are read *by* the runner, not the reverse — the dependency
  points one way, so deleting the runner cannot affect the application.
- `tools/mql5/` holds three `.mq5` sources, `export-macd-oracle.ini`, and gitignored `.ex5` and
  `.compile.log` build output. Removing all four tracked files leaves the directory holding
  only untracked build output.
- `web/indicators/mt5math.js` is imported by the FVG, OB and MACD indicators; it is plain
  JavaScript named after MT5's conventions, not tooling that talks to MT5.
  `tests/js/run_mt5math.mjs` exercises it with no external input.
- The OB provenance record lives in two places: the `OB_STRUCTURE_SOURCE` object in
  `web/indicators/ob-structure.js` and the header comments of both OB modules. The
  `OB_PARAMS` comment block additionally records two verification runs — the D1 fixture result
  and an intraday spot-check — the second of which names `tools/ob_intraday_spotcheck.mjs`.
- `verify-macd-parity-without-external-oracle` is in flight, unapplied, and its task 5 deletes
  the same four MACD export artifacts. The working tree also holds uncommitted edits to two of
  those exporters from earlier MACD work.

## Goals / Non-Goals

**Goals:**

- Remove the MT5-dependent surface completely rather than partially, so no half-path is left
  that a future contributor could mistake for a working one.
- Keep every OB behaviour currently specified, specified — the removal is of a verification
  claim, not of behaviour.
- Leave the OB implementation byte-identical apart from comments that would otherwise point at
  deleted files.
- Make the interaction with the in-flight MACD change explicit enough that either application
  order works without a judgment call at apply time.

**Non-Goals:**

- Replacing the OB parity check with a different check. Producing expected OB values from a
  clone is a design problem of its own — the source is an MQL5 indicator with no Python
  reference in the sibling repo — and it is not attempted here.
- Deciding where MACD's expected values come from. That is the other change's subject; this
  one deletes the MACD exporters as MT5-dependent tooling and says nothing about the MACD
  parity requirement.
- Touching FVG parity, its generator, or its fixtures. They are produced from a Python
  reference in a clone and are unaffected by anything MT5.
- Changing `web/indicators/ob.js` or `ob-structure.js` behaviour, parameters, or the recorded
  source hash.
- Rewriting `README.md` beyond the parts that name deleted files or attribute behaviour to a
  removed comparison.

## Decisions

**Delete the OB check outright rather than keeping the fixture and dropping the tooling.**
The tempting middle path is to keep `run_ob_fixtures.mjs` and `xauusd-d1.json` and delete only
the MQL5 exporter, on the grounds that the committed fixture still runs from a clone. It is
rejected because the fixture is a recording whose provenance can no longer be checked: the
requirement it satisfies demands the export carry the same source hash the port records, and
with the exporter gone nobody can re-derive that correspondence or extend the fixture to a
second instrument or timeframe. What would remain is a regression snapshot dressed as a parity
claim — it would fail whenever the port's output legitimately changed, with no way to
regenerate the expected values, and the only available response would be to hand-edit the
expected file. That is worse than no check. Deleting the whole path states the actual position:
OB has no numeric check, and getting one requires a producible oracle.

**Carry the deviations into an ADDED requirement rather than folding them into the existing
`OB indicator` requirement.**
The six deviations are a coherent subject — "how this port differs from the file it was
transcribed from, and what follows" — and the `OB indicator` requirement is already long and is
about what the indicator does, not about its relationship to a source. A separate requirement
also keeps the delta legible: one requirement removed, one added covering the same ground minus
the comparison, and the reader can see nothing fell out. Folding them in would have buried the
change inside a large MODIFIED block.

**Restate each deviation as behaviour, not as a comparison term.**
Three of the removed requirement's clauses were only meaningful as instructions to a comparison
— compare structure before zones, compare detected rather than drawn zones, treat a stale hash
as unverified — and they go. The rest describe what the port does and survive verbatim or
nearly so. Two needed rephrasing to stand alone: the skip-bar deviation said parity below H4 is
out of scope, which now reads that the port's sub-H4 output is not expected to agree with the
source's; and the fresh-load deviation said verification must use an export taken after a full
recalculation, which now reads that output depends only on the displayed series and not on
arrival order. That second rephrasing is the one place a scenario changed in kind rather than
in wording, and it was chosen because order-independence is the observable consequence of
reproducing only the full-recalculation path — testable in a clone, unlike the export
instruction it replaces.

**Keep the source provenance record, and say what it does and does not assert.**
`OB_STRUCTURE_SOURCE` and the header hashes stay, and the new requirement mandates them. A
reader asking "what was this transcribed from?" deserves an answer, and that answer is a fact
about the port's origin, not about any comparison. The requirement is explicit that the record
does not by itself assert anything has been compared — the removed requirement's hash-matching
rule was the part that made the record a parity instrument, and only that part is gone. The
alternative, deleting the record along with the check, was rejected: it would leave a port of a
specific version of a specific file with no statement of which one.

**Reword the supply-zone rationale in `OB indicator`, and change nothing else there.**
That requirement justifies detecting supply zones as "the other half of the parity comparison
against the source" and computes supply validity "so a parity comparison can read it". With the
comparison gone those clauses reference nothing. The rationale is replaced by the real one —
the detection is direction-symmetric, and hiding one direction is a rendering decision — which
is also what makes the behaviour testable without a comparison. Detection itself, the validity
computation, and every scenario are unchanged. The equivalent phrasing in the FVG parity
requirement is left alone: FVG parity is not being removed.

**Adjust only the `ob.js` comment that names a deleted file, and keep its findings.**
The `OB_PARAMS` comment block records what the intraday spot-check found, including two caveats
that are easy to rediscover the hard way and one gap in fixture coverage. Those findings remain
true and are worth keeping; only the pointer to `tools/ob_intraday_spotcheck.mjs` becomes a
dangling reference. The comment keeps the findings and drops the file path, and notes the
verification runs as historical. Deleting the block wholesale was rejected — it is the only
written record of what was and was not established about sub-H4 behaviour, which the new
requirement's sub-H4 clause rests on. Rewriting it into something new was also rejected: this
change is not re-litigating what those runs found.

**Remove the `.gitignore` and `openspec/config.yaml` MQL5 entries as part of the same change.**
Both exist solely to keep MQL5 build output out of commits. With no `.mq5` file in the
repository, `*.ex5` and `*.compile.log` cannot be produced by working in it, and an ignore rule
for a file type that cannot appear is a hint that the tooling is still there. The archive
guidance bullet is the same statement in prose. Leaving them would be harmless mechanically and
misleading documentally. User-level Cursor rules describing the MT5-Testing install are
deliberately untouched: they are about the machine, not this repository, and MT5 remains
installed there.

**Do not delete `tools/mql5/` build output from git — only from the working tree.**
The `.ex5` files and compile logs are gitignored and untracked, so they are a working-tree
cleanup. They must still be removed, otherwise `tools/mql5/` survives as a directory holding
only stale binaries.

**Make this change independent of the MACD change's application order.**
Both delete the four MACD export artifacts. Rather than making either wait, this change's tasks
treat an already-absent file as satisfying the step, and the proposal records the three places
where the MACD change's own artifacts assume the OB tooling still exists (its non-goal, its task
5.2 confirmation, and its task 6.2 runner list). If this change lands first, those three are
superseded rather than violated. The alternative — narrowing this change to OB and letting the
MACD change delete its own exporters — was rejected because it would leave the repository's
`.mq5` removal split across two changes with the `.gitignore` and config cleanup unable to land
in either one cleanly.

## Risks / Trade-offs

**OB loses its only numeric guard, so a regression in `ob.js` or `ob-structure.js` lands
unnoticed** → Accepted, and it is the substantive cost of this change. Mitigated only partly:
the deviations and the algorithm remain fully specified, so a regression is still detectable by
reading the spec, and the FVG and MACD checks still cover the shared `mt5math.js` helpers the
OB port depends on. The honest position is that OB is now spec-covered and not
fixture-covered, and the new requirement is written so that a future check can be built against
it. Anyone tempted to restore the deleted runner from git should note it cannot be extended
without the exporter, which is the reason it went.

**The intraday spot-check's findings become unreproducible** → They already were: the tool
needed exported CSVs from a terminal. Keeping the findings in the `OB_PARAMS` comment preserves
what they established; what is lost is the ability to re-run them, which nobody but the author's
machine ever had.

**A future contributor wants MT5 parity back and finds no path to it** → The removed
requirement's `Migration` note says what to do instead: provide expected values producible from
a clone. `ExportOBOracle.mq5` remains in git history as a working example of an MQL5 export
script if an MT5-fed path is ever genuinely wanted, so nothing is unrecoverable — it is only no
longer presented as the supported route.

**The two in-flight changes step on each other at apply time** → Every deletion here is
idempotent and every one of them is checked for absence rather than asserted present, so
whichever applies second finds its work partly done and proceeds. The one thing that must not
happen is the MACD change's task 5.2 or 6.2 being read as instructions to restore OB tooling;
the proposal calls that out explicitly.

**Uncommitted working-tree edits to the two MACD exporters are lost** → Deliberate: the files
are deleted, and those edits were made in service of an export procedure being retired. They
remain in the working tree's history only until the deletion, so if anything in them is worth
keeping it must be read before task 2 runs — but nothing in them is, since they only tune an
export nobody will run.

## Migration Plan

Deletion-only, no runtime component, no deploy step. The order that matters:

1. Delete the OB check (runner and fixture) before the tooling that fed it, so no intermediate
   state has a runner whose regeneration path is already gone.
2. Delete the tooling and `tools/mql5/`, including untracked build output.
3. Clean the ignore rules, the OpenSpec archive guidance, the README, and the one `ob.js`
   comment.
4. Confirm the remaining suites still run: `uv run pytest` and every surviving Node runner,
   including `run_mt5math.mjs`, which stays and must keep passing.

Rollback is `git revert` of the change's single commit; the fixture, the runner and the
exporters all come back with it. The untracked `.ex5` and `.compile.log` files do not, and are
rebuilt by MetaEditor if ever needed.
