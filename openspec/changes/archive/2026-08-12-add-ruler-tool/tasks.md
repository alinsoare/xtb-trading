## 1. Shared groundwork

- [x] 1.1 Move the `xCoordinate()` clamping helper out of `web/indicators/registry.js` into a new chart-free `web/chart/coords.js`, import it back into `registry.js`, and confirm `node tests/js/run_fixtures.mjs` still passes
- [x] 1.2 Add a `formatPrice(value, instrument)` helper deriving decimals from the instrument's `point_size`, and point the existing crosshair legend at it in place of its hardcoded two decimals

## 2. Measurement math (pure, testable)

- [x] 2.1 Create `web/chart-tools/measure.js` with a chart-free `measure(bars, fromAnchor, toAnchor)` that binary-searches bar indices and returns price change, signed percent change, inclusive bar count, elapsed seconds, and direction
- [x] 2.2 Normalize reversed measurements so bar count and elapsed time are non-negative magnitudes while price change stays relative to the first-clicked anchor
- [x] 2.3 Handle the same-bar case as bar count 1 with zero elapsed time
- [x] 2.4 Add label formatting: price change and signed percent at instrument precision, bar count, and a compact elapsed-time string
- [x] 2.5 Add `tests/js/run_measure.mjs` covering upward, downward, reversed, and same-bar measurements plus percent-change and bar-count arithmetic, and note the command in `README.md` beside the fixture harness

## 3. Tool framework

- [x] 3.1 Create `web/chart-tools/registry.js` with `registerTool({ id, label, activate, deactivate })`, `allTools()`, `activeToolId()`, and a `setActiveTool(id)` that deactivates the previously active tool before activating the new one
- [x] 3.2 Render a tool button group in the toolbar from the registry, reusing the existing `button` / `button.active` styles, wired to `setActiveTool`
- [x] 3.3 Restructure the toolbar markup so `#timeframes` and `#indicator-toggles` stay left while a single `#toolbar-right` container carries `margin-left: auto` and holds the tool buttons followed by `#sync-controls`; drop the now-redundant auto margin from `#sync-controls`
- [x] 3.4 Verify the tool button sits flush right in static mode and immediately left of the sync controls in dev mode, on the same row as the timeframes and FVG toggle

## 4. Ruler rendering

- [x] 4.1 Add a `RulerPrimitive` in `web/chart-tools/ruler.js` attached to the candle series at `zOrder: "top"`, drawing a translucent region between the anchors plus a connector, using the shared coordinate helper so it stays glued to bars through pan and zoom
- [x] 4.2 Draw the label box with an opaque background and direction-based colouring, keeping it inside the pane when a measurement extends beyond the visible range
- [x] 4.3 Give the primitive a `setMeasurement(measurement | null)` entry point that requests a repaint, so preview, completion, and dismissal all go through one path

## 5. Ruler interaction

- [x] 5.1 Register the ruler tool; on activation subscribe to chart click and crosshair-move, and on deactivation unsubscribe and clear the drawn measurement
- [x] 5.2 Build anchors from event `time` plus `coordinateToPrice(point.y)`, ignoring events with no bar time or no point
- [x] 5.3 Implement the two-click flow: first click sets the pending anchor, crosshair moves update the preview measurement, second click completes it and stops preview updates
- [x] 5.4 Keep a completed measurement on screen until dismissed, and replace it (not accumulate) when a new measurement starts
- [x] 5.5 On activation, disable the chart's drag-pan (`handleScroll.pressedMouseMove`) and restore the previous option values on deactivation
- [x] 5.6 Install an Escape keydown listener on activation and remove it on deactivation; Escape cancels a pending measurement, otherwise clears a completed one, leaving the tool active
- [x] 5.7 Clear ruler state and deactivate the tool wherever symbol and timeframe changes already flow through, so a measurement never outlives its bars
- [x] 5.8 Make the ruler refuse to start a measurement when no bars are loaded, leaving the existing empty-state message untouched

## 6. Verification

- [x] 6.1 Run `node tests/js/run_measure.mjs` and `node tests/js/run_fixtures.mjs`, plus the Python suite, and confirm all pass
- [x] 6.2 In the local dev server, walk every scenario in `specs/chart-tools/spec.md`: button placement and active state, preview, completion, Escape cancel and dismiss, replacement, reversed and same-bar measurements, pan/zoom with a measurement on screen, timeframe and symbol switch clearing it, and a page reload leaving nothing active
- [x] 6.3 Confirm the crosshair OHLC readout and FVG rendering still work with the ruler both inactive and active, and that FVG drawings look unchanged after the coordinate-helper move
- [x] 6.4 Verify on an instrument with a small `point_size` that the ruler readout and the crosshair legend show the same price precision
- [x] 6.5 Run a local static rehearsal (export, then serve `dist/`) and confirm the ruler behaves identically with no market-data request in the network panel
