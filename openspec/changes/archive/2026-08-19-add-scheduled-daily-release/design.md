## Context

See proposal.md — Why. The release workflow today is a thin wrapper triggered only by `workflow_dispatch`: it checks out `ref: release`, restores `market.db` from the `data` branch, runs `uv run xtb-charts sync`, force-pushes a fresh root commit back to `data`, exports, and deploys Pages under `concurrency: { group: release, cancel-in-progress: false }`.

Two constraints shape the design:

- **The offline-first rule is documented in three places** — `openspec/specs/sync/spec.md`, `openspec/specs/release-publishing/spec.md`, and the `context:` block in `openspec/config.yaml` that is injected into every future planning session. The config block currently says "Do not propose scheduled/cron syncing" without qualification. Adding a schedule while leaving that text in place would make the repository's own planning context contradict its workflow, and would push the next change back toward manual-only.
- **GitHub Actions reads `on: schedule` only from the workflow file on the repository's default branch.** The job then checks out whatever ref it names. So the schedule must land on `main`, while the published artifact still comes from `release` — the two are independent, and the split is what keeps a scheduled release from publishing unreleased work.

## Goals / Non-Goals

**Goals:**

- One daily release at a fixed wall-clock time, requiring no maintainer action.
- Reuse the existing job body verbatim, so a scheduled release and a manual one are the same pipeline and the local rehearsal still reproduces both.
- Leave the amended offline-first rule stated once, precisely, everywhere it is written down.

**Non-Goals:**

- No conditional execution. The workflow does not compare commits, diff the release branch, or skip the deploy when code is unchanged — the user asked for an unconditional daily sync and redeploy.
- No new inputs, CLI flags, or scheduling controls in the app.
- No change to fetch depth, export shape, or the `data` branch layout contract.

## Decisions

### D1: `schedule` added alongside `workflow_dispatch`, cron `0 12 * * *`

Both triggers stay on the one workflow rather than splitting a "scheduled release" into a second file. The pipeline is identical; a second file would duplicate seven steps and let them drift, and it would need its own concurrency wiring to avoid racing the first.

The cron is `0 12 * * *`. GitHub Actions cron is always UTC and has no timezone field, so noon means 12:00 UTC; there is no DST drift, but the run does land an hour earlier in local wall-clock time during European summer. Recorded as an assumption because the request said "noon" without naming a zone.

Alternative considered: a cron a few minutes off the hour (`7 12 * * *`), which is the usual advice for avoiding the top-of-hour queue where GitHub's scheduler is most congested. Rejected as premature — the run has no deadline, and an exact noon is easier to reason about. If delays become visible in practice, shifting the minute is a one-character change.

### D2: Scheduled runs are incremental by construction, not by a new branch

The sync step already reads `${{ inputs.full }}`, which evaluates to the empty string on a `schedule` event, so the `--full` flag is never added. No `if: github.event_name == ...` guard is needed, and the existing shell test is left alone. The spec's "scheduled runs never full-refresh" requirement is therefore satisfied by the expression's own semantics — worth asserting in review, since a future refactor that replaces the empty-string test with a default-true could silently schedule daily full re-pulls of every timeframe's whole window.

### D3: Keep `concurrency: { group: release, cancel-in-progress: false }` unchanged

This already gives the overlap behavior the spec asks for: a second run queues instead of running alongside. It matters more now that a run can start unattended — two concurrent runs would race on the `data` branch force-push, and the loser's freshly synced bars would be discarded.

The one sharp edge: a concurrency group holds a single pending run, so if a third run arrives while one is running and one is queued, the queued one is cancelled in favor of the newer. For this workflow that is harmless — the runs are interchangeable, and the newest one syncs the widest window anyway.

Alternative considered: `cancel-in-progress: true`. Rejected — cancelling mid-run can kill the job between the `data` force-push and the Pages deploy, leaving a published site older than the persisted snapshot.

### D4: Permissions and identity stay as they are

The job already declares `contents: write`, `pages: write`, `id-token: write`, and the built-in `GITHUB_TOKEN` carries them on a `schedule` event exactly as on a dispatch. The `github-pages` environment applies to both. Nothing needs a PAT.

The one behavioral difference worth knowing: pushes made with `GITHUB_TOKEN` do not trigger further workflows, so the daily `data` branch force-push cannot start a release loop. There is also no `actor` on a scheduled run in the usual sense — the run is attributed to the user who last modified the cron, which is cosmetic here but explains who appears in the run list.

### D5: Narrow the project context rather than delete the rule

`openspec/config.yaml`'s prohibition is rewritten to apply to the application surface — no startup sync, no fetch-on-view, no auto-resumed periodic refresh, no client-side timers, no streaming — and to name the daily CI release as the single sanctioned exception. Same for the README's opening paragraph.

The precedent risk is real: this project has already narrowed the offline-first rule once (see the archived `refactor-bar-limits` design), and each narrowing makes the next easier to argue for. Stating the exception as a closed list of one, in the same sentence as the prohibitions it does not touch, is the mitigation — a future change proposing a second automatic fetch has to amend the rule again in the open rather than cite this one as a general permission.

### D6: The schedule must live on the default branch

Because Actions only honors cron from the default branch, the workflow file carrying the `schedule` block must be on `main`. `release` may carry an older copy without the trigger and the schedule still works, since the scheduled run's own workflow definition comes from `main` while its checkout comes from `release`. This is easy to get backwards, so it is called out in the tasks and in the workflow's header comment.

## Risks / Trade-offs

- **Yahoo rate-limits the daily unattended run** → The sync already retries with backoff and isolates per-symbol failures, so a partial run still persists what it got and the next day widens the window. A run that fails outright leaves the previous snapshot and the previous Pages deployment intact.
- **A scheduled run publishes a release-branch state the maintainer did not intend to publish** → The schedule builds `release`, which only ever advances by a deliberate promotion; the risk is limited to code the maintainer already promoted but had not yet released.
- **GitHub disables scheduled workflows after 60 days without repository activity** → Accepted rather than worked around. Manual dispatch still works, and the schedule is re-enabled from the Actions tab. Documented in the README so a silently stopped schedule is diagnosable.
- **Cron is best-effort and can be delayed by tens of minutes or skipped under load** → Accepted; the spec states a missed day costs freshness only. Nothing downstream assumes exactly one snapshot per day.
- **The daily force-push rewrites the `data` branch every day** → Already the per-release behavior, just more often; the branch is one root commit by design and holds no history to lose.
- **Daily churn in run history and Pages deployments** → Accepted cost of the requirement.

## Migration Plan

1. Merge the workflow change to `main` so the cron is registered; confirm the schedule appears on the workflow's Actions page.
2. Let one scheduled run happen, or dispatch manually first to confirm the job body is unchanged.
3. Verify after the first scheduled run: the `data` branch has a fresh snapshot commit, the Pages deployment timestamp advanced, and the published site's snapshot timestamp moved.

Rollback is removing the `schedule` block from the workflow on `main`; the workflow reverts to manual dispatch with no other cleanup, since scheduled and manual runs produce identical artifacts.
