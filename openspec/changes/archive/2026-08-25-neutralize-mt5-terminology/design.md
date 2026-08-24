## Context

See proposal.md — Why. What matters for the approach is the exact inventory, because the sweep is
only finished when a single grep comes back empty. As of this change's writing, outside
`openspec/changes/**`, the repository holds MT5/MQL5/MetaTrader/SMCTrading/`.mq5` mentions in:

- `web/indicators/mt5math.js` — file name, header comment, three exported functions;
- `web/indicators/fvg.js`, `web/indicators/macd.js` — imports, call sites, the `fvg.js`
  re-export, the `SimpleMACD.mq5` / `FVGSignal.mq5` header provenance (path, version), and
  comments about the forming bar and the MQL5 inputs;
- `web/indicators/ob-structure.js` — `mt5ToJs` / `jsToMt5`, their `*Mt5` locals, header
  comments carrying the source path, version and hash, the `OB_STRUCTURE_SOURCE` constant, and
  a `prev_calculated == 0` comment;
- `web/indicators/ob.js` — header (path, version, hash), the `OB_STRUCTURE_SOURCE` import and
  re-export, and `OB_PARAMS` comments;
- `tests/js/run_mt5math.mjs` (file name and contents), `tests/js/run_fixtures.mjs` (imports and
  header);
- `tools/generate_macd_fixtures.py` (a locally defined `mt5_ema`),
  `tools/generate_fvg_fixtures.py` (`mt5_ema` / `mt5_stochastic` **imported from the sibling
  reference repo** and a docstring);
- `src/xtb_charts/fetch.py` — one comment;
- `README.md` — the test list, the indicators intro, the FVG and OB descriptions with their
  source file names, version and sha256 prefix, the OB forming-bar bullet, and the MACD-fixture
  section;
- `openspec/specs/indicators/spec.md` (the `## Purpose` line plus seven requirements) and
  `openspec/specs/market-data/spec.md` (one requirement).

Two constraints shape everything below. `tools/generate_fvg_fixtures.py` reaches into
`../xtb-trading` for the reference implementation, whose API this change cannot rename — so the
MT5-named half of that API has to stop being imported rather than be renamed. And every
committed fixture must survive byte-for-byte, since nothing here is allowed to change a number.

One piece of sequencing is already settled and only recorded here so a later reader does not
re-litigate it: `verify-macd-parity-without-external-oracle` is archived and its wording is
synced into `openspec/specs/indicators/spec.md`, so this change's MACD delta is written against
the main spec as it stands today.

## Goals / Non-Goals

**Goals:**

- One rule a reader can apply: no literal `MT5`, `MQL5`, `MetaTrader`, `SMCTrading` or `.mq5`
  token anywhere outside `openspec/changes/**`, with no allowlist.
- Names that state the convention they encode, so a reader who has never opened MetaTrader can
  tell what `smaSeededEma` does and why it is not the textbook EMA.
- A provably behaviour-free change: existing tests pass unchanged, fixtures unchanged.

**Non-Goals:**

- Renaming or reorganising anything for reasons other than the terminology (no module splits, no
  signature changes, no parameter renames in `OB_PARAMS` or `FVG_PARAMS`).
- Touching `openspec/changes/archive/**`. History records what was true when it was written, and
  it is where the OB port's recorded source path, version and hash stay readable.
- Touching `~/.cursor/rules/mt5-compilation.mdc` — outside the repository, and it describes how
  to compile MQL5 on this machine, which remains true and has nothing to do with this project.
- Renaming the sibling reference repo's API, or vendoring more of it than the two functions
  whose names force the issue.

## Decisions

**Strict erasure: the source is described, never identified.** Every literal `MT5`, `MQL5`,
`MetaTrader`, `SMCTrading` and `.mq5` token leaves the active tree — the file names
(`FVGSignal.mq5`, `SMCTrading.mq5`, `SimpleMACD.mq5`), the version markers that go with them
(v3.23, v1.02), the sha256 `484d821d…`, the recorded `~/daytrading/mt5/indicators/...` paths and
the `OB_STRUCTURE_SOURCE` constant that holds all three. What survives is the description: each
port says it transcribes an external source indicator and lists exactly how it deviates, which
is what actually constrains its behaviour. An earlier draft of this change drew a line at
provenance — named source file stays, platform category goes — and was rejected by explicit
decision. The cost is accepted and stated plainly: from the active tree alone a reader can no
longer tell which file `484d821d…` hashed, and re-deriving the port's origin means reading
`openspec/changes/archive/**`. The version markers go with the file names because a bare "v3.23"
identifies nothing once the file it versions is unnamed.

**The provenance requirement is removed, not reworded.** `OB deviations from the SMCTrading
source` currently makes the record normative: the port SHALL record path, version and content
hash where its parameters are defined, with a scenario asserting it. Strict erasure and that
requirement cannot both hold, so the provenance paragraph and the `Source provenance is recorded`
scenario go. This is the only substantive spec change here; everything else in the delta is
wording. `OB_STRUCTURE_SOURCE` falls out with it — nothing reads the constant, `ob.js` only
re-exports it, so deleting it cannot change behaviour.

Because content is genuinely dropped, this one requirement goes through `REMOVED` + `ADDED`
rather than `RENAMED` + `MODIFIED`: `openspec validate --strict` refuses a `MODIFIED` block that
omits a scenario the current spec still has, and rightly so — silently losing a scenario at
archive time is exactly the failure that guard exists to catch. The `REMOVED` entry carries the
reason and, as its migration note, the record being deleted, so the path, version and hash stay
legible in this change's own artifacts even after they leave the code.

**Replacement vocabulary is fixed up front, so the rewording is mechanical.** "the MT5 original"
and the named `.mq5` sources → "the source indicator"; "MT5's forming bar" → "the source's
forming bar — the still-open newest bar of a live chart"; "MT5's `EMPTY_VALUE`" → "the source's
empty value"; "MT5's iMA / iStochastic" → "the source platform's moving-average and stochastic
functions"; "no MT5 install, no terminal" → "no trading terminal"; "the MT5 chart's zones" → "the
zones the source indicator draws on a live chart"; "ports of MQL5 indicators" → "ports of an
external source indicator". The source platform's own API identifiers are paraphrased rather than
quoted: `STO_LOWHIGH` → "the source's low/high stochastic mode (rolling extremes with SMA
slowing)", `prev_calculated == 0` → "a full recalculation from the whole series". Keeping them as
pointers was considered and rejected: once the source file names are gone, an identifier a reader
cannot look up anywhere is noise rather than a pointer, and the behaviour they name is already
spelled out in the surrounding sentence.

**`series-math.js` with convention-naming exports.** The module holds an SMA-seeded EMA, its
from-a-later-index variant, and a low/high stochastic with SMA slowing. The names
`smaSeededEma` / `smaSeededEmaFromSeries` / `lowHighStochastic` were chosen over the shorter
`ema` / `emaFromSeries` / `stochastic` precisely because the seeding is the whole point of the
module: this repository's specs treat a first-value seed as a signal-changing defect, and a
function called `ema` invites exactly that substitution. The file name is descriptive rather than
another vendor tag: `series-math.js` fits the existing kebab-case sibling `ob-structure.js`.
`parity-math.js` was considered and rejected — parity is what the tests establish, not what the
functions compute.

**`sourceToJs` / `jsToSource` for the index flip.** The helpers convert between the source's
newest-first bar numbering and this repository's chronological arrays. Naming them after the
source rather than after MT5 keeps the asymmetry legible, and a one-line comment defines "source
index" once so the `*Src` locals need no further explanation. `revToJs` / `jsToRev` (reverse
index) was the alternative; "source" won because the reversal exists only to follow the source's
convention, and the file already speaks of "the source" throughout.

**The FVG reference EMA and stochastic are vendored into this repository.**
`tools/generate_fvg_fixtures.py` imports `mt5_ema` and `mt5_stochastic` from `../xtb-trading`,
and no alias hides that from a grep: `mt5_ema as sma_seeded_ema` still writes `mt5_ema` on the
import line, which under strict erasure is a hit like any other. So the two functions are
reimplemented in this repository — `sma_seeded_ema` and `low_high_stochastic` in a small
`tools/reference_math.py`, transcribed from the reference implementation's behaviour, operating
on the same NumPy arrays and returning the same NaN warm-up regions. The generator keeps
importing `Bar`, `FvgParams` and `fvg_zones` from the sibling repo: those names are neutral, and
the zone sets in the fixtures must keep coming from the reference implementation rather than
from a copy, or the fixtures stop being an independent check on the JS port.

The equivalence proof is the fixtures themselves: regenerating all four FVG fixtures with the
vendored functions must leave `tests/fixtures/fvg/` byte-for-byte unchanged, and those files
carry the EMA and stochastic arrays explicitly, so any divergence in seeding, warm-up length or
slowing shows up immediately as a diff. Two alternatives were rejected: the alias (does not
survive a literal grep, which is the whole acceptance criterion), and reaching the functions
indirectly through `getattr` (hides the name from a grep while leaving the dependency, and turns
an upstream rename from an import error into a runtime one). The duplication this creates is
noted as a risk below.

**Spec heading renames go through `RENAMED Requirements`, bodies through `MODIFIED`.** All three
renamed headings also need body edits, so the delta lists each rename in `RENAMED` and the new
body under `MODIFIED` keyed by the **new** heading. `openspec validate --strict` accepts this,
and archive applies renames before modifications. `REMOVED` + `ADDED` was the alternative for
these three; it was rejected because it would claim in the spec history that a parity requirement
was dropped and a different one introduced, which is the opposite of what happens. The OB
deviations requirement is the deliberate exception, for the reason given above.

**One `MODIFIED Requirements` section, not two.** The delta keeps a single header per operation.
A second `## MODIFIED Requirements` header later in the same file parses as an empty section and
its requirements are dropped without a validation error — the requirements simply vanish from the
delta. So the file order is `RENAMED`, then all `MODIFIED` requirements, then `ADDED`, then
`REMOVED`, and the delta's order need not follow the main spec's.

## Risks / Trade-offs

**A rename that misses a call site breaks the app silently in the browser** → The JS has no build
step and no type checker, so a stale `mt5Ema(` reference throws only when an indicator runs. The
task list ends with a grep gate (no `mt5|mql5|metatrader|smctrading|\.mq5` anywhere outside
`openspec/changes/**`, with no allowlist) plus running every dev-time runner and `uv run pytest`,
and enabling FVG, OB and MACD in the dev UI on a real series.

**The fixture generators are the one place this change could move a number** → The MACD generator
only renames a local function, which cannot change a value. The FVG generator now computes its
EMA and stochastic arrays from vendored code, which genuinely could. The gate is
`git diff --exit-code tests/fixtures/` after regenerating both fixture sets: any diff means the
change was not behaviour-free, and for the FVG fixtures specifically it means the vendored
functions do not match the reference implementation.

**The vendored EMA and stochastic can drift from the reference implementation they copy** →
Accepted, with the drift made loud rather than prevented: `tools/reference_math.py` exists solely
to feed the fixtures, and any divergence — introduced here or arriving later from `../xtb-trading`
— surfaces as a fixture diff the moment the fixtures are regenerated, because the fixtures record
the arrays themselves. The alternative, importing the sibling repo's versions, is what strict
erasure rules out. The vendored file's docstring SHALL say what it is a copy of and that the
fixtures are the check.

**Renaming a requirement heading loses the thread for anyone searching the spec history for "MT5
parity"** → Accepted, and recoverable only from history now that the source file names go too:
the archived changes carry the old headings, the old file names, the version markers and the
hash together, so `openspec/changes/archive/**` is the single place the port's origin can still
be reconstructed.

**Erasing provenance makes the ports' derivation unverifiable from the active tree** → Accepted
deliberately, and the reason it is survivable is that provenance was never what constrained the
ports: the deviation lists and the numeric-convention requirements are, and both stay. What is
lost is the ability to re-hash a file and confirm the port is still derived from the same
revision. If that record is ever wanted back, it should return as its own change with a decision
about where it belongs, not as a quiet reinstatement of the strings this change removed.

**Archive-time behaviour of `RENAMED` + `MODIFIED` on the same requirement is unexercised in this
repository** → No prior change has used `RENAMED`. Mitigation: after archiving, read the three
renamed requirements in `openspec/specs/indicators/spec.md` and confirm each appears exactly once,
under the new heading, with the reworded body; then confirm `OB deviations from the source
indicator` appears exactly once, `OB deviations from the SMCTrading source` not at all, and the
provenance paragraph and its scenario are gone — before committing the archive.

## Migration Plan

Nothing to migrate: no data, no persisted format, no public API. Rollback is `git revert` of the
single commit; the renames are self-contained and the fixtures are untouched, so a revert cannot
strand a regenerated artifact.
