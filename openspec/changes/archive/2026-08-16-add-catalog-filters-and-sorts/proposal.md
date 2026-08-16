## Why

The sidebar catalog has grown past the point where its three controls — free-text search, asset class, compatible-only — are enough to find an instrument. The list is otherwise fixed in catalog order or ordered by screening score, so questions the catalog can already answer ("which EUR instruments on XETRA?", "what has never been synced?", "show me it alphabetically") mean scrolling. Every field needed to answer them is already in the catalog payload the frontend loads; only the controls are missing.

## What Changes

- Add three filters to the sidebar, alongside the existing search, asset-class and compatible-only controls:
  - **quote currency** — the effective currency (the one compatibility is judged on), listed from the instruments actually loaded;
  - **exchange** — likewise listed from the loaded instruments;
  - **enabled only** — a checkbox hiding instruments whose catalog enabled flag is off.
- Add three sort orders to the existing order selector (currently "default order" and "sort by score"): **symbol A–Z**, **name A–Z**, and **recently synced** (never-synced instruments last).
- Add a **clear filters** control that returns every filter and the sort order to its default in one action, leaving the selected instrument, timeframe, indicators and display limit untouched.
- Show how much the filters are hiding: when any filter is narrowing the list, the sidebar summary reports the visible count against the catalog total.
- Persist the new filters and sort orders with the existing sidebar settings, and keep the established rule that an unusable stored value (an exchange or currency no longer present, an unknown sort order) falls back to its default without disturbing the rest of the restore.
- No filter or sort triggers a fetch, a sync, or a screener re-scan. All of them operate on data already loaded, as the existing filters do.

Assumption recorded, since the request named neither the specific filters nor the specific orders: the set above is the set derivable from fields the catalog payload already carries (`quote_currency`, `exchange`, `enabled`, `last_sync_utc`) without touching the backend or the catalog file. No filter over instrument type, point size or divisor is included — those are maintenance fields rather than things a user browses by.

## Non-goals

- Server-side filtering or sorting, or any new HTTP endpoint or query parameter.
- Changing the catalog file's schema or adding fields to the instrument payload.
- Filter or sort state that is shareable, URL-encoded, or synced between browsers.
- Reordering or restyling the screening content inside a row.

## Capabilities

### New Capabilities

None. The symbol browser is already specified under `charting`.

### Modified Capabilities

- `charting`: the **Symbol browser** requirement gains the new filters and sort orders, the clear-filters control, the visible-count reporting, and the rule that filtering and sorting never cause a fetch or a re-scan. The **User settings persist across reloads** requirement extends its list of persisted sidebar filters to the new ones and its fallback rule to values that no longer resolve against the loaded catalog.

## Impact

- `web/index.html`: two new selects, one new checkbox, one clear-filters control, and three new options in the sort selector.
- `web/app.js`: `visibleSymbols()` gains the new predicates and comparators; `populateAssetFilter()` generalises to populate the currency and exchange selects from loaded instruments; `renderSummary()` reports the visible count; the persist/restore wiring and change listeners cover the new controls.
- `web/settings.js`: new defaults and validation for the added filter fields and the widened set of valid sort orders.
- `web/styles.css`: layout for a filter row that now holds more controls.
- Tests covering settings restore and sidebar filtering.
- No backend change: `src/xtb_charts/` and the catalog file are untouched, and the offline-first rule is unaffected because no control added here reaches the network.
