## MODIFIED Requirements

### Requirement: Sync runs only on explicit user action

In the application — the dev UI and the published site — a sync SHALL start only because the user asked for one: a sync control pressed, or a periodic refresh the user switched on for the current session. The system SHALL NOT schedule syncs outside that opt-in, run them at startup, resume a previously enabled periodic refresh on a later load, or fetch market data as a side effect of loading or viewing a chart.

In CI, the release workflow's triggers SHALL be the authorized substitute for that user action: a manual dispatch, or the workflow's twice-daily schedule, which the maintainer has authorized standing in advance so the published snapshot stays at most about half a day old. That schedule SHALL be the only automatic sync trigger anywhere in the system; it SHALL NOT be taken as license for client-side scheduling, background refresh, or any implicit fetch in the app.

#### Scenario: Viewing a chart is offline

- **WHEN** the user opens the app and browses charts without pressing a sync control
- **THEN** no request is made to the market data source

#### Scenario: The daily CI schedule is the only automatic sync

- **WHEN** a sync starts without anyone pressing a control
- **THEN** it is one of the release workflow's scheduled runs, and no client-side path exists that could have started it
