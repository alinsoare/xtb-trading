## Context

The release workflow already runs on a fixed UTC cron with no timezone field. The only behavioral change is firing twice per day instead of once.

## Goals / Non-Goals

**Goals:**
- Halve worst-case published snapshot staleness with a second daily run.
- Keep every other scheduled-run property unchanged: unconditional pipeline, incremental-only, `release` ref checkout, serialized concurrency.

**Non-Goals:**
- New triggers, push-based releases, or client-side scheduling changes.
- Job step or input changes — `inputs.full` stays unset on schedule events.

## Decisions

### D1: Cron `0 3,15 * * *`

Two runs roughly twelve hours apart at 03:00 and 15:00 UTC. Same GitHub Actions cron semantics as the previous once-daily slot; only the expression and documentation change.

## Risks / Trade-offs

- **Doubled CI cost** → Acceptable for fresher published data; each run remains incremental.
- **Back-to-back runs if one overruns** → Existing `concurrency: { group: release, cancel-in-progress: false }` still serializes overlapping schedule and manual runs.
