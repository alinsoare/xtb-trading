## Context

See proposal.md — Why. The design-relevant facts:

- `tools/mql5/ExportMacdOracle.mq5` exports `rates_total = Bars(_Symbol, PERIOD_CURRENT)`
  bars — everything the terminal holds — as bars plus three full buffers at 10 decimal
  places. On a D1 XAUUSD chart that is thousands of bars and hundreds of kilobytes.
- `tools/mql5/ExportMacdOracleEA.mq5` is a strategy-tester twin of the same export,
  duplicating the window and serialisation logic.
- `tests/js/run_macd_fixtures.mjs` already reads the window and the first-defined indices
  out of the fixture (`bar_window`, `main_first`, `signal_first`, `hist_first`) and
  compares within a 1e-9 absolute/relative tolerance. Its comparison logic needs nothing.
- Committed comparables: `tests/fixtures/ob/xauusd-d1.json` at 36 KB, and the four FVG
  fixtures at 40–248 KB. A fixture in that range is normal for this repo.
- The MQL5 rule in this workspace pins compilation to the MT5-Testing install; the
  regenerated `.ex5` is build output and stays out of git.

## Goals / Non-Goals

**Goals:**

- One committed MACD fixture that makes `node tests/js/run_macd_fixtures.mjs` pass from a
  clean clone.
- An export that produces a same-sized artifact every time it is run, so a future
  regeneration is a drop-in replacement rather than a new negotiation about size.

**Non-Goals:**

- Changing `web/indicators/macd.js`, `web/indicators/mt5math.js`, or the tolerance. The
  port is presumed correct until the fixture says otherwise.
- Wiring the Node runners into CI. They are dev-time today and stay dev-time; this change
  only makes the MACD one runnable by whoever runs the others.
- A second symbol or timeframe. One fixture restores the coverage the runner was written
  for; more is a later call once there is a reason for it.

## Decisions

**MT5 stays the oracle; the fixture is what gets committed.**
The alternative — generating expected values from a checked-in reference implementation
of the same conventions — would make the check self-referential: the port would be
compared against a second copy of its own assumptions, and a shared misreading of
`SimpleMACD.mq5` would pass. The MT5 terminal is the only independent authority for
"what the original does," so the export stays the source and the cost is that
regeneration is manual. That cost is already accepted for OB, which works the same way.

**Bound the export with a bar-count input, defaulting to 400.**
400 bars leaves ~360 bars past the index-41 warm-up — ample for a value-by-value
comparison that would catch a seeding or off-by-one error many times over — and lands the
JSON at roughly 70 KB, in the same band as the OB and FVG fixtures. The alternative of
trimming a full export afterwards in `tools/copy_macd_fixture.py` was rejected: the
trimming would have to re-derive `main_first`/`signal_first` for the new window, which
means reimplementing warm-up arithmetic in the copy step, and slicing a window out of the
middle of an MT5 buffer discards exactly the warm-up bars the seeding conventions are
about. Bounding at the source keeps the exported window and its recorded warm-up indices
consistent by construction. The count stays an input rather than a constant so a future
investigation can widen it without editing and recompiling.

**Take the most recent N bars, not the oldest N.**
Recent bars are the ones a developer can eyeball against a live MT5 chart when a parity
failure needs adjudicating.

**Keep the EA twin in step.**
`ExportMacdOracleEA.mq5` gets the same input and the same window arithmetic. Leaving it
unbounded would mean two exports of the same fixture that disagree on size, and whichever
one a future contributor happens to run decides what lands in git.

**Fix the missing-directory failure in the runner, not by creating the directory.**
The runner's "no fixtures found" message is already the right message; it just never runs
because `readdirSync` throws first. Guarding the read is a few lines. Committing a
`.gitkeep` so the directory always exists would silence the crash while leaving the check
vacuous, which is the state this change exists to end.

**XAUUSD D1 as the exported instrument.**
Assumption, recorded here because nothing in the repo forces it: the README and the
export script's own procedure both name XAUUSD D1, it is the instrument the original MACD
work was verified against, and it matches the OB fixture's D1 choice. If the terminal in
use has a different XAUUSD symbol suffix, the fixture name follows the symbol and nothing
else changes — the runner discovers fixtures by directory listing.

## Risks / Trade-offs

**The regenerated fixture disagrees with the JS port** → That is a real parity bug this
change has surfaced, not a defect in the fixture. Stop, report the disagreement with the
failing indices, and let it be its own change. Do not adjust the tolerance or the port to
make the new fixture pass, and do not commit a fixture that is known to fail.

**`SimpleMACD` is not installed, or is configured differently, in the terminal doing the
export** → The script reads it through `iCustom` with explicit 13/34/9 and
`PRICE_TYPICAL`, so its own chart settings do not leak in; but a missing indicator gives
`INVALID_HANDLE` and the script prints and returns. Check the terminal's Experts log
before assuming the export succeeded.

**The export step cannot be automated, so applying this change stalls without a human at
the terminal** → Sequence the work so everything that does not need MT5 — the script
change, the runner guard, the README — is done and reviewable first, and the fixture
lands as the last step. If the terminal is unavailable that day, the change is paused
with its reason obvious rather than half-applied in an unclear state.

**A 70 KB generated JSON in git is noise in future diffs** → Accepted; it is how the OB
and FVG fixtures already work, and the bound is what keeps it from getting worse. The
fixture is regenerated wholesale, never edited, so it should appear in a diff only when
someone deliberately re-exported it.
