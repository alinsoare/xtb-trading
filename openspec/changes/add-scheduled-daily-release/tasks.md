## 1. Workflow

- [x] 1.1 Add `schedule: - cron: "0 12 * * *"` to `.github/workflows/release.yml` alongside the existing `workflow_dispatch`, leaving the `full` input on dispatch only
- [x] 1.2 Rewrite the workflow's header comment: the two authorized triggers, that scheduled runs are unconditional and always incremental, that noon means 12:00 UTC because Actions cron has no timezone, and that the cron is only honored from the default branch while the job still checks out `release`
- [x] 1.3 Confirm no other step needs a guard — `${{ inputs.full }}` is empty on a `schedule` event so the sync stays incremental, `concurrency: { group: release, cancel-in-progress: false }` already queues an overlapping run, and the declared `contents`/`pages`/`id-token` permissions apply unchanged to scheduled runs
- [x] 1.4 Verify the file parses as valid workflow YAML (e.g. `actionlint`, or a YAML parse) before moving on

## 2. Offline-first policy

- [x] 2.1 Narrow the `context:` block in `openspec/config.yaml`: scope the prohibition to the application surface (no startup sync, no fetch-on-view, no auto-resumed periodic refresh, no client-side timers, no streaming) and name the once-daily CI release as the single sanctioned automatic sync, so future planning sessions are not told to forbid what the repository now does
- [x] 2.2 Update the README's opening offline-first paragraph to list the daily scheduled release alongside the existing user-initiated sync paths
- [x] 2.3 Update the README's "Releasing to GitHub Pages" section: the daily 12:00 UTC schedule, that each scheduled run syncs and redeploys whether or not code changed, that full refresh remains manual-only, and that GitHub disables scheduled workflows after 60 days of repository inactivity and they must be re-enabled from the Actions tab

## 3. Verification

- [x] 3.1 Re-read the two delta specs and confirm the workflow and docs satisfy every scenario, in particular that a scheduled run cannot full-refresh and cannot publish anything but the release ref
- [x] 3.2 Run the existing test suites unchanged (`uv run pytest` and the `tests/js/*.mjs` runners) to confirm this change touches no application behavior
- [x] 3.3 Rehearse the release locally (`uv run xtb-charts sync`, `uv run xtb-charts export`, static preview) to confirm the pipeline a scheduled run executes is still the one a maintainer can reproduce

## 4. Post-merge activation (needs the repository)

- [ ] 4.1 After the change lands on the default branch, confirm the schedule is registered on the workflow's Actions page
- [ ] 4.2 After the first scheduled run, verify the `data` branch holds a fresh snapshot commit, the Pages deployment advanced, and the published site's snapshot timestamp moved
