## Why

Using the ruler permanently kills drag-panning. The tool disables `handleScroll.pressedMouseMove`
while it is active so that the click ending a drag cannot drop an anchor, and restores the previous
value when it deactivates — but the value it restores is already the disabled one, so panning never
comes back. Switching instrument or timeframe does not help, because the app builds one chart at
load and reuses it; only a page reload clears the state. The chart-tools spec already promises that
deactivating a tool resumes normal chart interaction, so this is a defect against existing behavior,
not a new feature.

The cause is aliasing, not logic. In the pinned lightweight-charts build, `chart.options()` returns
the chart's live internal options object rather than a copy, and `applyOptions` deep-merges into the
nested objects in place. Saving `chart.options().handleScroll` therefore saves a reference to the
very object the next line mutates.

## What Changes

- The ruler SHALL capture its own copy of the scroll settings it overrides, so the restore is
  unaffected by the chart mutating its options in place, and drag-panning works again the moment the
  tool is deactivated — whether by its toolbar button, by activating another tool, or by switching
  instrument or timeframe.
- The scroll suppression moves out of the ruler's event wiring into a small dedicated helper with a
  single "suppress now, restore later" shape, so the save/restore pair cannot drift apart and can be
  tested without a browser.
- A regression test SHALL cover the aliasing itself: against a chart stub that reproduces the
  library's live-reference and in-place-merge behavior, a suppress/restore round trip leaves
  drag-panning enabled.
- Not in scope: drag-panning remains unavailable while the ruler is active, which is the existing
  deliberate trade-off. Only the restoration is being fixed.
- Also not in scope: the scroll option's boolean form. The chart API expands a boolean into its
  four flags before merging, so what the tool reads back is always the object form, and the
  boolean case cannot arise.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `chart-tools`: "Tools do not disturb normal chart interaction" gains the explicit guarantee that a
  tool restores every chart interaction setting it changed, with scenarios pinning down panning
  after the tool is switched off; "Tool state is per-view and not persisted" gains the matching
  guarantee for the implicit deactivation that a symbol or timeframe switch performs.

## Impact

- `web/chart-tools/ruler.js`: the activate/deactivate pair stops reading and writing chart options
  directly.
- A new small module under `web/chart-tools/` owning the suppression and its restore.
- `tests/js/`: a new harness, or a case in an existing one, covering the round trip.
- No backend, data contract, storage, or persisted-settings change; nothing about offline-first
  behavior is touched, and the fix triggers no fetch.
