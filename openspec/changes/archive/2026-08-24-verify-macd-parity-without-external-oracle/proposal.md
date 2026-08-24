## Why

`tests/js/run_macd_fixtures.mjs` still has nothing to run against: `tests/fixtures/macd/`
has never existed and git has no record of any file under it. The preceding change
(`restore-macd-parity-fixture`) tried to fix that by bounding the MT5 export and committing
its output, but the fixture depends on a step no clone can perform — a human at a running
MT5-Testing terminal with `SimpleMACD` installed — and the fixture never landed. MACD is
consequently the only indicator whose documented numeric check is unavailable, so every
edit to `web/indicators/macd.js` or the shared MT5 EMA helpers still lands with no
numeric guard, while FVG and OB both ship committed fixtures.

The blocker is the oracle's location, not the comparison. Making the expected values
generable in-repo turns an indefinitely-blocked manual export into a command any
contributor can run, and it retires the MACD export tooling that only ever worked on one
machine.

## What Changes

- Generate the expected MACD arrays in-repo, from a reference implementation of
  `SimpleMACD.mq5`'s numeric conventions written independently of the JS port, over a
  deterministic synthetic bar series built by the generator itself — no market data, no
  terminal, no network.
- Commit the resulting fixtures under `tests/fixtures/macd/` in the shape the existing
  runner already reads, so the MACD parity check runs from a clean clone and is
  reproducible: re-running the generator on an unchanged port reproduces the committed
  files byte for byte.
- Anchor the fixture against values derivable from the spec alone — the SMA-seeded first
  defined value of each array and the exact first defined indices 33/41/41 — so the check
  is not merely two implementations agreeing with each other.
- **BREAKING** for the regeneration procedure only: remove the MACD MT5 export tooling —
  `tools/mql5/ExportMacdOracle.mq5`, `tools/mql5/ExportMacdOracleEA.mq5`,
  `tools/mql5/export-macd-oracle.ini`, and `tools/copy_macd_fixture.py` — along with their
  build output. Nothing the application ships depends on them, and leaving a second,
  unrunnable path to the same fixture invites the two to disagree about what a fixture
  contains. `ExportOBOracle.mq5` stays: the OB parity check still reads its output.
- Retain the runner and the comparison it performs unchanged — the same value-by-value
  tolerance, the same exact first-index assertions, the same missing-fixture failure —
  editing only the regeneration path its message and header comment name.
- Rewrite the README's MACD regeneration section around the in-repo generator, and drop
  the export steps it currently documents.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `indicators`: the "MACD parity with the MT5 original" requirement changes where the
  reference values come from — an in-repo reference implementation over a deterministic
  generated series, rather than an export from a running MT5 terminal — and what the
  fixture records: the generator inputs that reproduce it, rather than an exported bar
  window. The numeric conventions, the value-by-value comparison, the exact first-defined
  indices, the clean-clone guarantee and the missing-fixture failure are unchanged; the
  requirement additionally states what the check does and does not establish now that its
  oracle is in-repo.

## Impact

- `tools/generate_macd_fixtures.py` — new; the reference implementation and the series
  builder, alongside `generate_fvg_fixtures.py` and `generate_ob_fixtures.py`.
- `tests/fixtures/macd/` — new committed fixtures.
- `tests/js/run_macd_fixtures.mjs` — regeneration message and header comment only; the
  comparison logic and the missing-directory guard are untouched.
- `tools/mql5/ExportMacdOracle.mq5`, `tools/mql5/ExportMacdOracleEA.mq5`,
  `tools/mql5/export-macd-oracle.ini`, `tools/copy_macd_fixture.py` — deleted, with their
  `.ex5` and compile-log build output.
- `README.md` — the MACD regeneration section.
- `web/indicators/macd.js` and `web/indicators/mt5math.js` are **not** touched. If the
  generated fixture disagrees with the port, one of the two misreads `SimpleMACD.mq5` and
  resolving it is its own change.
- The working tree currently holds the preceding change's uncommitted edits to the two
  exporters and to the README's MACD section. This change deletes those exporters and
  rewrites that section, so those edits are superseded rather than built on.
