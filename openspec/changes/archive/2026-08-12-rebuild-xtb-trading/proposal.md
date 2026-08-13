# Rebuild xtb-trading

## Why

The reference app (`../xtb-trading`) works as an offline-first charting tool, but three of its behaviors have proven wrong in practice: the FVG indicator never renders on the default timeframe because day-based retention (365 days) leaves D1 with ~260 bars — below the 380-bar warm-up its EMA 377 needs; indicators are hardwired one-off features rather than a framework the user can extend and toggle; and the app can only be used on the machine running the Python backend, with no way to publish a browsable snapshot. This rebuild re-derives the app from its documented behavior, fixing those three problems by design rather than by patching.

## What Changes

- Ground-up rebuild of the offline-first OHLC charting app: curated XTB instrument catalog, Yahoo Finance data stored locally, candlestick charts for M15/H1/D1/W1 (all fetched directly; the reference's derived H4 is dropped in favor of M15), user-triggered sync only. The sibling repo is a behavioral reference; no code is copied.
- Data retention and fetch windows are defined as a **bar count per timeframe** instead of day-based windows: 1,000 bars by default everywhere (covering the EMA 377 warm-up plus deep scannable history), adjustable at sync time — including from the release workflow — and clamped to per-timeframe hard maxima so a request can never exceed Yahoo's limits (`15m` capped at 60 days, `1h` at 730). Incremental syncs stay fast — only the first pull is long. M15's cap means gaps older than 60 days are permanent; that trade-off is accepted for M15 only.
- Indicators become a **pluggable, client-side framework**: computed in JavaScript from bars already on the chart, individually enable/disable-able in the UI, with a registry that new indicators plug into. No indicator computation on the server.
- The first indicator is a **working FVG (Fair Value Gap) scanner**, re-derived from the reference's MQL5 port with its signal-parity rules preserved (MT5-style SMA-seeded EMA, stochastic filter, EMA 13/89/377 regime ladder). Unlike the original, it scans the **full stored history** rather than the last 120 bars, so every detected zone is visible on the chart at once.
- The frontend consumes one **static-friendly JSON data contract** that is served dynamically by the dev backend and exported as plain files for releases — the same UI code runs in both modes.
- New **release channel to GitHub Pages**: `main` stays the development branch; a manually-dispatched GitHub Actions workflow restores the previous data snapshot from a dedicated data branch, runs an incremental Yahoo sync in CI, commits the updated snapshot back, exports static data, and deploys to Pages. Data is never re-pulled from scratch, and the published site never contacts Yahoo. The whole pipeline minus the deploy step is rehearsable locally (sync → export → static preview), so a release can be validated before anything is pushed.

## Capabilities

### New Capabilities

- `instrument-catalog`: the hand-curated instrument list, XTB↔Yahoo symbol mapping, and portfolio compatibility rules (EUR quote currency verified against Yahoo, CFD detection from the XTB name).
- `market-data`: fetching OHLC bars from Yahoo Finance, persisting and querying them locally, and bar-count-based retention/backfill rules.
- `sync`: user-triggered sync orchestration — incremental vs. full runs, per-symbol isolation of failures, rate-limit handling, and progress reporting.
- `charting`: the chart UI — symbol browser with search/filter, candlestick chart, timeframe switching, sync controls, and compatibility warnings.
- `indicators`: the client-side indicator framework (registry, per-indicator enable/disable, data requirements) and the FVG indicator as its first implementation.
- `release-publishing`: the static data export contract, the GitHub Pages deployment, and the data-snapshot persistence that makes CI syncs incremental.

### Modified Capabilities

None — this is a greenfield repo; `openspec/specs/` is empty.

## Impact

- All application code in this repo is new: Python (uv-managed) backend for local development and sync, build-step-free vanilla JS frontend, SQLite storage (per the reference's defaults, which this proposal keeps).
- New GitHub repository plumbing: a release workflow (`workflow_dispatch`), a dedicated data branch for snapshot persistence, and GitHub Pages configuration. The workflow ships with this change; activating it on GitHub — creating the `release` branch, enabling Pages, and the first dispatch that creates the data branch — is deferred to a follow-up change, gated on confirmation that this repository can be pushed. Until then the pipeline is exercised only by the local rehearsal.
- External dependencies: Yahoo Finance via `yfinance` (rate limits and per-interval history caps constrain the fetch rules), lightweight-charts from a pinned CDN.
- The offline-first constraint is preserved end to end: no timers, no auto-sync, no fetch-on-view; CI sync runs only on manual dispatch, and the Pages site is a static snapshot.
