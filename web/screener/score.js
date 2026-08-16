import { columnarToBars, currentPrice } from "./bars.js";
import { computeRange } from "./range.js";
import {
  bullishRun,
  FVG_MIN_BARS,
  inLiveBullishFvg,
  lastConfirmedHighPivot,
  macdRedMorningStar,
  MACD_MIN_BARS,
  PIVOT_MIN_BARS,
} from "./signals.js";

export const GATE_MIN_RANGE_PCT = 0.03;
export const GATE_MIN_PEAK_DISCOUNT = 0.02;
export const WEIGHT_GATE_PASS = 1;
export const WEIGHT_D1_FVG_H1_RUN = 2;
export const WEIGHT_H1_FVG_M15_RUN = 1;
export const WEIGHT_MACD_RED_MORNING_STAR = 1;
export const H1_RUN_BARS = 1;
export const M15_RUN_BARS = 1;
export const PIVOT_BANDS = [0.02, 0.05, 0.1];
export const SOURCE_GATE = "gate";
export const SOURCE_D1_FVG_H1 = "D1 FVG+H1";
export const SOURCE_H1_FVG_M15 = "H1 FVG+M15";
export const SOURCE_MACD = "MACD";
export const SOURCE_PIVOT = "pivot";

export function scorePivotDistance(distance) {
  if (distance == null || distance <= PIVOT_BANDS[0]) return 0;
  if (distance <= PIVOT_BANDS[1]) return 1;
  if (distance <= PIVOT_BANDS[2]) return 2;
  return 3;
}

export function markCount(score) {
  if (score <= 0) return 0;
  if (score <= 2) return 1;
  if (score <= 4) return 2;
  if (score <= 6) return 3;
  return 4;
}

function emptyResult(status, rangePct = null, positionPct = null) {
  return {
    status,
    score: 0,
    marks: 0,
    reasons: [],
    rangePct,
    positionPct,
  };
}

function barsFromSeries(seriesByTimeframe) {
  return {
    m15: Array.isArray(seriesByTimeframe.m15)
      ? seriesByTimeframe.m15
      : columnarToBars(seriesByTimeframe.m15),
    h1: Array.isArray(seriesByTimeframe.h1)
      ? seriesByTimeframe.h1
      : columnarToBars(seriesByTimeframe.h1),
    d1: Array.isArray(seriesByTimeframe.d1)
      ? seriesByTimeframe.d1
      : columnarToBars(seriesByTimeframe.d1),
  };
}

export function scoreInstrument({
  enabled,
  seriesByTimeframe,
  pointSize,
  signalOverrides = {},
}) {
  if (!enabled) return emptyResult("not-screened");

  const bars = barsFromSeries(seriesByTimeframe);
  const price = currentPrice(bars);
  const { high, rangePct, positionPct } = computeRange(bars.d1, price);

  if (
    bars.d1.length < Math.max(FVG_MIN_BARS, MACD_MIN_BARS, PIVOT_MIN_BARS) ||
    bars.h1.length < FVG_MIN_BARS ||
    bars.m15.length < FVG_MIN_BARS
  ) {
    return emptyResult("insufficient-history", rangePct, positionPct);
  }

  const gateOpen =
    rangePct != null &&
    high != null &&
    rangePct >= GATE_MIN_RANGE_PCT &&
    price < high * (1 - GATE_MIN_PEAK_DISCOUNT);

  if (!gateOpen) {
    return emptyResult("screened", rangePct, positionPct);
  }

  const reasons = [{ rule: "Eligibility gate", points: WEIGHT_GATE_PASS, source: SOURCE_GATE }];
  let score = WEIGHT_GATE_PASS;

  const d1Fvg = signalOverrides.d1Fvg ?? inLiveBullishFvg(bars.d1, pointSize, price);
  const h1Run = signalOverrides.h1Run ?? bullishRun(bars.h1, H1_RUN_BARS);
  if (d1Fvg.insufficient || h1Run.insufficient) {
    return emptyResult("insufficient-history", rangePct, positionPct);
  }
  if (d1Fvg.ok && h1Run.ok) {
    score += WEIGHT_D1_FVG_H1_RUN;
    reasons.push({
      rule: "D1 FVG + H1 bullish run",
      points: WEIGHT_D1_FVG_H1_RUN,
      source: SOURCE_D1_FVG_H1,
    });
  }

  const h1Fvg = signalOverrides.h1Fvg ?? inLiveBullishFvg(bars.h1, pointSize, price);
  const m15Run = signalOverrides.m15Run ?? bullishRun(bars.m15, M15_RUN_BARS);
  if (h1Fvg.insufficient || m15Run.insufficient) {
    return emptyResult("insufficient-history", rangePct, positionPct);
  }
  if (h1Fvg.ok && m15Run.ok) {
    score += WEIGHT_H1_FVG_M15_RUN;
    reasons.push({
      rule: "H1 FVG + M15 bullish run",
      points: WEIGHT_H1_FVG_M15_RUN,
      source: SOURCE_H1_FVG_M15,
    });
  }

  const macd = signalOverrides.macd ?? macdRedMorningStar(bars.d1);
  if (macd.insufficient) {
    return emptyResult("insufficient-history", rangePct, positionPct);
  }
  if (macd.ok) {
    score += WEIGHT_MACD_RED_MORNING_STAR;
    reasons.push({
      rule: "D1 MACD red morning star",
      points: WEIGHT_MACD_RED_MORNING_STAR,
      source: SOURCE_MACD,
    });
  }

  const pivot = signalOverrides.pivot ?? lastConfirmedHighPivot(bars.d1, pointSize, price);
  if (pivot.insufficient) {
    return emptyResult("insufficient-history", rangePct, positionPct);
  }
  const pivotPoints = scorePivotDistance(pivot.pivotDistance);
  if (pivotPoints > 0) {
    score += pivotPoints;
    reasons.push({ rule: "D1 pivot distance", points: pivotPoints, source: SOURCE_PIVOT });
  }

  return {
    status: "screened",
    score,
    marks: markCount(score),
    reasons,
    rangePct,
    positionPct,
  };
}
