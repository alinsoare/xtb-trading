## Context

See proposal.md — Why, and this change's `specs/charting/spec.md` for the required behavior. The current state that shapes the approach:

- The frontend is build-step-free vanilla JS against the pinned lightweight-charts 5.0.9 CDN global. Pure helper modules under `web/chart/` and `web/chart-tools/` are exercised by dev-time Node harnesses in `tests/js/` with stub chart objects; anything that only exists inside an event handler is not reachable by that setup.
- `web/app.js` owns the single chart and candle series. `applySlice()` is the one place bars enter the chart; `frameDefaultZoom()` (via `web/chart/viewport.js`) is the whole of the current *horizontal* framing policy. There is no vertical-scale policy at all: the chart is created with `rightPriceScale: { borderColor }` only, so the library's own defaults are in force — autoscale on, with its own top/bottom margins — and dragging the price scale switches its autoscale off for the rest of the session.
- The price scale is a chart region, not a DOM element we own; `#chart-wrap` is already `position: relative` with `#chart` absolutely inset, and `#chart-empty` and `#legend` are overlaid on it at `z-index: 3`. An overlay control has an established place to live.
- `web/chart-tools/scroll-lock.js` exists because `chart.options()` returns the chart's live options object and `applyOptions` merges into it in place, so saving a nested option object and restoring it later restores the mutated value. Any change that toggles chart options has to copy before applying.
- `web/settings.js` is the sole owner of what persists, in one versioned JSON object, and `restoreSettings()` already defaults absent keys — which is what makes a new boolean additive at the current settings version.

A design doc is warranted here because the required 90/10 framing is not simply the library's autoscale with different margins, and because the toggle has to interact with the library's own manual-scaling behavior without leaving the chart in a state a reload is needed to escape.

## Goals / Non-Goals

**Goals:**

- Keep the price-range arithmetic — which prices a visible window yields, and what a flat or unusable window yields — in a pure, DOM-free, chart-free helper, so the edge cases in the spec are unit-testable, consistent with how the display limit, the default zoom and the ruler math are tested.
- Express the 10% headroom as a proportion of the pane, never in pixels, so the placement is identical at any container size and pixel ratio.
- Have exactly one owner of the vertical scale at a time, so "AUTO on" and "the user dragged the scale" can never both be in force.
- Make switching the toggle off leave the chart in an ordinary manual state, reachable and escapable, rather than in a state that only a reload clears.

**Non-Goals:**

- No configurable margin. The 10% is fixed by the spec; exposing it as a setting is additive later.
- No per-instrument or per-timeframe toggle state — one state for the chart, as with the display limit.
- No change to horizontal framing, to `applyDisplayLimit`, to how bars are fetched, sliced or exported, and no vertical-scale policy for indicator sub-panes, which keep their own scales.
- No new dependency, no build step, no version bump of the charting library.

## Decisions

**Derive the range in our own code and let the price scale apply the margins.** The candle series gets an `autoscaleInfoProvider` that returns a `priceRange` of `{ minValue, maxValue }` computed from the bars in the current visible logical range, and the right price scale is put in autoscale mode with `scaleMargins: { top: 0.1, bottom: 0.1 }`. The margins are the 10% headroom, expressed as fractions of the pane, so the high lands at 90% and the low at 10% by construction and at any height.

The alternative of relying on the library's built-in autoscale with those same margins was rejected even though it looks equivalent: what the built-in autoscale considers is not exactly "the visible bars' high and low" — price lines, a series' last-value line, and anything else attached to the pane can widen it, so the spec's "only visible bars contribute" would hold by luck rather than by construction, and the flat-window and non-finite-value cases would be the library's behavior rather than ours. Owning the range also puts the interesting arithmetic in a place a Node harness can reach.

The other alternative — computing a range and setting it directly — is not available: 5.0.9 exposes no public API for setting a price scale's visible range, only autoscale on/off. The provider *is* the supported way to state a range.

**`AutoscaleInfo.margins` is not the mechanism for the headroom.** That field is in pixels, so a 10% headroom expressed through it would have to be recomputed on every resize from a pane height we would have to measure. `scaleMargins` is already a fraction of the pane and the library maintains it across resizes.

**Off is "we have touched nothing".** With the toggle off from a fresh load, no price-scale option is applied and no provider is installed, so today's behavior is preserved by absence rather than by reproducing the library's defaults — which is the only way to be sure "off preserves current behavior" stays true if those defaults ever change under a version bump.

**Switching off freezes the current range rather than handing the scale back to library autoscale.** On switch-off, autoscale is turned off on the price scale, which leaves the range exactly as last drawn and makes manual dragging effective — matching the spec's "no jump at handover, then manual control". Handing back to library autoscale instead would re-frame with the library's own margins the moment the user switched off, which reads as the jump the spec forbids. The provider is left installed but inert (a provider is only consulted while autoscale is on); it is cheaper and less error-prone than reinstalling it on every toggle, and it keeps the toggle a two-line state change.

**Suppress axis drag-scaling while AUTO is on, using the copy-before-apply discipline.** Dragging the price axis makes the library switch autoscale off, which would silently take the scale away from the toggle mid-session. While AUTO is on, the chart's `handleScale` price-axis drag (and the axis double-click reset) is disabled and restored on switch-off. The saved value must be a copy, for exactly the reason documented in `scroll-lock.js`; the two concerns are close enough that the option-saving helper is worth sharing rather than reimplementing, and the restore must be idempotent the same way.

**Trust the library to re-invoke the provider as the visible range changes, and verify it rather than assume it.** Autoscale is recomputed as the visible range changes, so pan, zoom, jump-to-latest and resize should recompute the framing with no subscription of our own — which is the desirable shape, since a subscription that re-applies options on every pan frame is both slower and a source of feedback loops. If the provider proves not to be re-invoked for some navigation path, the fallback is a single `subscribeVisibleLogicalRangeChange` handler that calls `priceScale().setAutoScale(true)` to force a recompute, throttled to one call per animation frame. This is the one behavior in the change that must be confirmed in the browser before the task is called done, so it is called out as its own verification step in tasks.md.

**Instrument, timeframe, display-limit and post-sync reloads need no special handling.** Each of them re-enters bars through `applySlice()` and re-frames horizontally, so the visible range changes and the provider is consulted again. That is why the provider reads the visible range and `state.bars` at call time rather than capturing a range when the toggle was pressed.

**Flat windows get a symmetric range proportional to the price, with an absolute floor.** A window whose bars are all at one price yields `price ± max(|price| × 0.0005, tiny)` — proportional so it is sensible for an instrument quoted in thousands and one quoted in hundredths, with an absolute floor so a price of zero cannot produce a zero-height range. The candles then sit mid-pane, as the spec requires, and the price scale still renders distinct labels. Deriving the expansion from the instrument's point size was considered and rejected: it would drag instrument metadata into an otherwise pure arithmetic helper for a case that is visually indistinguishable either way, and the point size can be missing.

**A window with no usable price returns nothing and the provider defers to the library.** The helper returns `null` when the window contains no bars or no finite values, and the provider then returns the `original` autoscale info it was handed, which leaves the scale as it was without an error — the spec's "previous scale stays in force". The toggle's own state is untouched, so the next usable window is framed without the user intervening.

**The control is an overlay button in `#chart-wrap`, not a toolbar button and not a chart tool.** The spec places it over the price scale, which only an overlay in `#chart-wrap` can do; it sits alongside `#chart-empty` and `#legend` in that layer, anchored bottom-right and offset above the time-scale strip so it covers the price scale rather than the time axis. It is deliberately not registered in the chart-tools registry: tools are mutually exclusive modes with activation and restore rules, and registering a persistent vertical-scale preference there would let it deactivate the ruler for no reason. It is a native `<button>` with `aria-pressed`, an `aria-label`/`title` naming it as the automatic vertical scale, and a state indicated by both border/background and the pressed attribute so colour is not the only cue — the same treatment the existing toolbar buttons get in `styles.css`.

**The overlay is kept small and out of the readouts' way.** It is positioned to clear the crosshair price label and the OHLC legend, which live at the top-left, and to stay above the time axis; the empty-state message is centred, so the corner does not collide with it. The trade-off it does impose is that a few dozen square pixels of the price scale are no longer draggable — accepted below.

**Persist one additive boolean at the current settings version.** `autoScale: false` joins `DEFAULT_SETTINGS`, restored with a `typeof === "boolean"` check exactly as `compatibleOnly` and `enabledOnly` are, so a browser predating the control — or holding a non-boolean — restores to off with no migration and no version bump. What is *not* persisted is the derived range: after a restore the toggle is re-applied and the range is computed from whatever the default framing makes visible, which keeps the "transient view state does not persist" rule intact.

## Risks / Trade-offs

- **The provider might not be re-invoked on every navigation path, leaving a stale scale mid-pan.** → Confirmed in the browser as an explicit verification step, with a throttled `subscribeVisibleLogicalRangeChange` fallback that forces a recompute; the fallback is a handful of lines and needs no change to the helper or the spec.
- **Recomputing the range on every pan frame could be felt on a wide window of a 5,000-bar slice.** → The helper is a single linear scan of the *visible* slice with no allocation, which is the same order of work the chart already does to draw those bars; if it ever mattered, the scan is trivially memoisable on the range bounds.
- **The overlay covers a small part of the price scale, so that patch is no longer available for dragging while AUTO is off.** → The button is kept to the minimum legible size in the corner; the price scale remains draggable everywhere else, and the axis double-click reset is unaffected while the toggle is off.
- **Suppressing axis drag-scaling means restoring a nested chart option, the exact bug `scroll-lock.js` was written for.** → The same copy-before-apply and idempotent-restore discipline, in shared code with its own harness coverage, rather than a second hand-rolled save/restore.
- **A user who switches AUTO off is left on a frozen scale rather than library autoscale, which is a subtly different state from never having touched the toggle.** → It is the manual state the spec asks for and the same state a price-scale drag already produces; the library's own axis double-click reset still returns them to library autoscale.
- **Indicator sub-panes keep their own scales, so a pane indicator's scale does not follow the toggle.** → Out of scope by design and stated in the spec; the toggle names the price pane's vertical scale, and extending it to sub-panes later is additive.
