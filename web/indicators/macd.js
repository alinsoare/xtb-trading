/* MACD indicator, ported from SimpleMACD.mq5 v1.02.
 *
 * Source: ~/daytrading/mt5/indicators/SimpleMACD.mq5
 * Version: 1.02
 * Hash: 6e916173f4219438ea1cf5ed260e507d1081f042635e73484c4156da243b5f92
 *
 * Chronological, oldest-first. The newest stored bar carries MACD values like
 * any other bar — a per-bar reading, not a confirmed pattern.
 *
 * Sanctioned deviations from the source defaults:
 * - Periods fixed at 13 / 34 / 9 (source defaults 12 / 26 / 9).
 * - Applied price fixed to typical (high + low + close) / 3 (source default close).
 * - Signal line is never drawn (source default InpHideSignalLine = true).
 */

import { mt5Ema, mt5EmaFromSeries } from "./mt5math.js";
import { registerIndicator } from "./registry.js";

export const MACD_PARAMS = {
  fast: 13,
  slow: 34,
  signal: 9,
};

const HIST_UP = "#26a69a";
const HIST_DOWN = "#ef5350";
const MAIN_COLOR = "#b0bec5";

function typicalPrice(bar) {
  return (bar.high + bar.low + bar.close) / 3;
}

export function macdArrays(bars, params = MACD_PARAMS) {
  const n = bars.length;
  const applied = bars.map(typicalPrice);
  const fastEma = mt5Ema(applied, params.fast);
  const slowEma = mt5Ema(applied, params.slow);

  const mainFirst = params.slow - 1;
  const main = new Array(n).fill(NaN);
  for (let i = mainFirst; i < n; i++) {
    main[i] = fastEma[i] - slowEma[i];
  }

  const signal = mt5EmaFromSeries(main, params.signal, mainFirst);
  const histFirst = mainFirst + params.signal - 1;
  const histogram = new Array(n).fill(NaN);
  for (let i = histFirst; i < n; i++) {
    histogram[i] = main[i] - signal[i];
  }

  return { main, signal, histogram, mainFirst, histFirst };
}

function panePoint(time, value, color) {
  const point = { time, value };
  if (color) point.color = color;
  return point;
}

function seriesFromBars(bars, values, colorForValue) {
  const data = [];
  for (let i = 0; i < bars.length; i++) {
    const value = values[i];
    if (value === undefined || Number.isNaN(value)) continue;
    const color = colorForValue ? colorForValue(value) : undefined;
    data.push(panePoint(bars[i].time, value, color));
  }
  return data;
}

registerIndicator({
  id: "macd",
  label: "MACD",
  render: "pane",
  minBars: MACD_PARAMS.slow + MACD_PARAMS.signal,
  compute(bars) {
    const { main, histogram } = macdArrays(bars);
    return {
      paneSeries: [
        {
          kind: "line",
          title: "MACD",
          color: MAIN_COLOR,
          data: seriesFromBars(bars, main),
        },
        {
          kind: "histogram",
          title: "Histogram",
          color: HIST_UP,
          data: seriesFromBars(bars, histogram, (v) => (v >= 0 ? HIST_UP : HIST_DOWN)),
        },
      ],
      referenceLines: [{ value: 0, color: "#4a5568" }],
    };
  },
});
