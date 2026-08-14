import { RANGE_WINDOW_DAYS } from "./bars.js";

const SECONDS_PER_DAY = 86400;

/** 30-day D1 window: highest high, lowest low, range % and position %. */
export function computeRange(d1Bars, price) {
  if (!d1Bars?.length || price == null) {
    return { high: null, low: null, rangePct: null, positionPct: null };
  }

  const newestTs = d1Bars[d1Bars.length - 1].time;
  const cutoff = newestTs - RANGE_WINDOW_DAYS * SECONDS_PER_DAY;
  const inWindow = d1Bars.filter((b) => b.time >= cutoff);
  if (!inWindow.length) {
    return { high: null, low: null, rangePct: null, positionPct: null };
  }

  const high = Math.max(...inWindow.map((b) => b.high));
  const low = Math.min(...inWindow.map((b) => b.low));
  const span = high - low;
  if (span <= 0) {
    return { high, low, rangePct: null, positionPct: null };
  }

  return {
    high,
    low,
    rangePct: span / low,
    positionPct: (price - low) / span,
  };
}
