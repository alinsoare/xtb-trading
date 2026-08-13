/* Intraday diagnostic: explain sub-H4 divergence from MT5, don't assert parity.
 *
 * Below H4 the MQL5 source refuses to treat a bar opening inside its server-time
 * window as a pivot, while this port takes every bar as real data. So the two read
 * different bar sets and their output is expected to differ. This script checks that
 * the difference is *only* that: every divergence should involve a bar inside the
 * window. A divergence on a bar outside it is a port defect.
 *
 * Structure is sequential, so one divergence cascades into every later pivot. The
 * earliest divergence is therefore the only one that carries diagnostic weight; the
 * rest are consequences of it.
 *
 * Run:  node tools/ob_intraday_spotcheck.mjs <mt5-files-dir> <SYMBOL_PERIOD_TAG>
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { computeSwingStructure } from "../web/indicators/ob-structure.js";
import { obZones } from "../web/indicators/ob.js";

/* The source's default skip window, as seconds from midnight server time. MT5
 * datetimes already are server time, so a bar's second-of-day needs no offset. */
const SKIP_FROM = 23 * 3600 + 30 * 60; // 23:30
const SKIP_TO = 1 * 3600; // 01:00, next day

/* The source's InpLookbackBars. The port drops this cap by design, but the cap does
 * not merely hide older pivots: it decides where MT5's structure seeds from. Feeding
 * the port the whole series would compare two runs that started at different points,
 * so the port gets the same trailing window and the skip window stays the only
 * remaining difference. On a series at or below this length the slice is a no-op,
 * which is why D1 needed none of this. */
const SOURCE_LOOKBACK_BARS = 2000;

/* Bars at the left edge of the compared window whose pivots are ignored. A pivot needs
 * `pivotBars` neighbours on each side, and MT5 can read neighbours from before its
 * lookback boundary while a sliced array cannot, so the first pivots inside the window
 * differ for reasons that have nothing to do with the skip filter. Generous at 20 bars
 * against a 2000-bar window: 1%, and it costs only the seed pivot or two. */
const EDGE_WARMUP_BARS = 20;

const inSkipWindow = (t) => {
  const sod = ((t % 86400) + 86400) % 86400;
  return sod >= SKIP_FROM || sod < SKIP_TO;
};

const hhmm = (t) => {
  const sod = ((t % 86400) + 86400) % 86400;
  const h = String(Math.floor(sod / 3600)).padStart(2, "0");
  const m = String(Math.floor((sod % 3600) / 60)).padStart(2, "0");
  return `${h}:${m}`;
};

const iso = (t) => new Date(t * 1000).toISOString().replace(".000Z", "Z");

function readCsv(path) {
  const lines = readFileSync(path, "utf-8").trim().split(/\r?\n/);
  const header = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    return Object.fromEntries(header.map((h, i) => [h, cells[i]]));
  });
}

const dir = process.argv[2];
const tag = process.argv[3];
if (!dir || !tag) {
  console.error("usage: node tools/ob_intraday_spotcheck.mjs <mt5-files-dir> <SYMBOL_PERIOD_TAG>");
  process.exit(2);
}

const meta = Object.fromEntries(
  readCsv(join(dir, `meta_${tag}.csv`)).map((r) => [r.key, r.value]),
);
const pointSize = Number(meta.point_size);

const allBars = readCsv(join(dir, `bars_${tag}.csv`))
  .map((r) => ({
    time: Number(r.time),
    open: Number(r.open),
    high: Number(r.high),
    low: Number(r.low),
    close: Number(r.close),
  }))
  .sort((a, b) => a.time - b.time);

const bars = allBars.slice(-SOURCE_LOOKBACK_BARS);

const mt5Pivots = readCsv(join(dir, `pivots_${tag}.csv`)).map((r) => ({
  time: Number(r.time),
  type: r.type,
  extreme: Number(r.extreme),
  move_type: r.move_type,
}));

const newestBarTime = bars[bars.length - 1].time;
const mt5Zones = readCsv(join(dir, `zones_${tag}.csv`)).map((r) => ({
  time: Number(r.time_from),
  price_high: Number(r.price_high),
  price_low: Number(r.price_low),
  open: Number(r.time_to) > newestBarTime,
}));

console.log(`${tag}: ${allBars.length} bars exported, point=${pointSize}, digits=${meta.digits}`);
console.log(
  `comparing the newest ${bars.length} (the source's ${SOURCE_LOOKBACK_BARS}-bar lookback), ` +
    `from ${iso(bars[0].time)}`,
);
console.log(`window: [${hhmm(SKIP_FROM)}, ${hhmm(SKIP_TO)}) server time\n`);

const structure = computeSwingStructure(bars, pointSize, {
  pivotBars: 3,
  confirmPoints: 50,
  validityScanCap: 500,
});
const portPivots = structure.exportPivots();
const { zones: portZones } = obZones(bars, pointSize, undefined, structure);

const barsInWindow = bars.filter((b) => inSkipWindow(b.time)).length;
console.log(
  `bars inside window: ${barsInWindow}/${bars.length} ` +
    `(${((barsInWindow / bars.length) * 100).toFixed(1)}%)`,
);
console.log(`pivots  MT5=${mt5Pivots.length}  port=${portPivots.length}`);
console.log(`zones   MT5=${mt5Zones.length}  port=${portZones.length}\n`);

/* Pivot-level divergence, earliest first. */
const mt5ByTime = new Map(mt5Pivots.map((p) => [p.time, p]));
const portByTime = new Map(portPivots.map((p) => [p.time, p]));
const allTimes = [...new Set([...mt5ByTime.keys(), ...portByTime.keys()])].sort((a, b) => a - b);

const edgeCutoff = bars[Math.min(EDGE_WARMUP_BARS, bars.length - 1)].time;

const divergent = [];
const edgeArtifacts = [];
for (const t of allTimes) {
  const a = mt5ByTime.get(t);
  const b = portByTime.get(t);
  let kind = null;
  if (a && !b) kind = "MT5 only";
  else if (!a && b) kind = "port only";
  else if (a.type !== b.type) kind = `type ${a.type} vs ${b.type}`;
  else if (Math.abs(a.extreme - b.extreme) > 1e-9) kind = `extreme ${a.extreme} vs ${b.extreme}`;
  else if (a.move_type !== b.move_type) kind = `move_type ${a.move_type} vs ${b.move_type}`;
  if (!kind) continue;
  const entry = { time: t, kind, window: inSkipWindow(t) };
  if (t < edgeCutoff) edgeArtifacts.push(entry);
  else divergent.push(entry);
}

if (edgeArtifacts.length) {
  console.log(
    `ignored ${edgeArtifacts.length} divergence(s) in the first ${EDGE_WARMUP_BARS} bars ` +
      `of the window, where MT5 sees neighbours the slice cannot:`,
  );
  for (const d of edgeArtifacts) {
    console.log(`  ${iso(d.time)} (${hhmm(d.time)} server) — ${d.kind}`);
  }
  console.log("");
}

const outside = divergent.filter((d) => !d.window);
console.log(`divergent pivots: ${divergent.length}`);
console.log(`  inside window:  ${divergent.length - outside.length}`);
console.log(`  outside window: ${outside.length}`);

if (divergent.length) {
  const first = divergent[0];
  console.log(
    `\nearliest divergence: ${iso(first.time)} (${hhmm(first.time)} server) ` +
      `${first.window ? "INSIDE" : "OUTSIDE"} window — ${first.kind}`,
  );
  console.log("  (structure is sequential, so later divergences follow from this one)");
}

if (outside.length) {
  console.log(`\nfirst up to 10 divergences on bars OUTSIDE the window:`);
  for (const d of outside.slice(0, 10)) {
    console.log(`  ${iso(d.time)} (${hhmm(d.time)} server) — ${d.kind}`);
  }
}

/* If MT5 itself placed pivots on in-window bars, its filter was not in effect on the
 * exported chart, so this export cannot attribute anything to the window. Say so
 * rather than reporting a clean run as evidence about a filter that never ran. */
const mt5PivotsInWindow = mt5Pivots.filter((p) => p.time >= bars[0].time && inSkipWindow(p.time));
const barsInWindowCount = bars.filter((b) => inSkipWindow(b.time)).length;

let verdict;
if (divergent.length && !divergent[0].window) {
  verdict = "UNEXPLAINED — earliest divergence is outside the window, treat as a port defect";
} else if (divergent.length) {
  verdict = "EXPLAINED — earliest divergence sits inside the skip window";
} else if (mt5PivotsInWindow.length) {
  verdict =
    `NO DIVERGENCE, AND THE FILTER WAS INACTIVE — MT5 itself placed ` +
    `${mt5PivotsInWindow.length} pivot(s) on in-window bars, so the source's skip filter was ` +
    `not applied here. This run cannot attribute anything to the window; what it does show is ` +
    `that the port matches MT5 on this intraday series.`;
} else if (barsInWindowCount === 0) {
  verdict =
    "NO DIVERGENCE, AND THE WINDOW IS EMPTY — no bar in the compared range opens inside it, " +
    "so the filter had nothing to exclude and this instrument cannot exercise it.";
} else {
  verdict = "IDENTICAL — no divergence, and no in-window bar affected the outcome";
}
console.log(`\nverdict: ${verdict}`);
process.exit(divergent.length && !divergent[0].window ? 1 : 0);
