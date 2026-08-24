## Why

Every remaining MQL5 exporter and every tool fed by one can only be run by a human sitting
at the one MT5-Testing terminal on one machine. `tools/mql5/ExportOBOracle.mq5`,
`tools/generate_ob_fixtures.py` and `tools/ob_intraday_spotcheck.mjs` are the OB half of
that arrangement; `ExportMacdOracle.mq5`, its strategy-tester twin, its `.ini` and
`tools/copy_macd_fixture.py` are the MACD half. A contributor with a clone cannot regenerate
anything they produce, cannot tell whether the one committed OB fixture still corresponds to
the terminal it came from, and cannot act on a failure in `tests/js/run_ob_fixtures.mjs`
beyond reading it.

That leaves the OB parity check in a worse state than no check: it reads a single
`tests/fixtures/ob/xauusd-d1.json` recorded once at one instrument and timeframe, its
requirement demands that the MT5 export carry the same source hash the port records — a
condition nothing in a clone can re-establish — and the deviations it is meant to police are
already specified as behaviour elsewhere. Keeping it asserts a verification relationship the
repository can no longer perform, while the behaviour it protects is better stated directly
as behaviour.

The OB port's behaviour is not in question here and does not change. What goes is the
apparatus that claimed to re-verify it against a terminal, and the MT5-only tooling that fed
that apparatus.

## What Changes

- **BREAKING** for the OB regeneration and verification procedure only: delete
  `tests/js/run_ob_fixtures.mjs` and its sole committed fixture
  `tests/fixtures/ob/xauusd-d1.json`. No other test reads either, and the application does
  not import them.
- Delete every `.mq5` file in the repository — `tools/mql5/ExportOBOracle.mq5`,
  `tools/mql5/ExportMacdOracle.mq5`, `tools/mql5/ExportMacdOracleEA.mq5` — together with
  `tools/mql5/export-macd-oracle.ini` and the compiled `.ex5` / `.compile.log` build output
  sitting beside them, emptying and removing `tools/mql5/`.
- Delete the tools fed by those exporters: `tools/generate_ob_fixtures.py`,
  `tools/ob_intraday_spotcheck.mjs` and `tools/copy_macd_fixture.py`.
- Remove the in-repo MQL5 build-output entries from `.gitignore` (`*.ex5`,
  `*.compile.log`) and the MQL5 build-output bullet from the archive guidance in
  `openspec/config.yaml`, both of which exist only to describe artifacts the repository will
  no longer produce.
- Rewrite the affected `README.md` parts: drop the OB parity runner from the test list and
  the "Regenerating the OB fixtures" section, and reword the OB description where it
  attributes supply-zone detection to MT5 parity.
- Preserve the OB behaviour that the deleted parity requirement carried: the six intentional
  deviations from `SMCTrading.mq5` and their observable consequences move into a requirement
  of their own, stated as behaviour the port SHALL exhibit rather than as terms of a
  comparison.
- Keep the OB source provenance intact — the `OB_STRUCTURE_SOURCE` object and the port's
  header comments recording path, version and hash. What the port was derived from is a fact
  about the port, independent of whether a comparison is run.
- Explicitly out of scope: `web/indicators/mt5math.js` and `tests/js/run_mt5math.mjs` are
  pure JavaScript the application imports and a test that needs nothing external; they stay.
  FVG parity, `tools/generate_fvg_fixtures.py` and the FVG fixtures stay. The MACD parity
  requirement stays as it is, and this change makes no decision about where MACD's expected
  values come from.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `indicators`: the "OB signal parity with the MT5 original" requirement is **removed** — it
  specifies a verification procedure against an MT5 export that no clone can perform, and a
  source-hash agreement between the port and that export that cannot be re-established. In
  its place a new requirement, "OB deviations from the SMCTrading source", carries the six
  sanctioned deviations and their observable behaviour, so nothing the port does becomes
  unspecified. The "OB indicator" requirement is reworded where it justifies detecting
  supply zones by the parity comparison, which will no longer exist; supply zones are still
  detected and still never drawn.

## Impact

- `tests/js/run_ob_fixtures.mjs`, `tests/fixtures/ob/xauusd-d1.json` — deleted, emptying and
  removing `tests/fixtures/ob/`.
- `tools/mql5/` — deleted in full: three `.mq5` sources, one `.ini`, and their `.ex5` and
  `.compile.log` build output.
- `tools/generate_ob_fixtures.py`, `tools/ob_intraday_spotcheck.mjs`,
  `tools/copy_macd_fixture.py` — deleted.
- `.gitignore` — the MQL5 build-output section.
- `openspec/config.yaml` — the archive-guidance bullet forbidding commits of MQL5 build
  output.
- `README.md` — the test-command list, the "Regenerating the OB fixtures" section, and the
  supply-zone sentence in the OB description.
- `web/indicators/ob.js` — comments only, and only where they point at a deleted file: the
  header note referring to `tools/ob_intraday_spotcheck.mjs` keeps its findings but stops
  naming a script that is gone. No parameter, no algorithm and no provenance record changes.
- `web/indicators/ob-structure.js` — untouched, including `OB_STRUCTURE_SOURCE`.
- **Sequencing with `verify-macd-parity-without-external-oracle`.** That change is in flight
  and its task 5 deletes the same four MACD export artifacts this one does; whichever applies
  second finds them already gone and should treat that step as satisfied rather than as a
  failure. Two of its steps also assume this change has not landed: its design lists
  "Removing `ExportOBOracle.mq5`" as a non-goal and its task 5.2 asks for confirmation that
  `ExportOBOracle.mq5` and `tools/generate_ob_fixtures.py` are untouched, while its task 6.2
  re-runs `run_ob_fixtures.mjs`. If this change lands first, those three expectations are
  superseded by it — the files are gone deliberately — and the MACD work should proceed on
  the remaining steps rather than restoring them.
- The working tree currently holds uncommitted edits to `tools/mql5/ExportMacdOracle.mq5`,
  `tools/mql5/ExportMacdOracleEA.mq5`, `tests/js/run_macd_fixtures.mjs`, `README.md` and
  `openspec/specs/indicators/spec.md` from preceding MACD work. This change deletes the two
  exporters, so those edits are superseded rather than built on; it does not touch
  `run_macd_fixtures.mjs`.
