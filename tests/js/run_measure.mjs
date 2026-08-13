/* Tests for the ruler measurement math. Dev-time only (Node is not an app
 * dependency); CI and developers run:  node tests/js/run_measure.mjs
 *
 * Covers the cases the spec calls out and that a click-through would miss:
 * upward and downward moves, a measurement drawn backwards in time, both
 * anchors on one bar, and the percent/bar-count arithmetic itself.
 */

import {
  formatElapsed,
  measure,
  measurementLines,
  nearestBarIndex,
} from "../../web/chart-tools/measure.js";
import { formatPrice, priceDecimals } from "../../web/chart/format.js";

const HOUR = 3600;
const DAY = 86400;

let failures = 0;

function check(name, actual, expected) {
  const ok = Object.is(actual, expected);
  if (!ok) {
    failures += 1;
    console.error(`FAIL ${name}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
  return ok;
}

function checkClose(name, actual, expected, tolerance = 1e-9) {
  if (!(Math.abs(actual - expected) <= tolerance)) {
    failures += 1;
    console.error(`FAIL ${name}: ${actual} != ${expected}`);
  }
}

/* Daily bars, one per day, close = 100, 101, ... so index maths is readable. */
const BASE = 1_700_000_000; // arbitrary UTC epoch seconds
const bars = Array.from({ length: 40 }, (_, i) => ({
  time: BASE + i * DAY,
  open: 100 + i,
  high: 100.5 + i,
  low: 99.5 + i,
  close: 100 + i,
}));

const instrument = { point_size: 0.01 };

/* ---------- nearestBarIndex ---------- */

check("nearestBarIndex exact first", nearestBarIndex(bars, BASE), 0);
check("nearestBarIndex exact tenth", nearestBarIndex(bars, BASE + 10 * DAY), 10);
check("nearestBarIndex exact last", nearestBarIndex(bars, BASE + 39 * DAY), 39);
check("nearestBarIndex before series", nearestBarIndex(bars, BASE - 5 * DAY), 0);
check("nearestBarIndex after series", nearestBarIndex(bars, BASE + 99 * DAY), 39);
check("nearestBarIndex rounds down", nearestBarIndex(bars, BASE + 4 * DAY + HOUR), 4);
check("nearestBarIndex rounds up", nearestBarIndex(bars, BASE + 5 * DAY - HOUR), 5);
check("nearestBarIndex single bar", nearestBarIndex([bars[0]], BASE + 99 * DAY), 0);

/* ---------- upward measurement ---------- */

const up = measure(
  bars,
  { time: BASE + 2 * DAY, price: 100 },
  { time: BASE + 12 * DAY, price: 110 },
);
check("up direction", up.direction, "up");
checkClose("up priceChange", up.priceChange, 10);
checkClose("up percentChange", up.percentChange, 10);
check("up barCount", up.barCount, 11); // inclusive of both anchors
check("up elapsedSeconds", up.elapsedSeconds, 10 * DAY);
check("up label line 1", measurementLines(up, instrument)[0], "+10.00 (+10.00%)");
check("up label line 2", measurementLines(up, instrument)[1], "11 bars · 10d");

/* ---------- downward measurement ---------- */

const down = measure(
  bars,
  { time: BASE + 20 * DAY, price: 200 },
  { time: BASE + 25 * DAY, price: 190 },
);
check("down direction", down.direction, "down");
checkClose("down priceChange", down.priceChange, -10);
checkClose("down percentChange", down.percentChange, -5);
check("down barCount", down.barCount, 6);
check("down label line 1", measurementLines(down, instrument)[0], "-10.00 (-5.00%)");

/* ---------- reversed: end anchor earlier than the start ---------- */

const reversed = measure(
  bars,
  { time: BASE + 30 * DAY, price: 130 },
  { time: BASE + 10 * DAY, price: 120 },
);
check("reversed barCount is a magnitude", reversed.barCount, 21);
check("reversed elapsed is a magnitude", reversed.elapsedSeconds, 20 * DAY);
// Still relative to the anchor clicked first: started at 130, ended at 120.
checkClose("reversed priceChange", reversed.priceChange, -10);
check("reversed direction", reversed.direction, "down");
check("reversed timeFrom is the earlier bar", reversed.timeFrom, BASE + 10 * DAY);
check("reversed timeTo is the later bar", reversed.timeTo, BASE + 30 * DAY);

/* ---------- both anchors on one bar ---------- */

const sameBar = measure(
  bars,
  { time: BASE + 7 * DAY, price: 107 },
  { time: BASE + 7 * DAY, price: 108 },
);
check("same-bar barCount", sameBar.barCount, 1);
check("same-bar elapsedSeconds", sameBar.elapsedSeconds, 0);
check("same-bar label line 2", measurementLines(sameBar, instrument)[1], "1 bar · 0m");

/* ---------- flat move ---------- */

const flat = measure(
  bars,
  { time: BASE + 1 * DAY, price: 100 },
  { time: BASE + 3 * DAY, price: 100 },
);
check("flat direction", flat.direction, "flat");
check("flat label line 1", measurementLines(flat, instrument)[0], "0.00 (0.00%)");

/* ---------- guards ---------- */

check("no bars", measure([], { time: BASE, price: 1 }, { time: BASE, price: 2 }), null);
check("no anchor", measure(bars, null, { time: BASE, price: 2 }), null);
check("no lines without a measurement", measurementLines(null, instrument).length, 0);

/* ---------- elapsed formatting ---------- */

check("elapsed under a minute", formatElapsed(45), "0m");
check("elapsed minutes", formatElapsed(45 * 60), "45m");
check("elapsed whole hours", formatElapsed(4 * HOUR), "4h");
check("elapsed hours and minutes", formatElapsed(4 * HOUR + 15 * 60), "4h 15m");
check("elapsed whole days", formatElapsed(12 * DAY), "12d");
check("elapsed days and hours", formatElapsed(12 * DAY + 4 * HOUR), "12d 4h");
check("elapsed years", formatElapsed(365 * DAY), "1y");
check("elapsed years and days", formatElapsed(400 * DAY), "1y 35d");
check("elapsed negative clamps", formatElapsed(-5), "0m");

/* ---------- precision follows point size ---------- */

check("decimals for 0.01", priceDecimals(0.01), 2);
check("decimals for 0.001", priceDecimals(0.001), 3);
check("decimals for 0.00001", priceDecimals(0.00001), 5);
check("decimals for 1", priceDecimals(1), 0);
check("decimals default when missing", priceDecimals(undefined), 2);
check("decimals default when zero", priceDecimals(0), 2);
check("decimals default when negative", priceDecimals(-0.01), 2);
check("decimals default when not a number", priceDecimals("0.001"), 2);
check("price at 5 decimals", formatPrice(1.234567, { point_size: 0.00001 }), "1.23457");

const fx = measure(
  bars,
  { time: BASE, price: 1.1 },
  { time: BASE + DAY, price: 1.10025 },
);
check(
  "fx label uses instrument precision",
  measurementLines(fx, { point_size: 0.00001 })[0],
  "+0.00025 (+0.02%)",
);

if (failures) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log("all measurement checks pass");
