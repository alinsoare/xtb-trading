## 1. Verify the starting point

- [x] 1.1 Confirm `verify-macd-parity-without-external-oracle` is archived (its directory sits under `openspec/changes/archive/`) and that `openspec/specs/indicators/spec.md` already carries its in-repo-generator wording. Both were true when this change was planned, so there is no ordering gate: this change's MACD delta is written against the main spec as it stands. If either turns out to be false, stop — the delta will not apply cleanly
- [x] 1.2 Record the starting inventory: `rg -n -i "mt5|mql5|metatrader|smctrading|\.mq5" --glob '!openspec/changes/**'` — keep the output to check against at the end. Confirm the working tree is otherwise clean enough that this change's diff will be readable

## 2. Rename the shared math module

- [x] 2.1 `git mv web/indicators/mt5math.js web/indicators/series-math.js`
- [x] 2.2 Rename its exports in place: `mt5Ema` → `smaSeededEma`, `mt5EmaFromSeries` → `smaSeededEmaFromSeries`, `mt5Stochastic` → `lowHighStochastic`. Do not touch a single line of arithmetic
- [x] 2.3 Rewrite the module header to state the conventions without the platform and without naming a source file: the EMA is seeded with the SMA of the first `period` values (not a first-value seed — with EMA 377 the difference persists long enough to alter signals); the stochastic is the source's low/high mode, rolling extremes with SMA slowing; warm-up regions are NaN, standing in for the source's empty value. The `CalcEmaFromSeries in SimpleMACD.mq5` pointer on `smaSeededEmaFromSeries` goes — say what the function does (seed at `firstValidIndex + period − 1`) instead of where it came from
- [x] 2.4 Update `web/indicators/fvg.js`: the import, the three call sites, and the `export { … }` re-export at the bottom that its tests read. Strip its header of `FVGSignal.mq5` and any recorded source path, and reword the forming-bar and "MQL5 inputs" comments — the header keeps saying it is a port of an external source indicator and what it deviates from
- [x] 2.5 Update `web/indicators/macd.js`: the import and its two call sites. Strip its header of `SimpleMACD.mq5`, the `Version: 1.02` line and the `~/daytrading/mt5/...` source path
- [x] 2.6 `git mv tests/js/run_mt5math.mjs tests/js/run_series_math.mjs`, update its import, the run command in its own header comment, and its closing `ok` line. Leave every assertion and every expected number alone
- [x] 2.7 Run `node tests/js/run_series_math.mjs`, `node tests/js/run_fixtures.mjs`, `node tests/js/run_space_fixtures.mjs` and `node tests/js/run_macd_fixtures.mjs` — all must pass with no fixture regenerated

## 3. Rename the OB index helpers and drop the recorded source

- [x] 3.1 In `web/indicators/ob-structure.js` rename `mt5ToJs` → `sourceToJs` and `jsToMt5` → `jsToSource`, and add a one-line comment defining a "source index" as the newest-first bar number the source indicator uses (bar 0 is the newest)
- [x] 3.2 Rename the `*Mt5` locals to `*Src` at every call site: `confirmMt5`, `breakMt5`, `currentMt5`, `fbMt5`. The arithmetic, the loop bounds and the `pivotBars` offsets stay exactly as they are
- [x] 3.3 Delete the `OB_STRUCTURE_SOURCE` constant from `web/indicators/ob-structure.js` together with its import and re-export in `web/indicators/ob.js`. Confirm first that nothing else reads it (`rg -n "OB_STRUCTURE_SOURCE"` should show only those three sites), so the deletion cannot change behaviour
- [x] 3.4 Strip `web/indicators/ob-structure.js`'s header of `SMCTrading.mq5`, the `Version:` and `Hash:` lines and the source path, and reword its platform vocabulary — the "plays MT5's forming bar" sentence and the "equivalent to MT5 prev_calculated == 0" note, the latter becoming a full recalculation from the whole displayed series
- [x] 3.5 Do the same to `web/indicators/ob.js`: strip the header's source file name, version, hash and path, and reword the `OB_PARAMS` deviation notes that say "MT5 defaults", "MT5's structure seeds from" and "MT5 itself". The six deviations themselves stay exactly as they are — they are what the spec makes normative now that the provenance record is gone
- [x] 3.6 Run `node tests/js/run_fixtures.mjs` and `node tests/js/run_render.mjs` and `node tests/js/run_scan_cache.mjs`; confirm no OB behaviour moved

## 4. Fixture generators and the backend comment

- [x] 4.1 In `tools/generate_macd_fixtures.py` rename the locally defined `mt5_ema` to `sma_seeded_ema` and update its four call sites
- [x] 4.2 Add `tools/reference_math.py` holding `sma_seeded_ema` and `low_high_stochastic`, transcribed from the sibling reference repo's `mt5_ema` / `mt5_stochastic` in `../xtb-trading`: same NumPy array in and out, same SMA seeding, same slowing, same NaN warm-up regions. Its docstring SHALL say it is a vendored copy of the reference implementation kept in this repository so no vendor-named symbol is imported, and that the committed FVG fixtures are what proves the two still agree
- [x] 4.3 Point `tools/generate_fvg_fixtures.py` at the vendored functions: drop `mt5_ema` and `mt5_stochastic` from the `xtb_trading.indicators` import and update the two call sites. Keep importing `Bar`, `FvgParams` and `fvg_zones` from the sibling repo — those names are already neutral, and the fixture zone sets must keep coming from the reference implementation rather than from a copy. Reword the "MT5-seeded EMA arrays" line in the docstring to name the seeding
- [x] 4.4 Reword the header comment of `tests/js/run_fixtures.mjs` ("MT5-seeded EMA arrays") to name the seeding rather than the platform
- [x] 4.5 Reword the `auto_adjust=False` comment in `src/xtb_charts/fetch.py` so it cites what a broker's platform displays rather than "XTB and MT5"
- [x] 4.6 Regenerate both fixture sets (`uv run python tools/generate_fvg_fixtures.py`, `uv run python tools/generate_macd_fixtures.py`) and assert `git diff --exit-code tests/fixtures/` is clean. For the FVG fixtures this is the equivalence proof for the vendored functions — they record the EMA and stochastic arrays themselves, so any divergence in seeding, warm-up length or slowing shows up here. A diff means stop and fix rather than committing a new fixture

## 5. Documentation

- [x] 5.1 In `README.md`'s test list, rename the `run_mt5math.mjs` line to `run_series_math.mjs` with a description that names the shared EMA/stochastic helpers instead of MT5, and drop "vs MT5 export" from the `run_macd_fixtures.mjs` line — the export no longer exists
- [x] 5.2 Reword the indicators intro ("Both are ports of MQL5 indicators…") to say they are ports of external source indicators, noting that three indicators now exist rather than two if that sentence still says "Both"
- [x] 5.3 Drop the source identity from the FVG and OB descriptions: "ported from `FVGSignal.mq5`", "ported from `SMCTrading.mq5` v3.23 (sha256 `484d821d…`)" and "Six deliberate deviations from `SMCTrading.mq5`" all become references to the source indicator. The deviations themselves, the zone descriptions and the parity caveats stay
- [x] 5.4 Reword the OB bullet "stands in for MT5's forming bar" and the "Regenerating the MACD fixtures" paragraphs that mention "no MT5 install" and "a running MT5 terminal"
- [x] 5.5 Re-read the changed README sections end to end and confirm they still read as instructions to a contributor who has never used a trading terminal

## 6. Specs

- [x] 6.1 Apply the `indicators` delta to `openspec/specs/indicators/spec.md`: the three heading renames (FVG parity, OB omissions, MACD parity) and the reworded bodies of the FVG indicator, FVG parity, OB indicator, OB omissions, MACD indicator and MACD parity requirements. Copy from the delta rather than re-deriving the wording
- [x] 6.2 Replace `OB deviations from the SMCTrading source` with the delta's `OB deviations from the source indicator` — a removal plus an addition, not a rename, because the requirement loses the paragraph requiring path, version and content hash to be recorded and loses the `Source provenance is recorded` scenario (a scenario about the deviations being recorded where the parameters are takes its place). Confirm the old heading appears nowhere in the main spec afterwards. This is the change's one substantive spec edit; everything else is wording
- [x] 6.3 Apply the `market-data` delta to `openspec/specs/market-data/spec.md`: the "Prices are stored unadjusted" requirement
- [x] 6.4 Edit the `## Purpose` line of `openspec/specs/indicators/spec.md` directly — it names "the original MQL5 indicator" and a delta cannot reach a Purpose. Name no source file: signal parity is with the external source indicator the scanner is ported from
- [x] 6.5 Run `openspec validate --all --strict`

## 7. Final gates

- [x] 7.1 Re-run the inventory grep from 1.2. It must come back **empty** — there is no allowlist. Every hit outside `openspec/changes/**` is unfinished work, including `.mq5` file names, version markers, the sha256, recorded `~/daytrading/mt5/...` paths and any import line
- [x] 7.2 Confirm no `mt5`-named identifier is defined, imported or called anywhere: `rg -n "mt5[A-Za-z_]*" web tests tools src` returns nothing
- [x] 7.3 Run the full suite: `uv run pytest` plus every runner in `tests/js/` — none may fail and no fixture may change
- [x] 7.4 Start `uv run xtb-charts serve`, enable FVG, OB and MACD on a fully synced instrument, and confirm zones, pivot labels and the MACD pane render as before. The JS has no build step, so a missed call site surfaces only here
- [x] 7.5 Do not commit or archive: leave the change for review. The provenance record and the spec requirement that mandated it are gone from the active tree, and `openspec/changes/archive/**` becomes the only place the ports' origin can be reconstructed — worth a deliberate look before it lands
