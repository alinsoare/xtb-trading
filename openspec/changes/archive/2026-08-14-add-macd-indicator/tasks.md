## 1. MT5 numeric groundwork

- [x] 1.1 Add `mt5EmaFromSeries(values, period, firstValidIndex)` to `web/indicators/mt5math.js`, seeding with the SMA of `values[firstValidIndex .. firstValidIndex + period - 1]` and NaN before that, with a comment naming `CalcEmaFromSeries` in `SimpleMACD.mq5` as the convention it mirrors
- [x] 1.2 Extend `tests/js/` coverage for the new helper: seed index, seed value, and that a NaN-prefixed input does not poison the output

## 2. Registry: pane output kind

- [x] 2.1 Extend the registration contract in `web/indicators/registry.js` with `render: "zones" | "pane"` (defaulting to `"zones"` so `fvg` and `ob` need no edit) and document the `paneSeries` / `referenceLines` return shape beside the existing drawable shapes
- [x] 2.2 Validate at registration time that a pane indicator returns pane data and a zone indicator returns drawables, so a mismatch fails loudly rather than rendering nothing
- [x] 2.3 Keep `IndicatorPrimitive` untouched and confirm `fvg` and `ob` still render exactly as before

## 3. MACD computation

- [x] 3.1 Create `web/indicators/macd.js` with a single exported `MACD_PARAMS` (fast 13, slow 34, signal 9, applied price typical `(high + low + close) / 3`) and a header comment recording the source path, version v1.02 and sha256, in the style of `ob.js`
- [x] 3.2 Implement the applied-price series as `(high + low + close) / 3` per bar, then the fast and slow EMAs via `mt5Ema`, and the main line = fast − slow, undefined before index `slow - 1`
- [x] 3.3 Implement the signal line via `mt5EmaFromSeries` seeded at the main line's first defined index, and the histogram = main − signal, both undefined before index `slow + signal - 2`
- [x] 3.4 Register the indicator as id `macd`, label `MACD`, `render: "pane"`, `minBars: slow + signal` (43), returning the main line, the coloured histogram and a zero reference line — and no signal series
- [x] 3.5 Colour each histogram point by the sign of its own value (chart up colour when `>= 0`, down colour when `< 0`); give the main line a neutral accent distinct from both and do not read `palette.js`

## 4. Pane rendering in the app

- [x] 4.1 In `web/app.js`, add a `Map` from indicator id to its pane index and series, and a lifecycle function that creates a pane and its series when a pane indicator becomes enabled, calls `setData` when it is already enabled, and removes the series and the pane when it becomes disabled
- [x] 4.2 Route `compute` results by declared kind: drawables accumulate into the existing primitive, pane series go to the lifecycle function; warnings from both kinds keep joining into the one notice line
- [x] 4.3 Re-read pane indices from `chart.panes()` after any removal instead of caching them across removals
- [x] 4.4 Emit undefined values as omitted points so the warm-up region draws as a gap rather than zeros
- [x] 4.5 Import `./indicators/macd.js` beside the existing indicator imports

## 5. Parity fixtures

- [x] 5.1 Write `tools/mql5/ExportMacdOracle.mq5` in the shape of `ExportOBOracle.mq5`: read `SimpleMACD` via `iCustom` with 13/34/9 on `PRICE_TYPICAL`, and export the bar window plus the main, signal and histogram buffers as JSON in chronological order, recording the exact bar window used
- [x] 5.2 Compile it through the MT5-Testing install only (per the repo's MQL5 rule) and export a fixture for one symbol and timeframe into `tests/fixtures/macd/`
- [x] 5.3 Write `tests/js/run_macd_fixtures.mjs`: feed the port exactly the exported bar window, compare main/signal/histogram value by value within a float tolerance, and assert the first-defined indices exactly (33 main, 41 signal and histogram), treating MT5's warm-up zeros as undefined rather than comparing them
- [x] 5.4 Add the runner to the test list in `README.md`

## 6. Manual verification

- [x] 6.1 Enable `MACD` in the browser and confirm the pane appears below the candles with the main line, the coloured histogram and a zero line, and no signal line
- [x] 6.2 Toggle it off and confirm the pane is removed and the price pane reclaims the space; repeat the toggle several times and with `FVG`/`OB` also enabled
- [x] 6.3 Pan and zoom and confirm the pane stays aligned with the candles; switch symbol and timeframe and confirm the pane recomputes and the enabled state survives a reload
- [x] 6.4 Set the display limit below 43 and confirm the standard insufficient-history warning names 43 required with no pane content
- [x] 6.5 Compare the pane against the MT5 chart running `SimpleMACD` at 13/34/9 on typical price on the same symbol and timeframe, eyeballing the histogram sign flips and zero crossings
