## Context

See `proposal.md` - Why for motivation. See `specs/screener-export/spec.md` and `specs/release-publishing/spec.md` for the exact behavioral contract this design implements.

Relevant current state:
- `web/screener/score.js` exports `scoreInstrument()`, which takes `{ enabled, seriesByTimeframe, pointSize, signalOverrides }` and returns `{ status, score, marks, reasons, rangePct, positionPct, headroomPct }`. It is pure — no I/O, no DOM, no localStorage.
- `web/screener/scan.js` exports `SCAN_CACHE_VERSION = 9` and `runScan()`, which orchestrates `scoreInstrument()` over every catalog symbol, reading `data/scan-bars.json` for enabled symbols and treating disabled ones as `enabled: false`. `runScan()` is browser-oriented (accepts `storage`, `getJSON`, uses a `setTimeout`-based yield) but its core loop is a thin, reproducible wrapper.
- `tests/js/run_screener.mjs` already runs `score.js` under plain Node with no browser globals — proof that the scoring code has no browser dependency and can run in a Node subprocess or CI step today.
- `src/xtb_charts/contract.py` builds `meta.json`, `catalog.json`, and `scan-bars.json` from SQLite via pure functions taking a `Connection`; each stamps its own `generated_utc`. `scan-bars.json` covers **enabled** instruments only, capped at 420 bars/timeframe, columnar `{t,o,h,l,c}`.
- `src/xtb_charts/export.py` calls the `contract` builders and writes each result with a shared `_write_json()` helper into `dist/data/...`; `src/xtb_charts/api.py` calls the same builders per-request for the dev backend. Both are pure-Python, in-process.
- No Node runtime dependency exists in the Python pipeline today; project conventions call for avoiding one unless unavoidable.

## Goals / Non-Goals

**Goals:**
- Produce `data/screener-scores.json` with zero risk of scoring drift from what the browser computes, by reusing `score.js` itself rather than reimplementing its rules.
- Keep the dev-backend route and the static-exporter output byte-for-byte identical in shape, following the existing `scan-bars.json` pattern.
- Keep the addition self-contained: one new script, one new export step, one new dev route — no change to the sync pipeline, the database schema, or the scoring rules.

**Non-Goals:**
- Do not change any scoring rule, weight, band, or indicator implementation (out of scope per proposal).
- Do not build a general-purpose Node/Python bridge; this is a narrow, single-purpose subprocess call.
- Do not address how `xtb-reports` consumes the file — that is downstream, out of this repo.

## Decisions

### Decision 1: Compute scores via a Node subprocess that imports `score.js` verbatim (Option A), not a Python port (Option B)

**Chosen: Option A.** Add a small Node script, `scripts/build-screener-scores.mjs`, that:
1. Reads `catalog.json` and `scan-bars.json` payloads (passed as file paths or piped as JSON — the exact interface is a task-level detail, not a design-level one).
2. For each catalog symbol, builds the `seriesByTimeframe` shape `scoreInstrument()` expects (reusing `barsFromSeries`/`columnarToBars` conventions already in `web/screener/bars.js`), calling `scoreInstrument({ enabled, seriesByTimeframe, pointSize })` exactly as `scan.js`'s `runScan()` does for the non-cached path.
3. Emits the `screener-scores.json` payload (per-symbol results plus `generated_utc`, `scoring_model_version`, and summary counts) as JSON on stdout or to a given output path.

`src/xtb_charts/export.py` invokes this script as a subprocess after writing `catalog.json` and `scan-bars.json`, feeding it those two files (or their in-memory equivalents) and writing its stdout to `dist/data/screener-scores.json`. `src/xtb_charts/api.py`'s new `GET /data/screener-scores.json` route does the same against the live store, once per request (no new caching layer — this endpoint is already cheap: same order of work as `scan-bars.json`).

**Why over Option B (a Python port in `contract.py`):**
- **Drift risk is the dominant concern.** `score.js`'s rules (FVG D1, OB D1, MACD trough shape, distance banding, the 30-day window arithmetic, the mark-bucket thresholds) are detailed and specified in `openspec/specs/accumulation-screener/spec.md` at length. A Python reimplementation is a second place every future rule change has to be mirrored into, and the two have already diverged once in most codebases with this shape (e.g. an off-by-one in the MACD trough window, or a boundary rounding difference in `scoreDistance`). Calling `score.js` itself makes drift structurally impossible: there is exactly one implementation.
- **Cost is low and already paid for.** `tests/js/run_screener.mjs` proves the scoring code runs standalone under Node with no DOM/browser globals. A CI environment building this project already needs Node to run that test suite, so requiring Node at export time adds no new toolchain, only a new invocation of a toolchain that's already a build-time dependency (not a runtime one for the served app — the constraint against "no Node runtime dependency" in `config.yaml`'s context is about the **frontend the browser loads**, which stays build-step-free; this script never ships to the browser).
- Option B's stated benefit — "single language export" — does not outweigh the drift risk here, given the amount of specified logic involved and the project's own emphasis on offline-first correctness of screening facts.

**Alternative considered and rejected:** embedding a JS engine in Python (e.g. via a WASM/JS interpreter) to avoid a subprocess call — rejected as unnecessary complexity for a one-shot, already-fast computation; a subprocess is simpler, observable, and testable in isolation.

### Decision 2: Cover all catalog symbols, not just enabled ones — unlike `scan-bars.json`

`scan-bars.json` deliberately excludes disabled instruments (per its own spec) because it exists to carry bars, and there is nothing to carry for a symbol nobody scans. `screener-scores.json` instead must answer "what does the screener say about every catalog symbol," including disabled ones reported as `not-screened` — matching what the sidebar already shows for a disabled instrument. This makes `screener-scores.json`'s symbol set a superset of `scan-bars.json`'s, built by iterating `catalog.json`'s full symbol list, exactly as `runScan()` already does in the browser.

### Decision 3: `scoring_model_version` mirrors `SCAN_CACHE_VERSION`

`scan.js` already carries `SCAN_CACHE_VERSION = 9`, bumped whenever a change to scoring inputs, outputs, or logic would invalidate a browser-cached scan (see the "Scores are cached against sync freshness" requirement in `accumulation-screener`'s spec — it enumerates exactly this: new fields, changed rules, changed screened timeframes). The exported artifact's `scoring_model_version` SHALL be read from the same constant rather than tracked separately, so the two numbers can never disagree about what "the current scoring model" means. The build script imports `SCAN_CACHE_VERSION` from `scan.js` (or a shared constants module, if one is factored out) rather than hardcoding a duplicate integer.

### Decision 4: No new endpoint versioning, query parameters, or per-symbol files

Per the proposal's non-goals, this stays a single flat file at a stable path, matching `scan-bars.json`'s existing shape and the "no REST API, no query parameters, no per-symbol endpoints" constraint. Breaking changes are communicated only through `scoring_model_version` and through this project's normal spec/changelog process — not through URL versioning.

## Risks / Trade-offs

- **[Risk] Requiring Node at export/dev-serve time adds a toolchain dependency to the Python pipeline.** → Mitigation: Node is already required to run `tests/js/run_screener.mjs` in this repo's test suite; this only adds one more invocation in CI/export, not a new dependency. Document the requirement in the export script's error message if Node is missing.
- **[Risk] Subprocess call adds latency/failure surface to the dev `/data/screener-scores.json` route.** → Mitigation: the computation is small (same order as scoring ~44 instruments in the browser, which already completes in well under a second); a subprocess failure should surface as a 500 with the script's stderr, not silently serve stale or empty data.
- **[Risk] `scan-bars.json` is enabled-only, but the build script needs bars for every catalog symbol to score them — except disabled ones don't need bars at all (they're `not-screened` unconditionally).** → Mitigation: no risk in practice — disabled symbols short-circuit to `not-screened` in `scoreInstrument()` without ever touching `seriesByTimeframe`, exactly as `scan.js` already does; the build script only reads scan-bars for symbols the catalog marks enabled.
- **[Trade-off] Reusing `score.js` via subprocess is less "native" to the Python codebase than a port would be.** → Accepted: correctness and zero-drift outweigh stack uniformity here, and the pattern (Node script for JS-owned logic, invoked from Python) is confined to one file and one call site.

## Migration Plan

- No data migration: this is a new, additive artifact. No existing file changes shape.
- Deploy by shipping the new script, the `export.py` step, and the `api.py` route together; the first release after merge starts producing the file. No feature flag needed — its absence today only means the file didn't exist, and its appearance is purely additive for any consumer.
- Rollback: reverting the change removes the file from future exports; no cleanup of previously published `screener-scores.json` snapshots is required since they remain valid static artifacts of past releases.
