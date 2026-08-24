## 1. Reference computation and bar series

- [x] 1.1 Create `tools/generate_macd_fixtures.py` with a deterministic bar-series builder: a drifting random walk from a fixed `random.Random(seed)`, emitting `time`/`open`/`high`/`low`/`close` per bar, in the shape `tests/fixtures/fvg/*.json` already uses
- [x] 1.2 In the same file, write the reference MACD computation from the requirement text alone — typical price, SMA-seeded fast and slow EMAs, main line from index `slow − 1`, signal EMA seeded from the main line's first defined index, histogram — using plain sequential loops. Do not read `web/indicators/macd.js` or `web/indicators/mt5math.js` while writing it
- [x] 1.3 Assert the anchors before writing anything: the slow EMA's value at index 33 equals the mean of the first 34 typical prices and the signal line's at index 41 equals the mean of main-line values 33 through 41, both computed by direct summation rather than through the EMA routine, and the first defined indices are 33/41/41. Refuse to write a fixture that fails any of them

## 2. Fixtures

- [x] 2.1 Emit two fixtures into `tests/fixtures/macd/`: a 400-bar walk and a 43-bar boundary case at exactly `slow + signal`, each carrying `name`, `params` (13/34/9), the generator inputs that reproduce it (seed and bar count), a `bar_window` giving the count and the oldest and newest bar times, `bars`, `main`, `signal`, `histogram`, `main_first`/`signal_first`/`hist_first`, and the anchor values from 1.3
- [x] 2.2 Encode warm-up positions as `null` and write floats with Python's default repr rather than a fixed decimal count
- [x] 2.3 Run `uv run python tools/generate_macd_fixtures.py`, then run it a second time and confirm `git status` shows no change from the second run — regeneration is byte-for-byte reproducible

## 3. Compare against the port

- [x] 3.1 Run `node tests/js/run_macd_fixtures.mjs` and confirm both fixtures pass: value-by-value agreement within tolerance and first defined indices 33/41/41
- [x] 3.2 If it fails numerically, stop and report the failing indices and magnitudes. Two independent transcriptions disagree and adjudicating that against `SimpleMACD.mq5` is its own change — do not widen the tolerance, do not edit `macd.js` or `mt5math.js`, do not read the port to "fix" the reference, and do not commit a failing fixture
- [x] 3.3 Confirm the check is not vacuous: temporarily seed one price EMA from its first value instead of the SMA, see the runner fail naming a differing index, then revert the edit

## 4. Runner and packaging

- [x] 4.1 In `tests/js/run_macd_fixtures.mjs`, update the missing-fixture message and the header comment to name `tools/generate_macd_fixtures.py` as the regeneration path. Leave the comparison, the tolerance, the fixture discovery and the missing-directory guard untouched
- [x] 4.2 Verify the guard still reads correctly by temporarily moving `tests/fixtures/macd/` aside: the run must exit non-zero with the new message and no stack trace, then restore it

## 5. Remove the MACD export tooling

> **Overlap with `remove-mt5-tooling-and-ob-parity-check` (applied first):** Task 5.1 is
> partly or wholly satisfied by that change. Task 5.2's OB-tooling confirmation and the
> design non-goal "Removing `ExportOBOracle.mq5`" are superseded. Do not restore deleted
> files to satisfy those steps.

- [x] 5.1 Delete `tools/mql5/ExportMacdOracle.mq5`, `tools/mql5/ExportMacdOracleEA.mq5`, `tools/mql5/export-macd-oracle.ini` and `tools/copy_macd_fixture.py`, along with the matching `.ex5` and `.compile.log` build output in the working tree
- [x] 5.2 Confirm nothing else references them: grep the repo for `ExportMacdOracle`, `copy_macd_fixture`, `macd_oracle` and `InpMaxBars`, and confirm no stale references remain outside `openspec/changes/` artifacts (the OB export tooling is gone by design — do not restore it)

## 6. Documentation and close-out

> **Overlap with `remove-mt5-tooling-and-ob-parity-check` (applied first):** Task 5.1
> is partly or wholly satisfied — the MACD export artifacts and `copy_macd_fixture.py` are
> already deleted. Task 5.2's confirmation that `ExportOBOracle.mq5` and
> `tools/generate_ob_fixtures.py` are untouched is superseded; those files were removed
> deliberately. The design non-goal "Removing `ExportOBOracle.mq5`" is likewise superseded.
> Task 6.2 must no longer run `run_ob_fixtures.mjs` — that runner and its fixture are gone.
> Do not restore any deleted file to satisfy those steps.

- [x] 6.1 Rewrite the "Regenerating the MACD fixtures" section of `README.md` around the in-repo generator: one command, no MT5, no market data, and a note that the fixture is committed. Drop the export and copy steps, and state what the check establishes — regression cover on the conventions, not a fresh comparison against a terminal
- [x] 6.2 Re-run the neighbouring dev-time runners (`run_mt5math.mjs`, `run_fixtures.mjs`) plus `uv run pytest` to confirm nothing else moved
- [x] 6.3 Run `openspec validate verify-macd-parity-without-external-oracle --strict` and confirm the delta applies cleanly against `openspec/specs/indicators/spec.md`
