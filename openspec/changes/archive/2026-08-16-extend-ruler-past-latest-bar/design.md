## Context

See proposal.md — Why. The relevant current state:

- `web/chart-tools/ruler.js` builds an anchor from a crosshair/click event and returns `null` unless the event carries a bar time. In the empty space to the right of the newest bar the chart reports no time, so both the preview and the completing click are dropped there.
- `web/chart-tools/measure.js` is chart-free and DOM-free, and holds all the arithmetic (bar count, elapsed span, direction, percent). It resolves each anchor to a stored bar with `nearestBarIndex`, which clamps to the last index — so simply extrapolating an anchor time and handing it to `measure` would collapse back to the newest bar rather than counting past it. Its cases are covered by `tests/js/run_measure.mjs`.
- `web/chart/coords.js` maps a bar time to an x coordinate, clamping to a pane edge when the time falls outside the visible range. It has no notion of a position that has no bar at all.
- The empty space at the right edge is not incidental: the default framing reserves it (see `openspec/specs/charting/spec.md` — "Default chart zoom frames the most recent bars"), so the dead zone is on screen in the default view.

## Goals / Non-Goals

**Goals:**

- Keep every new arithmetic case inside `measure.js` so it stays testable without a browser, rather than pushing projection logic into the renderer.
- Keep a measurement's identity in time, not in screen or index space, so a projected end anchor survives panning, zooming, and a series reload that adds bars.
- Leave measurements wholly inside the stored range byte-for-byte identical in behavior and readout.

**Non-Goals:**

- Session or calendar awareness in the projection. Projected positions continue the bar spacing arithmetically; they do not skip weekends or market holidays.
- Projecting backwards past the oldest stored bar. See Decisions.
- Any change to how a measurement is dismissed, styled, or how the readout is formatted.

## Decisions

### Anchors carry a projection offset instead of only a time

An anchor becomes `{ time, price, barsAhead }`, where `barsAhead` is `0` for a pointer over the stored range and a positive integer for a pointer in the empty space to the right of the newest bar. `measure` uses `barsAhead` to place the end anchor at `lastIndex + barsAhead` and at `lastBarTime + barsAhead * interval`, bypassing `nearestBarIndex` for that anchor.

Alternative considered: extrapolate a time in the renderer and let `measure` resolve it as usual. Rejected because `nearestBarIndex` deliberately clamps to the stored range, so the projected time would snap back to the newest bar, reporting one bar and zero elapsed — exactly the bug being fixed. Loosening `nearestBarIndex` instead would weaken the fallback that keeps existing measurements sensible when bars are repruned underneath them.

### Bar interval derived from the median of recent stored gaps

`measure.js` gains an exported `barIntervalSeconds(bars)` that takes the median gap over the last N bars (order of 20) rather than the gap between the final two. The frontend has no timeframe-to-seconds table, and the last gap is the one most likely to straddle a weekend or holiday on D1/W1, which would inflate every projected step. The median is robust to those gaps while needing no new source of truth. With fewer than two bars there is no interval and no projection is possible; the tool then behaves as it does today.

Alternative considered: introduce a timeframe-to-seconds map keyed off the selected timeframe. Rejected as a second source of truth for something the data already states, and it would not describe a series whose bars are irregular.

### The pointer's bar position comes from the chart's logical index

The charting library reports a logical bar index for pointer positions in the empty space even where it reports no time, so `barsAhead` is `logical - lastIndex`, rounded and floored at `0`. This avoids the renderer having to reverse-engineer bar spacing in pixels.

### Rendering resolves projected positions through the logical scale

`coords.js` gains a companion to `xCoordinate` that maps a logical bar index to an x coordinate with the same pane-edge clamping, because the time-to-coordinate mapping has no bar to key on past the newest one. The ruler renderer uses the time path for stored anchors and the logical path for a projected anchor, so the region's right edge and the readout's placement work whether the projected position is on screen or scrolled away.

### A projected anchor is pinned by its time, and its index is recomputed

The measurement stores the projected absolute time as its identity; the logical index used for drawing is recomputed each frame from the current last bar as `lastIndex + round((anchorTime - lastBarTime) / interval)`. This keeps the drawn region over the same place on the time axis while panning and zooming, and means that when a later sync adds bars the anchor quietly becomes an ordinary position over real candles instead of drifting further into the future.

### Only the right-hand empty space is projectable

A pointer in the empty space to the left of the oldest stored bar keeps today's behavior: the click is ignored. Backward projection would invent history that the display limit may simply not have loaded yet, so the honest answer there is to pan and measure against the real bars. This also matches the request, which is about extending past the latest bar.

### The start anchor gate lives in the click handler

The first click is refused when the pointer has no bar time; the second is not. This is the whole of the "started before or at the latest bar" condition, and it keeps the invariant that a measurement always has one end on real data — which is what makes the price change, the percent change, and the stored-range part of the bar count meaningful.

## Risks / Trade-offs

- **A projected elapsed time reads as wall clock across closed markets** — a five-position projection on D1 reads five days even though two may be weekend. Mitigation: this matches the existing readout contract, where elapsed time is already wall clock and therefore already includes weekends and holidays on D1 and W1; the bar count remains the market-time measure.
- **The library's logical index in whitespace is an interaction detail the renderer now depends on** — a library upgrade could change it. Mitigation: the dependency is confined to anchor construction in `ruler.js` and the new coordinate helper; the arithmetic that could silently go wrong stays in `measure.js` under test, and losing the logical index degrades to today's behavior rather than to a wrong reading.
- **An irregular series makes the median interval an approximation** — a projected step may not equal the next real bar's span. Mitigation: the projection is a forward estimate by nature, and pinning the anchor by time means a later sync corrects the drawn position against real bars.
- **Rounding the pointer's logical index means the projected anchor snaps between whole positions** — consistent with anchors always spanning whole bars, so this is the intended behavior rather than a defect to work around.
