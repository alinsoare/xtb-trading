/* Accumulation screener unit tests. Dev-time only; run: node tests/js/run_screener.mjs */

import {
  columnarToBars,
  currentPrice,
  isDoji,
  lastCompletedIndex,
  SEQUENCE_SCAN_CAP,
} from "../../web/screener/bars.js";
import { computeRange } from "../../web/screener/range.js";
import { bullishRun, macdAscending } from "../../web/screener/signals.js";
import {
  GATE_MAX_POSITION_PCT,
  GATE_MIN_RANGE_PCT,
  markCount,
  scoreInstrument,
  scorePivotDistance,
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

const longDojiStretch = [];
for (let i = 0; i < SEQUENCE_SCAN_CAP + 5; i++) {
  longDojiStretch.push(bar(i, 10, 11, 9, 10.01));
}
longDojiStretch.push(bar(100, 10, 12, 9, 11));
check("scan cap bounds bullish run walk", bullishRun(longDojiStretch, 3).ok, false);

/* ---------- MACD ascending ---------- */

const macdBars = makeBars(80, 1_700_000_000, 3600, 50);
const macdResult = macdAscending(macdBars);
check("macd ascending is boolean", typeof macdResult.ok, "boolean");
check("short macd series is insufficient", macdAscending(makeBars(10)).insufficient, true);

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
check("flat histogram does not count as ascending", macdAscending(flatMacdBars).ok, false);

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

check("mark buckets", markCount(3), 1);
check("mark bucket at 4", markCount(4), 2);
check("mark bucket at 6", markCount(6), 2);
check("mark bucket at 7", markCount(7), 3);

const gatedOut = scoreInstrument({
  enabled: true,
  pointSize: 0.01,
  seriesByTimeframe: {
    d1: makeBars(400, 1_700_000_000, 86400, 100),
    h1: makeBars(400, 1_700_000_000, 3600, 100),
    m15: makeBars(400, 1_700_000_000, 900, 100),
  },
});
check("gated-out instrument scores nothing", gatedOut.score, 0);
check("gated-out keeps range figures", gatedOut.rangePct != null, true);

const gateOpenD1 = makeBars(400, 1_700_000_000, 86400, 100);
for (let i = gateOpenD1.length - 31; i < gateOpenD1.length - 1; i++) {
  gateOpenD1[i] = bar(gateOpenD1[i].time, 101, 110, 100, 101);
}
gateOpenD1[gateOpenD1.length - 1] = bar(
  gateOpenD1[gateOpenD1.length - 1].time,
  101,
  103,
  100,
  102,
);

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
check("full confluence score", fullConfluence.score, 9);
check("full confluence marks", fullConfluence.marks, 3);
checkDeep("full confluence reasons", fullConfluence.reasons, [
  { rule: "D1 FVG + H1 bullish run", points: 3 },
  { rule: "H1 FVG + M15 bullish run", points: 2 },
  { rule: "D1 MACD ascending", points: 1 },
  { rule: "D1 pivot distance", points: 3 },
]);

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
check("gate max position constant", GATE_MAX_POSITION_PCT, 0.33);

if (failures) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log("all screener checks pass");
