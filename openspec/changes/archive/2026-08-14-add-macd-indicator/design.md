## Context

See `proposal.md` — Why. What shapes the approach is the state of the indicator framework:

- `web/indicators/registry.js` owns one contract, `compute(bars, instrument) -> { drawables, warning }`, and one renderer, `IndicatorPrimitive`, a lightweight-charts series primitive attached to the candle series that paints `rect` and `label` drawables at `zOrder: "bottom"`. Everything is price-pane geometry.
- `web/app.js` accumulates the drawables of every enabled indicator into that single primitive and joins their warnings into one notice line. The insufficient-history check lives there, counted against `state.bars` (the displayed slice), not against what is stored.
- lightweight-charts is loaded from a CDN at version 5.0.9, which has first-class multi-pane support (`addSeries(type, options, paneIndex)`, `chart.panes()`, `chart.removePane()`), a `HistogramSeries` whose points may each carry their own `color`, and gap handling for points omitted from a series' data.
- MT5 numeric conventions live in `web/indicators/mt5math.js`; `mt5Ema` seeds with the SMA of the first `period` values and NaNs the warm-up.
- The reference is `~/daytrading/mt5/indicators/SimpleMACD.mq5` v1.02, sha256 `6e916173f4219438ea1cf5ed260e507d1081f042635e73484c4156da243b5f92`. Its compiled `SimpleMACD.ex5` is installed in the MT5-Testing terminal, so its buffers can be read from an MQL5 script through `iCustom`.

## Goals / Non-Goals

**Goals:**

- Grow the registry by one output kind without touching how the two existing indicators are registered, computed or drawn.
- Keep indicator modules free of chart and DOM dependencies, so the Node fixture harnesses can keep importing them directly.
- Reach numeric parity with the MQL5 indicator's own buffers, verified against an export rather than by inspection.

**Non-Goals:**

- A general-purpose oscillator toolkit. This adds exactly the pane vocabulary MACD needs (line, coloured histogram, one reference level) and no more.
- Per-indicator settings UI, pane height controls, or pane reordering.
- Any parity claim about the user's other `MyMACD.mq5` (divergences, alerts, anchoring).

## Decisions

### Pane output is a data contract, not a second primitive

`compute` gains an alternative return shape: `{ paneSeries: [...], warning }`, where each entry is plain data —
`{ kind: "line" | "histogram", title, color, data: [{ time, value, color? }] }` — plus an optional
`referenceLines: [{ value, color }]`. The registration declares its kind (`render: "zones" | "pane"`) so `app.js`
can route without inspecting the result.

Why not extend the existing primitive with a new drawable type: the primitive is attached to the candle series and
converts prices through `series.priceToCoordinate`. A MACD's values are not prices, so it would need its own
vertical scale, its own autoscale, its own axis labels and its own crosshair readout — reimplementing what
lightweight-charts panes already do. Alternative considered and rejected: normalising MACD values into the price
range and drawing them as an overlay. It removes the pane problem but makes the values unreadable and the axis a
lie.

Why plain data rather than handing indicators the chart: it preserves the property that makes the existing tests
possible — indicator modules import nothing from the chart, so `node tests/js/*.mjs` can call `compute` directly.

### `app.js` owns pane lifecycle, keyed by indicator id

A `Map<indicatorId, { paneIndex, series[] }>`. On recompute, a pane indicator that became enabled gets a pane and
its series created; one that became disabled has its series removed and its pane removed; one already enabled has
`setData` called on its existing series. Only `setData` runs on the common path (a bar-slice change), so panning and
limit changes do not churn panes.

The gotcha to respect: `removePane` shifts the indices of panes after it, so stored `paneIndex` values must be
re-read from `chart.panes()` after any removal rather than cached across removals. With one pane indicator this is
theoretical; the map is keyed by id precisely so it does not become real later.

Warnings keep flowing through the existing single notice line, and the existing `state.bars.length < minBars` check
runs before `compute` for both kinds, so the insufficient-history behaviour is inherited rather than reimplemented.

### A second EMA helper for the signal line

`mt5Ema(values, period)` cannot compute the signal line: its SMA seed starts at index 0, but the main line is NaN
until index `slowPeriod − 1`, and MT5 seeds the signal EMA from the main line's own first defined index
(`CalcEmaFromSeries`'s `srcFirstValid`). Feeding a NaN-prefixed array to `mt5Ema` yields NaN forever.

So add `mt5EmaFromSeries(values, period, firstValidIndex)` beside it, seeding at `firstValidIndex + period − 1`.
Alternative considered: slicing off the NaN prefix, running `mt5Ema`, and re-padding. Same arithmetic, but the
index bookkeeping moves into the caller and off the tested helper, which is where an off-by-one would hide.

### Parity is verified against an MT5 buffer export

Add `tools/mql5/ExportMacdOracle.mq5` in the shape of the existing `ExportOBOracle.mq5`: attach to a chart, read
`SimpleMACD` through `iCustom` with 13/34/9 on typical price (`PRICE_TYPICAL`), and write bars plus the main, signal and histogram buffers to
a JSON file, which becomes `tests/fixtures/macd/`. `tests/js/run_macd_fixtures.mjs` then compares the port's arrays
against it.

Why an export rather than a Python transcription in the style of `tools/generate_fvg_fixtures.py`: the FVG generator
had a Python reference implementation to import from `../xtb-trading`; MACD has none, so a Python generator would be
a second transcription of the same MQL5 source and could only prove the two transcriptions agree. The export
compares against the artifact the user actually looks at.

Two conversions the harness must apply, both consequences of MQL5 buffer conventions:

- MT5 buffers hold `0.0` over the warm-up, not an empty value. The harness SHALL treat indices below the documented
  first-defined index as undefined on both sides instead of comparing them, and SHALL assert the first-defined
  indices separately (33 for the main line, 41 for the signal and histogram).
- MT5 indexes oldest-first in `OnCalculate` but the export must be written in the same chronological order the JS
  port uses; the export script is responsible for that, as `ExportOBOracle.mq5` already is for its own output.

The export must be compiled and run through the MT5-Testing install only, per the repo's MQL5 rule.

### The comparison window must match the export's

Learned the hard way on OB (recorded in `web/indicators/ob.js`): an MT5 indicator's output depends on where its
series starts, because that is where its EMA seeds. Handing the port a longer series than the export covers
compares two runs seeded at different bars, and every value differs. The fixture therefore records the exact bar
window it was exported over, and the harness feeds the port exactly those bars.

### Colours

The histogram takes the chart's existing candle colours (`#26a69a` up, `#ef5350` down) rather than MQL5's raw
`clrGreen`/`clrRed`, which are harsh on the dark theme and would read as a third colour language on a chart that
already has two. The main line takes a neutral accent distinct from both. The zone palette in
`web/indicators/palette.js` is deliberately not reused: it means "demand/supply zone", not "up/down bar", and
borrowing it would imply a relationship that does not exist.

## Risks / Trade-offs

- **The pane lifecycle is the only stateful thing in an otherwise stateless render path.** A missed removal leaks an
  empty pane and steals vertical space. → Lifecycle lives in one function keyed by indicator id, driven by
  diffing enabled state against the map, so enable/disable/recompute all take the same path; the manual check
  covers toggling repeatedly and toggling while another indicator is enabled.
- **Panes are a 5.0.9 API the app has not used before.** A CDN version bump could change it. → The version is
  already pinned in `web/index.html`; no new dependency is introduced.
- **`removePane` index shifting** could misroute series once a second pane indicator exists. → Indices are re-read
  from `chart.panes()` after removals rather than cached.
- **The export oracle needs a running MT5 terminal**, so the fixture is not regenerable in CI. → Same trade-off the
  OB fixtures already make; fixtures are committed and the harness runs offline.
- **Fixed periods and applied price** mean matching a differently configured MT5 chart requires a code edit. →
  Accepted: they sit in one exported params object, as `FVG_PARAMS` and `OB_PARAMS` do, and no settings UI exists
  for those either.

## Resolved decisions

- **Applied price is typical** (`(high + low + close) / 3`, MQL5 `PRICE_TYPICAL`), matching the user's `MyMACD.mq5`
  pairing with these same 13/34/9 periods rather than `SimpleMACD.mq5`'s default `PRICE_CLOSE`. The export oracle
  must pass `PRICE_TYPICAL` into `iCustom` so fixtures compare like against like.
