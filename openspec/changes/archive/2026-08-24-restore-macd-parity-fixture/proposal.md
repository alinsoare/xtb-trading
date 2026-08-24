## Why

`tests/js/run_macd_fixtures.mjs` exists and is advertised in the README as part of the
test suite, but `tests/fixtures/macd/` has never been committed — git has no record of
any file under that path. The runner therefore cannot run at all: `readdirSync` on the
missing directory throws `ENOENT` and the run dies with a stack trace rather than the
"no fixtures found" message it was written to print. MACD is the only indicator whose
documented parity check is unavailable; FVG and OB both ship committed fixtures
(`tests/fixtures/fvg/`, `tests/fixtures/ob/xauusd-d1.json`). Every future edit to
`web/indicators/macd.js` or the MT5 EMA helpers currently lands with no numeric guard.

The gap is a packaging one, not a logic one. The oracle export script
(`tools/mql5/ExportMacdOracle.mq5`) and the copy step (`tools/copy_macd_fixture.py`)
both work, but the export is unbounded: it dumps every bar the terminal holds, which for
XAUUSD D1 is far larger than the 36 KB OB fixture, and the resulting artifact was
evidently never small enough to commit. Bounding the export makes committing it routine.

## What Changes

- Bound the oracle export to a recent, recorded slice of bars instead of the whole
  terminal history, so the committed fixture stays comparable in size to the OB one.
  The window is already recorded in the JSON (`bar_window.count` / `oldest_time` /
  `newest_time`); the change is that the count becomes deliberate and reproducible.
- Regenerate the fixture from MT5-Testing and commit it under `tests/fixtures/macd/`,
  making the MACD parity check runnable from a clean clone with no MT5 install.
- Make the runner fail with the actionable message it already contains when the fixture
  directory is missing, rather than throwing an unhandled `ENOENT`, so a future
  regression in fixture packaging reads as a fixture problem.
- Update the README's MACD regeneration steps to describe the bounded window and to say
  that the fixture is committed, matching how the OB section reads.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `indicators`: the "MACD parity with the MT5 original" requirement gains the packaging
  half of parity — that the comparison runs against a fixture committed to the
  repository, exported from the MT5 original over a bounded and recorded bar window,
  and that a missing or empty fixture set is reported as a failure naming the
  regeneration path rather than as an unhandled error.

## Impact

- `tools/mql5/ExportMacdOracle.mq5` — bar-window input; recompiled through the
  MT5-Testing install per the repo's MQL5 rule. `ExportMacdOracleEA.mq5` is the
  strategy-tester twin of the same export and moves with it.
- `tests/fixtures/macd/` — new committed fixture (one symbol/timeframe).
- `tests/js/run_macd_fixtures.mjs` — missing-directory handling only; the comparison
  logic is unchanged.
- `README.md` — MACD regeneration section.
- `web/indicators/macd.js` and `web/indicators/mt5math.js` are **not** touched. If the
  regenerated fixture disagrees with the port, that is a genuine parity bug and its fix
  belongs in a separate change, not here.
- Regenerating requires a running MT5-Testing terminal with `SimpleMACD` installed, so
  the export step is a manual one for whoever applies this change. Everyone else — CI,
  a fresh clone, a future agent — only runs the Node script.
