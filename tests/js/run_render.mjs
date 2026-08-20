/* Screener row rendering unit tests. Dev-time only; run: node tests/js/run_render.mjs */

import {
  renderMarks,
  renderSourceNames,
  renderScreenerRow,
} from "../../web/screener/render.js";
import { scoreInstrument } from "../../web/screener/score.js";
import {
  SOURCE_D1_FVG_H1,
  SOURCE_GATE,
  SOURCE_H1_FVG_M15,
  SOURCE_MACD,
  SOURCE_PIVOT,
} from "../../web/screener/score.js";

let failures = 0;

function countMarkSpans(html) {
  return (html.match(/<span class="screener-mark"><\/span>/g) ?? []).length;
}

function countSourceSpans(html) {
  return (html.match(/<span class="screener-source">/g) ?? []).length;
}

function check(name, actual, expected) {
  if (!Object.is(actual, expected)) {
    failures += 1;
    console.error(`FAIL ${name}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
}

function checkTrue(name, condition) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL ${name}`);
  }
}

const symbol = {
  xtb_symbol: "TEST.US",
  asset_class: "stock",
  name: "Test Instrument",
};

const fullReasons = [
  { rule: "Eligibility gate", points: 1, source: SOURCE_GATE },
  { rule: "D1 FVG + H1 bullish run", points: 2, source: SOURCE_D1_FVG_H1 },
  { rule: "H1 FVG + M15 bullish run", points: 1, source: SOURCE_H1_FVG_M15 },
  { rule: "D1 MACD red morning star", points: 1, source: SOURCE_MACD },
  { rule: "D1 pivot distance", points: 3, source: SOURCE_PIVOT },
];

/* ---------- renderMarks ---------- */

check("renderMarks with 0 marks", renderMarks(0, fullReasons), "");

const oneMark = renderMarks(1, [{ rule: "Eligibility gate", points: 1 }]);
checkTrue("one mark emits one dot span", countMarkSpans(oneMark) === 1);
checkTrue(
  "one mark tooltip carries rule and points",
  oneMark.includes('title="Eligibility gate: 1"'),
);

const fourMarks = renderMarks(4, fullReasons);
checkTrue("four marks emit four dot spans", countMarkSpans(fourMarks) === 4);
checkTrue(
  "four marks tooltip carries all rules",
  fourMarks.includes("Eligibility gate: 1") &&
    fourMarks.includes("D1 FVG + H1 bullish run: 2") &&
    fourMarks.includes("H1 FVG + M15 bullish run: 1") &&
    fourMarks.includes("D1 MACD red morning star: 1") &&
    fourMarks.includes("D1 pivot distance: 3"),
);

const escapedMarks = renderMarks(1, [{ rule: 'Rule <with> "quotes"', points: 1 }]);
checkTrue(
  "renderMarks escapes tooltip HTML",
  escapedMarks.includes('title="Rule &lt;with&gt; &quot;quotes&quot;: 1"'),
);

/* ---------- renderSourceNames ---------- */

check("renderSourceNames empty", renderSourceNames([]), "");

const multiSources = renderSourceNames(fullReasons);
checkTrue(
  "renderSourceNames emits one span per reason",
  countSourceSpans(multiSources) === 5,
);
checkTrue(
  "renderSourceNames preserves order",
  multiSources.indexOf(SOURCE_GATE) <
    multiSources.indexOf(SOURCE_D1_FVG_H1) &&
    multiSources.indexOf(SOURCE_D1_FVG_H1) <
      multiSources.indexOf(SOURCE_H1_FVG_M15) &&
    multiSources.indexOf(SOURCE_H1_FVG_M15) <
      multiSources.indexOf(SOURCE_MACD) &&
    multiSources.indexOf(SOURCE_MACD) < multiSources.indexOf(SOURCE_PIVOT),
);

const escapedSources = renderSourceNames([{ source: 'A <tag> & "quote"' }]);
checkTrue(
  "renderSourceNames escapes source text",
  escapedSources.includes("A &lt;tag&gt; &amp; &quot;quote&quot;"),
);

/* ---------- renderScreenerRow ---------- */

const fullRow = renderScreenerRow(symbol, {
  status: "screened",
  score: 8,
  marks: 4,
  reasons: fullReasons,
  rangePct: 0.1234,
  positionPct: 0.5678,
  headroomPct: 0.0294,
});
checkTrue(
  "full confluence row has marks inline with symbol code",
  fullRow.includes('<span class="symbol-code">TEST.US<span class="screener-marks"'),
);
checkTrue("full confluence row has four mark spans", countMarkSpans(fullRow) === 4);
checkTrue(
  "full confluence row has five source spans in order",
  countSourceSpans(fullRow) === 5 &&
    fullRow.includes(`>${SOURCE_GATE}<`) &&
    fullRow.includes(`>${SOURCE_D1_FVG_H1}<`) &&
    fullRow.includes(`>${SOURCE_H1_FVG_M15}<`) &&
    fullRow.includes(`>${SOURCE_MACD}<`) &&
    fullRow.includes(`>${SOURCE_PIVOT}<`),
);
checkTrue(
  "full confluence row shows range, position and headroom figures",
  fullRow.includes("30d range 12.3%") &&
    fullRow.includes("position 56.8%") &&
    fullRow.includes("headroom 2.9%"),
);
checkTrue(
  "full confluence marks tooltip carries full rule wording",
  fullRow.includes("D1 FVG + H1 bullish run: 2") &&
    fullRow.includes("D1 pivot distance: 3"),
);

const gateOnlyRow = renderScreenerRow(symbol, {
  status: "screened",
  score: 1,
  marks: 1,
  reasons: [{ rule: "Eligibility gate", points: 1, source: SOURCE_GATE }],
  rangePct: 0.1,
  positionPct: 0.2,
});
checkTrue("gate-only row has one mark", countMarkSpans(gateOnlyRow) === 1);
checkTrue(
  "gate-only row names gate alone",
  countSourceSpans(gateOnlyRow) === 1 &&
    gateOnlyRow.includes(`>${SOURCE_GATE}<`),
);

const negativeHeadroomRow = renderScreenerRow(symbol, {
  status: "screened",
  score: 0,
  marks: 0,
  reasons: [],
  rangePct: 0.1,
  positionPct: 0.95,
  headroomPct: -0.012,
});
checkTrue(
  "negative headroom is rendered with its sign",
  negativeHeadroomRow.includes("headroom -1.2%"),
);

const nullHeadroomRow = renderScreenerRow(symbol, {
  status: "screened",
  score: 0,
  marks: 0,
  reasons: [],
  rangePct: 0.1,
  positionPct: 0.2,
  headroomPct: null,
});
checkTrue(
  "null headroom renders as em dash beside real range and position",
  nullHeadroomRow.includes("30d range 10.0%") &&
    nullHeadroomRow.includes("position 20.0%") &&
    nullHeadroomRow.includes("headroom —"),
);

const gatedOutRow = renderScreenerRow(symbol, {
  status: "screened",
  score: 0,
  marks: 0,
  reasons: [],
  rangePct: 0.15,
  positionPct: 0.25,
  headroomPct: 0.05,
});
checkTrue("gated-out row has no marks", countMarkSpans(gatedOutRow) === 0);
checkTrue("gated-out row has no source names", !gatedOutRow.includes("screener-sources"));
checkTrue(
  "gated-out row still shows range, position and headroom figures",
  gatedOutRow.includes("30d range 15.0%") &&
    gatedOutRow.includes("position 25.0%") &&
    gatedOutRow.includes("headroom 5.0%"),
);

const notScreenedRow = renderScreenerRow(symbol, {
  status: "not-screened",
  score: 0,
  marks: 0,
  reasons: [],
  rangePct: null,
  positionPct: null,
});
checkTrue("not-screened row shows state text", notScreenedRow.includes("not screened"));
checkTrue("not-screened row has no marks", countMarkSpans(notScreenedRow) === 0);
checkTrue("not-screened row has no sources", !notScreenedRow.includes("screener-sources"));

const insufficientNoWindowRow = renderScreenerRow(symbol, {
  status: "insufficient-history",
  score: 0,
  marks: 0,
  reasons: [],
  rangePct: null,
  positionPct: null,
  headroomPct: null,
});
checkTrue(
  "insufficient-history without a window shows state text",
  insufficientNoWindowRow.includes("insufficient history"),
);
checkTrue(
  "insufficient-history without a window has no figures line",
  !insufficientNoWindowRow.includes("screener-figures"),
);
checkTrue("insufficient-history without a window has no marks", countMarkSpans(insufficientNoWindowRow) === 0);
checkTrue(
  "insufficient-history without a window has no sources",
  !insufficientNoWindowRow.includes("screener-sources"),
);

const insufficientWithWindowRow = renderScreenerRow(symbol, {
  status: "insufficient-history",
  score: 0,
  marks: 0,
  reasons: [],
  rangePct: 0.1,
  positionPct: 0.2,
  headroomPct: 0.05,
});
checkTrue(
  "insufficient-history with window figures shows range, position and headroom",
  insufficientWithWindowRow.includes("30d range 10.0%") &&
    insufficientWithWindowRow.includes("position 20.0%") &&
    insufficientWithWindowRow.includes("headroom 5.0%"),
);
checkTrue(
  "insufficient-history with window figures does not show state text",
  !insufficientWithWindowRow.includes("insufficient history"),
);
checkTrue("insufficient-history with window figures has no marks", countMarkSpans(insufficientWithWindowRow) === 0);
checkTrue(
  "insufficient-history with window figures has no sources",
  !insufficientWithWindowRow.includes("screener-sources"),
);

/* ---------- equal score, different sources (5.2) ---------- */

const d1PivotRow = renderScreenerRow(symbol, {
  status: "screened",
  score: 4,
  marks: 2,
  reasons: [
    { rule: "Eligibility gate", points: 1, source: SOURCE_GATE },
    { rule: "D1 FVG + H1 bullish run", points: 2, source: SOURCE_D1_FVG_H1 },
    { rule: "D1 pivot distance", points: 1, source: SOURCE_PIVOT },
  ],
  rangePct: 0.1,
  positionPct: 0.2,
});

const pivotOnlyRow = renderScreenerRow(symbol, {
  status: "screened",
  score: 4,
  marks: 2,
  reasons: [
    { rule: "Eligibility gate", points: 1, source: SOURCE_GATE },
    { rule: "D1 pivot distance", points: 3, source: SOURCE_PIVOT },
  ],
  rangePct: 0.1,
  positionPct: 0.2,
});

check(
  "equal-score rows share mark count",
  countMarkSpans(d1PivotRow),
  countMarkSpans(pivotOnlyRow),
);
checkTrue(
  "equal-score rows differ in source text",
  d1PivotRow.includes(`>${SOURCE_D1_FVG_H1}<`) &&
    !pivotOnlyRow.includes(`>${SOURCE_D1_FVG_H1}<`) &&
    pivotOnlyRow.includes(`>${SOURCE_PIVOT}<`),
);

/* ---------- symbol browser row states (6.1) ---------- */

function rowHasThreeFigures(html) {
  return (
    html.includes("screener-figures") &&
    html.includes("30d range") &&
    html.includes("position") &&
    html.includes("headroom")
  );
}

function makeScanSeries(d1Len, h1Len, m15Len) {
  const bar = (time) => ({ time, open: 100, high: 120, low: 100, close: 110 });
  const mk = (n, step) => Array.from({ length: n }, (_, i) => bar(1_700_000_000 + i * step));
  return { d1: mk(d1Len, 86400), h1: mk(h1Len, 3600), m15: mk(m15Len, 900) };
}

const screenedResult = scoreInstrument({
  enabled: true,
  pointSize: 0.01,
  seriesByTimeframe: makeScanSeries(420, 420, 420),
  signalOverrides: {
    d1Fvg: { ok: false, insufficient: false },
    h1Run: { ok: false, insufficient: false },
    h1Fvg: { ok: false, insufficient: false },
    m15Run: { ok: false, insufficient: false },
    macd: { ok: false, insufficient: false },
    pivot: { pivotDistance: null, insufficient: false },
  },
});
const gatedOutHtml = renderScreenerRow(symbol, screenedResult);
checkTrue("screened quiet row shows three labelled figures", rowHasThreeFigures(gatedOutHtml));

const shortWarmupResult = scoreInstrument({
  enabled: true,
  pointSize: 0.01,
  seriesByTimeframe: makeScanSeries(200, 420, 420),
});
const partialHistoryHtml = renderScreenerRow(symbol, shortWarmupResult);
checkTrue(
  "insufficient-history with a 30d window shows three figures",
  shortWarmupResult.status === "insufficient-history" &&
    shortWarmupResult.rangePct != null &&
    rowHasThreeFigures(partialHistoryHtml),
);
checkTrue(
  "insufficient-history with a 30d window does not replace figures with state text",
  !partialHistoryHtml.includes("insufficient history"),
);

const emptyHistoryResult = scoreInstrument({
  enabled: true,
  pointSize: 0.01,
  seriesByTimeframe: { d1: [], h1: [], m15: [] },
});
const emptyHistoryHtml = renderScreenerRow(symbol, emptyHistoryResult);
checkTrue(
  "insufficient-history without a window keeps state text",
  emptyHistoryResult.status === "insufficient-history" &&
    emptyHistoryHtml.includes("insufficient history") &&
    !emptyHistoryHtml.includes("screener-figures"),
);

const notScreenedResult = scoreInstrument({
  enabled: false,
  seriesByTimeframe: {},
  pointSize: 0.01,
});
const notScreenedHtml = renderScreenerRow(symbol, notScreenedResult);
checkTrue(
  "not-screened row keeps state text instead of figures",
  notScreenedHtml.includes("not screened") && !notScreenedHtml.includes("screener-figures"),
);

if (failures) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log("all render checks pass");
