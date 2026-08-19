## MODIFIED Requirements

### Requirement: Release is manually dispatched or runs on a daily schedule

A release SHALL be produced either by a workflow the maintainer dispatches manually or by a daily schedule built into that same workflow. The schedule SHALL run once per day at 12:00 UTC and SHALL be the only automatic trigger: the workflow SHALL have no push-based or other event-driven trigger that fetches data. Manual dispatch and the daily schedule are the two authorized triggers for the sync the workflow performs; nothing else may start one.

A scheduled run SHALL execute the same pipeline a manual dispatch does — restore snapshot, sync, persist snapshot, export, deploy — unconditionally, whether or not application code changed since the previous release. A scheduled run SHALL always sync incrementally and SHALL NOT perform a full refresh. Manual dispatch SHALL continue to offer exactly one choice, whether to run incrementally or as a full refresh, and SHALL offer no bar-count or depth parameters, since fetch depth is fixed per timeframe.

#### Scenario: Push to main does not release

- **WHEN** commits are pushed to the development branch
- **THEN** no release workflow runs, no data is fetched, and the published site is unchanged

#### Scenario: Manual dispatch releases

- **WHEN** the maintainer dispatches the release workflow
- **THEN** it syncs incrementally, exports static data, and deploys the updated site to GitHub Pages

#### Scenario: Daily scheduled release with no code change

- **WHEN** the daily schedule fires and no application code has changed since the previous release
- **THEN** the workflow still syncs incrementally, persists the updated snapshot, exports, and redeploys the site, so the published snapshot is refreshed anyway

#### Scenario: Daily scheduled release after a code change

- **WHEN** the daily schedule fires after the release branch has advanced
- **THEN** the run builds and deploys from the release branch's current state, publishing both the newer code and the freshly synced data

#### Scenario: Scheduled runs never full-refresh

- **WHEN** a scheduled release runs
- **THEN** it syncs incrementally on top of the restored snapshot, and a full refresh remains available only by manual dispatch

### Requirement: Development and release channels are separate

The main branch SHALL remain the development line. Publishing SHALL happen from an explicitly designated release ref/branch so that ongoing development neither blocks nor accidentally alters what is published. A scheduled release SHALL publish from that same release ref, so the schedule never promotes unreleased development work.

#### Scenario: Development continues after a release

- **WHEN** development commits land on main after a release
- **THEN** the published site continues serving the released version until a new release runs

#### Scenario: Scheduled release does not promote development work

- **WHEN** the daily schedule fires while main holds commits that have not been promoted to the release ref
- **THEN** the run publishes the release ref's code, leaving those commits unpublished

## ADDED Requirements

### Requirement: Scheduled and manual releases do not overlap

At most one release run SHALL be in flight at a time. When a scheduled run and a manual dispatch coincide, the later one SHALL wait for the running one to finish rather than running concurrently or cancelling it, so two runs never force-push the data snapshot or deploy Pages at the same time.

#### Scenario: Manual dispatch during a scheduled run

- **WHEN** the maintainer dispatches a release while the daily scheduled run is still executing
- **THEN** the dispatched run waits until the scheduled run completes, and neither run is cancelled

#### Scenario: Schedule fires during a manual release

- **WHEN** the daily schedule fires while a manually dispatched release is still executing
- **THEN** the scheduled run waits rather than running alongside it

### Requirement: A missed scheduled release degrades gracefully

The scheduled release SHALL be treated as best-effort: the platform may delay or drop a scheduled run, and the schedule SHALL be resumable by the maintainer if the platform suspends it for repository inactivity. A skipped day SHALL cost nothing beyond freshness — the next run, scheduled or manual, SHALL sync incrementally from the last persisted snapshot and catch up without re-pulling history.

#### Scenario: A scheduled run is skipped

- **WHEN** a day's scheduled run does not fire
- **THEN** the published site keeps serving the previous snapshot, and the next run restores that snapshot and fetches only the widened incremental window

#### Scenario: Published snapshot age stays visible

- **WHEN** a user loads the published site after a missed scheduled release
- **THEN** the displayed snapshot timestamp reflects the last release that actually ran, so staleness is visible rather than implied by the schedule
