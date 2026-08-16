## Why

The ruler stops responding the moment the pointer crosses the newest bar. Because every anchor must resolve to a stored bar time, moving into the empty space to the right of the last candle freezes the preview at the last position that was over a bar, and clicking there does nothing at all. That empty space is exactly where a trader wants to measure into — projecting a move forward from a swing to judge how far ahead a target sits — and the default view now reserves that space at the right edge, so the user meets the dead zone constantly rather than rarely.

## What Changes

- A measurement that starts on a stored bar can be extended into the empty space to the right of the newest bar: the preview keeps following the pointer and the second click lands there and completes the measurement.
- Bars past the newest one are projected forward at the series' own bar spacing, so the readout keeps counting bars and elapsed time as the pointer moves further right instead of standing still at the newest bar.
- Starting a measurement in the empty space is still refused, so a measurement always has at least one end anchored to real data — this is the "started before or at the latest bar" condition.
- No change to measurements that stay inside the stored range, to the readout format, or to how a measurement is dismissed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `chart-tools`: the two-click measurement requirement currently ties both anchors to stored bars, which makes an anchor past the newest bar impossible. It gains the projected-bar case for the end anchor, the rule that the start anchor must be a stored bar, and how bar count and elapsed time read once the end anchor sits beyond the newest bar.

## Impact

- `web/chart-tools/ruler.js`: anchor construction must accept a pointer position in the empty space (the chart reports no bar time there) and refuse it only for the first click; the renderer must place the region's right edge at a projected time.
- `web/chart-tools/measure.js`: the measurement math gains projected end anchors — bar count and elapsed time extend past the last stored index instead of being clamped to it. Covered by `tests/js/run_measure.mjs`, which extends with the new cases.
- `web/chart/coords.js`: the shared x-coordinate helper may need to resolve a time that lies past the newest bar, where the chart's time-to-coordinate mapping has no bar to key on.
- No backend, storage, or market-data involvement: the projection is arithmetic over already-loaded bars, so the tool still fetches nothing and works identically in static export mode.
