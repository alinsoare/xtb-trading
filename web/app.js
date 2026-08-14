/* XTB Charts frontend. No build step, no framework.
 *
 * Runs identically in two modes, decided by data/meta.json:
 * - "dev":    served by the local backend; sync controls visible.
 * - "static": exported files (GitHub Pages or a local rehearsal); no sync.
 *
 * All bar times are UTC epoch SECONDS (what lightweight-charts expects).
 * JavaScript Date works in milliseconds — multiply before date arithmetic.
 */

import { formatPrice, priceDecimals } from "./chart/format.js";
import { allTools, activeToolId, setActiveTool } from "./chart-tools/registry.js";
import "./chart-tools/ruler.js"; // registers the ruler tool
import { allIndicators, IndicatorPrimitive } from "./indicators/registry.js";
import "./indicators/fvg.js"; // registers the FVG indicator
import "./indicators/ob.js"; // registers the OB indicator
import "./indicators/macd.js"; // registers the MACD indicator
import {
  DEFAULT_DISPLAY_LIMIT,
  applyDisplayLimit,
  browserStorage,
  limitToText,
  parseDisplayLimit,
  readSettings,
  restoreSettings,
  writeSettings,
} from "./settings.js";
import { runScan } from "./screener/scan.js";

/* An incremental sync, repeated while the user leaves the control on. Long
 * enough that the skip rule leaves only M15 and H1 actually fetching. */
const PERIODIC_REFRESH_MS = 15 * 60 * 1000;

const storage = browserStorage();

const state = {
  meta: null,
  symbols: [],
  selected: null,
  timeframe: "d1",
  // The whole loaded series, kept only so a limit change can re-slice without
  // refetching; `bars` is the slice everything downstream draws from.
  loaded: [],
  bars: [],
  displayLimit: DEFAULT_DISPLAY_LIMIT,
  enabledIndicators: new Set(),
  syncPolling: null,
  // Session-only, and deliberately never persisted: restoring it would make the
  // app fetch on load, which is the startup auto-sync the project forbids.
  periodicTimer: null,
  screenerScores: {},
  screenerScanning: false,
  screenerProgress: null,
  // Nothing is persisted until the restore has finished writing state.
  ready: false,
};

const el = {
  list: document.getElementById("symbol-list"),
  search: document.getElementById("search"),
  assetFilter: document.getElementById("asset-filter"),
  sortOrder: document.getElementById("sort-order"),
  compatibleOnly: document.getElementById("compatible-only"),
  summary: document.getElementById("catalog-summary"),
  title: document.getElementById("chart-title"),
  subtitle: document.getElementById("chart-subtitle"),
  badges: document.getElementById("chart-badges"),
  notice: document.getElementById("chart-notice"),
  timeframes: document.getElementById("timeframes"),
  indicatorToggles: document.getElementById("indicator-toggles"),
  chartTools: document.getElementById("chart-tools"),
  syncControls: document.getElementById("sync-controls"),
  syncAll: document.getElementById("sync-all"),
  syncSelected: document.getElementById("sync-selected"),
  fullRefresh: document.getElementById("full-refresh"),
  periodicRefresh: document.getElementById("periodic-refresh"),
  periodicRefreshControl: document.getElementById("periodic-refresh-control"),
  displayLimit: document.getElementById("display-limit"),
  progress: document.getElementById("sync-progress"),
  progressFill: document.getElementById("progress-fill"),
  progressText: document.getElementById("progress-text"),
  empty: document.getElementById("chart-empty"),
  legend: document.getElementById("legend"),
  footer: document.getElementById("meta-footer"),
};

/* ---------- Chart ---------- */

const chart = LightweightCharts.createChart(document.getElementById("chart"), {
  layout: {
    background: { type: "solid", color: "#0f1216" },
    textColor: "#8b98a5",
    attributionLogo: false,
  },
  grid: {
    vertLines: { color: "#1b222b" },
    horzLines: { color: "#1b222b" },
  },
  rightPriceScale: { borderColor: "#262e38" },
  timeScale: { borderColor: "#262e38", timeVisible: true, secondsVisible: false },
  crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
  autoSize: true,
});

const candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
  upColor: "#26a69a",
  downColor: "#ef5350",
  borderVisible: false,
  wickUpColor: "#26a69a",
  wickDownColor: "#ef5350",
});

const indicatorPrimitive = new IndicatorPrimitive();
candleSeries.attachPrimitive(indicatorPrimitive);

/* Pane indicators own a separate sub-pane each. Keys are indicator ids; values
 * hold the chart series and any price lines created for reference levels. */
const indicatorPanes = new Map();

function refreshPaneIndices() {
  const panes = chart.panes();
  for (const entry of indicatorPanes.values()) {
    if (!entry.series.length) continue;
    const idx = panes.findIndex((pane) => pane.getSeries().includes(entry.series[0]));
    if (idx >= 0) entry.paneIndex = idx;
  }
}

function removeIndicatorPane(indicatorId) {
  const entry = indicatorPanes.get(indicatorId);
  if (!entry) return;

  const paneIndex = entry.paneIndex;
  for (const series of entry.series) {
    chart.removeSeries(series);
  }
  if (paneIndex !== undefined && paneIndex < chart.panes().length) {
    chart.removePane(paneIndex);
  }
  indicatorPanes.delete(indicatorId);
  refreshPaneIndices();
}

function syncPaneIndicator(indicatorId, result) {
  let entry = indicatorPanes.get(indicatorId);
  if (!entry) {
    const paneIndex = chart.panes().length;
    const series = [];
    const priceLines = [];
    for (const spec of result.paneSeries) {
      const SeriesType =
        spec.kind === "histogram"
          ? LightweightCharts.HistogramSeries
          : LightweightCharts.LineSeries;
      const options = {
        title: spec.title,
        color: spec.color,
        priceLineVisible: false,
        lastValueVisible: spec.kind === "line",
        ...(spec.kind === "line" ? { lineWidth: spec.lineWidth ?? 1 } : {}),
      };
      series.push(chart.addSeries(SeriesType, options, paneIndex));
    }
    if (result.referenceLines?.length && series[0]) {
      for (const ref of result.referenceLines) {
        priceLines.push(
          series[0].createPriceLine({
            price: ref.value,
            color: ref.color,
            lineWidth: 1,
            lineStyle: LightweightCharts.LineStyle.Dashed,
            axisLabelVisible: false,
          }),
        );
      }
    }
    entry = { paneIndex, series, priceLines };
    indicatorPanes.set(indicatorId, entry);
  }

  for (let i = 0; i < result.paneSeries.length; i++) {
    entry.series[i].setData(result.paneSeries[i].data);
  }
}

/* What a chart tool is handed on activation. Bars and instrument are accessors
 * because both change under the tool as the user browses. */
const toolContext = {
  chart,
  series: candleSeries,
  bars: () => state.bars,
  instrument: () => currentInstrument(),
};

chart.subscribeCrosshairMove((param) => {
  const bar = param.seriesData?.get(candleSeries);
  if (!bar) {
    el.legend.classList.add("hidden");
    return;
  }
  el.legend.classList.remove("hidden");
  el.legend.innerHTML =
    legendField("O", bar.open) +
    legendField("H", bar.high) +
    legendField("L", bar.low) +
    legendField("C", bar.close);
});

/* Keep the price scale, the legend and the chart tools on one precision, taken
 * from the instrument's point size. */
function applyPriceFormat() {
  const pointSize = currentInstrument()?.point_size;
  candleSeries.applyOptions({
    priceFormat: {
      type: "price",
      precision: priceDecimals(pointSize),
      minMove: Number.isFinite(pointSize) && pointSize > 0 ? pointSize : 0.01,
    },
  });
}

function legendField(label, value) {
  if (value === undefined || value === null) return "";
  const price = formatPrice(Number(value), currentInstrument());
  return `<span><span class="label">${label}</span>${price}</span>`;
}

/* ---------- Data ---------- */

async function getJSON(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function loadCatalog({ autoSelect = true } = {}) {
  const data = await getJSON("data/catalog.json");
  state.symbols = data.symbols;
  populateAssetFilter();
  renderList();
  renderSummary();
  if (!autoSelect) return;
  if (!state.selected && state.symbols.length) {
    select(state.symbols[0].xtb_symbol);
  } else if (state.selected) {
    renderHeader();
  }
}

// Guards against a slow response for a previously selected symbol/timeframe
// landing late and painting the wrong data under the current header.
let candleRequestSeq = 0;

async function loadCandles() {
  if (!state.selected) return;
  const seq = ++candleRequestSeq;
  const url = `data/candles/${encodeURIComponent(state.selected)}/${state.timeframe}.json`;
  const data = await getJSON(url);
  if (seq !== candleRequestSeq) return; // a newer selection superseded this response

  // A measurement refers to specific bars, so it must never outlive them. This
  // covers symbol and timeframe switches, and the reload after a sync.
  setActiveTool(null);
  renderChartTools();

  state.loaded = data.candles || [];
  applySlice();
  if (state.bars.length) chart.timeScale().fitContent();
  renderHeader();
}

/* The one place bars enter the chart. Slicing here rather than in each consumer
 * is what makes "indicators match what is on screen" structural: the candle
 * series, the indicators, the chart tools and the legend all read `state.bars`,
 * and none of them can forget to apply the limit. */
function applySlice() {
  state.bars = applyDisplayLimit(state.loaded, state.displayLimit);
  applyPriceFormat();
  candleSeries.setData(state.bars);
  el.empty.classList.toggle("hidden", state.bars.length > 0);
  recomputeIndicators();
}

/* Re-slice from bars already in memory. No fetch: the display limit bounds
 * drawing, not downloading. */
function changeDisplayLimit(raw) {
  const parsed = parseDisplayLimit(raw);
  if (parsed === null) {
    // Refused. The last valid limit stays in force and the chart is untouched;
    // restoring the text is what tells the user the entry did not take.
    el.displayLimit.value = limitToText(state.displayLimit);
    return;
  }

  el.displayLimit.value = limitToText(parsed);
  if (parsed === state.displayLimit) return;
  state.displayLimit = parsed;
  persist();

  // Treated as a series reload rather than a redraw: lowering the limit can push
  // a measurement's anchor out of the view, and half a measurement is worse than
  // none.
  setActiveTool(null);
  renderChartTools();
  applySlice();
  if (state.bars.length) chart.timeScale().fitContent();
}

/* ---------- Indicators ---------- */

function recomputeIndicators() {
  // Pure client-side computation over the displayed slice: no network here, and
  // a limit change recomputes because the slice it reads has changed.
  const drawables = [];
  const notices = [];
  const activePaneIds = new Set();
  const instrument = currentInstrument();

  for (const indicator of allIndicators()) {
    if (!state.enabledIndicators.has(indicator.id)) continue;
    // Counted against the displayed slice, not what is stored: a limit below an
    // indicator's warm-up must warn rather than render nothing while the bars it
    // needs sit unused in storage.
    if (state.bars.length < indicator.minBars) {
      notices.push(
        `${indicator.label}: needs at least ${indicator.minBars} bars, ` +
          `${state.bars.length} displayed on ${state.timeframe.toUpperCase()}`,
      );
      continue;
    }
    const result = indicator.compute(state.bars, instrument);
    if (result.warning) notices.push(`${indicator.label}: ${result.warning}`);
    if (indicator.render === "pane") {
      syncPaneIndicator(indicator.id, result);
      activePaneIds.add(indicator.id);
    } else {
      drawables.push(...(result.drawables || []));
    }
  }

  for (const id of indicatorPanes.keys()) {
    if (!activePaneIds.has(id)) removeIndicatorPane(id);
  }

  indicatorPrimitive.setDrawables(drawables);
  setNotice(notices.join(" · ") || null);
}

function renderIndicatorToggles() {
  el.indicatorToggles.innerHTML = "";
  for (const indicator of allIndicators()) {
    const button = document.createElement("button");
    button.textContent = indicator.label;
    button.classList.toggle("active", state.enabledIndicators.has(indicator.id));
    button.addEventListener("click", () => {
      if (state.enabledIndicators.has(indicator.id)) {
        state.enabledIndicators.delete(indicator.id);
      } else {
        state.enabledIndicators.add(indicator.id);
      }
      renderIndicatorToggles();
      recomputeIndicators();
      persist();
    });
    el.indicatorToggles.appendChild(button);
  }
}

/* ---------- Chart tools ---------- */

function renderChartTools() {
  el.chartTools.innerHTML = "";
  for (const tool of allTools()) {
    const button = document.createElement("button");
    button.textContent = tool.label;
    button.classList.toggle("active", tool.id === activeToolId());
    button.addEventListener("click", () => {
      // Pressing the active tool's own button turns it off.
      setActiveTool(tool.id === activeToolId() ? null : tool.id, toolContext);
      renderChartTools();
    });
    el.chartTools.appendChild(button);
  }
}

function setNotice(text) {
  el.notice.textContent = text || "";
  el.notice.classList.toggle("hidden", !text);
}

/* ---------- Rendering ---------- */

function currentInstrument() {
  return state.symbols.find((s) => s.xtb_symbol === state.selected) || null;
}

function badgeFor(reason) {
  const danger = reason === "CFD" || reason.startsWith("not ");
  return `<span class="badge ${danger ? "danger" : "warn"}">${escapeHtml(reason)}</span>`;
}

function visibleSymbols() {
  const query = el.search.value.trim().toLowerCase();
  const assetClass = el.assetFilter.value;
  const compatibleOnly = el.compatibleOnly.checked;

  const items = state.symbols.filter((s) => {
    if (compatibleOnly && !s.compatible) return false;
    if (assetClass && s.asset_class !== assetClass) return false;
    if (!query) return true;
    return (
      s.xtb_symbol.toLowerCase().includes(query) ||
      (s.name || "").toLowerCase().includes(query) ||
      (s.xtb_name || "").toLowerCase().includes(query)
    );
  });

  if (el.sortOrder.value !== "score") return items;

  return items
    .map((symbol, index) => ({ symbol, index }))
    .sort((a, b) => {
      const scoreA = state.screenerScores[a.symbol.xtb_symbol]?.score ?? 0;
      const scoreB = state.screenerScores[b.symbol.xtb_symbol]?.score ?? 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.index - b.index;
    })
    .map((entry) => entry.symbol);
}

function formatPct(value) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function renderMarks(marks, reasons) {
  if (!marks) return "";
  const title = reasons?.length
    ? reasons.map((r) => `${r.rule}: ${r.points}`).join("\n")
    : "";
  const dots = Array.from({ length: marks }, () => '<span class="screener-mark"></span>').join("");
  return `<span class="screener-marks" title="${escapeHtml(title)}">${dots}</span>`;
}

function renderScreenerRow(symbol) {
  const result = state.screenerScores[symbol.xtb_symbol];
  if (!result) return "";

  let marks = "";
  let detail = "";
  if (result.status === "not-screened") {
    detail = `<div class="screener-state">not screened</div>`;
  } else if (result.status === "insufficient-history") {
    detail = `<div class="screener-state">insufficient history</div>`;
  } else {
    marks = renderMarks(result.marks, result.reasons);
    const range = formatPct(result.rangePct);
    const position = formatPct(result.positionPct);
    detail = `<div class="screener-figures">30d range ${range} · position ${position}</div>`;
  }

  return `
    <div class="symbol-top">
      <span class="symbol-code">${escapeHtml(symbol.xtb_symbol)}${marks}</span>
      <span class="symbol-class">${escapeHtml(symbol.asset_class)}</span>
    </div>
    <div class="symbol-name" title="${escapeHtml(symbol.name)}">${escapeHtml(symbol.name)}</div>
    ${detail}`;
}

function renderList() {
  const items = visibleSymbols();
  el.list.innerHTML = "";

  if (!items.length) {
    el.list.innerHTML = `<li class="muted" style="padding:12px">No instruments match.</li>`;
    return;
  }

  for (const symbol of items) {
    const li = document.createElement("li");
    li.className = "symbol" + (symbol.xtb_symbol === state.selected ? " active" : "");

    const badges = symbol.incompatibility.map(badgeFor).join("");
    const synced = symbol.last_sync_utc
      ? `${symbol.total_bars.toLocaleString()} bars · ${relativeTime(symbol.last_sync_utc)}`
      : "never synced";

    const screener = renderScreenerRow(symbol);
    if (screener) {
      li.innerHTML = `${screener}
      <div class="symbol-meta">
        <span class="badge ok">${synced}</span>
        ${badges}
      </div>`;
    } else {
      li.innerHTML = `
      <div class="symbol-top">
        <span class="symbol-code">${escapeHtml(symbol.xtb_symbol)}</span>
        <span class="symbol-class">${escapeHtml(symbol.asset_class)}</span>
      </div>
      <div class="symbol-name" title="${escapeHtml(symbol.name)}">${escapeHtml(symbol.name)}</div>
      <div class="symbol-meta">
        <span class="badge ok">${synced}</span>
        ${badges}
      </div>`;
    }
    li.addEventListener("click", () => select(symbol.xtb_symbol));
    el.list.appendChild(li);
  }
}

function renderSummary() {
  const total = state.symbols.length;
  const flagged = state.symbols.filter((s) => !s.compatible).length;
  const bars = state.symbols.reduce((sum, s) => sum + s.total_bars, 0);
  let text =
    `${total} instruments · ${bars.toLocaleString()} bars` +
    (flagged ? ` · ${flagged} flagged` : "");
  if (state.screenerScanning && state.screenerProgress) {
    const { done, total: scanTotal } = state.screenerProgress;
    text += ` · screening ${done}/${scanTotal}`;
  }
  el.summary.textContent = text;
}

function renderHeader() {
  const symbol = currentInstrument();
  if (!symbol) return;

  el.title.textContent = `${symbol.xtb_symbol} — ${symbol.name}`;
  const parts = [
    `Yahoo ${symbol.yahoo_symbol}`,
    symbol.exchange,
    symbol.quote_currency,
    symbol.asset_class,
  ].filter(Boolean);
  el.subtitle.textContent = parts.join(" · ");

  // The warning belongs next to the chart, not only in the sidebar list.
  el.badges.innerHTML = symbol.incompatibility.map(badgeFor).join("");
}

function renderTimeframes() {
  el.timeframes.innerHTML = "";
  for (const key of state.meta.timeframe_order) {
    const button = document.createElement("button");
    button.textContent = state.meta.timeframes[key].label;
    button.className = key === state.timeframe ? "active" : "";
    button.addEventListener("click", () => {
      state.timeframe = key;
      renderTimeframes();
      persist();
      loadCandles().catch(reportError);
    });
    el.timeframes.appendChild(button);
  }
}

function populateAssetFilter() {
  const classes = [...new Set(state.symbols.map((s) => s.asset_class))].sort();
  const current = el.assetFilter.value;
  el.assetFilter.innerHTML = `<option value="">All classes</option>`;
  for (const cls of classes) {
    const option = document.createElement("option");
    option.value = cls;
    option.textContent = cls;
    el.assetFilter.appendChild(option);
  }
  el.assetFilter.value = current;
}

function renderFooter() {
  const generated = new Date(state.meta.generated_utc).toLocaleString();
  el.footer.textContent =
    state.meta.mode === "static"
      ? `Static snapshot generated ${generated} — data updates only via a new release.`
      : `Dev mode — data as of last sync.`;
}

function select(xtbSymbol) {
  state.selected = xtbSymbol;
  renderList();
  renderHeader();
  persist();
  loadCandles().catch(reportError);
}

/* ---------- Sync (dev mode only) ---------- */

async function startSync(symbols, { periodic = false } = {}) {
  // A refresh arriving mid-run is dropped, not queued. The server would answer
  // the second trigger with a conflict anyway; checking here keeps that expected
  // case out of the error display.
  if (periodic && state.syncPolling) return;

  const body = {
    symbols: symbols || null,
    // A periodic refresh is always incremental, whatever the checkbox says.
    full: periodic ? false : el.fullRefresh.checked,
    periodic,
  };
  try {
    await getJSON("api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSyncing(true);
    pollSync();
  } catch (error) {
    reportError(error);
  }
}

function setSyncing(active) {
  el.syncAll.disabled = active;
  el.syncSelected.disabled = active;
  el.progress.classList.toggle("hidden", !active);
}

/* `state.syncPolling` doubles as "a run is in flight", which is what a periodic
 * refresh checks before dropping its tick. It must therefore be cleared, not
 * merely stopped, or the first run would suppress every refresh after it. */
function stopPolling() {
  clearInterval(state.syncPolling);
  state.syncPolling = null;
}

function pollSync() {
  stopPolling();
  state.syncPolling = setInterval(async () => {
    let status;
    try {
      status = await getJSON("api/sync/status");
    } catch (error) {
      stopPolling();
      setSyncing(false);
      reportError(error);
      return;
    }

    const pct = status.total ? (status.completed / status.total) * 100 : 0;
    el.progressFill.style.width = `${pct}%`;
    el.progressText.textContent = status.running
      ? `Syncing ${status.current || ""} (${status.completed}/${status.total})`
      : summarise(status);

    if (!status.running) {
      stopPolling();
      setSyncing(false);
      el.progress.classList.remove("hidden");
      await loadCatalog();
      await loadCandles();
    }
  }, 1000);
}

function summarise(status) {
  const results = status.results || [];
  const failed = results.filter((r) => r.status === "error");
  const bars = results.reduce((sum, r) => sum + r.bars_written, 0);
  if (failed.length) {
    return `Done with ${failed.length} error(s): ${failed.map((f) => f.xtb_symbol).join(", ")}`;
  }
  const skipped = results.reduce((sum, r) => sum + (r.skipped || []).length, 0);
  const note = skipped ? ` · ${skipped} timeframe(s) already current` : "";
  return `Synced ${status.total} instruments · ${bars.toLocaleString()} bars written${note}`;
}

/* Session-scoped timer, owned entirely by the control that switches it on. */
function setPeriodicRefresh(on) {
  clearInterval(state.periodicTimer);
  state.periodicTimer = null;
  el.periodicRefreshControl.classList.toggle("on", on);
  if (!on) return;
  state.periodicTimer = setInterval(
    () => startSync(null, { periodic: true }),
    PERIODIC_REFRESH_MS,
  );
}

/* ---------- Helpers ---------- */

function relativeTime(iso) {
  const then = new Date(iso).getTime(); // milliseconds — ISO string, not epoch seconds
  if (Number.isNaN(then)) return "unknown";
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

function reportError(error) {
  console.error(error);
  el.progress.classList.remove("hidden");
  el.progressText.textContent = `Error: ${error.message}`;
}

/* ---------- Settings ---------- */

/* Written on every change the user makes. Sync state is absent on purpose: the
 * full-refresh option and the periodic-refresh control both come back off, so a
 * reload can never resume fetching. Tool state is absent too — a measurement
 * refers to specific bars and restoring one against a grown series would lie. */
function persist() {
  if (!state.ready) return;
  writeSettings(storage, {
    displayLimit: state.displayLimit,
    symbol: state.selected,
    timeframe: state.timeframe,
    indicators: [...state.enabledIndicators],
    search: el.search.value,
    assetClass: el.assetFilter.value,
    compatibleOnly: el.compatibleOnly.checked,
    sortOrder: el.sortOrder.value,
  });
}

async function startScreener() {
  state.screenerScanning = true;
  renderSummary();
  try {
    await runScan({
      catalog: { symbols: state.symbols },
      storage,
      getJSON,
      onProgress: ({ done, total }) => {
        state.screenerProgress = { done, total };
        renderSummary();
      },
      onScore: (symbol, result) => {
        state.screenerScores[symbol] = result;
        renderList();
      },
    });
  } catch (error) {
    reportError(error);
  } finally {
    state.screenerScanning = false;
    state.screenerProgress = null;
    renderSummary();
    renderList();
  }
}

/* ---------- Boot ---------- */

function onFilterChange() {
  renderList();
  persist();
}

el.search.addEventListener("input", onFilterChange);
el.assetFilter.addEventListener("change", onFilterChange);
el.sortOrder.addEventListener("change", onFilterChange);
el.compatibleOnly.addEventListener("change", onFilterChange);
el.displayLimit.addEventListener("change", () => changeDisplayLimit(el.displayLimit.value));
el.syncAll.addEventListener("click", () => startSync(null));
el.syncSelected.addEventListener("click", () =>
  startSync(state.selected ? [state.selected] : null),
);
el.periodicRefresh.addEventListener("change", () =>
  setPeriodicRefresh(el.periodicRefresh.checked),
);
// Leaving the page stops the timer as surely as switching it off does.
window.addEventListener("beforeunload", () => setPeriodicRefresh(false));

async function boot() {
  const stored = readSettings(storage);

  state.meta = await getJSON("data/meta.json");
  const defaultTimeframe = state.meta.timeframe_order.includes("d1")
    ? "d1"
    : state.meta.timeframe_order[0];

  // Sync controls, periodic refresh included, exist only where a backend does.
  // Static mode stays passive.
  el.syncControls.classList.toggle("hidden", state.meta.mode !== "dev");

  // The catalog first, without selecting anything: a restored instrument has to
  // be checked against it before it can be trusted.
  await loadCatalog({ autoSelect: false });

  const restored = restoreSettings(stored, {
    symbols: state.symbols.map((s) => s.xtb_symbol),
    timeframes: state.meta.timeframe_order,
    indicatorIds: allIndicators().map((i) => i.id),
  });

  state.displayLimit = restored.displayLimit;
  state.timeframe = restored.timeframe || defaultTimeframe;
  state.enabledIndicators = new Set(restored.indicators);
  el.displayLimit.value = limitToText(state.displayLimit);
  el.search.value = restored.search;
  el.compatibleOnly.checked = restored.compatibleOnly;
  el.sortOrder.value = restored.sortOrder;
  // Assigning an asset class the catalog no longer offers leaves the select on
  // "All classes", which is the fallback we want anyway.
  el.assetFilter.value = restored.assetClass;

  renderTimeframes();
  renderIndicatorToggles();
  renderChartTools();
  renderFooter();
  renderList();

  state.ready = true;

  const initial = restored.symbol || state.symbols[0]?.xtb_symbol || null;
  if (initial) select(initial);

  startScreener().catch(reportError);
}

boot().catch(reportError);
