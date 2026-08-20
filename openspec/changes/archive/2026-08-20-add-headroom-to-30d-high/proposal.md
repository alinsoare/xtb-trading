## Why

A catalog row reports two figures today — `30d range 40.0% · position 90.0%` — and neither answers the
question a user actually asks while scanning the list: *if this instrument returned to its 30-day high,
how much would I be up?* Answering it needs mental arithmetic on both figures at once, and the answer
does not follow either of them alone: a wide range near its top can leave less headroom than a narrow
range near its bottom. Every input is already in the screening result the row renders, so the figure is
a derivation, not new data.

At the same time the sort selector spends a slot on **recently synced**, an order that answers a
maintenance question ("what did I last fetch?") rather than a browsing one. Sync freshness is already
printed in every row, so the order is the least earned of the four.

## What Changes

- Add a third figure to every screened row's figures line, alongside the 30-day range and the position
  in it: the **headroom** to the 30-day high — how far the current price would have to rise, in percent
  of the current price, to reach the window's highest high.
- Keep both existing figures unchanged. Range and position keep their current meaning, wording, order
  and formatting; headroom is appended, not substituted.
- Compute headroom as `(highest high − current price) / current price`, from the same 30-day D1 window,
  the same highest high and the same current price the range and position figures and the eligibility
  gate already use. See the open question below: the request's worked example implies a different
  formula, and this one is what its stated intent ("max real % from current to top") means.
- Report headroom wherever range and position are reported — for every screened instrument, gated in or
  gated out — and withhold it exactly where those two are withheld: an instrument that was not screened
  or has insufficient history states that instead, as it does today.
- **BREAKING (user-visible control):** replace the **recently synced** sort order with a sort by
  headroom, highest first. The selector keeps five choices: default order, score, symbol A–Z, name A–Z,
  and the new headroom order. Instruments with no headroom figure sort after every instrument that has
  one, mirroring the rule that never-synced instruments sorted last.
- Invalidate cached screening results, so a result computed before headroom existed is recomputed rather
  than rendered with a blank third figure — the same treatment a renamed source label already gets.
- A stored sort order of `synced` becomes an unknown value and falls back to the default order on the
  next load. The existing persistence rule already covers this; no migration is added.
- Nothing here reaches the network: the figure is derived from already-loaded bars, and choosing the new
  sort order fetches nothing, syncs nothing and re-scans nothing.

## Settled decision — headroom formula

**Confirmed:** headroom is `(highest high − current price) / current price` — the actual percent return
from the current price to the 30-day high, measured over the current price.

For the worked example (low 100, high 140, price 136): range 40%, position 90%, headroom **2.9%**
being `(140 − 136) / 136`. This matches "max real % from current to top" and the pivot-distance
convention `(pivot high − price) / price`.

The alternative `range × (1 − position)` measured over the window's low (4.0% for the same example) was
considered and rejected.

## Non-goals

- Changing the eligibility gate, any scoring weight, the mark buckets or the source labels. Headroom is
  reported, never scored.
- Changing the 30-day window, the current-price convention or the definition of the range and position
  figures.
- Adding a *filter* (a control that hides rows) on headroom. The request called the replaced control a
  filter; the "recently synced" control is a sort order, and this change replaces it in kind.
- Presenting headroom as a target, an entry, a stop or a position size — the screener states facts.
- Any backend, payload or catalog-file change.

## Capabilities

### New Capabilities

None. Both the screening figures and the symbol browser are already specified.

### Modified Capabilities

- `accumulation-screener`: the screening gate requirement, which today defines the range and position
  figures a result reports, gains the headroom figure — its formula, the window and price it is derived
  from, when it is reported, and the rule that it never affects eligibility or score. The caching
  requirement gains the rule that results predating the figure are recomputed rather than shown
  incomplete.
- `charting`: the **Symbol browser** requirement gains the third figure in a row, and its sort list
  drops recency of last sync in favour of headroom, highest first, with the ordering of instruments that
  have no figure. The **User settings persist across reloads** requirement's set of valid sort orders
  changes with it.

## Impact

- `web/screener/range.js`: `computeRange` returns the headroom alongside `high`, `low`, `rangePct` and
  `positionPct` — it already holds both inputs.
- `web/screener/score.js`: carries the figure through every result shape, including the early returns
  for `not-screened`, `insufficient-history` and a failed gate.
- `web/screener/scan.js`: cache version bumped so cached results without the figure are discarded.
- `web/screener/render.js`: the figures line renders the third figure.
- `web/symbol-list.js`: the `synced` comparator is replaced by a headroom comparator reading the
  screening results already passed in; the sync comparator and its `last_sync_utc` reads go away.
- `web/settings.js`: `VALID_SORT_ORDERS` swaps `synced` for the new order.
- `web/index.html`: the sort selector's fifth option is replaced.
- `tests/js/`: screener range/score coverage for the new figure and its absent cases, symbol-list
  coverage for the new order, settings coverage for the changed valid set.
- No change under `src/xtb_charts/`, no change to the screening payload or the catalog file, and no new
  network call.
