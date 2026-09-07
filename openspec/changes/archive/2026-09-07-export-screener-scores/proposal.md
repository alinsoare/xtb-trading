## Why

The accumulation screener only ever scores instruments inside the browser at page load, and the result lives in memory/localStorage — it is never written to disk. External tools that want the same screening facts (in particular the `xtb-reports` dashboard, which ranks XTB account holdings and plans averaging-down ladders) currently have no way to get them except by re-implementing the FVG/OB/MACD/distance rules against `data/scan-bars.json` themselves. That duplicates non-trivial logic in a second language and will drift from `score.js` the first time a rule changes. Exporting the already-computed result as a static JSON file removes the duplication and gives any consumer — `xtb-reports` or a plain `curl` — the same facts the sidebar shows, with no new fetch, API, or scoring logic.

## What Changes

- Add a new exported artifact `data/screener-scores.json`, containing one entry per **catalog** symbol (enabled and disabled) keyed by `xtb_symbol`, carrying exactly what `scoreInstrument()` in `web/screener/score.js` returns: `status`, `score`, `marks`, `reasons` (`rule`, `points`, `source`), `rangePct`, `positionPct`, `headroomPct`.
- File-level metadata: `generated_utc` (aligned with the same snapshot as `catalog.json`/`scan-bars.json`), `scoring_model_version` (mirrors `SCAN_CACHE_VERSION` from `scan.js`), and summary counts (`symbol_count`, `enabled_count`, `screened_count`).
- Disabled or otherwise not-scanned catalog symbols are included with `status: "not-screened"`, matching what the browser already reports for them.
- Scores are computed once, at export/sync time, from bars already stored locally — no new fetch, no live API call, no websocket, consistent with this project's offline-first constraint.
- The dev backend serves the identical shape at `GET /data/screener-scores.json`, and the static exporter writes the identical file to `dist/data/screener-scores.json`, so the two channels can never disagree (same pattern already used for `scan-bars.json`).
- Score computation is reused verbatim from `web/screener/score.js` via a small Node script invoked as a subprocess during export/dev-serve, rather than ported to Python — see `design.md` for the rationale.
- No scoring rule, weight, or indicator implementation changes. This only exposes an existing result in a new place.

## Capabilities

### New Capabilities
- `screener-export`: defines the `data/screener-scores.json` artifact — its payload shape, which symbols it covers, how it is produced (reusing `score.js`), and the guarantee that the dev backend and the static export serve identical content.

### Modified Capabilities
- `release-publishing`: the static export SHALL additionally write `data/screener-scores.json`, and the published GitHub Pages site SHALL serve it identically to the dev backend, following the existing pattern for `scan-bars.json`.

## Impact

- **New**: a Node script (e.g. `scripts/build-screener-scores.mjs`) that reads `catalog.json` + `scan-bars.json` (or the equivalent in-process data) and calls `scoreInstrument()` from `web/screener/score.js` for every catalog symbol, emitting the `screener-scores.json` payload.
- **`src/xtb_charts/export.py`**: gains a step that invokes the Node script (subprocess) and writes its output to `dist/data/screener-scores.json`, alongside the existing `meta.json`/`catalog.json`/`scan-bars.json`/candles writes.
- **`src/xtb_charts/api.py`** (dev backend): gains a `GET /data/screener-scores.json` route that runs the same Node script (or an equivalent code path) against the current store so dev and static stay identical.
- **Tests**: extends `tests/test_export.py` with an export round-trip assertion for the new file, and extends the Node harness (`tests/js/run_screener.mjs` or a sibling script) with a check that the exported payload matches `scoreInstrument()` output for a fixture catalog + scan-bars pair.
- **Not impacted**: `market-data` capability (no fetch/storage change), scoring rules/weights/indicator logic (unchanged), `catalog.json` schema (unchanged).
- **External consumer** (documented, not implemented here): `xtb-reports` (`/home/alin/xtb-reports`) can join this file on `xtb_symbol` against its own `ticker` field to combine screener facts (score, `positionPct`, reasons) with its own signals (green semaphore, velocity, win rate) when building its averaging-down ladder watchlist. That integration work happens in the `xtb-reports` repo, not here.
