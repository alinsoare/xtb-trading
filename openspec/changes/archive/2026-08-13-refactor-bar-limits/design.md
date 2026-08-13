## Context

See proposal.md — Why. The mechanics that matter for the approach: `target_bars` is read in
three places that must be separated. `fetch.start_for_bars` turns it into a request start
date, `store.prune_to_target` deletes everything past it after each symbol/timeframe, and
`contract.build_candles` serves every stored bar with no limit, so the chart's depth is
whatever pruning left behind. The value itself lives in the `settings` table so it rides the
`data`-branch snapshot, and reaches sync through the CLI (`--target`), the API (`targets`),
and four `workflow_dispatch` inputs.

Two source constraints shape the fetch side and are not negotiable: Yahoo serves `15m` for
60 days and `1h` for about 730 days, and it answers an over-deep request with an empty frame
that is indistinguishable from a dead ticker — which is why every request start is clamped
rather than optimistic.

## Goals / Non-Goals

**Goals:**

- One place decides fetch depth (the timeframe definition) and one place decides display
  depth (the user's limit), with no value serving both.
- The displayed series is sliced once, at the point where bars enter the chart, so
  "indicators match what is on screen" holds structurally rather than by convention.
- Removing pruning cannot lose data, and can be shipped without a data migration.

**Non-Goals:**

- Windowed or virtualised rendering. The display limit exists precisely so the chart is
  never handed more bars than it can draw; there is no incremental loading of older bars as
  the user pans.
- Any client-side bar cache or delta protocol (separate change, per the proposal).
- Server-side paging of the candle contract. Files stay whole; the client slices.
- Preserving the `target_bars` name or its settings rows as a compatibility shim.

## Decisions

**Express fetch depth as a bar count only where the source caps history; otherwise "as deep
as it serves".** The timeframe definition replaces `default_target_bars`, `floor_bars` and
`max_bars` with a single optional depth: M15 carries 1,200, and H1, D1, W1 carry "no limit".
The fetch start then has one code path — a bar count becomes a date estimate as it does
today, no limit becomes the fixed 1980 start — and both are passed through the existing
`clamp_start`, which is what turns "no limit" into 730 days for H1 and leaves D1/W1 alone.
Considered and rejected: keeping numeric ceilings for D1 and W1 (the existing 10,000 and
3,000). They read as safety but behave as silent history caps, which is the coupling this
change is removing; the payload concern they were guarding is now the display limit's job.

**M15's 1,200 is a target, not a promise, and the cap binds first for short sessions.** At
34 bars per session (Xetra, 09:00–17:30) 1,200 bars is about 49 calendar days and fits inside
the 60-day window; at 26 bars (US cash session) it needs about 65 calendar days and the cap
truncates it to roughly 1,100. Both outcomes are correct and neither is an error — this is
why the spec says "at most 1,200 and never deeper than the cap" rather than naming a
guaranteed count.

**Delete the target machinery instead of leaving it dormant.** `prune_to_target`,
`get_target_bars`, `set_target_bars` and `clamp_target_bars` go, along with the `targets`
plumbing through `SyncRunner`, the API model, the CLI and the workflow inputs. The `settings`
table stays in the schema — an empty table costs nothing, needs no migration, and the next
persisted server-side setting will want it — while any surviving `target_bars.*` rows are
simply never read. Considered and rejected: keeping the parameter as an "initial depth"
override. It only has meaning for M15 (everything else is already maximal), and a knob that
silently does nothing on three of four timeframes is worse than no knob.

**A sync request carrying a depth parameter is refused, not ignored.** The request model
forbids unknown fields, so a stale caller — an old workflow file, a script, a bookmarked
curl — gets an error instead of quietly syncing at a depth it did not ask for. The cost is
that any future field must be added to the model before a client may send it, which is the
normal contract discipline here.

**Slice once, on load, and keep the full series only for re-slicing.** The chart state holds
the loaded series and the displayed slice as separate values; everything downstream —
candle series, indicator computation, chart tools, the legend — reads the slice. Changing the
limit re-slices from the already-loaded series and redraws, with no fetch, which is what makes
the "no request to the data source" scenario true by construction. Considered and rejected:
passing a limit to each consumer and letting it slice (the failure mode is one consumer
forgetting, which is exactly how the ruler and legend drifted apart on price precision).

**The display limit is one text input that accepts a positive integer or `all`.** A single
control keeps the toolbar honest, and the word `all` is a clearer affordance for "everything"
than an empty field or a zero would be, both of which the spec requires to be refused.
Considered and rejected: a preset dropdown plus a custom field (two controls for one
setting), and treating an empty input as unlimited (indistinguishable from a half-typed
value).

**All persisted settings live in one versioned JSON object under a single localStorage key.**
One key cannot leave the app in a half-restored state, and a version field lets a future shape
change discard old data rather than misinterpret it. Each field is validated on restore
against live data — the instrument against the loaded catalog, the timeframe against the
contract's timeframe list, the indicator ids against the registry, the limit against the same
rule the input enforces — and anything unusable falls back to its default. Every read and
write is wrapped, because a browser with storage denied throws on access rather than
returning null, and a settings feature must never be able to prevent the chart from loading.

**Chart tool state stays unpersisted, and a limit change discards a measurement.** The
`chart-tools` requirement that tool state is per-view and discarded on reload is deliberately
untouched: a measurement refers to specific bars, and restoring one against a series that has
since grown would be misleading. For the same reason a display-limit change is treated like a
series reload rather than a redraw — lowering the limit can push an anchor out of the view
entirely, and a measurement half outside its own series is worse than none. Zoom and pan
position are likewise not persisted; the display limit already determines what the chart opens
on.

**The periodic refresh is a session-scoped timer, deliberately not a persisted setting.** It
is the one piece of UI state that is excluded from persistence on purpose: restoring it would
make the app fetch on load, which is the "startup auto-sync" the project context still forbids
even after being narrowed. So the control starts off on every load, and its "on" state lives
only in memory alongside the timer that owns it. A refresh that fires while a run is still in
flight is dropped rather than queued, reusing the existing single-run lock — the API already
answers a second trigger with a conflict, and a 15-minute cadence against a run that takes
seconds means this is a rare edge, not a queueing problem.

**The skip rule is measured from the newest stored bar and applies only to periodic runs.**
"Less than one bar duration has elapsed" is the cheapest correct test for "the source cannot
have a bar we lack", and it needs nothing the store does not already expose. Two consequences
are deliberate. A still-forming bar is not re-fetched by a periodic run within its own period,
so its values settle on the first run after the period ends — acceptable, since the overlap
window revises it then. And a manual sync ignores the rule entirely: a user who presses sync
and sees "nothing fetched" would reasonably read that as a bug, so the button always fetches.
Considered and rejected: measuring from the last sync timestamp instead (it would skip a
timeframe that failed its last attempt, which is exactly when a retry is wanted).

**Data acquisition stays on the server in this change.** Moving the delta fetch into the
browser — server snapshot for history, Yahoo directly for recent bars — is a different
architecture and is out of scope for the reasons in the proposal. The blocking fact is worth
recording here so it is not rediscovered: a probe of Yahoo's chart endpoint with a browser
`Origin` returned `HTTP/2 429` with no `access-control-allow-origin` header and a cookie
handshake (`set-cookie: dflow=...`), which is why `yfinance` is a server-side library. From a
Pages origin the call needs a proxy or serverless hop, so the follow-up change has to design
that, plus the export chunking that makes an incremental client fetch worthwhile.

## Risks / Trade-offs

**A revert after this ships would delete accumulated history.** The old code prunes to the
target on the next sync, so rolling back the commit and syncing would discard everything
deeper than 1,000 bars per timeframe. → Mitigation: the `data`-branch snapshot is a fresh
commit per release, so the pre-revert snapshot remains recoverable from the previous release
commit; treat a revert as requiring a snapshot copy first, and note it in the rollback step
rather than assuming the revert is symmetric.

**Payload growth is real and lands on page load, not on sync.** Full D1 history is about
1.5 MB per symbol at the measured ~133 bytes per bar, and the client fetches whole files. →
Mitigation: accepted for now (the proposal's decision), with the browser-cache change as the
intended fix. The display limit does not help here — it bounds drawing, not downloading — and
that asymmetry is worth stating plainly so nobody expects a lower limit to make loading faster.

**The first sync after this change is a large, slow-looking pull.** → Mitigation: request
count is unchanged (one call per symbol/timeframe regardless of depth), so the cost is
transfer and parse rather than round trips; it is one-time per symbol and the existing
progress display already covers it.

**Indicator drawing cost scales with the displayed series, and `all` is unbounded.** FVG
computation is linear, but zone count grows with bars and each zone is a drawn primitive, so
`all` on a deep D1 series can mean many hundreds of rectangles. → Mitigation: the default of
5,000 keeps the common path close to today's cost, and the limit is the user's own escape
hatch. No structural work now; if it bites, the fix is capping drawn zones, not the scan.

**Persisting the selected instrument makes the first paint depend on stored state.** A
restored selection that no longer resolves, or a stale timeframe key, could strand the user on
an empty chart. → Mitigation: validation against live catalog and contract data with fallback
to defaults, covered by its own scenario.

**Removing the workflow inputs is a breaking change to a dispatch UI the maintainer may have
bookmarked.** → Mitigation: the inputs disappear from the form, so a dispatch cannot silently
carry a value that is no longer honored; the README's release section is updated in the same
change.

**A periodic refresh left on for hours quietly multiplies requests to Yahoo, whose main
failure mode is rate limiting.** Eight instruments times four timeframes every 15 minutes is
128 requests an hour before the skip rule, which removes most of them — W1 and D1 are skipped
almost always, leaving M15 and H1. → Mitigation: the skip rule is part of the requirement
rather than an optimisation, the existing chunk pause and backoff still apply, and the control
is off by default and session-scoped, so the worst case is bounded by a window the user left
open.

**Narrowing the offline-first constraint invites further erosion.** The project context was a
deliberate guard against the reference app's live-fetching habits. → Mitigation: the amendment
keeps every prohibition that mattered — no cron, no startup sync, no fetch on view, no
streaming — and permits exactly one thing: a control the user switches on, for one session.

## Migration Plan

1. Ship the code change. Nothing breaks on an existing database: bars are only ever added,
   and the inert `target_bars.*` rows are ignored.
2. Run one full refresh per symbol (`xtb-charts sync --full`, or a dispatch with full
   refresh) to deepen series that were pruned to 1,000 bars. Until then the app behaves as
   before, just without further pruning — the display limit simply exceeds what is stored.
3. Release as usual. The first release after the deepening commits a substantially larger
   snapshot and export; expect the Pages payload to jump from roughly 3.6 MB to about 20 MB
   for the current eight instruments.
4. Rollback: revert the commit, but copy the current snapshot aside first — see the revert
   risk above, since the restored code prunes on its next sync.
