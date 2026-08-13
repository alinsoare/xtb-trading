# Delta Spec: release-publishing

## Purpose

Covers publishing the app as a static site on GitHub Pages: the exported data contract, the manually-dispatched release pipeline, and the data-snapshot persistence that keeps CI syncs incremental instead of re-pulling history from scratch.

## ADDED Requirements

### Requirement: Static data export

The system SHALL export the local data store to static files consumable by the frontend without a backend: a catalog manifest (instruments with compatibility flags and sync freshness) and per-symbol, per-timeframe bar files, plus metadata recording when the snapshot was generated. The exported shapes SHALL match what the dev backend serves, so the same frontend code reads both.

#### Scenario: Export round-trip

- **WHEN** the exporter runs against a synced data store
- **THEN** loading the static site from the exported files shows the same instruments, bars, and warnings as the dev app showed

### Requirement: The release can be rehearsed locally

Every step of the release pipeline except the deployment itself SHALL be runnable locally: the headless sync, the exporter, and a preview of the exported site served as plain static files. The locally exported artifact SHALL match what the workflow publishes, so a maintainer can validate a release end to end before pushing anything to GitHub.

#### Scenario: Local rehearsal before dispatching

- **WHEN** the maintainer runs the sync and exporter locally and serves the export directory with a plain static file server
- **THEN** the site behaves exactly as it will on GitHub Pages — browsing, charts, indicators, snapshot timestamp — with nothing pushed to GitHub

### Requirement: Release is manually dispatched

A release SHALL be produced by a workflow the maintainer dispatches manually. The workflow SHALL have no scheduled, push-based, or otherwise automatic trigger for data fetching: manual dispatch is the explicit user action that authorizes the sync it performs. The dispatch MAY carry per-timeframe bar-count target adjustments, forwarded to the sync run and clamped to the same floor and per-timeframe hard maxima as any other sync.

#### Scenario: Push to main does not release

- **WHEN** commits are pushed to the development branch
- **THEN** no release workflow runs, no data is fetched, and the published site is unchanged

#### Scenario: Manual dispatch releases

- **WHEN** the maintainer dispatches the release workflow
- **THEN** it syncs incrementally, exports static data, and deploys the updated site to GitHub Pages

### Requirement: Data snapshot persists between releases

The release workflow SHALL restore the data snapshot committed by the previous release before syncing, run an incremental sync on top of it, and commit the updated snapshot back to a dedicated data location in the repository. Bars SHALL never be re-pulled from scratch when a prior snapshot exists.

#### Scenario: First release

- **WHEN** the workflow is dispatched and no prior snapshot exists
- **THEN** it performs the initial full backfill to the bar-count targets and commits the resulting snapshot

#### Scenario: Subsequent release

- **WHEN** the workflow is dispatched with a prior snapshot available
- **THEN** it restores that snapshot, fetches only the incremental window per symbol and timeframe, and commits the updated snapshot

### Requirement: The published site is a passive snapshot

The published GitHub Pages site SHALL make no requests to the market data source and SHALL offer no sync capability. It SHALL display when its data snapshot was generated so the user knows how fresh it is.

#### Scenario: Browsing the published site

- **WHEN** a user browses charts and toggles indicators on the Pages site
- **THEN** the only network requests are for the site's own static assets and data files, and the snapshot timestamp is visible

### Requirement: Development and release channels are separate

The main branch SHALL remain the development line. Publishing SHALL happen from an explicitly designated release ref/branch so that ongoing development neither blocks nor accidentally alters what is published.

#### Scenario: Development continues after a release

- **WHEN** development commits land on main after a release
- **THEN** the published site continues serving the released version until the maintainer dispatches a new release
