## MODIFIED Requirements

### Requirement: Release is manually dispatched or runs on a daily schedule

A release SHALL be produced either by a workflow the maintainer dispatches manually or by a schedule built into that same workflow. The schedule SHALL run twice per day, at 03:00 UTC and 15:00 UTC, and SHALL be the only automatic trigger: the workflow SHALL have no push-based or other event-driven trigger that fetches data. Manual dispatch and the scheduled runs are the two authorized triggers for the sync the workflow performs; nothing else may start one.

A scheduled run SHALL execute the same pipeline a manual dispatch does — restore snapshot, sync, persist snapshot, export, deploy — unconditionally, whether or not application code changed since the previous release. A scheduled run SHALL always sync incrementally and SHALL NOT perform a full refresh. Manual dispatch SHALL continue to offer exactly one choice, whether to run incrementally or as a full refresh, and SHALL offer no bar-count or depth parameters, since fetch depth is fixed per timeframe.

Both scheduled runs SHALL behave identically: neither time of day is privileged, and the second run of a day SHALL NOT skip work merely because the first one already released that day.

#### Scenario: Push to main does not release

- **WHEN** commits are pushed to the development branch
- **THEN** no release workflow runs, no data is fetched, and the published site is unchanged

#### Scenario: Manual dispatch releases

- **WHEN** the maintainer dispatches the release workflow
- **THEN** it syncs incrementally, exports static data, and deploys the updated site to GitHub Pages

#### Scenario: Daily scheduled release with no code change

- **WHEN** a scheduled run fires and no application code has changed since the previous release
- **THEN** the workflow still syncs incrementally, persists the updated snapshot, exports, and redeploys the site, so the published snapshot is refreshed anyway

#### Scenario: Daily scheduled release after a code change

- **WHEN** a scheduled run fires after the release branch has advanced
- **THEN** the run builds and deploys from the release branch's current state, publishing both the newer code and the freshly synced data

#### Scenario: Scheduled runs never full-refresh

- **WHEN** a scheduled release runs
- **THEN** it syncs incrementally on top of the restored snapshot, and a full refresh remains available only by manual dispatch

#### Scenario: The second scheduled run of the day still releases

- **WHEN** the 15:00 UTC run fires on a day the 03:00 UTC run already released successfully
- **THEN** it performs the same unconditional pipeline again, refreshing the snapshot and redeploying the site
