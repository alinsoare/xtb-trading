## Context

See proposal.md — Why. The constraints that shape the approach:

- Source names live in exactly one place. `web/screener/score.js` exports one `SOURCE_*` constant per
  scoring component and attaches it as the `source` field of the reason it records; `renderSourceNames`
  in `web/screener/render.js` prints whatever string the reason carries, escaped, one span per reason.
  So the rename is a change to two string literals and nothing else in the rendering path.
- Both node harnesses (`tests/js/run_screener.mjs`, `tests/js/run_render.mjs`) assert against the
  imported constants rather than literal label text, so they follow a value change automatically —
  which also means nothing currently pins the label text itself.
- `web/screener/scan.js` caches whole result objects in `localStorage` behind `SCAN_CACHE_VERSION`
  (at `5`), keyed otherwise on per-instrument sync freshness alone. A cached result carries the
  `source` strings written by the release that computed it.
- An unrelated change, `style-source-names-as-green-outlined-labels`, is in flight against the same
  line, but touches only `web/styles.css` and the `charting` spec — no overlap in files or requirements.

## Goals / Non-Goals

**Goals:**

- Name the two gap sources `FVG D1` and `FVG H1`, in one place, with no other observable change to a row.
- Ensure a returning user with a warm cache never sees a former label.
- Leave the label text pinned by a test, so the next rename is a deliberate edit rather than a silent one.

**Non-Goals:**

- Renaming `gate`, `MACD` or `pivot`, or establishing a naming convention for non-gap sources.
- Touching the `rule` wording shown in the audit tooltip, the weights, the mark buckets, the reason
  order, the gate, or the sort.
- Any change to the outlined-label styling, which the in-flight styling change owns.
- Shortening or restructuring the row layout to exploit the narrower labels.

## Decisions

**Keep the constant identifiers `SOURCE_D1_FVG_H1` and `SOURCE_H1_FVG_M15`; change only their values.**
The identifiers name the scoring component — a D1 gap confirmed by an H1 run — and that component is
unchanged; only its display label is losing the confirming run. Renaming them to `SOURCE_FVG_D1` and
`SOURCE_FVG_H1` would touch both test harnesses and every import site for no behavioral gain, and
would leave the identifier no longer traceable to the weight constant beside it (`WEIGHT_D1_FVG_H1_RUN`),
which is not being renamed. Trade-off accepted: the identifier no longer mirrors its value, so a
comment at the constants records that the label deliberately omits the confirming run.

**Drop the confirming run's timeframe from the label rather than compressing it.** Alternatives were
`FVG D1+H1` (keeps both, still two timeframes and a `+`) and `D1 FVG` (indicator last, so the two gap
labels no longer align on their first token). Dropping the run is the only option that makes the two
names read as a pair and matches the one-token width of the neighbouring names. The information is not
lost: the full rule wording, including the run, is already in the marks tooltip, and the spec now
requires it to stay there. Distinctness is preserved — `FVG D1` and `FVG H1` differ, and neither
collides with `gate`, `MACD` or `pivot`.

**Bump `SCAN_CACHE_VERSION` from 5 to 6.** Cached results hold the former `source` strings, and the
cache key covers sync freshness only, so without a bump a user who does not sync keeps reading the old
labels indefinitely. This is the mechanism the codebase already uses for exactly this — the previous
two reason-label changes each bumped it — and it costs one recompute from already-stored bars on the
next load. Alternative considered and rejected: mapping former names to new ones when reading the
cache, which adds a migration table that must be carried forever to avoid one recompute.

**Pin the two label values in `tests/js/run_screener.mjs` alongside the existing weight-constant
assertions.** Because every other assertion goes through the constants, a future accidental edit to
the string would pass the whole suite. One assertion per label, in the block that already pins
constants by value, closes that gap without duplicating label text across the render tests.

## Risks / Trade-offs

- **A reader misses that an M15 run confirmed the H1 gap, since the label no longer says so** → The
  rule wording in the marks tooltip is unchanged and now spec-required to keep naming the run; the
  source line was never the audit surface.
- **`FVG` is jargon where `gap` is plain language** → It is the term already used throughout the
  codebase, the indicator UI and the existing labels, so this rename introduces nothing new; changing
  the vocabulary would be a separate, larger decision.
- **One extra full rescan for every user on first load after release** → Same cost as each previous
  version bump; the scan recomputes from stored bars with no network access, which keeps the
  offline-first constraint intact.
- **Merge friction with the in-flight styling change** → Disjoint files (`score.js`/`scan.js` versus
  `styles.css`) and disjoint capabilities (`accumulation-screener` versus `charting`); either can land
  first.

## Migration Plan

No data migration and no server change. Bumping `SCAN_CACHE_VERSION` discards cached scores on first
load after release; the scan recomputes from already-stored bars, so nothing syncs. Rollback is
reverting the change — the earlier release's own version check discards the cache this one wrote.
