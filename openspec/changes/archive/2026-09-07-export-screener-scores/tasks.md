## 1. Node scoring script

- [x] 1.1 Add `scripts/build-screener-scores.mjs` that imports `scoreInstrument`, `markCount`, and constants from `web/screener/score.js`, and `SCAN_CACHE_VERSION` from `web/screener/scan.js`
- [x] 1.2 Implement input handling: read a `catalog.json` payload and a `scan-bars.json` payload (file paths as CLI args, or stdin — pick one interface and keep it consistent with how `export.py` will invoke it)
- [x] 1.3 Implement the per-symbol loop over `catalog.symbols`: for a disabled symbol call `scoreInstrument({ enabled: false, ... })`; for an enabled symbol, build `seriesByTimeframe` from the matching `scan-bars.json` entry (falling back to an empty series if the symbol is missing from scan-bars) and call `scoreInstrument({ enabled: true, seriesByTimeframe, pointSize })`
- [x] 1.4 Assemble the output payload: `generated_utc` (from the input catalog's own `generated_utc`, per Decision in design.md), `scoring_model_version` (= `SCAN_CACHE_VERSION`), `symbol_count`, `enabled_count`, `screened_count`, and a `symbols` map keyed by `xtb_symbol` with each entry's `status`/`score`/`marks`/`reasons`/`rangePct`/`positionPct`/`headroomPct`
- [x] 1.5 Write the payload as JSON to stdout or to a given output path, and exit non-zero with a clear stderr message on any input/parse error
- [x] 1.6 Add a Node-side test (extend `tests/js/run_screener.mjs` or add a sibling script) that runs the build script against a small fixture catalog + scan-bars pair and asserts the output matches direct `scoreInstrument()` calls for the same fixtures, including at least one disabled symbol and one insufficient-history symbol

## 2. Python export integration

- [x] 2.1 Add a helper in `src/xtb_charts/export.py` (or a small new module) that invokes `scripts/build-screener-scores.mjs` via subprocess, passing the already-built catalog and scan-bars payloads, and returns the parsed JSON result
- [x] 2.2 Wire the helper into `export_site()` so `dist/data/screener-scores.json` is written alongside `meta.json`, `catalog.json`, and `scan-bars.json`, using the existing `_write_json()` helper
- [x] 2.3 Surface a clear error (not a silent empty file) if the Node subprocess is unavailable or exits non-zero, so a missing Node toolchain fails the export loudly rather than publishing a broken artifact

## 3. Dev backend route

- [x] 3.1 Add `GET /data/screener-scores.json` to `src/xtb_charts/api.py`, building `catalog.json`/`scan-bars.json`-equivalent payloads from the live store and invoking the same subprocess helper from task 2.1
- [x] 3.2 Confirm the dev route's response shape is identical to the exporter's output for the same store (manual check or via task 4.1's test)

## 4. Tests

- [x] 4.1 Extend `tests/test_export.py` with an export round-trip assertion for `data/screener-scores.json`: file exists, `generated_utc` matches the other exported files (modulo the existing volatile-field handling pattern already used for `meta`/`catalog`/`scan-bars`), and the dev route (`/data/screener-scores.json`) returns the same content modulo `generated_utc`
- [x] 4.2 Add an assertion that a disabled fixture symbol appears in the exported file with `status: "not-screened"`
- [x] 4.3 Add an assertion that `scoring_model_version` is present and equals the current `SCAN_CACHE_VERSION`
- [ ] 4.4 (Optional) Add a golden-file test pinning the exact scored output for 2-3 fixture symbols with known bars, so an unintended scoring change is caught even if it doesn't break shape assertions

## 5. Documentation

- [x] 5.1 Note the new `data/screener-scores.json` artifact and its shape in whatever doc already documents `scan-bars.json`/`catalog.json` for downstream consumers (e.g. a contract reference doc, if one exists, or a comment in `contract.py`/`export.py`), including the `scoring_model_version` versioning contract and the guidance that consumers should ignore unknown fields
