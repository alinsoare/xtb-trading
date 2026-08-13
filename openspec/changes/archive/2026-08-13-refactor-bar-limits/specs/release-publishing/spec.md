## MODIFIED Requirements

### Requirement: Release is manually dispatched

A release SHALL be produced by a workflow the maintainer dispatches manually. The workflow
SHALL have no scheduled, push-based, or otherwise automatic trigger for data fetching: manual
dispatch is the explicit user action that authorizes the sync it performs. The dispatch SHALL
offer no bar-count or depth parameters, since fetch depth is fixed per timeframe; the only
choice it carries is whether to run incrementally or as a full refresh.

#### Scenario: Push to main does not release

- **WHEN** commits are pushed to the development branch
- **THEN** no release workflow runs, no data is fetched, and the published site is unchanged

#### Scenario: Manual dispatch releases

- **WHEN** the maintainer dispatches the release workflow
- **THEN** it syncs incrementally, exports static data, and deploys the updated site to GitHub Pages

### Requirement: Data snapshot persists between releases

The release workflow SHALL restore the data snapshot committed by the previous release before
syncing, run an incremental sync on top of it, and commit the updated snapshot back to a
dedicated data location in the repository. Bars SHALL never be re-pulled from scratch when a
prior snapshot exists, and a release SHALL NOT drop bars the snapshot already holds — the
snapshot only ever grows.

#### Scenario: First release

- **WHEN** the workflow is dispatched and no prior snapshot exists
- **THEN** it performs the initial backfill to each timeframe's fetch depth and commits the resulting snapshot

#### Scenario: Subsequent release

- **WHEN** the workflow is dispatched with a prior snapshot available
- **THEN** it restores that snapshot, fetches only the incremental window per symbol and timeframe, and commits the updated snapshot

#### Scenario: Accumulated history is republished

- **WHEN** successive releases accumulate history for a symbol
- **THEN** each release exports every bar the snapshot holds, so the published site's depth grows release over release

### Requirement: The published site is a passive snapshot

The published GitHub Pages site SHALL make no requests to the market data source and SHALL
offer no sync capability, including no periodic-refresh control. It SHALL display when its
data snapshot was generated so the user knows how fresh it is.

#### Scenario: Browsing the published site

- **WHEN** a user browses charts and toggles indicators on the Pages site
- **THEN** the only network requests are for the site's own static assets and data files, and the snapshot timestamp is visible

#### Scenario: No refresh control on the published site

- **WHEN** a user looks for a way to update the data on the Pages site
- **THEN** neither a sync control nor a periodic-refresh control is present, and the snapshot timestamp is the only indication of data age
