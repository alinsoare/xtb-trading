## 1. The space predicate

- [x] 1.1 Add the close-to-open-space predicate to `web/indicators/fvg.js`: given two adjacent bars, return whether the later carries a space, per the same-type (neutral borrows the other's type, two neutrals produce nothing) and opening-beyond conditions
- [x] 1.2 Add the two derived measures beside it — a bar's space-extended body (`|close - previous close|` when it carries a space, its recorded body otherwise) and its space-extended range (recorded range widened to cover the space) — each taking the series and an index so the first bar is handled without a special case at every call site
- [x] 1.3 Document the rule where the file already documents the dropped bar-limit cap: what a space is, why displacement is measured this way, and that the zone deliberately is not affected

## 2. Rule changes in the scanner

- [x] 2.1 Body dominance: compare space-extended bodies for all three bars instead of recorded bodies
- [x] 2.2 Bar3 wick limit: scale the configured multiple off bar3's space-extended body, leaving the wick measurement itself unchanged
- [x] 2.3 Gap ratio: compare the gap against bar2's space-extended range
- [x] 2.4 Confirm by inspection that nothing else reads a body or a range — the gap, both zone edges, the stair-step test, the stochastic, the minimum height, and the rectangle and label placement must all still read recorded prices

## 3. Fixtures for the space rules

- [x] 3.1 Verify the four committed fixtures under `tests/fixtures/fvg/` still pass unchanged after the rule changes (they contain no spaces, so they should be inert); if any zone set moves, stop and reconcile before continuing
- [x] 3.2 Build a hand-checked bar series covering each case with its expected outcome stated: bullish space, bearish space, overlapping bodies producing no space, opposite types producing no space, a neutral bar borrowing its neighbour's type, and the dead-flat-bar boundary where a neutral run meets a real bar
- [x] 3.3 Include a triplet that fails body dominance today and passes only once spaces are counted, and one that passes today and fails once bar1's or bar3's space is counted — the two directions the change moves signals in
- [x] 3.4 Extend the fixture runner (or add a sibling runner) to check the new set, keeping each case's assertion named after the rule it exercises rather than comparing one opaque golden blob

## 4. Verification on real data

- [x] 4.1 Run the scanner over several fully synced symbols and timeframes before and after, and record the zone counts and the added/removed zones per series
- [x] 4.2 Inspect on a real chart a sample of the zones that disappear — the losses come from bar1 or bar3 gaining the larger extended body — and confirm each looks like a pattern that should not have qualified
- [x] 4.3 Confirm rectangles and labels still sit correctly against the candles, since zone geometry was not meant to move at all

## 5. Specs and documentation

- [x] 5.1 Update `README.md` if it describes the FVG rules
- [x] 5.2 Re-read the delta spec against the implemented behaviour and correct either one where they disagree
- [x] 5.3 Run `openspec validate --strict` for the change
