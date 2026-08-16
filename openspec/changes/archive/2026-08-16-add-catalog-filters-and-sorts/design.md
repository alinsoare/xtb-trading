## Context

See proposal.md — Why. The constraints that shape the approach:

- The sidebar's filtering and ordering is one function, `visibleSymbols()` in `web/app.js`: it reads the three controls directly from the DOM, filters `state.symbols`, and applies the score order by decorating each item with its catalog index, sorting, and undecorating — the existing stability mechanism.
- Every field the new controls need is already in the instrument payload built by `src/xtb_charts/contract.py`: `quote_currency` (the *effective* currency, already reconciled against what the last sync observed), `catalog_currency` (the hand-typed one), `exchange`, `enabled` and `last_sync_utc`. Nothing here needs a backend change.
- `web/settings.js` holds all persisted settings in one versioned JSON object under one `localStorage` key. `readSettings` discards the *whole* object on a `SETTINGS_VERSION` mismatch; `restoreSettings` then validates field by field against `live` data (`symbols`, `timeframes`, `indicatorIds`) so one unusable field costs only itself. Today `sortOrder` is checked against `VALID_SORT_ORDERS`, while `search` and `assetClass` are accepted as any string.
- `populateAssetFilter()` already does exactly the work the two new selects need — collect distinct values from the loaded instruments, rebuild the options, restore the previously selected value — for one hardcoded field.
- The screener scan is deliberately independent of the sidebar controls: `accumulation-screener` requires that a scan is not re-run because the user filtered or selected. `onFilterChange()` re-renders only, and must stay that way.

## Goals / Non-Goals

**Goals:**

- Add the filters and orders as pure functions of already-loaded state, so the render path stays synchronous and fetch-free.
- Keep every order stable through the one mechanism already used for score, rather than per-order ad-hoc tie-breaking.
- Extend persisted settings without discarding what a returning user already has stored.
- Make a stale stored filter value unable to present an empty catalog.

**Non-Goals:**

- Refactoring `visibleSymbols()`, `renderList()` or the settings module beyond what the new controls need.
- A general-purpose query or facet abstraction; five named orders and six named filters do not warrant one.
- Multi-select filters, negation, or combining two sort keys.

## Decisions

**Keep `SETTINGS_VERSION` at 1 and extend `DEFAULT_SETTINGS` additively.** The new fields are new keys in the same object, and `restoreSettings` already substitutes a default for any key absent from stored data — so an object written before this change restores correctly, with the new filters at their defaults. Bumping the version would throw away the user's instrument, timeframe, indicators and display limit to gain nothing, because there is no old value here to reinterpret. The version stays available for a change that alters the *meaning* of an existing key. Trade-off accepted: version 1 now covers two shapes, distinguished only by presence of keys, which is exactly what the field-by-field restore is built to tolerate.

**Validate the three list-derived filters (asset class, quote currency, exchange) against values present among the loaded instruments, the way `symbol` is validated against the catalog.** `restoreSettings`'s `live` argument grows `assetClasses`, `currencies` and `exchanges`. Without this, a stored exchange that has since left the catalog restores into a select that cannot offer it, and the user sees an empty list with no visible cause — the failure the spec now forbids. This incidentally closes the same pre-existing gap for `assetClass`, which is accepted as any string today; treating all three alike is cheaper than preserving the inconsistency. Alternative rejected: reconciling the value in `app.js` after populating the selects, which would put settings validation in two places.

**One sort-order select with five options, backed by a comparator lookup keyed by the order's id.** The alternative — a sort-field select plus an ascending/descending toggle — doubles the controls and offers combinations nobody wants (score ascending, sync recency reversed). Each order's natural direction is fixed and named in its own option label ("symbol A–Z", "recently synced"), so direction never needs to be a separate control. An unknown id falls back to the catalog's default order, which is also what the settings restore does, so a stale stored order degrades identically wherever it arrives from.

**Apply the existing decorate-with-index / sort / undecorate wrapper to every order, not just score.** `Array.prototype.sort` is specified as stable in modern engines, but the catalog's default order is the *input* order only for the first sort; making the index an explicit final tie-break is what the spec's stability requirement actually says (ties keep their default relative order) and it is already the pattern in the file. So the change is to generalise the existing block to take a comparator rather than to add new sorting machinery.

**Sort never-synced instruments as an explicit partition, not as a sentinel timestamp.** `last_sync_utc` is `null` for an instrument that has never synced. Coercing null to 0 (oldest) or infinity (newest) both put unsynced instruments somewhere on the timeline, where they read as data rather than as absence. Partitioning — synced first by recency, unsynced after in default order — is what the spec requires and is unambiguous.

**Filter on `quote_currency`, never on `catalog_currency`.** `quote_currency` is the effective currency the backend already reconciled from what the last sync observed, and it is the value compatibility warnings are computed from. Filtering on the hand-typed catalog value would let a EUR filter admit an instrument the same list flags "not EUR" — two controls disagreeing about the same instrument.

**Compute the visible set once per render.** `renderList()` calls `visibleSymbols()` and `renderSummary()` needs its length. Rather than calling the function twice, `renderList()` records the count it rendered on `state` and the summary reads it, with the render order (list before summary) making that ordering explicit. Alternative rejected: passing the array between the two renderers, which couples them for one integer.

**Clear-filters resets to `DEFAULT_SETTINGS` values, through the same change path as a manual edit.** The control writes the default value into each control, then calls the existing `onFilterChange()`, so re-render and persistence happen exactly as they do when the user changes one control by hand. Nothing about chart state is referenced, which is what keeps the spec's promise that selection, timeframe, indicators and display limit survive.

## Risks / Trade-offs

- **The filter row now holds six controls and gets cramped in a narrow sidebar** → Lay it out as a wrapping grid in `web/styles.css` rather than one row; the controls are short labels and a checkbox each. Worth a visual check at the narrowest sidebar width the app is used at.
- **Alphabetical order of symbols and names is locale-sensitive** → Use `localeCompare` with no explicit locale, matching how the app already renders numbers and dates for the user's locale, and accept that ordering can differ between locales. The ordering only has to be stable within a session, not identical across machines.
- **A user who leaves enabled-only on may forget why a disabled instrument is missing, having previously relied on disabled instruments staying listed** → The visible-count reporting names the gap on every render, and clear-filters is one action away. Default is off, so nothing changes for a user who never touches it.
- **Six persisted filters make a restored state harder to reason about than three** → Each is validated independently and each has a visible control showing its value; the count report makes an unexpectedly short list self-explaining.
- **Adding options to the sort select could collide with a future screener change that also owns that control** → The comparator lookup keeps each order's logic in one place, so a new order is an entry rather than an edit to a branch chain.

## Migration Plan

No data migration, no server change, no release-format change. Settings written by the current release restore unchanged with the new filters at their defaults; settings written by this release restore under the current one, which ignores keys it does not know. Rollback is reverting the frontend files.
