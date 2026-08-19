## Why

The published Pages site only refreshes when the maintainer remembers to dispatch the release workflow, so its snapshot silently ages whenever a few days pass without a manual release. The maintainer has decided the published snapshot should be at most a day old without anyone touching GitHub, which means the project's "no scheduled syncing" rule has to be relaxed deliberately for CI rather than worked around.

## What Changes

- Add a `schedule` trigger to the release workflow that runs once a day at **12:00 UTC**, alongside the existing `workflow_dispatch`.
- Every scheduled run performs the full release pipeline unconditionally — restore snapshot, incremental sync, persist snapshot, export, deploy Pages — regardless of whether any code changed since the last release. The site is redeployed and the `data` branch snapshot is refreshed daily.
- Scheduled runs are always **incremental**. The full-refresh option stays available on manual dispatch only; nothing schedules a full re-pull.
- Scheduled runs publish from the same `release` branch a manual dispatch uses, so a scheduled release never picks up unreleased development work from `main`.
- **BREAKING (policy)**: the offline-first rule is amended. It currently reads that CI syncs only on manual dispatch, and the project context forbids proposing scheduled syncing outright. Both are narrowed to permit exactly one scheduled server-side sync — the daily release — while the app itself (dev UI and published site) keeps every existing prohibition: no startup sync, no fetch-on-view, no auto-resumed periodic refresh, no client-side scheduling.
- Documented operational behavior for the schedule: GitHub's cron is best-effort and may be delayed or dropped under load, the existing `release` concurrency group serializes a scheduled run against a manual one instead of running both, and GitHub disables scheduled workflows on repositories with no activity for 60 days.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `release-publishing`: "Release is manually dispatched" becomes a requirement that a release is produced either by manual dispatch or by a daily schedule; the scheduled run's unconditional full-pipeline behavior, incremental-only mode, release-branch source, and overlap handling become spec'd behavior.
- `sync`: "Sync runs only on explicit user action" is amended so the release workflow's daily schedule joins manual dispatch as an authorized CI trigger, while every client-side prohibition stays intact.

## Impact

- `.github/workflows/release.yml` — add the `schedule` trigger and the header comment explaining the amended rule; the job body is otherwise unchanged, since scheduled runs use the same steps with `inputs.full` unset (falsy), which already means incremental.
- `openspec/config.yaml` — the project context's blanket "do not propose scheduled/cron syncing" must be narrowed to the client-side prohibition it is now meant to express, otherwise every future change is planned against a rule the repository no longer follows.
- `README.md` — the offline-first paragraph and the "Releasing to GitHub Pages" section describe manual dispatch as the only release path and must document the daily schedule.
- No Python, frontend, or test code changes: no CLI flag, export shape, or data contract is affected.
- Operational: roughly one additional CI run and one `data` branch force-push per day, plus a daily Pages deployment; Yahoo fetch volume rises to at least one incremental sync per day.
