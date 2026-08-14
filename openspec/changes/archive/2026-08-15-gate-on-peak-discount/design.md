## Context

See proposal.md — Why. The gate lives in one place: `scoreInstrument()` in
`web/screener/score.js` reads `rangePct` and `positionPct` from `computeRange()`
(`web/screener/range.js`), which already computes and returns the 30-day window's `high` and
`low` alongside them. So the new condition needs no new computation, only a different field of
an existing result. Scores are cached in browser storage keyed on per-instrument sync times plus
a `SCAN_CACHE_VERSION` (`web/screener/scan.js`), and the screening gate is asserted by constant
and by fixture in the node harness `tests/js/run_screener.mjs`.

## Goals / Non-Goals

**Goals:**

- Express the new condition as a named constant, consistent with the existing rule that every
  screening threshold is tunable without editing logic.
- Ensure users see marks recomputed under the new gate on their next load, not cached marks from
  the old one.

**Non-Goals:**

- No change to the signals, weights, mark buckets, payload, exporter or sidebar layout.
- No new displayed figure for the discount from the peak.

## Decisions

- **Keep the ≥ 3% range condition.** The user's request named only the position condition. The
  range floor answers a different question — is this instrument moving enough to be worth
  flagging — and the discount rule does not subsume it: a range of 2.5% can still contain a
  price 2% under its peak. Alternative considered: drop the range floor as redundant, rejected
  because it would silently widen the gate beyond the request.
- **Compare against the peak, not a derived percentage.** Gate on `price < high * (1 - DISCOUNT)`
  using the window `high` that `computeRange()` already returns, rather than deriving a new
  "discount from peak" percentage and comparing that. One multiplication, no extra field to
  thread through result objects, and the boundary case is unambiguous. If a discount percentage
  is wanted later for display, it can be added then.
- **Strict inequality at the boundary.** The request wrote `<`, so a price exactly at
  `high × 0.98` gates out. Consistent with the spec scenario for the boundary.
- **Replace `GATE_MAX_POSITION_PCT` rather than keep it unused.** The constant would otherwise
  read as a live threshold that nothing enforces. The new constant is a peak-discount fraction
  (0.02).
- **Keep `positionPct` computed and displayed.** It remains useful context for the user reading
  a row, and removing it would change the sidebar for no benefit. It simply no longer feeds the
  gate. Assumption recorded: the sidebar's "30d range X% · position Y%" text stays byte-for-byte
  as it is today.
- **Bump `SCAN_CACHE_VERSION` to invalidate stored scores once.** The cache key covers sync
  freshness, not screener logic, so without a bump a user who has not synced would keep seeing
  marks computed under the old gate indefinitely. A version bump is the mechanism the cache
  already has for exactly this; it costs one recompute on the next load. Alternative considered:
  fold the gate constants into the cache key, rejected as more machinery than a one-off logic
  change needs.

## Risks / Trade-offs

- More instruments pass the gate, so more rows carry marks and the mark loses some of its
  scarcity → the range floor and the four signals still have to fire for a score above zero;
  the gate only decides who gets scored.
- An instrument can now gate in while sitting near the top of a wide range, which is the
  opposite of "low in its range" → intended: the peak is the reference point the user wants.
  The pivot-distance signal still rewards room to the upside, so such an instrument tends to
  score lower rather than being flagged strongly.
- The position figure shown in the sidebar no longer explains why a row has no mark → accepted
  for now; the range figure and the price relative to the visible 30-day high still make it
  readable on the chart. Revisit only if the user asks for the discount to be displayed.
