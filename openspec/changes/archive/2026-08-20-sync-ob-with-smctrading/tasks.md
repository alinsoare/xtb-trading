## 1. Audit the port against the current source

- [x] 1.1 Record the current `sha256` of `/home/alin/daytrading/mt5/indicators/SMCTrading.mq5` and confirm it is still `484d821dff2081a56c081331e9897fc1837e21cff800c4e74930266a35faf8a7`; if it has moved again, use the new hash throughout and note it in the audit
- [x] 1.2 Read `.cursor/rules/smctrading-indicator.mdc` section by section and, for each OB-relevant section (structural break classification, break-bar marker, `UpdateTrendFromPivots` guard, wick-bar exclusion, Order Block detection, boundary gate, BOS-context pending pass), check the corresponding code in `web/indicators/ob-structure.js` and `web/indicators/ob.js` against the source function it ports
- [x] 1.3 Write the audit result as a short divergence list in the change directory (working note, not an artifact to keep): for each finding, the source function, the port site, whether it changes output, and whether it is a defect or an already-sanctioned deviation
- [x] 1.4 Confirm the audit reproduces the four divergences this change already anticipates — stale source hash, same-type collapse guard plus label bookkeeping, live extreme kept after failing containment, live-swing validity fast path not requiring an active break — and treat anything else found as a new finding to resolve before coding
- [x] 1.5 Confirm no finding requires modelling the source's incremental per-bar path; if one does, stop and raise it, because the specs scope parity to the fresh-load path

## 2. Break state and classification

- [x] 2.1 In `web/indicators/ob-structure.js`, reduce the break state to the swing direction, the active-break flags (`bosOccurred`, `bosSameTypeOccurred`), the pivot count and `lastBreakBarTime`; remove `lastStructEventPivotCount`, `hasLastStructEvent` and `lastStructEventIsBOS`
- [x] 2.2 Rewrite `handleStructuralBreak` to take the broken level alongside the bar time and direction, classify the break from one comparison of the break direction against the pre-break swing direction, update the direction on a reversal or a first break only, and advance `lastBreakBarTime` whenever the break bar is newer — with no early return before that advance
- [x] 2.3 Note at the level parameter that it is carried to mirror the source's break sites and is read by no guard the port keeps
- [x] 2.4 Pass the level at every break site: in `initializeBasePivots`, the last confirmed high for an up break and the last low for a down break, matching the source's case-1/case-2 arguments; in `checkStructureBreak`, the previous same-type level it already computes
- [x] 2.5 Confirm the port still never recomputes the swing direction from confirmed pivots while a break is active, and add a comment at each `updateTrendFromPivots` call site stating why that site is safe
- [x] 2.6 Confirm the state resets that correspond to the source's `prev_calculated == 0` block still cover every field the reduced state keeps

## 3. Pending-swing fidelity

- [x] 3.1 In `checkPivotConfirmation`, discard the pending extreme when it fails structure containment — clear it rather than returning with it intact — so no live swing is scanned and no break is registered from it, matching the source
- [x] 3.2 Make the returned structure reflect that discard, so `obZones` sees no pending pivot in that case
- [x] 3.3 In `getObValidityEndTime` in `web/indicators/ob.js`, require an active break for the pending-swing open-ended fast path, matching the source's condition
- [x] 3.4 Note at both sites that they are unreachable through the current search path and are aligned with the source deliberately

## 4. Draw demand zones only

- [x] 4.1 In the registered `compute` in `web/indicators/ob.js`, emit a rectangle and an `OB` label only for zones whose direction is demand; skip supply zones without altering the zone list `obZones` returns
- [x] 4.2 Leave `obZones`, `detectBetweenPivots` and the validity computation detecting and describing both directions, including each supply zone's `direction`, prices, `time_to` and `open` flag
- [x] 4.3 Leave the confirmed-pivot `H` and `L` label emission untouched — both types keep their labels
- [x] 4.4 Leave `ZONE_PALETTE` and `web/indicators/palette.js` unchanged, since FVG still draws in both directions

## 5. Provenance and documentation

- [x] 5.1 Update `OB_STRUCTURE_SOURCE` in `web/indicators/ob-structure.js` to the audited hash, keeping path and version
- [x] 5.2 Update the header comment hash in `web/indicators/ob.js` to match, and extend its sanctioned-deviation list with the show-history switch, the trend-bias filter, demand-only rendering, and the fresh-load-path-only scope
- [x] 5.3 Update the OB section of `README.md`: demand zones only on the chart, supply detected for parity, the deviation list, and the source hash if it is quoted there
- [x] 5.4 Confirm no skip-window parameter, server-time offset or show-history flag was introduced anywhere by this change

## 6. Verify against the existing fixture

- [x] 6.1 Run `node tests/js/run_ob_fixtures.mjs` and confirm it still passes: the demand and supply algorithm is not meant to change, so a failure here is a regression from sections 2 or 3
- [x] 6.2 Run the remaining scripts under `tests/js/` and the Python suite (`uv run pytest`) and confirm nothing regressed
- [x] 6.3 If `tests/js/run_ob_fixtures.mjs` does not already compare a fixture's `source.hash` against the port's recorded hash, add that check so a drifted source fails loudly

## 7. Regenerate the MT5 oracle and confirm parity

- [x] 7.1 In the MT5-Testing install, open the XAUUSD D1 chart, attach `SMCTrading` with `InpShowHistory = true`, force a full recalculation, and run `ExportOBOracle`
- [x] 7.2 Regenerate the fixture with `uv run python tools/generate_ob_fixtures.py` and confirm `tests/fixtures/ob/xauusd-d1.json` now carries the audited source hash
- [x] 7.3 Run `node tests/js/run_ob_fixtures.mjs` against the regenerated fixture and confirm the pivot sequence (times, types, confirmation times, impulse classification) matches exactly and the detected zones match in both directions, prices within tolerance
- [x] 7.4 For any mismatch, fix the port to the current source; if a mismatch is a source behaviour that should not be adopted, add it to the sanctioned-deviation list in `OB_PARAMS` with its reason and reflect it in the parity requirement rather than leaving it undocumented
- [x] 7.5 Confirm closed zones' validity end times match exactly and zones open at export time are compared as open

## 8. Confirm on the chart

- [x] 8.1 With `OB` enabled on a D1 chart, confirm every rectangle drawn is a demand rectangle in the palette's demand colour and no supply rectangle or supply `OB` label appears anywhere in the history
- [x] 8.2 Confirm demand zones still span low to high from their own bar, are filled at 50% opacity with no border, carry a full-strength `OB` label, and end where they did before this change
- [x] 8.3 Confirm demand zones deep in history are still drawn, including zones on swings opposing the newest swing direction, so neither a history nor a trend-bias filter crept in
- [x] 8.4 Confirm the `H` and `L` pivot labels are unchanged, and that a demand zone whose swing starts at a pivot low still shows that `L`
- [x] 8.5 Enable `FVG` alongside `OB` and confirm bearish FVG zones still draw in the supply colour
- [x] 8.6 Check a series short enough to trigger the insufficient-history and "no confirmed swing structure" warnings and confirm both still appear with nothing drawn
- [x] 8.7 Check one intraday timeframe (for example M15) and confirm demand-only rendering and full history hold there too, with parity still out of scope below H4
