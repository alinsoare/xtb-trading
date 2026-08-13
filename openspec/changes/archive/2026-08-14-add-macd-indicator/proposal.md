## Why

Both indicators the app has today — FVG and OB — draw zones on the price pane, so the
indicator framework only knows how to paint rectangles and labels over the candles. A MACD
is the opposite shape of output: a value per bar, on a scale that has nothing to do with
price, which MT5 therefore renders in a separate subwindow. Adding it gives the chart the
momentum read the user already relies on in MT5, and it forces the framework to grow the one
thing it is missing — an indicator that owns its own pane — before a third zone indicator
cements the price-pane-only assumption.

The reference is the user's own MQL5 `SimpleMACD.mq5` (v1.02), whose defaults are 12/26/9 on
close. The user wants the ported indicator configured 13/34/9 on typical price
`(high + low + close) / 3`, with the signal line hidden — which is exactly what the
source's `InpHideSignalLine = true` default already does.

## What Changes

- Extend the indicator registry with a second output kind: a **pane indicator** that returns
  per-bar series (lines and a coloured histogram) rendered in its own pane below the price
  pane, alongside today's `drawables` zone output. Existing registrations, the toolbar
  toggles, the persisted enabled-state, and the insufficient-history warning keep working
  unchanged for both kinds.
- Register a `macd` indicator porting `SimpleMACD.mq5`: main line = EMA(13) − EMA(34) of the
  applied price, signal = EMA(9) of the main line, histogram = main − signal, with MT5's
  SMA-seeded EMA and MT5's exact warm-up boundaries.
- The **signal line is computed but never drawn**. It has to be computed — the histogram is
  defined as main minus signal — and hiding it matches the source's own default. Only the
  main line and the histogram are rendered.
- Histogram bars are coloured by the sign of the histogram value (non-negative one colour,
  negative the other), reproducing the source's `DRAW_COLOR_HISTOGRAM` rule.
- Add a zero reference line in the MACD pane, since a MACD read without one is guesswork.
- Add dev-time golden fixtures for the MACD arrays (main, signal, histogram, and their
  first-defined indices) and a Node harness runner in the existing `tests/js/` style.

Not in scope: the divergence detection, alerting, and peak/trough anchoring of the user's
other `MyMACD.mq5`; a settings UI for the periods (they live in one exported params object,
like `FVG_PARAMS` and `OB_PARAMS`); and any change to how bars are fetched, stored or sliced.

## Capabilities

### New Capabilities

None. The indicator framework and its indicators are already one capability.

### Modified Capabilities

- `indicators`: adds a requirement for pane-rendered (oscillator) indicator output as a
  second output kind in the registry, and requirements for the MACD indicator itself — its
  computation, its MT5 numeric conventions and warm-up boundaries, the hidden signal line,
  and its rendering in a dedicated pane.

## Impact

- `web/indicators/registry.js` — a pane output kind beside the existing drawables kind; the
  registration contract grows an optional field rather than changing the existing one.
- `web/app.js` — creates and disposes the MACD pane as the indicator is toggled, and routes
  pane output to it; the single `IndicatorPrimitive` for zone drawables stays as it is.
- `web/indicators/macd.js` (new) — the port, its parameters, and its registration.
- `web/indicators/mt5math.js` — an EMA-of-a-series variant that starts its SMA seed at the
  source series' first defined index, which the signal line needs and `mt5Ema` cannot express.
- `tests/js/run_macd_fixtures.mjs` and `tests/fixtures/macd/` (new), plus a generator under
  `tools/`, following the FVG fixture pattern.
- `README.md` — the new test runner in the Quick start list.
- No backend, storage, data-contract or sync change; the indicator computes in the browser
  from bars already loaded, so no network call is added.
