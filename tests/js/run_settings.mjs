/* Tests for persisted settings and the display-limit rule. Dev-time only (Node
 * is not an app dependency); CI and developers run:  node tests/js/run_settings.mjs
 *
 * The module takes its storage as a parameter precisely so this file can run
 * without a browser. Covered here: the parsing rule the toolbar input enforces,
 * a round trip through a storage stub, per-field fallback when live data no
 * longer contains a stored value, and a storage that throws on every access —
 * which is what a browser with storage denied actually does.
 */

import {
  DEFAULT_DISPLAY_LIMIT,
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  SETTINGS_VERSION,
  SHOW_ALL,
  applyDisplayLimit,
  limitToText,
  parseDisplayLimit,
  readSettings,
  restoreSettings,
  writeSettings,
} from "../../web/settings.js";

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

/* A localStorage stand-in. `denied` makes every access throw, the way a browser
 * with storage blocked behaves — it does not politely return null. */
function stubStorage({ denied = false, initial = null } = {}) {
  let value = initial;
  return {
    getItem(key) {
      if (denied) throw new Error("storage denied");
      return key === SETTINGS_KEY ? value : null;
    },
    setItem(key, next) {
      if (denied) throw new Error("storage denied");
      if (key === SETTINGS_KEY) value = next;
    },
    peek: () => value,
  };
}

const LIVE = {
  symbols: ["ABEA.DE", "NVD.DE"],
  timeframes: ["m15", "h1", "d1", "w1"],
  indicatorIds: ["fvg"],
};

/* ---------- parseDisplayLimit ---------- */

check("parses a plain integer", parseDisplayLimit("5000"), 5000);
check("parses a number", parseDisplayLimit(250), 250);
check("parses 'all'", parseDisplayLimit("all"), SHOW_ALL);
check("parses 'ALL' case-insensitively", parseDisplayLimit("ALL"), SHOW_ALL);
check("trims surrounding space", parseDisplayLimit("  120  "), 120);
check("accepts one bar", parseDisplayLimit("1"), 1);

check("refuses zero", parseDisplayLimit("0"), null);
check("refuses a zero number", parseDisplayLimit(0), null);
check("refuses a negative", parseDisplayLimit("-5"), null);
check("refuses a negative number", parseDisplayLimit(-5), null);
check("refuses a fraction", parseDisplayLimit("1.5"), null);
check("refuses a fractional number", parseDisplayLimit(2.5), null);
check("refuses text", parseDisplayLimit("lots"), null);
check("refuses a half-typed value", parseDisplayLimit("12abc"), null);
check("refuses an empty field", parseDisplayLimit(""), null);
check("refuses whitespace", parseDisplayLimit("   "), null);
check("refuses null", parseDisplayLimit(null), null);
check("refuses undefined", parseDisplayLimit(undefined), null);
check("refuses NaN", parseDisplayLimit(NaN), null);
check("refuses Infinity", parseDisplayLimit(Infinity), null);

check("limitToText for a number", limitToText(5000), "5000");
check("limitToText for all", limitToText(SHOW_ALL), "all");

/* ---------- applyDisplayLimit ---------- */

const series = Array.from({ length: 100 }, (_, i) => ({ time: i }));

check("keeps the most recent bars", applyDisplayLimit(series, 10).length, 10);
check("slice ends at the newest bar", applyDisplayLimit(series, 10)[9].time, 99);
check("slice starts 10 back", applyDisplayLimit(series, 10)[0].time, 90);
check("a shorter series is untouched", applyDisplayLimit(series, 5000).length, 100);
check("'all' shows everything", applyDisplayLimit(series, SHOW_ALL).length, 100);
check("an empty series stays empty", applyDisplayLimit([], 10).length, 0);
check("a missing series is empty", applyDisplayLimit(null, 10).length, 0);

/* ---------- storage round trip ---------- */

const settings = {
  displayLimit: 1200,
  symbol: "NVD.DE",
  timeframe: "h1",
  indicators: ["fvg"],
  search: "nvid",
  assetClass: "STOCK",
  compatibleOnly: true,
};

const storage = stubStorage();
check("write reports success", writeSettings(storage, settings), true);
checkDeep("round trip returns what was written", readSettings(storage), settings);
checkDeep("restore keeps every valid field", restoreSettings(readSettings(storage), LIVE), settings);
check(
  "stored payload carries its version",
  JSON.parse(storage.peek()).version,
  SETTINGS_VERSION,
);

/* ---------- unreadable storage falls back to defaults ---------- */

checkDeep("no storage at all", readSettings(null), {});
checkDeep("nothing stored yet", readSettings(stubStorage()), {});
checkDeep("corrupt JSON", readSettings(stubStorage({ initial: "{not json" })), {});
checkDeep("a bare array", readSettings(stubStorage({ initial: "[1,2,3]" })), {});
checkDeep(
  "an older version is discarded rather than reinterpreted",
  readSettings(stubStorage({ initial: JSON.stringify({ version: 0, settings }) })),
  {},
);
checkDeep(
  "a payload with no settings object",
  readSettings(stubStorage({ initial: JSON.stringify({ version: SETTINGS_VERSION }) })),
  {},
);

const denied = stubStorage({ denied: true });
checkDeep("a storage that throws on read", readSettings(denied), {});
check("a storage that throws on write reports failure", writeSettings(denied, settings), false);
check("writing to no storage reports failure", writeSettings(null, settings), false);
checkDeep(
  "denied storage still restores usable defaults",
  restoreSettings(readSettings(denied), LIVE),
  DEFAULT_SETTINGS,
);

/* ---------- per-field validation against live data ---------- */

const stale = {
  displayLimit: "not a number",
  symbol: "GONE.XX",
  timeframe: "h4",
  indicators: ["fvg", "no-such-indicator"],
  search: 42,
  assetClass: null,
  compatibleOnly: "yes",
};
const salvaged = restoreSettings(stale, LIVE);

check("unparseable limit falls back", salvaged.displayLimit, DEFAULT_DISPLAY_LIMIT);
check("an instrument gone from the catalog falls back", salvaged.symbol, null);
check("an unknown timeframe falls back", salvaged.timeframe, null);
checkDeep("unregistered indicators are dropped", salvaged.indicators, ["fvg"]);
check("a non-string search falls back", salvaged.search, "");
check("a null asset class falls back", salvaged.assetClass, "");
check("a non-boolean flag falls back", salvaged.compatibleOnly, false);

// The point of per-field fallback: one bad value must not cost the others.
const partial = restoreSettings(
  { displayLimit: SHOW_ALL, symbol: "GONE.XX", timeframe: "w1", indicators: ["fvg"] },
  LIVE,
);
check("a bad symbol does not discard the limit", partial.displayLimit, SHOW_ALL);
check("a bad symbol does not discard the timeframe", partial.timeframe, "w1");
checkDeep("a bad symbol does not discard indicators", partial.indicators, ["fvg"]);
check("only the bad field is defaulted", partial.symbol, null);

checkDeep("nothing stored restores every default", restoreSettings({}, LIVE), DEFAULT_SETTINGS);
checkDeep("a non-object restores every default", restoreSettings(null, LIVE), DEFAULT_SETTINGS);
checkDeep(
  "no live data yet defaults the validated fields",
  restoreSettings(settings, {}),
  { ...DEFAULT_SETTINGS, displayLimit: 1200, search: "nvid", assetClass: "STOCK", compatibleOnly: true },
);

if (failures) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log("all settings checks pass");
