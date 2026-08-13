# Design: rebuild-xtb-trading

## Context

See `proposal.md` — Why. The sibling repo `../xtb-trading` is the behavioral reference; its documented behavior and pitfalls (UTC-epoch-seconds timestamps, session-date pinning for D1/W1, Yahoo's per-interval history caps and rate limits, unadjusted prices, MT5 numeric conventions for the FVG port) carry over as constraints. Its code and layout do not.

Constraints that shape this design:

- Offline-first is non-negotiable: market data moves only on explicit user action, including in CI.
- GitHub Pages is static hosting — no server process, so anything the published site needs must exist as files at deploy time and anything interactive must run in the browser.
- Yahoo serves `15m` for at most ~60 days and `1h` for ~730; `1d` and `1wk` are effectively unlimited. Sub-hourly gaps older than 60 days can never be backfilled — a trade-off deliberately accepted for M15 (user decision) and the reason no finer interval is offered.
- The FVG indicator needs 380 bars of warm-up (EMA 377) before it can say anything; past the warm-up, indicators scan every stored bar, so retention depth directly sets how far back signals reach.

## Goals / Non-Goals

**Goals:**

- One frontend codebase that runs identically against the dev backend and as a static Pages site.
- Every timeframe indicator-ready by construction: retention targets sized from indicator needs, not calendar intuition.
- A single client-side implementation of each indicator — no Python/JS dual maintenance.
- CI releases that are incremental: the long Yahoo pull happens once, ever.

**Non-Goals:**

- Multi-user or hosted-backend deployment; the backend remains a local dev tool.
- Indicator parameter editing in the UI; indicators ship with the MQL5 defaults (minus the recent-bars scan cap, deliberately dropped — see the indicators spec), defined in one place for later configurability.
- Live or streaming data of any kind.
- Portfolio tracking/valuation beyond the compatibility flags.

## Decisions

### D1: Keep the reference stack — Python 3.13/uv + FastAPI for dev, SQLite storage, build-step-free vanilla JS frontend

The project context treats this as the default, and nothing in the new requirements argues against it: the backend's only jobs are sync orchestration and serving files/JSON locally; the frontend must run on Pages anyway, so it cannot depend on a server framework. A bundler-based frontend was considered and rejected — it buys nothing for one page of UI and breaks the "no Node runtime dependency" property. lightweight-charts stays, loaded from a pinned CDN.

Module responsibilities mirror the reference's proven separation (catalog / storage / fetch / sync orchestration / HTTP surface as distinct concerns), plus two new ones: a static exporter and the client-side indicator engine. The reference's resampling concern is deliberately dropped: with H4 removed (user decision, replaced by M15), every timeframe is fetched directly and nothing is derived locally.

### D2: Retention as per-timeframe bar-count targets, with calendar-window estimation only at fetch time

`target_bars` is a runtime-adjustable setting, not a constant (user-confirmed): every timeframe defaults to 1,000 bars, and a sync run — dev UI/API, headless CLI flag, or `workflow_dispatch` input on the release workflow — can change it. The adjusted value persists as the effective target for later runs (so deeper history is not pruned away by the next plain sync) and is always clamped to [floor, hard max]:

| Timeframe | Default | Floor | Hard max | Basis for the hard max |
|-----------|---------|-------|----------|------------------------|
| M15 | 1,000 | 1,000 | ~1,400 | Yahoo's 60-day sub-hourly cap (~26–34 bars/day) |
| H1 | 1,000 | 1,000 | ~4,000 | Yahoo's 730-day cap (~7–8.5 bars/day) |
| D1 | 1,000 | 1,000 | 10,000 (~40 y) | no Yahoo cap; payload sanity ceiling |
| W1 | 1,000 | 1,000 | 3,000 (~57 y) | no Yahoo cap; payload sanity ceiling |

Indicators scan everything stored, so raising a timeframe's target directly deepens its signal history. Pruning keeps the newest effective-target rows per symbol/timeframe — exact, no calendar math. When a run's target exceeds what a symbol already holds, backfill is deficit-aware: it extends past the incremental window to fetch the missing depth instead of only appending new bars.

The effective targets live in the SQLite store alongside the sync state, so they ride the `data` branch snapshot: a target raised in one release workflow run is still in force for the next, and dev and CI cannot silently disagree about retention depth.

Fetching translates a bar count into a start date with conservative per-timeframe multipliers (trading days ≈ 5/7 of calendar days, ~8 trading hours/day for European sessions), then clamps to Yahoo's per-interval cap. Over-estimation of the window is harmless (pruning trims it); under-estimation is not, so multipliers err generous.

M15 is the permanent exception: the 60-day cap yields roughly 1,000 bars on short-session exchanges (US, ~26 bars/day) and up to ~1,400 on longer sessions (Xetra), so its backfill is best-effort toward its target — always comfortably past the 380-bar FVG warm-up, which is the guarantee that matters. W1 targets beyond an instrument's listed lifetime are naturally age-limited rather than Yahoo-limited.

Alternative considered: keep day-based retention and special-case D1. Rejected — day-based windows are the root cause of the FVG breakage, and every future indicator would reintroduce the same class of bug.

### D3: Indicators are client-side JS modules behind a registry

Each indicator is one JS module registering `{ id, label, minBars(params), compute(bars, instrument) -> drawables, renderer }`. The UI builds its toggle strip from the registry; the chart owns a generic primitive that renders whatever drawables the active indicators emit. Adding indicator #2 means adding one module and one registry entry. Toggle state is deliberately session-only (user-confirmed): it survives symbol and timeframe switches but resets on page reload — no localStorage persistence.

Computation happens in the browser from bars already loaded for the chart — no `/api/indicators/*` endpoints exist at all. This is what makes indicators work identically on Pages and keeps exactly one implementation. The FVG port translates the MT5 numeric conventions directly to JS (SMA-seeded EMA, STO_LOWHIGH stochastic with SMA slowing, forming-bar exclusion, oldest-first index orientation); the reference repo's porting notes are the checklist. One deliberate behavioral deviation from the original: the `bar_limit` recent-bars scan cap (default 120) is dropped, so the scan covers all stored bars past the EMA warm-up and every detected zone is visible at once — even at the largest configurable series (10,000 D1 bars) the extra client-side compute is negligible.

Alternatives considered: server-side Python computation with precomputed JSON for releases (two data paths, parameters frozen at export time, drift risk between paths — rejected); Python as tested reference plus a validated JS port (dual maintenance of delicate numeric code — rejected).

### D4: The data contract is a static file layout; the dev backend serves the same URLs dynamically

Contract (all JSON, all times UTC epoch seconds):

- `data/meta.json` — snapshot generation time, mode (`dev` | `static`), timeframe definitions.
- `data/catalog.json` — instruments with compatibility flags, warnings, per-timeframe bar counts and sync state.
- `data/candles/<symbol>/<timeframe>.json` — bar arrays.

The dev backend serves these paths from SQLite on request; the exporter writes the identical shapes to disk. The frontend always fetches the same relative URLs and decides whether to show sync controls from `meta.json`'s mode. Sync endpoints (`/api/sync`, `/api/sync/status`) exist only in dev and are the only non-contract surface.

Alternative considered: shipping SQLite to the browser via sql.js/wasm. Rejected — megabytes of wasm plus the whole DB download to serve what static JSON files answer with plain HTTP range-cacheable requests.

### D5: Release pipeline — `workflow_dispatch`, snapshot on a dedicated `data` branch, deploy from a `release` branch

Flow of the manually dispatched workflow:

1. Check out the `release` branch (the designated publishing ref; `main` stays development).
2. Restore `market.db` from the `data` branch (skip if the branch doesn't exist yet — first release does the full backfill).
3. Run the headless sync CLI (a console entry point sharing the sync orchestration with the dev API — needed anyway so CI never boots a web server).
4. Commit the updated `market.db` back to the `data` branch as a fresh orphan/replace commit, so binary snapshots don't accumulate unbounded git history.
5. Run the exporter; upload frontend + exported `data/` as the Pages artifact; deploy with the official Pages actions.

Manual dispatch is the explicit user action that satisfies the offline-first rule; the workflow has no `schedule` or `push` trigger for anything that fetches data.

The workflow is deliberately a thin wrapper: every step except the Pages deployment invokes the same commands a maintainer runs locally (headless sync CLI → exporter → any plain static file server over the export directory, e.g. `python -m http.server`). A release is therefore fully rehearsable on the dev machine — same snapshot, same exported artifact, same site behavior — before anything is pushed or dispatched.

Alternatives considered for snapshot persistence: GitHub Actions cache (evictable after 7 days idle — a stale project would silently re-pull everything, violating the requirement); re-importing the previous release's exported JSON from `gh-pages` (lossy round-trip, couples export format to storage). A dedicated branch is durable, inspectable, and trivially restorable.

### D6: Testing — pytest for the backend, browser-run harness plus golden fixtures for the JS indicators

Backend behavior (catalog rules, bar-count retention, session-date pinning, sync state) is pytest territory, as in the reference. The FVG port gets golden-fixture tests: recorded bar series with expected zones (generated once from the reference implementation, checked into the repo), executed in a minimal browser/Node-invoked harness used only at development time. This keeps the app runtime free of Node while still catching numeric drift in the port — EMA-377 seeding errors are invisible to eyeballing a chart.

## Risks / Trade-offs

- [Yahoo rate-limits GitHub's shared runner IPs harder than residential ones] → Incremental syncs are small (overlap + new bars); retries with exponential backoff and chunk pauses carry over from the reference; worst case, the maintainer syncs locally and pushes the snapshot to the `data` branch manually — the workflow design makes that a first-class path since it restores whatever the branch holds.
- [yfinance upstream breakage] → Pin the version in `pyproject.toml`; the fetch module is the only network touchpoint, so adaptation is contained.
- [JS float behavior diverges from the MT5 original enough to change signals] → Golden fixtures with strict tolerances on EMA/stochastic values, not just final zones; the SMA-seeded EMA and slowing-window stochastic are pure arithmetic with no library dependence.
- [Committed SQLite snapshots bloat the repository] → Orphan/replace commits on the `data` branch keep exactly one snapshot in history; the branch can be deleted and rebuilt at the cost of one full backfill.
- [M15 develops permanent, unfillable gaps if syncs are more than 60 days apart (Yahoo's sub-hourly cap)] → Accepted trade-off (user decision); only M15 carries the risk — H1/D1/W1 remain fully backfillable — and the UI's last-sync freshness display keeps staleness visible.
- [M15 cannot always reach even the 1,000-bar floor — short sessions yield ~1,000 bars from 60 days, sometimes slightly fewer] → Accepted as best-effort; the 380-bar FVG warm-up is always cleared, so no indicator functionality is lost.
- [Instruments younger than a timeframe's warm-up depth (e.g. listed less than ~7.3 years ago for W1's 380-week EMA warm-up) can never clear indicator warm-up on that timeframe] → Inherent to source history, not retention; the insufficient-history warning names required vs. available bars so the chart is never silently empty.
- [Two frontends' worth of modes (dev/static) tested as one] → The contract-as-file-layout decision means static mode is exercised every release; a dev-mode-only regression cannot hide in Pages and vice versa for browsing features.

## Migration Plan

Greenfield — no existing users or data to migrate. Bring-up order matches the task breakdown: data layer and sync first (provable via pytest without any UI), then the dev HTTP surface and frontend, then indicators, then exporter and CI. Repository plumbing (enable Pages, create `release` branch, first workflow dispatch that creates the `data` branch) lands last, and is deferred out of this change to a follow-up gated on confirmation that the repository can be pushed — until then the pipeline is proven by the local rehearsal alone. Rollback of a bad release is redeploying the previous Pages artifact or re-dispatching from the prior `release` commit; the `data` branch is unaffected by rollbacks.