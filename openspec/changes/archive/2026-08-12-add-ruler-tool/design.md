## Context

See `proposal.md` — Why. The relevant existing state, all frontend:

- `web/app.js` creates one lightweight-charts chart with one candlestick series, holds all UI state in a single `state` object, and reloads bars through `loadCandles()` with a request-sequence guard.
- `web/indicators/registry.js` renders indicator output through a v5 series primitive (`IndicatorPrimitive`) at `zOrder: "bottom"`, i.e. behind the candles. It paints `rect` and `label` drawables and owns a private `xCoordinate()` helper that clamps partially-visible shapes to the pane edge.
- Indicator toggle buttons are rendered from the registry into `#indicator-toggles`; enabled state is session-only and survives symbol/timeframe switches by design.
- `#toolbar` is a flex row holding `#timeframes`, `#indicator-toggles`, and `#sync-controls`, where `#sync-controls` already claims the right side with `margin-left: auto`.
- Frontend test infrastructure is one Node harness (`tests/js/run_fixtures.mjs`) that imports chart-free modules and compares them against recorded fixtures. There is no DOM or browser test runner, and no bundler.

Bar times are UTC epoch seconds throughout, and `state.bars` is sorted ascending by time.

## Goals / Non-Goals

**Goals:**

- Keep pointer-driven tools structurally separate from indicators, so neither's lifecycle leaks into the other.
- Put the measurement arithmetic in a chart-free module so the spec's scenarios are covered by the existing Node harness rather than by manual clicking.
- Draw the measurement so it stays glued to its bars through pan and zoom, reusing the coordinate handling the indicator renderer already got right.

**Non-Goals:**

- No drawing tools beyond the ruler (trendlines, boxes, fibs), no multiple simultaneous measurements, no editing or dragging an existing measurement's anchors.
- No keyboard shortcut for activating the tool, and no persistence of tool state.
- No change to the price scale, the chart's interaction defaults when no tool is active, or any backend behavior.

## Decisions

### The ruler is a chart tool with its own registry, not an indicator

The indicator contract is `compute(bars, instrument) -> { drawables, warning }`: a pure function of bar data, recomputed when data changes. A ruler is driven by pointer events and holds in-progress state across events, so forcing it through `registerIndicator` would mean an indicator whose `compute` ignores its arguments and whose output changes on mousemove. Instead a small `web/chart-tools/registry.js` holds `{ id, label, activate(ctx), deactivate() }` entries plus a single `activeToolId`, and a `setActiveTool(id)` that deactivates the previous tool — which is where the spec's mutual-exclusivity requirement lives, in one place, even though the ruler is the only tool today.

Alternative considered: an `activeTool` field in `state` with the ruler wired directly into `app.js`. Rejected because the toolbar rendering and the exclusivity rule would then have to be re-derived by the next tool added, which the proposal expects.

### A second series primitive, at `zOrder: "top"`

The measurement must be readable over the candles, and `IndicatorPrimitive` is deliberately behind them. Rather than teach that class about a second pane view with a different z-order and a different drawable vocabulary, the ruler gets its own primitive attached to the same candle series, drawing at `zOrder: "top"`: a translucent filled region between the anchors, a connector between the anchor points, and a label box with an opaque background so its text stays legible over candles.

The `xCoordinate()` clamping logic is needed identically by both renderers, so it moves to a shared chart-free `web/chart/coords.js` that `registry.js` imports. Alternative considered: exporting it from `indicators/registry.js` and importing that from the tool. Rejected — it would make the tools layer depend on the indicators layer for a generic geometry helper.

### Anchors come from the chart's own click and crosshair events

`subscribeClick` and `subscribeCrosshairMove` both deliver `{ time, point }`, where `time` is already snapped to the bar under the pointer. That snapping is exactly the "anchors span whole bars" behavior in the spec, so the anchor is `{ time: param.time, price: candleSeries.coordinateToPrice(param.point.y) }`. Events without a `time` (the whitespace beyond the last bar) or without a `point` (pointer left the pane) are ignored rather than clamped, so a stray click never creates a degenerate measurement.

Alternative considered: raw DOM `mousedown`/`mousemove` listeners on the chart container with manual bar hit-testing. Rejected as re-implementing coordinate mapping the library already exposes.

### Drag-panning is disabled while a tool is active

lightweight-charts emits a click at the end of a drag, so with pan enabled a pan gesture would drop an unintended anchor. While a tool is active the chart's `handleScroll.pressedMouseMove` is turned off and the previous option values are restored on deactivation. Wheel zoom, pinch, and axis dragging stay available, so the chart is still navigable mid-measurement.

Alternative considered: measuring pointer travel between `mousedown` and `mouseup` and discarding clicks that moved more than a few pixels. Rejected as a heuristic with a threshold to tune, when the option toggle is exact and reversible. Trade-off: the user cannot drag the chart body to pan while the ruler is active.

### Escape is handled only while a tool is active

The keydown listener is added on activation and removed on deactivation, so the app installs no permanent global key handler. Escape cancels an in-progress measurement if there is one, otherwise clears a completed measurement; it does not deactivate the tool, matching the spec.

### The toolbar's right side becomes one cluster

`#sync-controls` already uses `margin-left: auto`. Adding a second auto-margin element would split the free space between the two and park the ruler mid-row, so the markup instead wraps the right-hand items in a single `#toolbar-right` container that carries `margin-left: auto`, with the tool buttons first and the sync controls after. The ruler then sits flush right in static mode, where sync controls are hidden, and immediately left of the sync controls in dev mode. Tool buttons reuse the existing `button` / `button.active` styles, so the ruler is visually a sibling of the FVG toggle as requested.

### Measurement math is a pure module, tested by the existing harness

`web/chart-tools/measure.js` exports a chart-free `measure(bars, fromAnchor, toAnchor)` returning the price change, signed percent change, inclusive bar count, elapsed seconds, direction, and the formatted label lines. Bar indices come from a binary search over the ascending `state.bars`, and anchors are normalized so a measurement drawn right-to-left reports non-negative bar count and elapsed time while the price change stays relative to the first-clicked anchor. `tests/js/` gains a harness for this module covering the spec's edge scenarios (same-bar, reversed, up, down) — no fixtures from Python needed, since this is app behavior rather than a port with parity obligations.

Elapsed time is the wall-clock difference between the two bar timestamps, so on D1 and W1 it includes weekends and holidays. That is what TradingView reports too, and the bar count is the market-time measure standing beside it; the label shows both so neither is read alone.

### Price precision comes from the instrument's point size

The catalog payload already carries `point_size` per instrument, so decimals are derived from it in a shared `formatPrice(value, instrument)` helper. The crosshair legend currently hardcodes `toFixed(2)`, which would make a 5-decimal FX pair's ruler readout disagree with the legend above it; the legend is pointed at the same helper so the two agree. No stated charting requirement covers legend precision, so this is a consistency fix rather than a behavior change.

### Tool state is cleared where the chart data changes

`state.ruler` (pending anchor and completed measurement) is reset in the same place symbol and timeframe changes already flow through, so a measurement can never outlive the bars it referenced. The tool stays active across such a switch only if that is what the reset code does — the spec requires the measurement to be discarded, and the simpler reading is to deactivate the tool as well, which is what `setActiveTool(null)` on data change gives.

## Risks / Trade-offs

- **Repainting on every mousemove during a preview feels sluggish** → The preview draws one region plus one label box through the library's own `requestUpdate`, the same path indicators already repaint through; if it does drag on a 1000-bar chart, the fix is to coalesce updates into a `requestAnimationFrame`, not to change the interaction.
- **No automated coverage of pointer interaction, activation, or drawing** → Keep the renderer and event wiring thin and push every decision worth testing into `measure.js`; verify the interactive parts by hand against the local dev server, and also in a local static rehearsal so both modes are exercised.
- **Disabling drag-pan surprises a user who expects to pan mid-measurement** → The active-state button makes the mode obvious, wheel zoom and axis drag still work, and Escape plus a second button press both exit quickly.
- **The measurement obscures candles or drifts off-screen** → The region is translucent with only the label box opaque, and the label is placed inside the pane so a measurement anchored off the visible range does not paint its text outside the chart.
- **A click that lands in whitespace or outside the data range yields no anchor and looks broken** → Ignoring the event is the deliberate behavior; because no anchor is set, nothing is drawn and the next click on a real bar starts cleanly.
- **Extracting `xCoordinate()` touches the indicator renderer** → It is a pure move of a private helper with no signature change, and the existing FVG fixture harness plus a visual check on a chart with FVG enabled confirm indicators still paint identically.

## Migration Plan

None required: additive, frontend-only, no data model, contract, or API change, and nothing persisted. The static exporter copies `web/` wholesale, so new files ship with the next export; a local rehearsal before any release confirms the static mode. Rollback is reverting the change — with no tool active, chart behavior is untouched.

## Open Questions

- The granularity of the elapsed-time string on intraday timeframes (whether an M15 span reads `4h` or `4h 15m`, and where minutes stop being shown). Purely a formatting detail inside `measure.js`; it changes no requirement, no structure, and no task.
