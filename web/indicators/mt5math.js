/* MT5 numeric conventions, ported with signal parity in mind.
 *
 * These deliberately mirror MetaTrader's iMA / iStochastic behavior rather
 * than the textbook or pandas defaults — the differences change signals:
 * - the EMA is seeded with the SMA of the first `period` values (MT5's iMA);
 *   with EMA 377 a first-value seed diverges long enough to alter decisions;
 * - the stochastic is STO_LOWHIGH with SMA slowing: rolling extremes over the
 *   %K period, then SMA sums over the slowing window.
 * Warm-up regions are NaN, mirroring MT5's EMPTY_VALUE.
 */

export function mt5Ema(values, period) {
  const n = values.length;
  const out = new Array(n).fill(NaN);
  if (n < period) return out;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  out[period - 1] = sum / period;

  const k = 2 / (period + 1);
  for (let i = period; i < n; i++) {
    out[i] = out[i - 1] + k * (values[i] - out[i - 1]);
  }
  return out;
}

/* EMA of a series whose warm-up starts at `firstValidIndex`, mirroring
 * CalcEmaFromSeries in SimpleMACD.mq5: seed at firstValidIndex + period − 1
 * with the SMA of values[firstValidIndex .. firstValidIndex + period − 1]. */
export function mt5EmaFromSeries(values, period, firstValidIndex) {
  const n = values.length;
  const out = new Array(n).fill(NaN);
  const firstEma = firstValidIndex + period - 1;
  if (period < 1 || firstEma >= n) return out;

  let sum = 0;
  for (let k = 0; k < period; k++) sum += values[firstValidIndex + k];
  out[firstEma] = sum / period;

  const k = 2 / (period + 1);
  for (let i = firstEma + 1; i < n; i++) {
    out[i] = out[i - 1] + k * (values[i] - out[i - 1]);
  }
  return out;
}

export function mt5Stochastic(high, low, close, kPeriod = 21, slowing = 9) {
  const n = close.length;

  // Rolling extremes over kPeriod bars; NaN during warm-up.
  const ll = new Array(n).fill(NaN);
  const hh = new Array(n).fill(NaN);
  for (let i = kPeriod - 1; i < n; i++) {
    let lo = Infinity;
    let hi = -Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (low[j] < lo) lo = low[j];
      if (high[j] > hi) hi = high[j];
    }
    ll[i] = lo;
    hh[i] = hi;
  }

  // %K = 100 * SMA(close - LL, slowing) / SMA(HH - LL, slowing).
  // A window containing any NaN yields NaN, matching pandas' rolling sum.
  const out = new Array(n).fill(NaN);
  for (let i = slowing - 1; i < n; i++) {
    let num = 0;
    let den = 0;
    let valid = true;
    for (let j = i - slowing + 1; j <= i; j++) {
      if (Number.isNaN(ll[j]) || Number.isNaN(hh[j])) {
        valid = false;
        break;
      }
      num += close[j] - ll[j];
      den += hh[j] - ll[j];
    }
    if (!valid || den === 0) continue; // stays NaN (flat window or warm-up)
    out[i] = (100 * num) / den;
  }
  return out;
}
