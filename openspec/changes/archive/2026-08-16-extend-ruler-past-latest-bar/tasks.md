## 1. Measurement arithmetic

- [x] 1.1 Add `barIntervalSeconds(bars)` to `web/chart-tools/measure.js`: the median gap over the last ~20 bars, returning null when fewer than two bars exist
- [x] 1.2 Teach `measure(bars, from, to)` to accept an end anchor carrying `barsAhead > 0`: place it at `lastIndex + barsAhead` and at `lastBarTime + barsAhead * interval` instead of resolving it through `nearestBarIndex`
- [x] 1.3 Keep the returned shape and every existing field's meaning unchanged for `barsAhead === 0`, and carry the projected end anchor's absolute time in the result so the renderer can pin it
- [x] 1.4 Refuse a projected end anchor when no interval can be derived, returning the same result as today rather than a partly-projected measurement

## 2. Arithmetic tests

- [x] 2.1 Extend `tests/js/run_measure.mjs` with `barIntervalSeconds` cases: regular daily bars, a series whose final gap straddles a weekend, and a series too short to have an interval
- [x] 2.2 Add a case measuring from the newest bar five positions ahead: bar count 6, elapsed five intervals
- [x] 2.3 Add a case measuring from well inside history to a projected position: bar count is stored bars plus projected positions, price and percent change unaffected by the projection
- [x] 2.4 Add a case asserting projected measurements keep the direction, percent and backwards-in-time conventions the existing cases pin down
- [x] 2.5 Run `node tests/js/run_measure.mjs` and confirm the pre-existing cases still pass alongside the new ones

## 3. Coordinate mapping

- [x] 3.1 Add a logical-index-to-x helper to `web/chart/coords.js` alongside `xCoordinate`, with the same pane-edge clamping for a position outside the visible range
- [x] 3.2 Keep `web/chart/coords.js` chart-free and DOM-free, taking the time scale as an argument as `xCoordinate` already does

## 4. Ruler interaction

- [x] 4.1 In `web/chart-tools/ruler.js`, build an anchor from a pointer position with no bar time by deriving `barsAhead` from the event's logical index relative to the last bar, rounded and floored at 0
- [x] 4.2 Treat a pointer left of the oldest bar as unanchorable, exactly as today
- [x] 4.3 Refuse the first click when the pointer has no bar time, so no measurement begins in the empty space; allow the second click there
- [x] 4.4 Keep the crosshair-move preview updating while the pointer is in the empty space, once a start anchor exists

## 5. Rendering a projected anchor

- [x] 5.1 Resolve a projected anchor's x coordinate by recomputing its logical index from its stored time and the current last bar, then mapping through the new coordinate helper
- [x] 5.2 Draw the region's right edge and place the readout box from that coordinate, keeping the existing in-pane clamping so the numbers stay legible when the projected position is off screen
- [x] 5.3 Leave the stored-anchor drawing path on the existing time-based mapping

## 6. Verification

- [x] 6.1 Click through the ruler in the browser: start on a bar, extend into the empty space, confirm the preview follows and the second click completes and persists
- [x] 6.2 Confirm a first click in the empty space does nothing and the next click on a bar starts a measurement normally
- [x] 6.3 Pan and zoom with a projected measurement drawn, including panning until the projected end anchor is off screen, and confirm the values do not change
- [x] 6.4 Confirm Escape, starting a new measurement, deactivating the tool, and switching instrument or timeframe all behave as before with a projected measurement drawn
- [x] 6.5 Confirm the chart made no market-data request during any of the above, including in static export mode
- [x] 6.6 Run `openspec validate extend-ruler-past-latest-bar --strict`
