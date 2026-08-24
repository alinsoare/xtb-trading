## 1. Runner guard (no MT5 needed)

- [x] 1.1 In `tests/js/run_macd_fixtures.mjs`, guard the fixture directory read so a missing directory produces the existing "no fixtures found" failure — naming the directory and the regeneration path — instead of an unhandled `ENOENT` from `readdirSync`
- [x] 1.2 Verify by running `node tests/js/run_macd_fixtures.mjs` before any fixture exists: it must exit non-zero with the actionable message and no stack trace

## 2. Bound the oracle export (no MT5 needed)

- [x] 2.1 Add an `InpMaxBars` input to `tools/mql5/ExportMacdOracle.mq5` defaulting to 400, and export the most recent `min(InpMaxBars, Bars(...))` bars: shift `CopyRates`/`CopyBuffer` to that window and keep `bar_window.count`/`oldest_time`/`newest_time` describing the window actually written
- [x] 2.2 Keep the existing too-few-bars guard meaningful against the bounded count, so a window below `slow + signal` still refuses to export
- [x] 2.3 Mirror the same input and window arithmetic in `tools/mql5/ExportMacdOracleEA.mq5` so the two exporters cannot disagree about what a fixture contains
- [x] 2.4 Compile both through the MT5-Testing install per the repo's MQL5 rule and confirm `0 errors, 0 warnings`; do not commit the `.ex5` or the compile log

## 3. Export and commit the fixture (needs a running MT5-Testing terminal)

- [x] 3.1 Open XAUUSD D1 in MT5-Testing with `SimpleMACD` available, run `ExportMacdOracle` on that chart, and confirm from the Experts log that it wrote the JSON rather than returning on `INVALID_HANDLE` or a `CopyBuffer` failure
- [x] 3.2 Run `uv run python tools/copy_macd_fixture.py` to land the JSON in `tests/fixtures/macd/`, and check the resulting file: 400 bars, a recorded bar window, and a size in the same band as `tests/fixtures/ob/xauusd-d1.json`
- [x] 3.3 Run `node tests/js/run_macd_fixtures.mjs` and confirm it passes — main, signal and histogram matching value by value and first defined indices 33/41/41
- [x] 3.4 If it fails numerically, stop and report the failing indices and magnitudes: that is a parity bug in the port and belongs in its own change. Do not widen the tolerance, edit `web/indicators/macd.js`, or commit a failing fixture
- [x] 3.5 Stage the fixture and confirm nothing under `MQL5/Files/` or any `.ex5` came along with it

## 4. Documentation and close-out

- [x] 4.1 Update the "Regenerating the MACD fixtures" section of `README.md`: state that the fixture is committed and the runner needs no MT5, name the bounded bar count and the `InpMaxBars` input, and keep the numbered procedure accurate for a re-export
- [x] 4.2 Re-run the neighbouring dev-time runners (`run_mt5math.mjs`, `run_ob_fixtures.mjs`, `run_fixtures.mjs`) plus `uv run pytest` to confirm nothing else moved
- [x] 4.3 Run `openspec validate restore-macd-parity-fixture --strict` and confirm the delta still applies cleanly against `openspec/specs/indicators/spec.md`
