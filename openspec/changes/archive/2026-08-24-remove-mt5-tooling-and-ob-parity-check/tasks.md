## 1. Remove the OB parity check

- [x] 1.1 Confirm nothing but the runner reads the OB fixture: grep the repository for `run_ob_fixtures`, `fixtures/ob` and `ob_oracle`, and confirm no file under `web/` and no Python test names either
- [x] 1.2 Delete `tests/js/run_ob_fixtures.mjs`
- [x] 1.3 Delete `tests/fixtures/ob/xauusd-d1.json` and the now-empty `tests/fixtures/ob/` directory, leaving `tests/fixtures/fvg/` and `tests/fixtures/fvg-spaces/` in place

## 2. Remove the MQL5 sources and the tooling they fed

- [x] 2.1 Delete `tools/mql5/ExportOBOracle.mq5`, `tools/mql5/ExportMacdOracle.mq5`, `tools/mql5/ExportMacdOracleEA.mq5` and `tools/mql5/export-macd-oracle.ini`. The last three are also deleted by `verify-macd-parity-without-external-oracle`; if that change has already been applied they are absent and this step is satisfied
- [x] 2.2 Delete the untracked build output beside them (`*.ex5`, `*.compile.log`) and remove the now-empty `tools/mql5/` directory. Confirm `git status` shows no leftover untracked file under that path
- [x] 2.3 Delete `tools/generate_ob_fixtures.py`, `tools/ob_intraday_spotcheck.mjs` and `tools/copy_macd_fixture.py` (the last is also deleted by the MACD change; absent is satisfied)
- [x] 2.4 Confirm no `.mq5` file remains anywhere in the repository, and that `tools/` still holds `generate_fvg_fixtures.py`, `fetch_xtb_names.py`, `import_xtb_report_symbols.py` and `verify_catalog_symbols.py`
- [x] 2.5 Confirm `web/indicators/mt5math.js` and `tests/js/run_mt5math.mjs` are untouched — they are pure JavaScript the indicators import and a test needing nothing external, and they stay

## 3. Clean up ignore rules and OpenSpec guidance

- [x] 3.1 Remove the MQL5 build-output section from `.gitignore` (the `*.ex5` and `*.compile.log` entries and their comment), leaving every other entry alone
- [x] 3.2 Remove the archive-guidance bullet in `openspec/config.yaml` that forbids committing MQL5 build output, leaving the other two archive-guidance bullets and the `context` block unchanged
- [x] 3.3 Do not touch user-level Cursor rules or any file outside this repository; the MT5-Testing install still exists on the machine and those rules describe it, not this project

## 4. Documentation and source comments

- [x] 4.1 In `README.md`, drop the `node tests/js/run_ob_fixtures.mjs` line from the test-command list and delete the whole "Regenerating the OB fixtures" section, leaving the "Regenerating the MACD fixtures" section for the MACD change to rewrite
- [x] 4.2 In `README.md`, reword the OB paragraph's "Supply zones are still detected internally for MT5 parity but are not rendered" so it no longer credits a comparison that is gone, while still saying supply zones are detected and never drawn. Keep the six-deviation list and the `SMCTrading.mq5` v3.23 / sha256 attribution as they are
- [x] 4.3 In `web/indicators/ob.js`, edit the `OB_PARAMS` comment block so it no longer names `tools/ob_intraday_spotcheck.mjs`: keep both verification results as historical records, keep both caveats and the untested-confirmation-gate note, and drop only the reference to the deleted script
- [x] 4.4 Confirm `web/indicators/ob-structure.js` is untouched, including `OB_STRUCTURE_SOURCE` and its header hash, and that `OB_PARAMS`, the OB algorithm and the recorded source hash in `ob.js` are unchanged apart from that comment

## 5. Verify nothing else moved

- [x] 5.1 Run `uv run pytest` and confirm it passes — no Python test reads the deleted tooling
- [x] 5.2 Run every surviving Node runner (`run_fixtures.mjs`, `run_space_fixtures.mjs`, `run_mt5math.mjs`, `run_measure.mjs`, `run_settings.mjs`, `run_scroll_lock.mjs`, `run_viewport.mjs`, `run_screener.mjs`, `run_render.mjs`, `run_scan_cache.mjs`, `run_symbol_list.mjs`, and `run_macd_fixtures.mjs` if the MACD change has landed) and confirm each behaves as it did before
- [x] 5.3 Load the app (`uv run xtb-charts serve`), enable `OB`, and confirm demand zones, `H`/`L` pivot labels and the insufficient-history warning behave exactly as before — the deletions touched no code path the chart uses
- [x] 5.4 Grep the repository once more for `ExportOBOracle`, `generate_ob_fixtures`, `ob_intraday_spotcheck`, `copy_macd_fixture`, `run_ob_fixtures` and `.ex5` and confirm the only remaining hits are inside `openspec/changes/` artifacts

## 6. Close out

- [x] 6.1 Run `openspec validate remove-mt5-tooling-and-ob-parity-check --strict` and confirm the delta applies cleanly against `openspec/specs/indicators/spec.md`
- [x] 6.2 Confirm the applied spec still specifies OB behaviour completely: the six deviations, the sub-H4 expectation, the forming-bar convention, supply detection without rendering, and the source provenance record all appear, and no requirement still refers to comparing against an MT5 export
- [x] 6.3 If `verify-macd-parity-without-external-oracle` has not yet been applied, note on it that its task 5.1 is now partly or wholly done, that its task 5.2 confirmation and its design's "Removing `ExportOBOracle.mq5`" non-goal are superseded, and that its task 6.2 must no longer run `run_ob_fixtures.mjs`. Do not restore any deleted file to satisfy those steps
