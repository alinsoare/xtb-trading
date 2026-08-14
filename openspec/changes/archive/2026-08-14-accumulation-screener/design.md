## Context

See `proposal.md` — Why. The relevant current state:

- The indicator computations the screener needs already exist and are pure functions over a bar
  array: `fvgZones(bars, pointSize, params)` in `web/indicators/fvg.js`, `macdArrays(bars, params)`
  in `web/indicators/macd.js`, and `computeSwingStructure(bars, pointSize, params)` in
  `web/indicators/ob-structure.js`. None of them touch the chart, so all three can run headless.
- The data contract is built in `src/xtb_charts/contract.py` (`build_meta`, `build_catalog`,
  `build_candles`) and served twice: live by `src/xtb_charts/api.py` and as files by
  `src/xtb_charts/export.py`. `build_catalog` already carries each instrument's `enabled` flag and
  a per-symbol `last_sync_utc`.
- The frontend has no build step and no Node runtime dependency; tests are Node harnesses under
  `tests/js/` run directly against the ES modules.
- Offline-first is non-negotiable: nothing may fetch market data without the user asking. The
  screener reads bars that were already synced, so it stays inside that rule, but it must not
  quietly become a reason to sync more often.

Two conventions in the existing indicator code are load-bearing and were derived independently in
each module: `j3Newest = n - 2` in `fvg.js` and `lastCompletedJs = n - 2` in `ob-structure.js` both
encode that the newest stored bar is still forming.

## Goals / Non-Goals

**Goals:**

- Screen the whole catalog on load in one request and a bounded amount of client CPU.
- Reuse the existing indicator implementations verbatim rather than porting them into the screener.
- Define the shared bar-reading conventions once, so no two signals can disagree about the last
  completed bar, the current price, or what a doji is.
- Make every threshold and weight a named constant, because they are judgement calls that will be
  retuned.
- Make a mark auditable: from the list alone, the user can see which rules fired and for how much.

**Non-Goals:**

- Validating the weights. 3/2/1 and the pivot bands are unbacktested judgement; a replay harness is
  the honest follow-up and is not in this change.
- Order-block detection. The screener calls `computeSwingStructure` directly for pivots and never
  builds zones.
- Any server-side scoring. Scoring happens in the browser so it behaves identically in dev and on
  the static site.

## Decisions

### A dedicated screening payload rather than the existing per-symbol bar files

Screening 44 instruments over 3 timeframes through `dist/data/candles/` would be 132 requests at
roughly 115 KB each — about 15 MB — for data that is 95% irrelevant to the score.

Instead `contract.build_scan_bars(conn)` emits one payload beside `build_catalog` and
`build_candles`, served at `GET /data/scan-bars.json` and written to the same relative path by the
exporter. It is columnar (`{"symbols": {"<sym>": {"d1": {"t": [], "o": [], "h": [], "l": [], "c": []}}}}`)
and drops volume, which no signal reads. That lands near 2 MB raw and comfortably under 1 MB
gzipped in a single request.

*Alternatives considered.* Scoring server-side and shipping only the scores — rejected because the
static site has no server, and the same scoring would then need two implementations. Reusing the
per-symbol files with a concurrency limit — rejected on the 15 MB alone.

### 420 bars per timeframe

The binding constraint is FVG's 380-bar EMA warm-up. 420 clears it with 40 bars of margin, which is
what lets a zone detected just past the warm-up boundary still be live at the newest bar
(`rectBars: 14` expires zones well inside that margin). D1 at 420 bars also covers the 30-day range
window and the pivot lookback with room to spare. The cap is a named constant so raising it is a
one-line change if a future signal needs more.

An instrument holding fewer bars than a signal's warm-up is reported as insufficient history rather
than scored on partial data — a partly warmed-up MACD is worse than no reading.

### One conventions module, imported by every signal

The forming-bar rule, the current-price rule, the doji test, the bullish-run walk, the live-zone
test and the 30-day window all live in one module under `web/screener/`. Signals never index bars
directly. This is the difference between one place to fix a wrong assumption and four places that
have already drifted.

Current price is deliberately the close of the newest bar *across the three timeframes chosen by
timestamp*, not D1's close. If D1 failed to sync while M15 succeeded, taking D1 would gate and score
against a price that is days old.

The doji rule (`|close − open| ≤ 0.10 × (high − low)`, plus any zero-range bar) treats a doji as
neutral: it neither counts toward the three bullish bars nor breaks the run, and the walk stops at
the first bearish bar or after a fixed scan cap of 8 bars examined. Without the cap, a long doji
stretch could let a "last three bullish bars" signal reach arbitrarily far back and mean nothing.

### Modules split by what they answer, not by what they call

- `web/screener/range.js` — the 30-day window, range and position.
- `web/screener/signals.js` — bullish run, live-zone containment, MACD ascending, pivot distance.
- `web/screener/score.js` — the gate, the weights, the reasons, the mark buckets.
- `web/screener/scan.js` — orchestration, progress callback, cache.

Only `scan.js` knows about the network and storage; the other three are pure functions over bars,
which is what makes the Node fixtures possible without a DOM.

### Cache keyed by sync freshness, not by time

`scan.js` writes scores to `localStorage` keyed by each symbol's `last_sync_utc` from
`catalog.json`. A reload where nothing synced skips the scan payload entirely and costs one small
catalog request. A key mismatch on any symbol invalidates the whole cache and re-screens — a
per-symbol partial reuse would save little and adds a staleness question per row.

Time-based expiry was rejected: it would either re-screen data that has not changed or trust a
score after a sync has changed the data underneath it. Sync time is the only thing that can change
a score.

### Pivots via `computeSwingStructure`, not order blocks

`computeSwingStructure().pivots` returns pivots chronologically; the last high pivot is the most
recent entry with `isHigh === true`, and only confirmed pivots are used — a pending pivot can still
be invalidated. Calling it directly skips the `validityScanCap: 500` zone scan that the OB indicator
performs, which is the single most expensive part of that module and produces nothing the screener
reads.

### The UI reports facts and nothing else

Rows gain the mark group, the range and position figures, and a `title` listing the firing rules
with their points. Scan progress goes into the existing `#catalog-summary` line rather than a new
progress element. Sorting by score joins the existing filters and persists with them.

Deliberately absent: any target tier, entry, stop or size. The screener says where price sits and
what fired; what to do about it is the user's call.

## Risks / Trade-offs

- **`point_size` becomes load-bearing across the whole catalog** → FVG's `minFvgPoints: 50` and OB's
  `confirmPoints: 50` are scaled by each instrument's `point_size` from `data/symbols.csv`. A wrong
  value used to distort one chart; now it silently suppresses that instrument's marks everywhere.
  Mitigation: a sanity pass over the catalog's point sizes as part of this change, and reporting
  insufficient-history and not-screened states explicitly so a suspiciously silent instrument is
  visible rather than invisible.
- **Marks will be rare** → Gate plus confluence means blank screens for days. Mitigation: the range
  and position figures render for every screened instrument, so an empty screen reads as screened
  and quiet rather than broken.
- **The weights are unvalidated** → 3/2/1 and the pivot bands are judgement. Mitigation: every
  threshold is a named exported constant, and the reasons tooltip records which rules actually fire
  over time, which is the raw material for retuning them later.
- **Scores are only as fresh as the last sync** → A mark can reflect a setup that has already
  resolved. Mitigation: the sync age already shown in each row sits next to the mark, and nothing
  about screening triggers a fetch — the answer to stale marks stays the sync control the user
  operates.
- **Client CPU on load** → 44 instruments × 3 timeframes × 420 bars through FVG, MACD and swing
  structure is real work on a slow machine. Mitigation: the cache means it usually does not run at
  all; the scan yields between instruments so the list stays interactive, and progress is reported.
- **A second payload can drift from the per-symbol files** → Two builders reading the same store
  could disagree after a change to either. Mitigation: both are built in `contract.py` from the same
  query layer, and the export tests assert the payload against the catalog's enabled set.
