## Why

The chart's vertical scale is whatever the charting library last decided, and a user who drags the price scale to look at something closely has no obvious way back to a sane framing — the scale stays where it was dragged as the user pans through history, so a window whose prices sit outside the dragged range draws candles squashed against an edge or off-screen. There is also no way to ask for a *defined* framing: when reading structure across many windows, the useful view is one where the visible high and the visible low always land in the same place on screen, so the shape of the move is comparable from window to window rather than depending on where the scale happens to be.

## What Changes

- A new **AUTO** toggle sits over the price scale in the lower-right corner of the chart area, visible whenever a chart is drawn.
- **Off** — the default and the current behavior: the vertical scale is left to the library and to the user, who can drag the price scale to change it exactly as today. Nothing about today's charting changes while the toggle is off.
- **On**: the vertical scale is derived from the visible bars, placing the highest visible price at 90% of the chart's height and the lowest visible price at 10%, leaving a tenth of the height as headroom above and below.
- Panning and zooming recompute that framing for the newly visible bars, so the 90/10 placement holds continuously as the user navigates left and right rather than only at the moment the toggle is pressed.
- Degenerate windows are defined rather than left to chance: a window whose visible bars are all at one price, or which contains no usable prices at all, keeps a readable chart instead of collapsing the scale or blanking the pane.
- Manual price-scale dragging is inert while the toggle is on — the framing is the toggle's to decide — and switching the toggle off hands the scale back to the user without losing the currently framed prices.
- The toggle is a durable preference: it persists across reloads alongside the other chart settings, while the zoom and scroll position continue not to persist.
- The control is keyboard-operable and announces its pressed state, as the existing toolbar controls do.

## Capabilities

### New Capabilities

None. This extends the existing chart surface rather than introducing a new capability.

### Modified Capabilities

- `charting`: adds a requirement for the AUTO vertical-scale toggle — its placement, its two states, the 90/10 framing math, recomputation while navigating, and degenerate-window behavior — and extends the settings-persistence requirement so the toggle's state is restored on the next load while transient view state still is not.

## Impact

- **Frontend only.** The chart page (`web/index.html`, `web/styles.css`, `web/app.js`) gains the control, its overlay placement, and the wiring that applies and recomputes the framing; the price-range arithmetic belongs in a pure helper under `web/chart/` alongside the existing framing helper, exercised by a new Node harness in `tests/js/`.
- **Persisted settings** (`web/settings.js`) gain one additive boolean, defaulting to off, so an existing browser restores today's behavior.
- **No backend, contract, data, or sync impact.** The framing reads bars already loaded in the chart; no code path here fetches market data, and the control is identical in dev-backend and static-export modes.
- **No new dependency and no build step**, consistent with the build-step-free frontend.
