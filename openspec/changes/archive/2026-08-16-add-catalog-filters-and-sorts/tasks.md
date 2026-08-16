## 1. Settings module

- [x] 1.1 In `web/settings.js`, extend `VALID_SORT_ORDERS` from `{"default", "score"}` to also hold `"symbol"`, `"name"` and `"synced"`, and no other order. Leave `DEFAULT_SORT_ORDER` at `"default"`.
- [x] 1.2 In `web/settings.js`, add `quoteCurrency: ""`, `exchange: ""` and `enabledOnly: false` to `DEFAULT_SETTINGS`, keeping the empty string as the "admit everything" value the existing `assetClass` already uses.
- [x] 1.3 Leave `SETTINGS_VERSION` at `1` and add a short comment at it recording why the new keys do not warrant a bump — see design.md, the version decision — so a later reader does not treat the omission as an oversight.
- [x] 1.4 In `restoreSettings`, read `assetClasses`, `currencies` and `exchanges` from the `live` argument (defaulting each to `[]`) and validate `assetClass`, `quoteCurrency` and `exchange` against them: keep the stored value only if the list holds it, otherwise fall back to the default. An empty stored value stays the default without consulting the list.
- [x] 1.5 In `restoreSettings`, validate `enabledOnly` as a boolean, exactly as `compatibleOnly` is validated.
- [x] 1.6 Confirm `readSettings` and `writeSettings` are untouched: the new fields ride in the same object under the same key.

## 2. Sidebar controls

- [x] 2.1 In `web/index.html`, add a quote-currency select (`id="currency-filter"`, first option "All currencies" with an empty value) and an exchange select (`id="exchange-filter"`, first option "All exchanges" with an empty value) inside the existing `.filters` block.
- [x] 2.2 In `web/index.html`, add an `enabled only` checkbox (`id="enabled-only"`) alongside the existing `compatible only` checkbox, using the same `label.check` markup.
- [x] 2.3 In `web/index.html`, add the three new options to `#sort-order`, after the existing two: `symbol` ("Symbol A–Z"), `name` ("Name A–Z") and `synced` ("Recently synced"). The option values must match the ids added in 1.1 exactly, and no bar-count option is offered.
- [x] 2.4 In `web/index.html`, add a clear-filters control (`id="clear-filters"`, a `button type="button"`) in the `.filters` block, labelled so its scope is obvious (filters and sort order, not the chart).
- [x] 2.5 In `web/styles.css`, lay the `.filters` block out as a wrapping grid so six controls fit a narrow sidebar without overflowing or forcing a horizontal scrollbar. Do not restyle the symbol rows or the screener content inside them.
- [x] 2.6 In `web/app.js`, register the four new elements in the `el` lookup: `currencyFilter`, `exchangeFilter`, `enabledOnly`, `clearFilters`.

## 3. Filtering and ordering

- [x] 3.1 In `web/app.js`, generalise `populateAssetFilter()` into a helper that fills a given select from a given field of `state.symbols` — distinct values, sorted, preceded by the existing "all" option, with the previously selected value reassigned afterwards — and call it for `asset_class`, `quote_currency` and `exchange`. Update the call site that runs after the catalog loads so all three selects are populated together.
- [x] 3.2 In `web/app.js`, extend the predicate in `visibleSymbols()` with the three new filters: quote currency matched against the payload's `quote_currency` (never `catalog_currency` — see design.md), exchange matched against `exchange`, and `enabledOnly` excluding instruments whose `enabled` flag is false. An empty select value must admit every instrument.
- [x] 3.3 In `web/app.js`, replace the score-only sort block with a comparator lookup keyed by sort-order id, covering `score`, `symbol`, `name` and `synced`, with `default` (and any unknown id) meaning no reordering. Route every order through the existing decorate-with-catalog-index / sort / undecorate wrapper so the index is the final tie-break for all of them.
- [x] 3.4 Implement the `symbol` and `name` comparators with `localeCompare` on `xtb_symbol` and on `name` respectively, ascending, treating a missing name as an empty string rather than throwing.
- [x] 3.5 Implement the `synced` comparator as: instruments with a `last_sync_utc` before every instrument without one, synced instruments most recent first, and unsynced instruments left to the index tie-break. Do not coerce a null sync time to a number.
- [x] 3.6 In `web/app.js`, have `renderList()` record the number of rows it rendered on `state`, and have `renderSummary()` read it — reporting "N of M instruments" while any filter is narrowing the list and the plain total otherwise, without calling `visibleSymbols()` a second time. Keep the existing bars total, flagged count and screening-progress text.
- [x] 3.7 In `web/app.js`, add a `clearFilters()` handler that writes each control back to its `DEFAULT_SETTINGS` value (search, asset class, currency, exchange, both checkboxes, sort order) and then calls the existing `onFilterChange()`. It must not touch `state.selected`, `state.timeframe`, `state.enabledIndicators` or `state.displayLimit`, and must not call `loadCandles()` or `startScreener()`.
- [x] 3.8 In `web/app.js`, add `change` listeners on the two new selects and the new checkbox, and a `click` listener on the clear-filters button, all routed through `onFilterChange()` / `clearFilters()`. Confirm `onFilterChange()` still only re-renders and persists — no fetch, no sync, no rescan.

## 4. Persistence wiring

- [x] 4.1 In `web/app.js`, extend `persist()` to write `quoteCurrency`, `exchange` and `enabledOnly` from their controls alongside the existing sidebar fields.
- [x] 4.2 In `web/app.js`, extend the `restoreSettings` call in `boot()` to pass `assetClasses`, `currencies` and `exchanges` collected from the loaded `state.symbols`, and assign the restored values to the three selects and the new checkbox after the selects have been populated, so a restored value is one the select can actually hold.
- [x] 4.3 Update or remove the comment at the asset-class assignment in `boot()` that says an unknown class silently leaves the select on "All classes" — the value is now validated in `restoreSettings`, so the comment would be describing behaviour that has moved.

## 5. Tests

- [x] 5.1 In `tests/js/run_settings.mjs`, assert the widened `VALID_SORT_ORDERS`: each of the four non-default orders restores as itself, and an unknown order — including `"bars"` — restores as `"default"`.
- [x] 5.2 In `tests/js/run_settings.mjs`, assert that a stored `assetClass`, `quoteCurrency` or `exchange` absent from the corresponding `live` list restores as the empty default, that one present restores as itself, and that a stale value in one field does not disturb the others.
- [x] 5.3 In `tests/js/run_settings.mjs`, assert that a settings object written without the new keys — the shape the previous release wrote, same version — restores with the new filters at their defaults and every pre-existing field intact.
- [x] 5.4 In `tests/js/run_settings.mjs`, assert `enabledOnly` restores as stored when boolean and as `false` for a non-boolean.
- [x] 5.5 Add Node coverage for the filter predicate and comparators. If they are still private to `web/app.js`, export them (or move them beside the other pure list helpers) so a harness can import them without a DOM, and add `tests/js/run_symbol_list.mjs` following the pattern of the existing harnesses.
- [x] 5.6 In that harness, cover: each new filter in isolation; two filters combining; the currency filter refusing an instrument whose effective currency differs from its catalog currency; each of the four orders; equal-key ties keeping catalog order; and never-synced instruments landing after every synced one under the `synced` order.
- [x] 5.7 Run `node tests/js/run_settings.mjs`, the new harness, and every other entrypoint under `tests/js/` — `run_render.mjs` and `run_screener.mjs` especially, since the sidebar row markup must be untouched — and confirm all pass.
- [x] 5.8 Run the Python test suite and confirm it is unaffected; no file under `src/xtb_charts/` should have changed.

## 6. Verification

Manual smoke checks in the browser, after the automated tests pass.

- [x] 6.1 Load the app and confirm the six filter controls and the clear-filters button all fit the sidebar without overflow.
- [x] 6.2 Open the currency and exchange filters, confirm they offer only values the catalog holds, and confirm picking one narrows the list.
- [x] 6.3 Toggle `enabled only` on and off and confirm disabled instruments leave and return.
- [x] 6.4 With a filter active, confirm the summary reads "N of M instruments".
- [x] 6.5 Step through the three new sort orders and confirm each ordering matches its label, and that no bar-count order is offered.
- [x] 6.6 Press clear filters and confirm the filters and sort order reset while the chart stays as it was.
- [x] 6.7 Reload and confirm the filters and sort order are restored.
- [x] 6.8 Change a filter and confirm the screener marks stay put — no re-scan and no progress text.
