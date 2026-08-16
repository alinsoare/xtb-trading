/* Filter predicate and sort comparator tests. Dev-time only; run:
 *   node tests/js/run_symbol_list.mjs */

import { filterSymbols, sortSymbols, visibleSymbolList } from "../../web/symbol-list.js";

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

function checkSymbols(name, actual, expectedSymbols) {
  checkDeep(name, actual.map((s) => s.xtb_symbol), expectedSymbols);
}

const symbols = [
  {
    xtb_symbol: "AAA.US",
    name: "Alpha Corp",
    asset_class: "STOCK",
    quote_currency: "USD",
    catalog_currency: "USD",
    exchange: "NASDAQ",
    compatible: true,
    enabled: true,
    total_bars: 100,
    last_sync_utc: "2026-01-10T12:00:00Z",
  },
  {
    xtb_symbol: "BBB.DE",
    name: "Beta GmbH",
    asset_class: "STOCK",
    quote_currency: "EUR",
    catalog_currency: "EUR",
    exchange: "XETRA",
    compatible: false,
    enabled: true,
    total_bars: 500,
    last_sync_utc: "2026-02-01T08:00:00Z",
  },
  {
    xtb_symbol: "CCC.US",
    name: "Charlie Inc",
    asset_class: "ETF",
    quote_currency: "USD",
    catalog_currency: "USD",
    exchange: "NASDAQ",
    compatible: true,
    enabled: false,
    total_bars: 50,
    last_sync_utc: null,
  },
  {
    xtb_symbol: "DDD.EU",
    name: "Delta Fund",
    asset_class: "ETF",
    quote_currency: "EUR",
    catalog_currency: "USD",
    exchange: "XETRA",
    compatible: true,
    enabled: true,
    total_bars: 200,
    last_sync_utc: "2026-01-20T00:00:00Z",
  },
];

const emptyFilters = {
  search: "",
  assetClass: "",
  quoteCurrency: "",
  exchange: "",
  compatibleOnly: false,
  enabledOnly: false,
};

/* ---------- filterSymbols: each filter in isolation ---------- */

checkSymbols(
  "quote currency EUR",
  filterSymbols(symbols, { ...emptyFilters, quoteCurrency: "EUR" }),
  ["BBB.DE", "DDD.EU"],
);

checkSymbols(
  "exchange XETRA",
  filterSymbols(symbols, { ...emptyFilters, exchange: "XETRA" }),
  ["BBB.DE", "DDD.EU"],
);

checkSymbols(
  "enabled only",
  filterSymbols(symbols, { ...emptyFilters, enabledOnly: true }),
  ["AAA.US", "BBB.DE", "DDD.EU"],
);

checkSymbols(
  "empty currency admits all",
  filterSymbols(symbols, { ...emptyFilters, quoteCurrency: "" }),
  ["AAA.US", "BBB.DE", "CCC.US", "DDD.EU"],
);

/* ---------- currency filter uses quote_currency, not catalog_currency ---------- */

checkSymbols(
  "EUR filter excludes catalog-USD instrument with effective EUR",
  filterSymbols(symbols, { ...emptyFilters, quoteCurrency: "EUR" }),
  ["BBB.DE", "DDD.EU"],
);

check(
  "USD filter excludes DDD.EU despite catalog_currency USD",
  filterSymbols(symbols, { ...emptyFilters, quoteCurrency: "USD" }).some((s) => s.xtb_symbol === "DDD.EU"),
  false,
);

/* ---------- combined filters ---------- */

checkSymbols(
  "EUR and XETRA together",
  filterSymbols(symbols, { ...emptyFilters, quoteCurrency: "EUR", exchange: "XETRA" }),
  ["BBB.DE", "DDD.EU"],
);

checkSymbols(
  "asset class ETF and enabled only",
  filterSymbols(symbols, { ...emptyFilters, assetClass: "ETF", enabledOnly: true }),
  ["DDD.EU"],
);

/* ---------- sortSymbols: each order ---------- */

const scores = {
  "AAA.US": { score: 2 },
  "BBB.DE": { score: 5 },
  "CCC.US": { score: 5 },
  "DDD.EU": { score: 1 },
};

checkSymbols(
  "sort by score descending",
  sortSymbols(symbols, "score", scores),
  ["BBB.DE", "CCC.US", "AAA.US", "DDD.EU"],
);

checkSymbols(
  "sort by symbol ascending",
  sortSymbols(symbols, "symbol"),
  ["AAA.US", "BBB.DE", "CCC.US", "DDD.EU"],
);

checkSymbols(
  "sort by name ascending",
  sortSymbols(symbols, "name"),
  ["AAA.US", "BBB.DE", "CCC.US", "DDD.EU"],
);

checkSymbols(
  "sort by synced: recent first, never-synced last",
  sortSymbols(symbols, "synced"),
  ["BBB.DE", "DDD.EU", "AAA.US", "CCC.US"],
);

checkSymbols(
  "default order preserves input",
  sortSymbols(symbols, "default"),
  ["AAA.US", "BBB.DE", "CCC.US", "DDD.EU"],
);

checkSymbols(
  "unknown order preserves input",
  sortSymbols(symbols, "unknown"),
  ["AAA.US", "BBB.DE", "CCC.US", "DDD.EU"],
);

/* ---------- equal-key ties keep catalog order ---------- */

const tiedSyncTimes = [
  { xtb_symbol: "ONE", name: "One", last_sync_utc: "2026-01-01T00:00:00Z" },
  { xtb_symbol: "TWO", name: "Two", last_sync_utc: "2026-01-01T00:00:00Z" },
];

checkSymbols(
  "equal sync times keep catalog order",
  sortSymbols(tiedSyncTimes, "synced"),
  ["ONE", "TWO"],
);

const tiedScores = {
  ONE: { score: 3 },
  TWO: { score: 3 },
};

checkSymbols(
  "equal scores keep catalog order",
  sortSymbols(tiedSyncTimes, "score", tiedScores),
  ["ONE", "TWO"],
);

const tiedSync = [
  { xtb_symbol: "OLD", last_sync_utc: "2026-01-01T00:00:00Z" },
  { xtb_symbol: "NEW", last_sync_utc: "2026-06-01T00:00:00Z" },
  { xtb_symbol: "NEVER", last_sync_utc: null },
];

checkSymbols(
  "never-synced after all synced",
  sortSymbols(tiedSync, "synced"),
  ["NEW", "OLD", "NEVER"],
);

/* ---------- visibleSymbolList combines filter and sort ---------- */

checkSymbols(
  "filter and sort together",
  visibleSymbolList(
    symbols,
    { ...emptyFilters, quoteCurrency: "EUR" },
    "symbol",
    scores,
  ),
  ["BBB.DE", "DDD.EU"],
);

if (failures) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log("all symbol list checks pass");
