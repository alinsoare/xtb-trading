## Context

See proposal.md — Why. What matters for the approach is where the timeframe set is actually
decided, and how little of it is spread out.

The backend holds one table of timeframes and one order list beside it. Sync, the exporter,
the catalog manifest's per-timeframe entries, the candles route's validation and the
`data/meta.json` the frontend reads all iterate that order rather than naming timeframes
themselves. The frontend builds its timeframe buttons from `meta.timeframe_order`, picks D1
as its default when the order contains it, and validates a persisted timeframe against the
same list. So the chart half of this change is a data edit, not a UI edit.

The screener is the part that names timeframes for itself. It carries its own screened set on
both sides of the wire — one constant in the payload builder, one in the browser's shared bar
conventions — and its current-price rule reads the newest bar across whichever timeframes it
was handed. No trigger reads M15 bars, so nothing in the scoring model needs rethinking; what
changes is which bar can supply the price the figures and the distance component are measured
against.

Two pieces of state outlive the code: rows already stored under `m15` in every developer's
database and in the committed release snapshot, and scores already cached in browsers that
were computed when an M15 bar could be the newest one.

## Goals / Non-Goals

**Goals:**

- Retire M15 from one place — the timeframe table — and let everything that iterates it follow,
  so no second list of timeframes is introduced in the process.
- Keep the screener's timeframe set explicit but derived from what the payload carries, so the
  current-price rule does not encode how many timeframes exist.
- Leave every existing database and the published snapshot loadable and correct without a
  migration step.
- Preserve the coverage that M15-specific tests provided for rules that are not M15-specific.

**Non-Goals:**

- Deleting stored `m15` rows, now or as an optional tool. See the decision below.
- Changing the periodic-refresh interval, its control or its label.
- Changing any trigger, weight, band or mark bucket.
- Introducing a replacement intraday timeframe (M30, M5) or a locally derived one.
- Rewriting the historical M15 spot-check note in the OB indicator's header comment, which
  records how the port was verified rather than what the app offers.

## Decisions

**Retire the timeframe by deleting its entry, not by filtering it out.** The alternative — keep
the `m15` definition and exclude it from `TIMEFRAME_ORDER`, or add an `enabled` flag to the
timeframe record — would leave a half-supported timeframe that the fetch layer could still be
asked about. Deleting the entry makes `timeframe("m15")` raise the same unknown-timeframe error
any typo raises, and makes the candles route's existing membership check reject it with no new
code. The cost is that the 60-day-cap knowledge encoded in that entry (`yahoo_max_days`) leaves
the codebase along with it; that field still exists for H1's 730-day cap, so the clamping
machinery stays exercised.

**Derive the screener's set from the payload, keep the constant as the payload's definition.**
The payload builder's screened-timeframe constant stays the single declaration of what is sent.
The browser's shared conventions keep their own constant for the timeframes they expect, but the
current-price rule iterates the series it was actually handed rather than a fixed triple. That
way a payload built by an older exporter, or a future change to the set, cannot produce a price
computed from a timeframe the browser did not know about, and cannot skip one it was sent. The
alternative — the browser hard-coding H1 and D1 — is what makes the current code carry a
three-way branch that has to be edited in lockstep with the backend.

**Bump the scan cache version rather than detect the change.** The cache already carries a
version and already invalidates wholesale when it moves. A cached score computed when M15 could
supply the current price is not distinguishable from a current one by inspecting its fields — the
score and the sources may be identical while the price underneath differs by a tick. Bumping the
version costs every user one recomputation on the first load after the change, which is the same
cost the previous scoring-model change imposed, and the screener's own requirement already
forbids displaying a result computed under a superseded model.

**Leave stored `m15` rows in place.** Three options were weighed. Deleting them in a migration
is the only one that reclaims space, but it contradicts the append-only guarantee the store is
built on, it cannot be undone if M15 is ever reinstated, and it would have to run against the
committed snapshot — turning a code change into a data rewrite in a repository whose history
keeps the old bytes anyway, so the repository does not even shrink. Offering an optional prune
tool spends real design and test effort on a one-off cleanup nobody is asking for. Leaving the
rows costs disk in a file that is already tens of megabytes and a table nothing queries, and it
keeps the change reversible: reinstating M15 would be re-adding the timeframe entry, with the
history still there. The cost is stated in the spec rather than left as a surprise.

**Rely on the existing unknown-setting fallback for a persisted `m15`.** The settings restore
already validates the stored timeframe against the live list and falls back to the default,
field by field, and the charting spec already names an unknown timeframe among the cases it
covers. No migration and no special case is needed; what this change adds is a test that pins
the behaviour for this specific value, so the fallback is verified rather than assumed.

**Re-point the M15 sync and fetch tests instead of deleting them.** Several tests use M15
because it was the timeframe where the interesting condition was easy to construct: an
incremental start sitting outside the fetch window, and a full refresh whose window is
narrower than the stored history. Both rules apply to every timeframe. H1 reproduces them
with a 730-day window instead of a 60-day one, so the fixtures move to H1 with wider date
offsets. The one test that genuinely only concerned M15 — that its 1,200-bar depth stayed
inside the 60-day cap — goes with the requirement it guarded.

## Risks / Trade-offs

**Periodic refresh becomes nearly inert.** With the finest timeframe hourly and the interval at
15 minutes, three of four ticks now fetch nothing at all. → Accepted and specified: the
all-skipped run is stated as a successful outcome so it cannot be read as a failure. Changing
the interval is a separate decision about a control, not a consequence of retiring a timeframe.

**Screener figures shift slightly on the first scan.** The current price may now come from an H1
bar where it came from an M15 bar, so headroom, position and the distance component can move,
and an instrument sitting on a band boundary can gain or lose a point. → The cache bump forces a
clean recomputation for everyone at once, so no user sees a mix of old and new prices; and the
shift is the honest consequence of the finest available bar changing.

**A reused export directory could keep stale `m15.json` files.** The exporter writes per-symbol,
per-timeframe files by iterating the timeframe order, so it will simply stop writing M15 files
rather than remove ones already there. A published site deployed from a reused directory could
keep serving them. → A task verifies what the exporter does with an output directory that
already holds them, and the deploy path is checked to confirm it publishes a fresh tree rather
than an overlay. Nothing in the frontend requests them once `meta.json` stops listing M15, so
the worst case is dead files, not wrong data.

**Search-and-replace overreach.** The string `15m` appears in places that have nothing to do
with the timeframe: the **auto 15m** control, the elapsed-time formatter's `4h 15m` test, the
periodic-refresh interval. → The impact list in the proposal names each of them as
deliberately untouched, and the tasks work file by file rather than by global replacement.
