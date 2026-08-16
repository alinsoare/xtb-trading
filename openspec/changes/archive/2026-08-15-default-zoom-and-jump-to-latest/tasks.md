## 1. Framing arithmetic

- [x] 1.1 Add a pure viewport helper under `web/chart/` exporting the default-zoom bar count (200, named alongside the display-limit default so the "visible vs available" distinction is legible) and a function that turns a bar count plus the time scale's right offset into a visible logical range
- [x] 1.2 Have the helper return `null` for an empty series and clamp the range to the whole series when it holds 200 bars or fewer, so no empty space is reserved
- [x] 1.3 Add `tests/js/run_viewport.mjs` covering a deep series (last 200 bars framed), a short series (all bars framed), a series of exactly 200 bars, and an empty series; register it in the README's dev-time test list

## 2. Default zoom on the chart

- [x] 2.1 Add a framing function in `web/app.js` that applies the helper's range via `timeScale().setVisibleLogicalRange()` and does nothing when the helper returns `null`
- [x] 2.2 Replace the `fitContent()` call after loading candles with the framing function, so selecting an instrument, switching timeframe, and reloading after a sync all open on the last 200 bars
- [x] 2.3 Replace the `fitContent()` call in the display-limit handler with the framing function, keeping the existing measurement-discard behavior unchanged
- [x] 2.4 Confirm no framing path issues a fetch — the framing function must read only bars already in `state.bars`

## 3. Jump-to-latest control

- [x] 3.1 Add the button to the toolbar's right-hand group in `web/index.html`, next to the display-limit control, with a title explaining that it returns to the newest bar without changing zoom
- [x] 3.2 Style it in `web/styles.css` consistently with the neighbouring toolbar buttons, including its disabled state
- [x] 3.3 Wire the handler in `web/app.js` to call `timeScale().scrollToRealTime()`, making no options or zoom changes so nothing needs restoring
- [x] 3.4 Disable the button whenever the current series has no bars, driven from the same place that toggles the empty-state message
- [x] 3.5 Verify the control is not registered as a chart tool, so it neither participates in "at most one tool active" nor deactivates the ruler

## 4. Verification

- [x] 4.1 Run the existing dev-time JS harnesses (`run_settings.mjs`, `run_scroll_lock.mjs`, `run_measure.mjs`) plus the new `run_viewport.mjs`, and the Python test suite, to confirm nothing regressed
- [x] 4.2 In the browser with the backend: open a deep D1 series and confirm ~200 legible candles, pan left to reach older bars, then press jump-to-latest and confirm the newest bar returns at the same zoom
- [x] 4.3 Zoom in to ~40 bars and out to ~1,000 bars, pan back each time, and confirm jump-to-latest preserves each span rather than snapping to 200
- [x] 4.4 Press jump-to-latest immediately after a chart opens and confirm the view is unchanged with no error; confirm the button is disabled on a timeframe with no stored bars
- [x] 4.5 Draw a ruler measurement, press jump-to-latest, and confirm the measurement stays anchored to its own bars
- [x] 4.6 Reload the page and confirm the restored instrument and timeframe open on the default framing, with zoom not restored
- [x] 4.7 Load the static export without a backend and repeat the framing and jump checks, confirming no market-data request is made (network panel clean)

## 5. Documentation

- [x] 5.1 Update the README's chart/UI description to mention the 200-bar default framing and the jump-to-latest control, and to state that the display limit bounds what is available while the zoom bounds what is visible
