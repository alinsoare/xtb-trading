## 1. Workflow schedule

- [x] 1.1 In `.github/workflows/release.yml`, change the `schedule` cron from `0 12 * * *` to `0 3,15 * * *`, leaving `workflow_dispatch` and its `full` input untouched
- [x] 1.2 Update the workflow's header comment: scheduled runs fire twice per day at 03:00 and 15:00 UTC (Actions cron has no timezone field), and everything else about a scheduled run — unconditional pipeline, incremental-only, cron read from the default branch while the job checks out `release` — is unchanged
- [x] 1.3 Confirm no job step needs adjusting: `${{ inputs.full }}` is still empty on a `schedule` event, and `concurrency: { group: release, cancel-in-progress: false }` still serializes the two daily runs against each other and against a manual dispatch
- [x] 1.4 Verify the file parses as valid workflow YAML (e.g. `actionlint`, or a YAML parse)

## 2. Documentation and project context

- [x] 2.1 Update the `context:` block in `openspec/config.yaml` so the single sanctioned exception to offline-first reads as the twice-daily CI schedule (03:00 and 15:00 UTC) instead of the once-daily 12:00 UTC one, leaving every client-side prohibition as written
- [x] 2.2 Update the README's opening offline-first paragraph (the "daily 12:00 UTC schedule" mention) to the twice-daily cadence
- [x] 2.3 Update the README's "Releasing to GitHub Pages" section: the schedule fires twice a day at 03:00 and 15:00 UTC, each run releases unconditionally, full refresh stays manual-only, and the 60-day inactivity note now refers to the scheduled release rather than a daily one

## 3. Verification

- [x] 3.1 Re-read both delta specs and confirm the workflow and docs satisfy every scenario, in particular that the second run of a day still releases and that neither scheduled run can full-refresh
- [x] 3.2 Grep the repository for remaining "12:00 UTC", "once-daily", and "daily release" wording and reconcile anything that still states the old cadence
- [x] 3.3 Run the existing test suites unchanged (`uv run pytest` and the `tests/js/*.mjs` runners) to confirm this change touches no application behavior

## 4. Post-merge activation (needs the repository)

- [ ] 4.1 After the change lands on the default branch, confirm the workflow's Actions page shows the new twice-daily schedule
- [ ] 4.2 After the first 03:00 UTC and 15:00 UTC runs, verify each produced a fresh `data` branch snapshot commit and advanced the Pages deployment, so both slots work and the two runs did not collide
