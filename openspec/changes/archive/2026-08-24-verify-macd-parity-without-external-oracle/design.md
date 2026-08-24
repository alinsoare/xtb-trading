## Context

See proposal.md — Why. The design-relevant facts:

- `tests/js/run_macd_fixtures.mjs` reads every `*.json` under `tests/fixtures/macd/`, feeds
  `fixture.bars` to `macdArrays`, asserts the first defined index of each output array
  against `main_first` / `signal_first` / `hist_first`, and compares `main`, `signal` and
  `histogram` value by value from the first defined index onward within a 1e-9
  absolute/relative tolerance. Indices below the first defined index are skipped, so
  whatever the fixture holds over the warm-up is never read. It already guards the missing
  directory and prints an actionable message.
- `tools/generate_fvg_fixtures.py` is the in-repo precedent for a generated fixture: a
  deterministic synthetic series from a fixed `random.Random` seed, NaN encoded as `null`,
  written to `tests/fixtures/<indicator>/`. It draws its reference values from the sibling
  reference repo's Python indicators, which has no MACD — so there is no existing Python
  MACD to import, and the reference computation has to be written here.
- `tools/generate_ob_fixtures.py` and `tools/mql5/ExportOBOracle.mq5` remain the MT5-fed
  path for OB and are untouched by this change.
- The preceding change (`openspec/changes/archive/2026-08-24-restore-macd-parity-fixture/`)
  recorded the opposite decision — MT5 stays the oracle — on the grounds that a checked-in
  reference would make the check self-referential. That reasoning is answered below rather
  than ignored.

## Goals / Non-Goals

**Goals:**

- A fixture whose regeneration is deterministic and hermetic: same command, same bytes, no
  terminal, no market data, no network.
- A reference computation that can disagree with the port, and anchors that hold even when
  both agree.
- One fewer path to a MACD fixture, not two.

**Non-Goals:**

- Changing `web/indicators/macd.js`, `web/indicators/mt5math.js`, or the tolerance. The
  port is presumed correct until the fixture says otherwise.
- Re-establishing agreement with a live MT5 terminal. That is what this change gives up,
  deliberately and explicitly.
- Changing the runner's comparison, its tolerance, or its fixture discovery.
- Removing `ExportOBOracle.mq5` or anything else the OB parity check reads.
- Wiring the Node runners into CI. They are dev-time today and stay dev-time.

## Decisions

**Reverse the preceding change's decision: the oracle moves in-repo.**
The earlier reasoning was sound about what an in-repo reference cannot do — it cannot catch
a misreading of `SimpleMACD.mq5` shared by both transcriptions — but it was weighed against
a fixture that would exist. Two attempts later there is no fixture, so the comparison being
theoretically stronger has bought nothing: a check that never runs catches no regression at
all. The trade is a check that catches every future drift in the port against a check that
would additionally catch a misreading nobody is currently at risk of introducing, since
`SimpleMACD.mq5` is not being re-read. Taking the weaker-but-real check is the better deal,
and the spec now says plainly what it does and does not establish rather than letting
"parity" imply more than it delivers.

**A Python reference implementation in `tools/generate_macd_fixtures.py`, written from the
conventions, not from the JS.**
The reference computes the typical-price series, the two SMA-seeded EMAs, the main line, the
main-line-seeded signal EMA and the histogram directly from the arithmetic the spec states.
It is in Python because that keeps it structurally distinct from the JS port — a transcription
error is unlikely to be reproduced identically across two languages — and because Python is
already this repo's fixture-generation language, with `uv` in place and two generators
alongside it. Importing the port into a Node generator was rejected outright: it would
compare the port to itself and the fixture would be a recording, not a check.

**Anchors carry the weight the second implementation cannot.**
Three values follow from the spec alone, independently of either implementation: the slow
EMA's first defined value is the arithmetic mean of the first 34 typical prices, the signal
line's first defined value is the arithmetic mean of the main line's values at indices 33
through 41, and the first defined indices are exactly 33, 41 and 41. The generator SHALL
compute the two means by direct summation — not through its own EMA routine — and refuse to
write a fixture that disagrees, so a seeding error in the reference is caught where it is
introduced. The indices are asserted at check time by the runner, which already does it.
Both are recorded in the fixture so a reader can verify them by hand. This is what makes a
shared misreading of the seeding rules — the one class of error two transcriptions could
plausibly share — unable to pass.

**Two fixtures: a 400-bar walk and a 43-bar boundary case.**
400 bars leaves ~360 bars past the index-41 warm-up, enough that an off-by-one in the EMA
recurrence shows up hundreds of times rather than once. 43 bars is exactly
`slowPeriod + signalPeriod`, the indicator's declared minimum, where the histogram is
defined at indices 41 and 42 only — the case where a warm-up boundary error is most likely
and least likely to be noticed. Nothing shorter is added: the runner asserts an exact first
defined index, so a series below the slow period would leave `main` all-undefined and fail
the assertion by construction. Below-warm-up behaviour is covered by the separate warm-up
requirement, not here.

**A deterministic synthetic series, not a recorded instrument.**
`random.Random(seed)` with a fixed seed is stable across CPython versions and is what the
FVG generator already relies on. A recorded instrument window would reintroduce exactly what
this change removes — an artifact that can only be produced where the data is — and MACD's
conventions are indifferent to whether the prices look like gold or like a random walk. The
seed and bar count go into the fixture, so the series is reproducible from the fixture alone.

**Reproducibility means byte-for-byte.**
Values are written with Python's default float repr (shortest round-trippable form) rather
than a fixed decimal count, so nothing is lost in serialisation and re-running the generator
on unchanged inputs rewrites the identical file. Fixed-decimal formatting was rejected: the
old MT5 export's 10 decimal places discarded low bits, which forces a tolerance to absorb a
loss the generator has no reason to introduce.

**Warm-up encoded as `null`.**
The runner never reads those positions, and `null` is the FVG fixtures' existing convention
for an undefined value. Writing `0` there — what the MT5 export did — would leave a fixture
that reads as though the warm-up had values.

**Delete the MACD export tooling rather than leaving it dormant.**
`ExportMacdOracle.mq5`, its strategy-tester twin, its `.ini` and `tools/copy_macd_fixture.py`
exist only to produce this fixture, which is now produced another way. Keeping them would
leave two procedures that write the same path in different shapes, and whichever a future
contributor happens to find decides what lands in git. Their build output (`.ex5`, compile
logs) goes with them; it is gitignored, so this is a working-tree cleanup, not a commit.

**Rewrite the runner's regeneration message, and nothing else in it.**
Its message currently names compiling `ExportMacdOracle.mq5` and copying JSON out of
MT5-Testing — a procedure that will not exist. The comparison logic, tolerance, discovery
and missing-directory guard stay exactly as they are.

## Risks / Trade-offs

**A misreading of `SimpleMACD.mq5` shared by the port and the reference passes the check** →
Accepted and stated in the spec: this check pins conventions and catches regressions, and
does not re-derive agreement with the terminal. The anchors close off the shared-misreading
case most likely to occur (seeding and warm-up boundaries) because they are computed from
the stated arithmetic rather than from either implementation. If a genuine question about
what the original does ever arises, answering it means reading the source or the terminal —
which is what it would have meant anyway.

**The generated fixture disagrees with the JS port on first run** → That is a real
divergence between two independent transcriptions and it needs adjudicating against
`SimpleMACD.mq5`, not smoothing over. Stop, report the failing indices and magnitudes, and
let the resolution be its own change. Do not widen the tolerance, do not edit the port to
match the reference, and do not commit a fixture known to fail.

**The reference is written by reading the JS port instead of the conventions, making the
"independent" implementation a translation** → Write it from the requirement text and the
arithmetic it states, then compare; if the two agree on the first run, the anchors are what
distinguishes agreement from having copied. Treat any temptation to consult `macd.js` to
resolve a disagreement as a signal that the disagreement is the finding.

**Deleting the exporters loses the ability to re-verify against MT5 later** → They are in
git history and recoverable, and the sibling `ExportOBOracle.mq5` remains as a working
pattern for an MQL5 export if one is ever wanted again. What is being deleted is a procedure
nobody has completed, not a capability in use.

**Float determinism across platforms** → The arithmetic is IEEE-754 addition, multiplication
and division in a fixed order, which is reproducible; the risk would come from vectorised or
reordered summation, so the generator uses plain loops and `math.fsum` is deliberately
avoided for the EMA recurrence, which has a defined sequential order.
