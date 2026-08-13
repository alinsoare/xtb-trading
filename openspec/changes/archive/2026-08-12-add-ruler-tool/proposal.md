## Why

Reading a chart is only half the job — deciding whether a move is worth trading means knowing how big it was. Today the only way to measure a move is to hover two candles and do the arithmetic by hand, which is slow and error-prone. TradingView's ruler solves this with a two-click measurement; the app needs the same affordance.

## What Changes

- Add a **ruler** chart tool: the user activates it, clicks a start point on the chart, sees a live preview as the pointer moves, and clicks again to finish the measurement.
- The finished measurement persists on the chart until dismissed (Escape, starting a new measurement, or deactivating the tool), so it can be read while thinking about the trade.
- The measurement box reports **price change, percent change, bar count, and elapsed time** between the two anchors, and is coloured by direction (up vs down).
- Add a toolbar toggle button for the ruler, styled like the FVG indicator toggle, placed on the **right side of the existing toolbar row** that holds the timeframe buttons and indicator toggles.
- The ruler is a *chart tool*, not an indicator: it is driven by pointer input rather than computed from bar data, so it lives outside the indicator registry and does not appear among indicator toggles.
- Measurements are per-chart-view state only: switching instrument or timeframe clears any active measurement, and nothing about the ruler is persisted across page loads (consistent with the existing no-persistence decision for indicator toggles).
- Works identically in dev-backend mode and static-export mode, since it needs no backend and triggers no data fetch.

## Capabilities

### New Capabilities

- `chart-tools`: Interactive, pointer-driven tools that operate on the rendered chart rather than computing from bar data — activation and mutual exclusivity of tools, their toolbar controls, and the ruler measurement itself. Future drawing tools (trendlines, boxes) belong here too.

### Modified Capabilities

None. The ruler's toolbar button sits in the toolbar that the `charting` capability describes, but `charting` has no main spec yet (`openspec/specs/` is empty because `rebuild-xtb-trading` has not been archived). Rather than have two active changes write competing delta specs for the same capability path, this change declares its own capability and keeps `charting`'s requirements untouched.

## Impact

- **Frontend only.** New chart-tools module(s) under `web/` plus wiring in `web/app.js`, toolbar markup in `web/index.html`, and styles in `web/styles.css`.
- **No backend changes**: no Python modules, no API endpoints, no data contract or database changes. The static exporter needs no change beyond copying the new `web/` files it already copies wholesale.
- **No new dependencies.** Built on the lightweight-charts primitive/coordinate APIs already used by the FVG indicator, with no bundler or Node runtime added.
- **Interaction risk to watch**: the tool subscribes to chart click and crosshair events, so it must not break existing crosshair OHLC readout, pan/zoom, or indicator rendering when inactive.
