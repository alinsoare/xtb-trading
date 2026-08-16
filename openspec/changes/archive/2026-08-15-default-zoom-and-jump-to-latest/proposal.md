## Why

Opening a chart currently fits the whole displayed slice into the viewport, so with the default 5,000-bar display limit a deep series arrives as an unreadable wall of hairline candles and the user has to zoom in by hand before every session's first look. And once they have set a zoom they like, the only way back to the newest bars is to pan by hand or to reload the chart, which throws the zoom away.

## What Changes

- The chart's initial view SHALL frame the most recent 200 bars of the displayed slice instead of fitting the entire slice. Bars older than that stay loaded and reachable by panning; only the initial viewport changes.
- The same 200-bar framing applies wherever the chart is presented afresh today: selecting an instrument, switching timeframe, changing the display limit, and reloading after a sync.
- A new "jump to latest" control in the chart toolbar scrolls the view so the newest displayed bar is back at the right edge, keeping the current zoom (the number of bars in view) exactly as the user left it.
- The control operates purely on bars already in memory. It never triggers a market-data fetch, and it works identically in static-export mode — "latest" means the newest stored bar, not a fresh quote.

**Assumptions recorded** (minor details, decided rather than asked):

- 200 is a fixed default, not a user-facing setting, and is the same on every timeframe. It is deliberately separate from the existing display limit, which bounds how many bars are drawn and pannable.
- Zoom and scroll position remain transient: they are not persisted across reloads, matching the existing rule that only the listed settings persist.
- A series holding fewer than 200 bars is simply shown in full, as it is today.
- The jump control stays available regardless of whether the view is already at the newest bar; pressing it then is a no-op the user cannot get wrong.

## Capabilities

### New Capabilities

None. Both behaviors belong to the existing chart view.

### Modified Capabilities

- `charting`: the initial chart view gains a bounded default zoom (most recent 200 bars) that is distinct from the display limit, and the chart gains a jump-to-latest control that restores the newest bars without altering the current zoom.

## Impact

- Frontend chart view: the two places that currently call `fitContent` after loading a slice (`web/app.js`, on candle load and on display-limit change) become a "frame the last N bars" operation; a new toolbar button and its handler are added alongside the existing chart-tools/display-limit controls in `web/index.html` and `web/styles.css`.
- No backend, API, data-contract, or dependency changes. No new market-data requests, so the offline-first constraint is untouched.
- Chart tools and indicators are unaffected: jumping to the latest bars is an ordinary pan, so a drawn measurement stays pinned to its bars rather than being discarded.
