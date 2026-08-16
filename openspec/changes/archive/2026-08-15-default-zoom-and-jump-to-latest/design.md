## Context

See proposal.md — Why. The relevant current state:

- `web/app.js` funnels every bar into the chart through one `applySlice()`, and both callers that present a fresh series (`loadCandles()` and `changeDisplayLimit()`) follow it with `chart.timeScale().fitContent()`. Those two calls are the entire current framing policy.
- The frontend is build-step-free vanilla JS against the pinned lightweight-charts 5.0.9 CDN global. Pure helper modules under `web/chart/` and `web/chart-tools/` are exercised by dev-time Node harnesses in `tests/js/` with stub chart objects; anything that only exists inside an event handler is untestable in that setup.
- `web/settings.js` decides what persists. Zoom has never been part of it.
- Chart tools rely on the time scale continuing to behave normally; `scroll-lock.js` exists precisely because a tool that mutates chart options and restores them badly leaves the chart unusable.

## Goals / Non-Goals

**Goals:**

- Express framing as bar counts, not pixels, so the default is identical regardless of the container's width or the device's pixel ratio.
- Keep the arithmetic (which bars a default frame spans) in a pure, unit-testable helper, consistent with how the display limit and ruler math are tested.
- Make the jump control an action that reads no chart state it does not have to, so it cannot drift out of sync with the user's zoom.

**Non-Goals:**

- No configurable default-zoom setting and no persistence of zoom or scroll position. Both are deliberate; adding either later is additive.
- No change to how bars are sliced, fetched, or exported, and no new dependency or build step.
- No animated or "smart" scrolling behavior beyond returning the view to the newest bar.

## Decisions

**Frame the default zoom with a visible logical range, not bar spacing.** `timeScale().setVisibleLogicalRange({ from, to })` takes logical bar indices, so "the last 200 bars" is stated directly and the library derives the bar spacing for the current width. The alternative — computing a `barSpacing` from the container width and calling `scrollToRealTime()` — would make the default zoom depend on the viewport size, so the same chart would show a different number of bars on a laptop and an external monitor. Framing runs after `candleSeries.setData()`, replacing the two `fitContent()` calls; it belongs in one helper called from the same two places, so the "one place bars enter the chart" property in `applySlice()` is not weakened by a second framing policy appearing later.

**Reserve the same right-edge margin the chart already uses.** The `to` end of the range is the newest bar's index plus the time scale's right offset, so the newest candle is not flush against the price scale. That keeps the initial view and the post-jump view visually identical rather than subtly different by a few bars.

**Jump to latest via `timeScale().scrollToRealTime()`.** It scrolls to the newest bar while leaving bar spacing untouched, which is exactly the required behavior, and it preserves zoom by construction rather than by us reading the current logical range and re-deriving a shifted one. The read-and-shift alternative was rejected because it has to reproduce the right-offset arithmetic and would round the span, so repeated presses could creep the zoom. Because it makes no options change, there is nothing to restore afterwards and no interaction with `scroll-lock.js`.

**Put the control in the toolbar's right-hand group as a plain button, not a chart tool.** Chart tools are modes governed by "at most one active" and by activation/restore rules; this is a one-shot action with no state. Registering it in the chart-tools registry would drag it into those rules and let it deactivate the ruler for no reason. It sits next to the display-limit control in `web/index.html`, disabled when the current series has no bars so that the empty-state scenario needs no special-casing in the handler.

**Extract the framing arithmetic into a pure helper under `web/chart/`.** A function of (bar count, default zoom, right offset) returning the logical range — or `null` when there are no bars — is directly testable by a new `tests/js/run_viewport.mjs` harness alongside the existing ones, covering the deep series, the fewer-than-200-bars case, and the empty series. The DOM wiring and the `scrollToRealTime()` call stay thin enough to verify by hand in the browser.

**Keep 200 as a named constant next to the display-limit default.** The two numbers are related and easy to confuse; naming both in one place makes the distinction (available versus visible) legible to the next reader.

## Risks / Trade-offs

- **A user who liked the old fit-everything view loses it on every timeframe switch.** → It is one gesture to zoom out, panning still reaches every bar in the slice, and framing on a wall of hairline candles was the problem being fixed. No setting is added for it unless asked for.
- **`scrollToRealTime()` behaves differently than expected against a series whose newest bar is already visible.** → The spec requires a no-op there, and the manual check list includes pressing the control immediately after a chart opens.
- **Framing before the chart has been laid out (first paint, hidden container) could compute against a zero width.** → The framing call happens after `setData()` in the same paths that already called `fitContent()` successfully, so it runs no earlier than the working code does; the logical range is width-independent in any case.
- **A future indicator pane or tool that manipulates the time scale could fight the default framing.** → Framing is a single helper invoked from two known call sites, so a conflict is found by reading one function rather than by hunting scattered `fitContent()` calls.
