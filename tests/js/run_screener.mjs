/* Accumulation screener unit tests. Dev-time only; run: node tests/js/run_screener.mjs */

import {
  columnarToBars,
  currentPrice,
  isDoji,
  lastCompletedIndex,
  SEQUENCE_SCAN_CAP,
} from "../../web/screener/bars.js";
import { computeRange } from "../../web/screener/range.js";
import { bullishRun, isMacdRedMorningStarTrough, macdRedMorningStar } from "../../web/screener/signals.js";
import {
  GATE_MIN_PEAK_DISCOUNT,
  GATE_MIN_RANGE_PCT,
  H1_RUN_BARS,
  M15_RUN_BARS,
  markCount,
  scoreInstrument,
  scorePivotDistance,
  SOURCE_D1_FVG_H1,
  SOURCE_GATE,
  SOURCE_H1_FVG_M15,
  SOURCE_MACD,
  SOURCE_PIVOT,
  WEIGHT_D1_FVG_H1_RUN,
  WEIGHT_GATE_PASS,
  WEIGHT_H1_FVG_M15_RUN,
  WEIGHT_MACD_RED_MORNING_STAR,
} from "../../web/screener/score.js";

let failures = 0;

function check(name, actual, expected) {
  if (!Object.is(actual, expected)) {
    failures += 1;
    console.error(`FAIL ${name}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
}

function checkDeep(name, actual, expected) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    failures += 1;
    console.error(`FAIL ${name}: ${a} != ${b}`);
  }
}

function bar(time, open, high, low, close) {
  return { time, open, high, low, close };
}

function makeBars(count, start = 1_700_000_000, step = 86400, base = 100) {
  return Array.from({ length: count }, (_, i) =>
    bar(start + i * step, base + i, base + i + 2, base + i - 1, base + i + 1),
  );
}

/* ---------- conventions ---------- */

const fiveBars = [
  bar(1, 10, 12, 9, 11),
  bar(2, 11, 13, 10, 12),
  bar(3, 12, 14, 11, 13),
  bar(4, 13, 15, 12, 14),
  bar(5, 14, 16, 13, 15),
];
check("lastCompletedIndex", lastCompletedIndex(fiveBars), 3);

check(
  "currentPrice picks freshest timeframe",
  currentPrice({
    d1: [bar(1, 1, 2, 0.5, 1)],
    h1: [bar(100, 2, 3, 1.5, 2.5)],
    m15: [bar(50, 3, 4, 2.5, 3.5)],
  }),
  2.5,
);

check("doji on small body", isDoji(bar(1, 10, 11, 9, 10.05)), true);
check("zero-range bar is doji", isDoji(bar(1, 10, 10, 10, 10)), true);
check("bullish bar is not doji", isDoji(bar(1, 10, 12, 9, 11)), false);

const columnar = { t: [1, 2], o: [1, 2], h: [2, 3], l: [0.5, 1.5], c: [1.5, 2.5] };
checkDeep("columnarToBars", columnarToBars(columnar), [
  bar(1, 1, 2, 0.5, 1.5),
  bar(2, 2, 3, 1.5, 2.5),
]);

/* ---------- bullish run ---------- */

const runBars = [
  bar(1, 9, 10, 8, 9.5),
  bar(2, 10, 11, 9, 10.5),
  bar(3, 11, 12, 10, 11.5),
  bar(4, 12, 13, 11, 12.5),
  bar(5, 13, 14, 12, 13.5),
  bar(6, 14, 15, 13, 14.5),
];
check("doji is neutral in run", bullishRun(runBars, 3).ok, true);

const brokenRun = [
  bar(1, 9, 10, 8, 9.5),
  bar(2, 10, 11, 9, 9.2),
  bar(3, 11, 12, 10, 11.5),
  bar(4, 12, 13, 11, 12.5),
  bar(5, 13, 14, 12, 13.5),
];
check("bearish bar breaks run", bullishRun(brokenRun, 3).ok, false);

const oneBarRun = [
  bar(1, 9, 10, 8, 9.2),
  bar(2, 10, 11, 9, 9.2),
  bar(3, 11, 12, 10, 9.2),
  bar(4, 12, 13, 11, 12.5),
  bar(5, 13, 14, 12, 13.5),
];
check("one-bar run succeeds on last bullish bar", bullishRun(oneBarRun, 1).ok, true);

const oneBarFail = [
  bar(1, 9, 10, 8, 9.5),
  bar(2, 10, 11, 9, 10.5),
  bar(3, 11, 12, 10, 11.5),
  bar(4, 12, 13, 11, 9.2),
  bar(5, 13, 14, 12, 13.5),
];
check("one-bar run fails when last completed bar is bearish", bullishRun(oneBarFail, 1).ok, false);

const dojiThenBullish = [
  bar(1, 9, 10, 8, 9.5),
  bar(2, 10, 11, 9, 10.5),
  bar(3, 11, 12, 10, 11.5),
  bar(4, 12, 13, 11, 12.5),
  bar(5, 13, 14, 12, 13.01),
  bar(6, 14, 15, 13, 14.5),
];
check("one-bar run skips doji and counts prior bullish bar", bullishRun(dojiThenBullish, 1).ok, true);

const longDojiStretch = [];
for (let i = 0; i < SEQUENCE_SCAN_CAP + 5; i++) {
  longDojiStretch.push(bar(i, 10, 11, 9, 10.01));
}
longDojiStretch.push(bar(100, 10, 12, 9, 11));
check("scan cap bounds bullish run walk", bullishRun(longDojiStretch, 3).ok, false);

/* ---------- MACD red morning star ---------- */

check(
  "negative-territory trough fires",
  isMacdRedMorningStarTrough(-0.42, -0.61, -0.35),
  true,
);
check(
  "rising triple above zero does not fire",
  isMacdRedMorningStarTrough(0.1, 0.2, 0.3),
  false,
);
check(
  "trough with newest above zero does not fire",
  isMacdRedMorningStarTrough(-0.15, -0.05, 0.08),
  false,
);
check(
  "still-falling triple does not fire",
  isMacdRedMorningStarTrough(-0.2, -0.4, -0.6),
  false,
);
check(
  "flat pair below zero does not fire",
  isMacdRedMorningStarTrough(-0.3, -0.3, -0.2),
  false,
);
check(
  "exact zero newest bar does not fire",
  isMacdRedMorningStarTrough(-0.1, -0.3, 0),
  false,
);

const macdBars = makeBars(80, 1_700_000_000, 3600, 50);
const macdResult = macdRedMorningStar(macdBars);
check("macd red morning star is boolean", typeof macdResult.ok, "boolean");
check("short macd series is insufficient", macdRedMorningStar(makeBars(10)).insufficient, true);

const flatMacdBars = makeBars(80, 1_700_000_000, 3600, 50);
for (let i = 0; i < flatMacdBars.length; i++) {
  flatMacdBars[i] = bar(
    flatMacdBars[i].time,
    50,
    50.5,
    49.5,
    50,
  );
}
check("flat histogram does not count as red morning star", macdRedMorningStar(flatMacdBars).ok, false);

/* ---------- pivot bands ---------- */

check("pivot distance <= 2% scores 0", scorePivotDistance(0.02), 0);
check("pivot distance exactly 5% scores 1", scorePivotDistance(0.05), 1);
check("pivot distance exactly 10% scores 2", scorePivotDistance(0.1), 2);
check("pivot distance above 10% scores 3", scorePivotDistance(0.14), 3);

/* ---------- range and position ---------- */

const d1Window = [
  bar(1_700_000_000, 90, 100, 80, 95),
  bar(1_700_086_400, 95, 110, 85, 100),
  bar(1_700_172_800, 100, 120, 90, 105),
];
const rangeAtBottom = computeRange(d1Window, 82);
checkDeep("range arithmetic", {
  rangePct: Number(rangeAtBottom.rangePct?.toFixed(4)),
  positionPct: Number(rangeAtBottom.positionPct?.toFixed(4)),
}, { rangePct: 0.5, positionPct: 0.05 });

const flatRange = [
  bar(1_700_000_000, 100, 100, 100, 100),
  bar(1_700_086_400, 100, 100, 100, 100),
];
const zeroRange = computeRange(flatRange, 100);
check("zero-range window yields null rangePct", zeroRange.rangePct, null);
check("zero-range window yields null positionPct", zeroRange.positionPct, null);

/* ---------- score composition ---------- */

check("mark buckets at 0", markCount(0), 0);
check("mark buckets at 1", markCount(1), 1);
check("mark buckets at 2", markCount(2), 1);
check("mark buckets at 3", markCount(3), 2);
check("mark bucket at 4", markCount(4), 2);
check("mark bucket at 5", markCount(5), 3);
check("mark bucket at 6", markCount(6), 3);
check("mark bucket at 7", markCount(7), 4);
check("mark bucket at 8", markCount(8), 4);

function tuneWindowTail(d1Bars, { high, low, close }) {
  for (let i = d1Bars.length - 31; i < d1Bars.length - 1; i++) {
    d1Bars[i] = bar(d1Bars[i].time, low, high, low, close);
  }
  d1Bars[d1Bars.length - 1] = bar(
    d1Bars[d1Bars.length - 1].time,
    close,
    high,
    low,
    close,
  );
  return d1Bars;
}

const gatedOutD1 = tuneWindowTail(makeBars(400, 1_700_000_000, 86400, 100), {
  high: 100,
  low: 85,
  close: 99,
});
const gatedOut = scoreInstrument({
  enabled: true,
  pointSize: 0.01,
  seriesByTimeframe: {
    d1: gatedOutD1,
    h1: makeBars(400, 1_700_000_000, 3600, 100),
    m15: makeBars(400, 1_700_000_000, 900, 100),
  },
});
check("gated-out instrument scores nothing", gatedOut.score, 0);
check("gated-out has no reasons", gatedOut.reasons.length, 0);
check("gated-out keeps range figures", gatedOut.rangePct != null, true);
check("gated-out keeps position figures", gatedOut.positionPct != null, true);
check(
  "gated-out is within 2% of the 30-day high",
  gatedOutD1[gatedOutD1.length - 1].close >= 100 * (1 - GATE_MIN_PEAK_DISCOUNT),
  true,
);

const gateOpenD1 = tuneWindowTail(makeBars(400, 1_700_000_000, 86400, 100), {
  high: 110,
  low: 100,
  close: 102,
});

const fullConfluence = scoreInstrument({
  enabled: true,
  pointSize: 0.01,
  seriesByTimeframe: {
    d1: gateOpenD1,
    h1: makeBars(400, 1_700_000_000, 3600, 100),
    m15: makeBars(400, 1_700_000_000, 900, 100),
  },
  // Signal primitives have dedicated tests above. These overrides isolate the
  // score-orchestration contract without depending on a fragile synthetic FVG.
  signalOverrides: {
    d1Fvg: { ok: true, insufficient: false },
    h1Run: { ok: true, insufficient: false },
    h1Fvg: { ok: true, insufficient: false },
    m15Run: { ok: true, insufficient: false },
    macd: { ok: true, insufficient: false },
    pivot: { pivotDistance: 0.11, insufficient: false },
  },
});
check("full confluence score", fullConfluence.score, 8);
check("full confluence marks", fullConfluence.marks, 4);
checkDeep("full confluence reasons", fullConfluence.reasons, [
  { rule: "Eligibility gate", points: 1, source: SOURCE_GATE },
  { rule: "D1 FVG + H1 bullish run", points: 2, source: SOURCE_D1_FVG_H1 },
  { rule: "H1 FVG + M15 bullish run", points: 1, source: SOURCE_H1_FVG_M15 },
  { rule: "D1 MACD red morning star", points: 1, source: SOURCE_MACD },
  { rule: "D1 pivot distance", points: 3, source: SOURCE_PIVOT },
]);
check(
  "full confluence source names are distinct",
  new Set(fullConfluence.reasons.map((r) => r.source)).size,
  5,
);
check(
  "full confluence source order",
  fullConfluence.reasons.map((r) => r.source).join(","),
  [SOURCE_GATE, SOURCE_D1_FVG_H1, SOURCE_H1_FVG_M15, SOURCE_MACD, SOURCE_PIVOT].join(","),
);

const jmlpD1 = tuneWindowTail(makeBars(400, 1_700_000_000, 86400, 17), {
  high: 19.31,
  low: 17.54,
  close: 18.21,
});
const jmlpStyle = scoreInstrument({
  enabled: true,
  pointSize: 0.01,
  seriesByTimeframe: {
    d1: jmlpD1,
    h1: makeBars(400, 1_700_000_000, 3600, 100),
    m15: makeBars(400, 1_700_000_000, 900, 100),
  },
  signalOverrides: {
    d1Fvg: { ok: true, insufficient: false },
    h1Run: { ok: true, insufficient: false },
    h1Fvg: { ok: false, insufficient: false },
    m15Run: { ok: false, insufficient: false },
    macd: { ok: false, insufficient: false },
    pivot: { pivotDistance: null, insufficient: false },
  },
});
check("JMLP-style pullback is scored", jmlpStyle.score, 3);
check(
  "JMLP-style sits high in its range",
  jmlpStyle.positionPct != null && jmlpStyle.positionPct > 0.33,
  true,
);

const gateOnly = scoreInstrument({
  enabled: true,
  pointSize: 0.01,
  seriesByTimeframe: {
    d1: gateOpenD1,
    h1: makeBars(400, 1_700_000_000, 3600, 100),
    m15: makeBars(400, 1_700_000_000, 900, 100),
  },
  signalOverrides: {
    d1Fvg: { ok: false, insufficient: false },
    h1Run: { ok: false, insufficient: false },
    h1Fvg: { ok: false, insufficient: false },
    m15Run: { ok: false, insufficient: false },
    macd: { ok: false, insufficient: false },
    pivot: { pivotDistance: null, insufficient: false },
  },
});
check("gate-only instrument scores 1", gateOnly.score, 1);
check("gate-only instrument carries one mark", gateOnly.marks, 1);
checkDeep("gate-only reasons list only the eligibility gate", gateOnly.reasons, [
  { rule: "Eligibility gate", points: 1, source: SOURCE_GATE },
]);
check("gated-out has no source fields", gatedOut.reasons.every((r) => r.source == null), true);

const boundaryD1 = tuneWindowTail(makeBars(400, 1_700_000_000, 86400, 100), {
  high: 100,
  low: 85,
  close: 98,
});
const boundaryGated = scoreInstrument({
  enabled: true,
  pointSize: 0.01,
  seriesByTimeframe: {
    d1: boundaryD1,
    h1: makeBars(400, 1_700_000_000, 3600, 100),
    m15: makeBars(400, 1_700_000_000, 900, 100),
  },
});
check("discount boundary gates out", boundaryGated.score, 0);
check("discount boundary has no reasons", boundaryGated.reasons.length, 0);
check(
  "discount boundary price is exactly high * 0.98",
  boundaryD1[boundaryD1.length - 1].close,
  100 * (1 - GATE_MIN_PEAK_DISCOUNT),
);

const narrowRangeD1 = tuneWindowTail(makeBars(400, 1_700_000_000, 86400, 100), {
  high: 100,
  low: 98.5,
  close: 95,
});
const narrowRangeGated = scoreInstrument({
  enabled: true,
  pointSize: 0.01,
  seriesByTimeframe: {
    d1: narrowRangeD1,
    h1: makeBars(400, 1_700_000_000, 3600, 100),
    m15: makeBars(400, 1_700_000_000, 900, 100),
  },
});
check("narrow range gates out below peak", narrowRangeGated.score, 0);
check("narrow range has no reasons", narrowRangeGated.reasons.length, 0);
check(
  "narrow range is under 3%",
  narrowRangeGated.rangePct != null && narrowRangeGated.rangePct < GATE_MIN_RANGE_PCT,
  true,
);

checkDeep(
  "disabled instrument is not screened",
  scoreInstrument({ enabled: false, seriesByTimeframe: {}, pointSize: 0.01 }).status,
  "not-screened",
);

checkDeep(
  "insufficient history is reported",
  scoreInstrument({
    enabled: true,
    pointSize: 0.01,
    seriesByTimeframe: { d1: makeBars(5), h1: makeBars(5), m15: makeBars(5) },
  }).status,
  "insufficient-history",
);

check("gate min range constant", GATE_MIN_RANGE_PCT, 0.03);
check("gate min peak discount constant", GATE_MIN_PEAK_DISCOUNT, 0.02);
check("weight gate pass constant", WEIGHT_GATE_PASS, 1);
check("weight D1 FVG + H1 run constant", WEIGHT_D1_FVG_H1_RUN, 2);
check("weight H1 FVG + M15 run constant", WEIGHT_H1_FVG_M15_RUN, 1);
check("weight MACD red morning star constant", WEIGHT_MACD_RED_MORNING_STAR, 1);
check("H1 run bars constant", H1_RUN_BARS, 1);
check("M15 run bars constant", M15_RUN_BARS, 1);
check(
  "weights plus top pivot band sum to 8",
  WEIGHT_GATE_PASS + WEIGHT_D1_FVG_H1_RUN + WEIGHT_H1_FVG_M15_RUN + WEIGHT_MACD_RED_MORNING_STAR + 3,
  8,
);

if (failures) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log("all screener checks pass");
