## Why

The indicator ports were transcribed from `.mq5` sources, and the platform they came from
leaked into this repository's own vocabulary: a module named `mt5math.js`, exported functions
`mt5Ema` / `mt5Stochastic`, index helpers `mt5ToJs` / `jsToMt5`, a test runner named after the
module, README lines advertising an "MT5 export", and requirement headings such as "FVG signal
parity with the MT5 original". None of that names anything this repository contains any more.
`remove-mt5-tooling-and-ob-parity-check` deleted the exporters and the terminal-fed fixtures,
and `verify-macd-parity-without-external-oracle` replaced the last MT5-sourced oracle with an
in-repo generator — so the remaining mentions describe a platform the project no longer talks
to, in identifiers a reader has to know MetaTrader to parse.

What is left goes in full. An earlier draft of this change carved out **provenance** — which
file each port transcribes, its version, its hash — and removed only the **platform
vocabulary** around it. That carve-out is dropped by decision: every literal `MT5`, `MQL5`,
`MetaTrader` and `SMCTrading` token leaves the active tree, including the `.mq5` source file
names, their version numbers, the recorded sha256 and the `~/daytrading/mt5/...` paths the port
headers carry. The ports keep saying that they transcribe an external source indicator and
exactly how they deviate from it; they stop saying which file it was. The one consequence worth
naming up front: the `indicators` spec currently *requires* the OB port to record its source's
path, version and hash, so that requirement and its scenario are removed here rather than
reworded.

## What Changes

- Rename `web/indicators/mt5math.js` to `web/indicators/series-math.js` and its exports to
  names that state the convention rather than the vendor: `mt5Ema` → `smaSeededEma`,
  `mt5EmaFromSeries` → `smaSeededEmaFromSeries`, `mt5Stochastic` → `lowHighStochastic`. Update
  every importer (`web/indicators/fvg.js`, `web/indicators/macd.js`) and the re-export
  `fvg.js` provides for its tests.
- Rename `tests/js/run_mt5math.mjs` to `tests/js/run_series_math.mjs`, updating its import, its
  self-documenting run command and its final `ok` line. The assertions are unchanged.
- Rename the bar-indexing helpers in `web/indicators/ob-structure.js`: `mt5ToJs` → `sourceToJs`,
  `jsToMt5` → `jsToSource`, and the `*Mt5` locals (`confirmMt5`, `breakMt5`, `currentMt5`,
  `fbMt5`) to `*Src`, with a comment defining a "source index" as the newest-first bar number
  the source indicator uses. Arithmetic untouched.
- Rename the local helper `mt5_ema` in `tools/generate_macd_fixtures.py` to `sma_seeded_ema`.
- **Vendor the FVG reference EMA and stochastic into this repository** — `sma_seeded_ema` and
  `low_high_stochastic` in a new `tools/reference_math.py` — rather than importing `mt5_ema` /
  `mt5_stochastic` from the sibling reference repo, so not even an import line carries an
  MT5-named token. `tools/generate_fvg_fixtures.py` keeps importing `Bar`,
  `FvgParams` and `fvg_zones` from `../xtb-trading` — those names are already neutral and the
  zone sets must still come from the reference implementation. The vendored functions are proved
  equivalent by the fixtures regenerating byte-for-byte.
- Strip the port headers of source identity: `web/indicators/ob-structure.js`,
  `web/indicators/ob.js`, `web/indicators/macd.js`, `web/indicators/fvg.js` and the renamed
  `series-math.js` lose the `.mq5` file names, the `Version:` and `Hash:` lines, the
  `~/daytrading/mt5/...` paths and the `CalcEmaFromSeries in SimpleMACD.mq5` pointer. They keep
  saying that they port an external source indicator and what they deviate from.
- **Delete `OB_STRUCTURE_SOURCE`** (path, version, hash) from `web/indicators/ob-structure.js`,
  along with its import and re-export in `web/indicators/ob.js`. Nothing reads it — it is a
  provenance record with no consumer.
- Reword the platform vocabulary in comments, `README.md` and both affected specs: "MT5's
  forming bar" becomes the source indicator's forming bar, "ports of MQL5 indicators" becomes
  ports of an external source indicator, "no MT5 install" becomes no trading terminal, and the
  requirement headings that name the MT5 original or the SMCTrading source are renamed after the
  source indicator instead. The source platform's own API identifiers are paraphrased rather
  than quoted: `EMPTY_VALUE` becomes the source's empty value, `STO_LOWHIGH` becomes the
  source's low/high stochastic mode, `prev_calculated == 0` becomes a full recalculation.
- Reword the one backend mention outside the indicators: the unadjusted-price comment in
  `src/xtb_charts/fetch.py` and the matching sentence in the `market-data` spec, which cite
  "XTB and MT5" as the displays being matched.
- **Nothing is carved out.** After this change the only `mt5`/`mql5`/`metatrader`/`smctrading`
  hits left in the repository sit under `openspec/changes/**`, which is history.
- No behaviour changes. No committed fixture changes content, no tolerance is touched, and every
  existing test SHALL pass unchanged after the renames — the fixtures are regenerated only as
  proof that they come out byte-for-byte identical.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `indicators`: three requirement headings — "FVG signal parity with the MT5 original", "OB omits
  the MQL5 source's other SMC features" and "MACD parity with the MT5 original" — are renamed
  after the source indicator, and the platform vocabulary inside the FVG indicator, FVG parity,
  OB indicator, OB omissions, MACD indicator and MACD parity requirements is reworded, dropping
  the `.mq5` names and the v3.23 / v1.02 version markers that go with them. One substantive
  change, and it is why the OB deviations requirement is replaced rather than renamed: "OB
  deviations from the SMCTrading source" is removed and "OB deviations from the source indicator"
  added in its place, carrying the identical deviation list but without the paragraph mandating
  that the port record its source's path, version and content hash and without the "Source
  provenance is recorded" scenario. Everything else — the conventions, the deviation list, the
  thresholds and the remaining scenarios — is unchanged.
- `market-data`: the "Prices are stored unadjusted" requirement stops citing MT5 as one of the
  displays being matched. The storage rule itself is unchanged.

## Impact

- `web/indicators/mt5math.js` → `web/indicators/series-math.js`, with all three exports
  renamed. `web/indicators/fvg.js` and `web/indicators/macd.js` — imports, call sites and the
  `fvg.js` re-export. No numeric change in any of them.
- `web/indicators/ob-structure.js` — the two index helpers, their call sites and their locals,
  the header's source identity, and the deletion of `OB_STRUCTURE_SOURCE`. The algorithm is
  untouched.
- `web/indicators/ob.js` — header, the `OB_STRUCTURE_SOURCE` import and re-export, and
  `OB_PARAMS` comments.
- `tests/js/run_mt5math.mjs` → `tests/js/run_series_math.mjs`. `tests/js/run_fixtures.mjs` —
  import names, call sites and its header comment.
- `tools/generate_macd_fixtures.py` — identifier names and docstrings. New file
  `tools/reference_math.py` holding the vendored `sma_seeded_ema` / `low_high_stochastic`, and
  `tools/generate_fvg_fixtures.py` switched onto them, plus its docstring. Both generators must
  still reproduce their committed fixtures byte-for-byte.
- `src/xtb_charts/fetch.py` — one comment.
- `README.md` — the two test-command lines that name the renamed runner and an "MT5 export",
  the indicators intro, the FVG and OB descriptions (which name `FVGSignal.mq5` and
  `SMCTrading.mq5` v3.23 with its sha256 prefix), the OB forming-bar bullet, and the two
  MACD-fixture paragraphs that mention an MT5 install and a running MT5 terminal.
- `openspec/specs/indicators/spec.md`, `openspec/specs/market-data/spec.md` — via this change's
  delta specs, plus the `## Purpose` line of the indicators spec, which a delta cannot reach.
- Sequencing is settled: `verify-macd-parity-without-external-oracle` is archived and its
  wording is synced into `openspec/specs/indicators/spec.md`, so this change's MACD delta is
  written against the main spec as it stands today and nothing can resurrect the old wording.
- Explicitly out of scope, and not to be rewritten: `openspec/changes/archive/**`, which is the
  historical record of how the MT5 tooling was removed and where the OB port's recorded source
  path, version and hash remain readable; the user-level Cursor rule at
  `~/.cursor/rules/mt5-compilation.mdc`, which is outside this repository and describes a
  machine, not this project; and the sibling reference repo `../xtb-trading` itself, whose own
  API this change cannot rename — it stops importing the MT5-named half of it instead.
