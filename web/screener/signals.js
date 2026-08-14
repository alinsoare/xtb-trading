import { FVG_PARAMS, fvgZones } from "../indicators/fvg.js";
import { MACD_PARAMS, macdArrays } from "../indicators/macd.js";
import { OB_PARAMS } from "../indicators/ob.js";
import { computeSwingStructure } from "../indicators/ob-structure.js";
import { isDoji, lastCompletedIndex, SEQUENCE_SCAN_CAP } from "./bars.js";

export const FVG_MIN_BARS = FVG_PARAMS.emaSlow + 3;
export const MACD_MIN_BARS = MACD_PARAMS.slow + MACD_PARAMS.signal;
export const PIVOT_MIN_BARS = OB_PARAMS.pivotBars * 3 + 1;

export function bullishRun(bars, required) {
  if (!bars?.length) return { ok: false, insufficient: true };

  const last = lastCompletedIndex(bars);
  if (last < required - 1) return { ok: false, insufficient: true };

  let count = 0;
  let examined = 0;
  for (let i = last; i >= 0 && examined < SEQUENCE_SCAN_CAP; i--, examined++) {
    const bar = bars[i];
    if (isDoji(bar)) continue;
    if (bar.close > bar.open) {
      count++;
      if (count >= required) return { ok: true, insufficient: false };
    } else {
      break;
    }
  }
  return { ok: false, insufficient: false };
}

export function inLiveBullishFvg(bars, pointSize, price) {
  if (!bars?.length || price == null) return { ok: false, insufficient: true };
  if (bars.length < FVG_MIN_BARS) return { ok: false, insufficient: true };

  const { zones } = fvgZones(bars, pointSize);
  const newestTs = bars[bars.length - 1].time;

  for (const zone of zones) {
    if (zone.direction !== "bullish") continue;
    if (zone.time_to < newestTs) continue;
    if (price >= zone.price_low && price <= zone.price_high) {
      return { ok: true, insufficient: false };
    }
  }
  return { ok: false, insufficient: false };
}

export function macdAscending(bars) {
  if (bars.length < MACD_MIN_BARS) return { ok: false, insufficient: true };

  const { histogram } = macdArrays(bars);
  const k = lastCompletedIndex(bars);
  const h0 = histogram[k];
  const h1 = histogram[k - 1];
  const h2 = histogram[k - 2];
  if (h0 === undefined || h1 === undefined || h2 === undefined) {
    return { ok: false, insufficient: false };
  }
  if (Number.isNaN(h0) || Number.isNaN(h1) || Number.isNaN(h2)) {
    return { ok: false, insufficient: false };
  }
  return { ok: h0 > h1 && h1 > h2, insufficient: false };
}

export function lastConfirmedHighPivot(bars, pointSize, price) {
  if (bars.length < PIVOT_MIN_BARS) {
    return { pivotHigh: null, pivotDistance: null, insufficient: true };
  }

  const { pivots } = computeSwingStructure(bars, pointSize, OB_PARAMS);
  let pivotHigh = null;
  for (let i = pivots.length - 1; i >= 0; i--) {
    const pivot = pivots[i];
    if (pivot.isHigh && pivot.isConfirmed) {
      pivotHigh = pivot.high;
      break;
    }
  }

  if (pivotHigh == null || price == null) {
    return { pivotHigh, pivotDistance: null, insufficient: false };
  }

  return {
    pivotHigh,
    pivotDistance: (pivotHigh - price) / price,
    insufficient: false,
  };
}
