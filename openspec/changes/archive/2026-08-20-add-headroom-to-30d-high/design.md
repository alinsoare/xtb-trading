## Context

See `proposal.md` — Why. The design-relevant state of the code:

- `web/screener/range.js` computes the 30-day window in one place, already returning `high`, `low`,
  `rangePct = (high − low) / low` and `positionPct = (price − low) / (high − low)`. It already holds both
  inputs the headroom needs, and it already handles the degenerate cases (no bars, no price, no bar in
  the window, zero span) by returning nulls.
- `web/screener/score.js` threads the figures through every result shape it can return, including four
  early returns (`not-screened`, `insufficient-history`, gate failure, and per-signal insufficiency).
- `web/screener/render.js` prints the figures line; `web/symbol-list.js` holds the pure comparators and
  already receives the screening results as an argument (`sortSymbols(symbols, sortOrder, screenerScores)`).
- `web/settings.js` gates valid sort orders through `VALID_SORT_ORDERS`, and `restoreSettings` already
  falls back to the default for any order not in that set.
- `web/screener/scan.js` caches results in `localStorage` under a version constant, discarding anything
  written under a different version.

The shape of the change is therefore additive at every layer except the comparator, which is a swap.

## Goals / Non-Goals

**Goals**

- One definition of the headroom, in the same module that defines the range and the position, so the
  three figures can never disagree about the window or the price.
- Absence stays representable end to end: a null figure must survive the cache, the renderer and the
  comparator without becoming a zero.
- The sort-order swap leaves no dead `synced` path behind — not in the comparator table, not in the
  valid set, not in the markup.

**Non-Goals**

- Recomputing anything on the backend or adding a field to the screening payload. The figure is derived
  in the browser from bars already loaded.
- Reworking the figures line's layout beyond adding a third figure to it.

## Decisions

### The headroom is measured over the current price, not over the window's low

`headroom = (high − price) / price`, computed in `computeRange` from the same `high` and `price` it
already uses for the range and the position.

*Why:* the request asks for the "max real % from current to top". The real percentage gain from holding
at today's price to the 30-day high is measured against today's price. This also matches the only other
distance-to-a-high figure in the screener — the pivot-distance rule scores `(pivot high − price) / price`
— so two "distance up to a high" numbers in the same product are measured the same way.

*Alternative considered:* `rangePct × (1 − positionPct)`, the headroom expressed in units of the range and
therefore measured over the window's low. It has the property that a user can check it by eye against the
two printed figures ("10% of 40% is 4%"), which is worth something for a figure whose whole purpose is to
save mental arithmetic. Rejected because it is a percentage of a price nobody is trading at, and it
overstates the gain whenever price sits above the low — for the request's own example, 4.0% against a real
2.9%.

*Alternative rejected outright:* the request's worked example, `(100 − position) × (100 − range)`. See
`proposal.md` — Open question. It is dimensionally meaningless and inverts the ranking for volatile
instruments.

Because this is the one decision the request states two ways, it is called out in the proposal as needing
confirmation. Everything else in this design holds under either of the two live candidates: only the
expression inside `computeRange` and the arithmetic in the range/score tests would differ.

### Named "headroom", in the row and in the sort selector

The row's figures line reads `30d range 40.0% · position 90.0% · headroom 2.9%`, and the sort selector's
fifth option — the slot "Recently synced" occupied — reads **Most headroom**.

*Why:* the sidebar's figures are terse, lower-case and unpunctuated, and "headroom" is one word that
already means "distance to the ceiling" without needing a unit or a direction. The persisted setting value
is `headroom`, matching the existing one-word values (`score`, `symbol`, `name`).

*Alternatives considered:* "upside" (reads as a forecast, and the screener is forbidden from implying
one); "to high" / "room to high" (two words, and ambiguous about which high); "potential" (a
recommendation by another name).

### The figure lives in the screening result, not in the row

`computeRange` returns it, `scoreInstrument` carries it in every result shape including the early returns,
and the row and the comparator both read it from the result.

*Why:* the alternative — deriving it in the renderer and again in the comparator from `rangePct` and
`positionPct` — would put the formula in two places and reconstruct it from two rounded-looking figures.
It would also be impossible in the `insufficient-history` and gate-failure paths without duplicating the
window logic. Carrying one more field is cheaper than carrying the formula twice.

### Absence is `null`, and the comparator sorts nulls last explicitly

The comparator ranks by descending headroom with an explicit null-last branch, exactly as `compareSynced`
does today for a missing `last_sync_utc`, rather than defaulting a missing figure to `0` or `-Infinity`.

*Why:* `compareScore` can safely default to `0` because a missing score genuinely means "scored nothing".
A missing headroom means "not measurable", which is a different thing from "no room", and the specs require
it to sort after every measurable instrument — including after a *negative* headroom. A numeric sentinel
cannot express that ordering, since any sentinel is comparable to a real value.

Stability comes free: `sortWithIndex` already carries the original index as the tiebreaker.

### The scan cache version is bumped rather than migrated

`SCAN_CACHE_VERSION` goes 6 → 7, discarding every cached result written before the figure existed.

*Why:* a cache entry from the previous version has no headroom field, and reusing it would render rows
with a blank third figure and sort them last for no visible reason. The precedent is the source-rename
change, whose spec already requires a carried-over result to be recomputed rather than displayed stale.
Recomputation is local, needs no sync, and the cache is per-browser, so the cost is one scan on first load.

### No migration for the persisted `synced` sort order

`VALID_SORT_ORDERS` drops `synced` and gains `headroom`; `restoreSettings` then treats a stored `synced`
as unknown and falls back to `DEFAULT_SORT_ORDER`. No settings version bump, no mapping table.

*Why:* `SETTINGS_VERSION` stays 1 because the existing per-field fallback already handles exactly this
case, and bumping the version would discard the user's whole settings object — instrument, timeframe,
indicators, display limit — to fix one field. Mapping `synced` onto `headroom` was considered and
rejected: silently sorting by a different metric than the user chose is worse than returning to the
default order.

## Risks / Trade-offs

- **The formula may be the wrong one of the two candidates** → It is isolated to one expression in
  `computeRange` and to the expected values in its tests; the proposal flags it as needing confirmation
  before implementation starts, so the correction costs one line plus fixture arithmetic.
- **Users lose the sync-recency order** → Sync freshness is still printed in every row ("N bars · 3h ago"
  or "never synced"), so the information survives even though the ordering does not. Recording it here as
  a deliberate loss: the request asked for the replacement.
- **A third figure lengthens the figures line and may wrap in a narrow sidebar** → The line already wraps
  (`.screener-figures` sits in a flexible row); the tasks include checking the wrap at the sidebar's
  current width rather than assuming it.
- **Negative headroom looks like a bug to a user who has not read this** → It is rare (it needs the
  intraday price above the 30-day high) and it is the honest reading of the data. Clamping it to zero
  would make an instrument at a new high indistinguishable from one exactly at the window high.
- **The formula's denominator can be zero for a zero price** → `computeRange` already returns nulls
  whenever it lacks a usable price or span; the headroom is computed on the same guarded path, so it is
  null in the same cases rather than infinite.

## Migration Plan

None beyond the two version-shaped effects above: the scan cache invalidates itself on first load after
deployment, and a persisted `synced` sort order falls back to the default order on the same load. Rollback
is a revert — an older build discards the newer cache by the same version check, and `headroom` becomes the
unknown sort order that falls back to the default.
