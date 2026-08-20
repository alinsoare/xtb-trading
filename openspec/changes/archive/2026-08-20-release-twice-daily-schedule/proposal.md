## Why

The scheduled release fires once a day at 12:00 UTC, so the published snapshot can be nearly 24 hours stale and a single missed or delayed run stretches that to two days. Firing twice a day halves worst-case staleness and gives the schedule a second chance to land the same day, at the cost of one extra CI run.

## What Changes

- The release workflow's scheduled trigger runs **twice per day, at 03:00 UTC and 15:00 UTC**, instead of once per day at 12:00 UTC. The cron expression changes from `0 12 * * *` to `0 3,15 * * *`.
- The freshness guarantee tightens from "at most about a day old" to "at most about half a day old". Nothing else about a scheduled run changes: it still runs the full pipeline unconditionally, still syncs incrementally only, still publishes from the `release` ref, and is still the only automatic sync trigger anywhere in the system.
- No new trigger type and no new authorization: schedule and `workflow_dispatch` remain the only two triggers, and every client-side prohibition in the offline-first rule stays exactly as it is.
- Documentation that states the cadence as "daily at 12:00 UTC" — the workflow header comment, the README, and the project context in `openspec/config.yaml` — is restated as the twice-daily cadence, so future planning is not done against a rule the repository no longer follows.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `release-publishing`: "Release is manually dispatched or runs on a daily schedule" changes its stated cadence from once per day at 12:00 UTC to twice per day at 03:00 UTC and 15:00 UTC; the scenarios that name "the daily schedule" are reworded to the scheduled run without changing what they assert.
- `sync`: "Sync runs only on explicit user action" changes the CI exception from the workflow's once-daily schedule to its twice-daily schedule, tightening the stated freshness bound while keeping the schedule the sole automatic sync trigger.

## Impact

- `.github/workflows/release.yml` — the `schedule` cron value and the header comment describing the cadence. The job body is untouched: both runs use the same steps with `inputs.full` unset, which already means incremental.
- `openspec/config.yaml` — the project context names the once-daily 12:00 UTC schedule as the single sanctioned exception to offline-first; it must name the twice-daily schedule instead.
- `README.md` — the offline-first paragraph and the "Releasing to GitHub Pages" section state the daily 12:00 UTC cadence.
- No Python, frontend, or test code changes: no CLI flag, export shape, or data contract is affected.
- Operational: roughly two CI runs, two `data` branch force-pushes, and two Pages deployments per day instead of one each; Yahoo fetch volume doubles to two incremental syncs per day, each covering a shorter window. The two times are roughly 12 hours apart, so the gap between refreshes is even rather than lopsided.
