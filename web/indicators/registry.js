/* Indicator registry and the generic chart primitive that renders indicator output.
 *
 * An indicator registers:
 *   { id, label, minBars, compute(bars, instrument) -> { drawables, warning } }
 *
 * Drawables are plain data, so this module has no chart or DOM dependency and
 * the dev-time Node test harness can import indicator modules directly.
 *
 * Drawable shapes:
 *   { type: "rect",  timeFrom, timeTo, priceLow, priceHigh, color }
 *   { type: "label", time, price, text, color, baseline: "top" | "bottom" }
 */

import { xCoordinate } from "../chart/coords.js";

const indicators = [];

export function registerIndicator(spec) {
  for (const key of ["id", "label", "minBars", "compute"]) {
    if (!(key in spec)) throw new Error(`indicator registration missing ${key}`);
  }
  if (indicators.some((i) => i.id === spec.id)) {
    throw new Error(`indicator ${spec.id} already registered`);
  }
  indicators.push(spec);
}

export function allIndicators() {
  return [...indicators];
}

/* ---------- Chart rendering ----------
 *
 * lightweight-charts has no rectangle series; drawables are painted through the
 * v5 series-primitive plugin API. The renderer runs on every paint with fresh
 * coordinate converters, which keeps shapes glued to bars through pan/zoom.
 */

export class IndicatorPrimitive {
  constructor() {
    this._drawables = [];
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;

    const primitive = this;
    this._paneView = {
      zOrder: () => "bottom", // behind the candles
      renderer: () => ({ draw: (target) => primitive._draw(target) }),
    };
  }

  attached({ chart, series, requestUpdate }) {
    this._chart = chart;
    this._series = series;
    this._requestUpdate = requestUpdate;
  }

  detached() {
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
  }

  paneViews() {
    return [this._paneView];
  }

  updateAllViews() {}

  setDrawables(drawables) {
    this._drawables = drawables || [];
    if (this._requestUpdate) this._requestUpdate();
  }

  _draw(target) {
    if (!this._drawables.length || !this._chart || !this._series) return;

    target.useMediaCoordinateSpace((scope) => {
      const ctx = scope.context;
      const width = scope.mediaSize.width;
      const timeScale = this._chart.timeScale();
      const visible = timeScale.getVisibleRange();
      if (!visible) return;

      for (const d of this._drawables) {
        if (d.type === "rect") this._drawRect(ctx, d, timeScale, visible, width);
        else if (d.type === "label") this._drawLabel(ctx, d, timeScale, visible, width);
      }
    });
  }

  _drawRect(ctx, rect, timeScale, visible, width) {
    // Entirely off-screen: skip rather than clamp both edges together.
    if (rect.timeTo < visible.from || rect.timeFrom > visible.to) return;
    const x1 = xCoordinate(rect.timeFrom, timeScale, visible, width);
    const x2 = xCoordinate(rect.timeTo, timeScale, visible, width);
    const y1 = this._series.priceToCoordinate(rect.priceHigh);
    const y2 = this._series.priceToCoordinate(rect.priceLow);
    if (x1 === null || x2 === null || y1 === null || y2 === null) return;
    ctx.strokeStyle = rect.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  }

  _drawLabel(ctx, label, timeScale, visible, width) {
    const x = xCoordinate(label.time, timeScale, visible, width);
    const y = this._series.priceToCoordinate(label.price);
    if (x === null || y === null) return;
    ctx.fillStyle = label.color;
    ctx.font = "9px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = label.baseline === "top" ? "top" : "bottom";
    ctx.fillText(label.text, x, y);
  }
}