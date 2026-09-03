## 1. Price-range arithmetic

- [x] 1.1 Add `web/chart/auto-scale.js`: a DOM-free, chart-free module exporting the fixed 10% margin constant and a function that takes the displayed bars plus a visible logical range and returns `{ minValue, maxValue }` or `null`
- [x] 1.2 Clamp the logical range to the bars actually present (it can extend past the last bar by the time scale's right offset, and past the first when zoomed out) and scan only the bars inside it, taking the low of lows and the high of highs
- [x] 1.3 Ignore bar values that are not finite numbers, and return `null` when the clamped window holds no bar with a usable high and low
- [x] 1.4 Expand a flat window to `price ± max(|price| × 0.0005, absolute floor)` so a single-price window and a zero price both yield a non-zero range
- [x] 1.5 Add `tests/js/run_auto_scale.mjs` covering: a normal window; a window narrower than the slice, asserting off-screen extremes are excluded; a range extending past the last bar; a flat window; a zero-price flat window; non-finite values mixed with usable bars; an all-unusable window; an empty bar array
- [x] 1.6 Register the new harness in the README's dev-time test list alongside `run_viewport.mjs`

## 2. Option save/restore for the price axis

- [x] 2.1 Extend the chart-option suppression helper (`web/chart-tools/scroll-lock.js` or a sibling module in the same shape) with a suppressor for price-axis drag scaling and the axis double-click reset, returning an idempotent restore
- [x] 2.2 Copy the nested option object before applying, for the live-options reason documented in `scroll-lock.js`, so the restore puts back the pre-suppression value
- [x] 2.3 Extend `tests/js/run_scroll_lock.mjs` (or add a harness in its shape) to cover the new suppressor against the same stub: suppress, restore, restore again as a no-op, and a restore that does not overwrite a later change

## 3. Chart wiring

- [x] 3.1 Install an `autoscaleInfoProvider` on the candle series that, while the toggle is on, reads the current visible logical range and `state.bars`, calls the helper, and returns the derived `priceRange`; when the helper returns `null`, return the `original` info it was handed; when the toggle is off, return `original` unchanged
- [x] 3.2 Add the state transition: switching on applies `autoScale: true` with `scaleMargins { top: 0.1, bottom: 0.1 }` to the right price scale and suppresses price-axis drag scaling; switching off turns autoscale off — freezing the range as drawn — and restores drag scaling
- [x] 3.3 Apply the toggle's state once at startup only when it restores to on, so a fresh browser with the toggle off leaves every price-scale option untouched
- [x] 3.4 Confirm the framing is applied when a series is presented afresh (instrument switch, timeframe switch, display-limit change, post-sync reload) without adding a second framing call site, since each already re-enters bars through `applySlice()` and re-frames horizontally
- [x] 3.5 Confirm no code path added here can trigger a market-data fetch or a sync

## 4. Control and presentation

- [x] 4.1 Add the AUTO button to `web/index.html` inside `#chart-wrap`, in the overlay layer with `#chart-empty` and `#legend`, as a native `<button>` with `aria-pressed`, an accessible name identifying it as the automatic vertical scale, and a matching `title`
- [x] 4.2 Style it in `web/styles.css`: anchored bottom-right over the price scale and clear of the time axis, kept to the minimum legible size, with a visible focus indicator and an on/off state distinguished by border and background rather than colour alone
- [x] 4.3 Wire click and keyboard activation to the state transition, reflect the state in `aria-pressed`, and persist on change
- [x] 4.4 Keep the button inert with no bars charted while retaining its state for the next series, so the empty-state message needs no special-casing

## 5. Persistence

- [x] 5.1 Add `autoScale: false` to `DEFAULT_SETTINGS` in `web/settings.js` and restore it with the boolean check used for `compatibleOnly`/`enabledOnly`, leaving `SETTINGS_VERSION` at 1
- [x] 5.2 Apply the restored state during startup so a restored-on toggle frames the restored series, and confirm the derived price range itself is never written to storage
- [x] 5.3 Extend `tests/js/run_settings.mjs`: the toggle round-trips; settings written before the key existed restore to off; a non-boolean value restores to off without disturbing the other restored fields

## 6. Verification

- [x] 6.1 Run the dev-time JS harnesses (`run_auto_scale.mjs`, `run_settings.mjs`, `run_scroll_lock.mjs`, `run_viewport.mjs`) and the Python test suite to confirm nothing else regressed
- [x] 6.2 **Confirm in the browser that the provider is re-invoked as the visible range changes** — pan left into a lower-priced window, pan back right, zoom in and out, press jump-to-latest, and resize the window, checking the high and low stay at 90% and 10%; if any path leaves a stale scale, add the throttled `subscribeVisibleLogicalRangeChange` fallback from design.md that forces a recompute
- [x] 6.3 Check by hand with the toggle off that the price scale drags as it does today, and that a fresh profile behaves identically to before this change
- [x] 6.4 Check the handover by hand: switch on, then off, and confirm the framed prices do not jump and the scale then drags manually; switch on again after a manual drag and confirm an immediate re-frame
- [x] 6.5 Check the degenerate cases by hand where reachable — a flat or near-flat window, and an instrument and timeframe with no stored bars — confirming no error state and no blank pane
- [x] 6.6 Check the overlay does not obscure the crosshair price label, the OHLC legend, the empty-state message or a pane indicator's scale, at a narrow and a wide window, and that a ruler measurement survives toggling
- [x] 6.7 Check keyboard operation and the announced pressed state, and confirm the two states are distinguishable with colour disregarded
- [x] 6.8 Check the control behaves identically in static-export mode with no backend
