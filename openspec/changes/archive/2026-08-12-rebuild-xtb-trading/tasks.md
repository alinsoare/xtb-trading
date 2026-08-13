# Tasks: rebuild-xtb-trading

## 1. Project scaffolding

- [x] 1.1 Initialize the Python package with uv (`pyproject.toml`, Python 3.13, pinned `yfinance`, FastAPI, pytest) and the app entry point
- [x] 1.2 Create the configuration module: timeframe definitions (M15/H1/D1/W1 with Yahoo intervals and seconds — all fetched, none derived), `target_bars` defaults (1,000 everywhere) with per-timeframe floor and hard maxima (M15 ~1,400 per the 60-day cap, H1 ~4,000 per the 730-day cap, D1 10,000 and W1 3,000 sanity ceilings) plus a clamp helper, Yahoo per-interval history caps, paths, base currency
- [x] 1.3 Seed the instrument catalog CSV with its column schema (XTB symbol, verbatim XTB name, Yahoo symbol, name, asset class, instrument type, exchange, quote currency, point size, price divisor, enabled) and starter instruments
- [x] 1.4 Write the repo README covering quick start, dev vs. release modes, and the offline-first rule

## 2. Instrument catalog

- [x] 2.1 Implement catalog loading and validation from the CSV (single source of truth, enabled flag respected)
- [x] 2.2 Implement CFD detection from the verbatim XTB name and the compatibility rules (non-EUR effective currency, CFD), producing warning reasons rather than blocks
- [x] 2.3 Implement observed-vs-catalog currency precedence and mismatch warnings
- [x] 2.4 Tests: CFD name variants, non-EUR flagging, catalog/observed mismatch, disabled entries excluded from sync scope

## 3. Storage

- [x] 3.1 Create the SQLite schema and storage module (bars keyed by symbol/timeframe/UTC-epoch-seconds, per-symbol/timeframe sync state), the only module that writes SQL
- [x] 3.2 Implement bar upsert and bar-count pruning (keep newest effective-target bars per symbol/timeframe)
- [x] 3.3 Persist the effective per-timeframe `target_bars` in the database alongside sync state (defaults seeded from config, survives the data-branch snapshot)
- [x] 3.4 Tests: upsert-overwrite of revised bars, exact bar-count pruning, target persistence and clamping

## 4. Fetching from Yahoo

- [x] 4.1 Implement the fetch module (the only module that performs network calls): per-symbol history requests with `auto_adjust=False`, currency read from the same response's metadata
- [x] 4.2 Implement bar-count-to-start-date estimation with conservative multipliers, clamping to Yahoo's per-interval caps, and the post-1970 floor for full-history requests
- [x] 4.3 Implement timestamp normalization: intraday true UTC instants; D1/W1 pinned to UTC midnight of the exchange-local session date; epoch math via Timedelta division, never int64 casts
- [x] 4.4 Implement price divisor application and empty-response disambiguation (dead ticker vs. no new bars via metadata presence)
- [x] 4.5 Implement rate-limit retries with exponential backoff and chunk pauses between symbol batches
- [x] 4.6 Tests (mocked yfinance): clamping, session-date pinning (Xetra 22:00 UTC case), divisor, disambiguation, backoff exhaustion

## 5. Sync orchestration

- [x] 5.1 Implement the sync runner: incremental start computation (overlap bars before newest stored), deficit-aware backfill when the effective target exceeds stored depth, full-refresh mode, fetch → upsert → prune per symbol, per-symbol failure isolation
- [x] 5.2 Accept per-timeframe `target_bars` adjustments on a sync run (clamped to floor/hard max, persisted as the new effective targets)
- [x] 5.3 Implement single-run enforcement (concurrent trigger rejected) and observable progress state (running, totals, current symbol, per-symbol results)
- [x] 5.4 Record sync state per symbol/timeframe (time, status, message, newest bar, observed currency)
- [x] 5.5 Add the headless sync CLI entry point sharing the runner (used by CI; no web server involved), including flags for the target adjustments
- [x] 5.6 Tests: incremental window math, deficit-aware backfill, target clamping, isolation of one failing symbol, concurrent rejection, state recording

## 6. Data contract and dev HTTP surface

- [x] 6.1 Define and implement the contract endpoints served from SQLite: `data/meta.json` (generated-at, mode, timeframes), `data/catalog.json` (instruments + flags + sync state), `data/candles/<symbol>/<timeframe>.json`
- [x] 6.2 Implement dev-only sync endpoints (`/api/sync` start with scope/full/target-adjustment options returning conflict when running, `/api/sync/status` for polling)
- [x] 6.3 Serve the frontend statically from the dev backend; verify no endpoint triggers a market-data fetch as a side effect
- [x] 6.4 Tests: contract shapes, sync conflict response, unknown symbol/timeframe errors

## 7. Frontend

- [x] 7.1 Build the page skeleton and symbol browser: search, asset-class filter, compatible-only filter, freshness display, warning badges
- [x] 7.2 Build the candlestick chart (lightweight-charts from pinned CDN): timeframe switching, crosshair OHLC legend, empty state, stale-response guard so late responses never paint a wrong selection
- [x] 7.3 Show compatibility badges in the chart header; render times as epoch seconds without millisecond confusion
- [x] 7.4 Implement sync controls (sync all / sync selected / full refresh) with progress polling and post-sync refresh, shown only when `meta.json` reports dev mode
- [x] 7.5 Verify static mode manually: frontend served as plain files over exported data behaves identically minus sync controls

## 8. Indicator framework

- [x] 8.1 Implement the registry (`id`, `label`, `minBars`, `compute`, renderer) and the generic chart primitive that renders drawables from all enabled indicators
- [x] 8.2 Build the indicator toggle UI from the registry; enabled state applies immediately and survives symbol/timeframe switches within a session
- [x] 8.3 Implement insufficient-history warnings (required vs. available bar counts) surfaced on the chart
- [x] 8.4 Recompute enabled indicators on bar reload with no network requests beyond the bar data itself

## 9. FVG indicator

- [x] 9.1 Port the numeric building blocks to JS: SMA-seeded EMA (NaN before seed index) and MT5 STO_LOWHIGH stochastic with SMA slowing
- [x] 9.2 Port the FVG scan: EMA 13/89/377 regime ladder, middle-bar body dominance, swing stairs (strict/relaxed), gap-vs-bar2-range ratio, bar3 wick/body limit, stochastic overbought/oversold filter, point-size floor/ceiling, forming-bar exclusion; scan depth spans all stored bars past the EMA warm-up (the original's 120-bar cap is dropped); defaults defined in one parameters object
- [x] 9.3 Implement zone rendering: rectangles behind candles spanning bar1 forward `rect_bars`, clamped to stored bars, with direction-colored labels at bar3; clamp partially visible rectangles to pane edges
- [x] 9.4 Generate golden fixtures (bar series + expected EMA/stochastic values and zones) from the reference implementation configured to scan the full series (matching the dropped bar-limit cap) and check them into the repo
- [x] 9.5 Add the dev-time test harness running the JS indicator against the fixtures with strict tolerances; wire into the test workflow
- [x] 9.6 Register FVG in the registry and verify end-to-end on all four timeframes of a fully synced symbol (zones or genuine no-signal, never a warm-up warning)

## 10. Exporter and release pipeline

- [x] 10.1 Implement the static exporter writing `meta.json` (mode `static`), `catalog.json`, and all candle files from SQLite, byte-compatible in shape with the dev endpoints
- [x] 10.2 Test: export round-trip — exported files parse and match the dev endpoint shapes for the same database
- [x] 10.3 Display the snapshot generation time in the static site UI
- [x] 10.4 Verify the local release rehearsal: run the sync CLI and exporter locally, serve the export directory with a plain static file server, and confirm the site matches dev-mode behavior (browsing, charts, indicators, snapshot timestamp) with no GitHub involvement; document the rehearsal steps in the README
- [x] 10.5 Create the release workflow (`workflow_dispatch` only, with optional per-timeframe bar-target inputs forwarded to the sync CLI): restore `market.db` from the `data` branch when it exists, run the headless sync CLI, commit the snapshot back as a replace commit, export, upload frontend + data as the Pages artifact, deploy
- [x] 10.6 Document the manual-sync fallback path in the README (sync locally, push the snapshot to the `data` branch), so it is written down before the pipeline is first used

## 11. End-to-end verification

- [x] 11.1 Full local run: fresh database, sync all seeded symbols, confirm every timeframe meets its `target_bars` (M15 best-effort within the 60-day cap) and FVG scans on all four timeframes
- [x] 11.2 Second sync run: confirm it is incremental (small fetch windows, fast completion)

## Deferred out of this change: GitHub publication

Everything below requires pushing this repository to GitHub, which is gated on the maintainer's
explicit go-ahead. It is deliberately not tracked as a task here, and will be planned as its own
change once that confirmation is given:

- Create the `release` branch and enable GitHub Pages (workflow-based deployment).
- Dispatch the first release: verify full backfill, `data` branch creation, Pages deploy, and that the published site makes no Yahoo requests.
- Dispatch a second release: confirm snapshot restore, incremental CI sync, and unchanged behavior on the published site.

The release workflow itself ships with this change (10.5), and every step of it except the Pages
deploy is already verified locally by the rehearsal (10.4) and the sync runs (11.1-11.2). What is
deferred is GitHub-side activation and the verification that can only happen against real GitHub.
