## Why

The chart carries exactly one indicator today — the FVG scanner — and the registry was built
so a second one costs nothing but the indicator itself. The obvious second one is the Order
Block: the SMC zone the author actually reads charts with in MT5, where `SMCTrading.mq5`
(v3.23) has produced it for years. An FVG marks where price left a gap; an Order Block marks
the last opposing candle before the impulse that broke structure, which is the level the
author waits at. Without it, the web chart cannot replace the MT5 window for the decision it
is meant to support.

## What Changes

- Add an **Order Block indicator** to the client-side registry — registry id `ob`, toolbar
  label `OB` — ported from the Order Block detection in `SMCTrading.mq5`. It detects supply
  (SELL) and demand (BUY) zones and renders them as rectangles with a direction-coloured
  label, using the drawable shapes the registry already defines.
- Port, as **internal computation only**, the machinery Order Block detection depends on:
  swing-pivot detection over typical price with points-based confirmation, structural
  break tracking (BOS/SMS), and the impulse/pullback classification of each swing (the MQL5
  `MoveTypeBuffer`, buffer 12). The Order Block impulse filter is not expressible without
  them. None of it is rendered or exposed as a separate indicator.
- Explicitly **do not** port, as user-visible features: pivot `H`/`L` labels, swing arrows
  between pivots, BOS/SMS break labels, confirmation-level lines, the pending-pivot `H ?`
  visuals, the price-return arrow markers drawn when price re-enters a zone, or the slow-RSI
  momentum block. The slow RSI is dead weight even in the source — it is computed but its only
  consumer (`GetSlowRSIExtreme`) is never called.
- **Drop the skip-bar interval.** The source refuses to treat bars opening in a configured
  server-time window (`[23:30, 01:00)` by default) as pivots, on timeframes below H4. The port
  takes **every bar as real data**: no bar is skipped or modified. The consequence is accepted
  deliberately — on `m15` and `h1` the port reads a larger bar set than MT5 does, so its zones
  there may differ from the MT5 chart's.
- Commit to **strict algorithmic parity** with the MQL5 source on timeframes of H4 and above
  (`d1` and `w1` here), where the dropped skip filter cannot fire and both implementations read
  the same bars. Parity is verified by comparing the JS output against the MT5 indicator's own
  output over the same bars for the same symbol and timeframe, with a stated tolerance and a
  stated set of documented deviations. Unlike FVG, there is no Python reference implementation
  to generate fixtures from, so MT5 itself is the oracle: a dumper script exports the
  indicator's pivots and order blocks, and those exports become the golden fixtures.
- Add the OB analogue of the existing FVG test path: fixtures under `tests/fixtures/ob/`, a
  runner (`tests/js/run_ob_fixtures.mjs`) that imports the indicator module directly under
  Node, and a generator that converts MT5 exports into fixtures.

No behaviour changes for FVG, no new toolbar concepts, no data-layer or sync changes, and
nothing that fetches data — the indicator computes in the browser from bars already loaded,
exactly as the registry requires.

## Capabilities

### New Capabilities

None. The Order Block indicator is another entry in the existing indicator registry, and the
requirements it adds are about indicator behaviour, so they belong in the `indicators`
capability rather than a new one.

### Modified Capabilities

- `indicators`: adds requirements for the Order Block indicator — its detection rules, the
  internal-only pivot/structure/impulse computation it rests on, what it deliberately omits
  from the MQL5 source, and its strict-parity obligation against the MT5 original (including
  how parity is verified and which deviations are sanctioned). The existing framework
  requirements (registry, per-indicator toggle, client-side computation, full-history scan,
  insufficient-history warning) are unchanged and are what make this a drop-in addition;
  the FVG requirements are untouched.

## Impact

- **Frontend only.** New `web/indicators/ob.js`, plus one import line in `web/app.js` to
  register it (the same one-line hook `fvg.js` uses). Toolbar controls, persistence of the
  enabled set, and the insufficient-history warning all come for free from the registry —
  no changes to `web/index.html`, `web/styles.css`, `web/settings.js`, or `web/app.js`
  beyond that import.
- **Possible extension of `web/indicators/mt5math.js`** if shared MT5 numeric helpers are
  needed. The OB algorithm is structural (highs, lows, typical price, point-size distances)
  rather than moving-average based, so it may need nothing from that module; anything it does
  need goes there rather than into the indicator.
- **No backend changes**: no Python modules, no API endpoints, no data-contract or storage
  changes. The static exporter already copies `web/` wholesale.
- **No new runtime dependencies.** Node stays dev-time-only, used by the fixture runner.
- **New dev-time tooling outside the app**: an MQL5 script or `iCustom` consumer that dumps
  the MT5 indicator's pivots and order blocks to CSV, plus a Python generator that turns
  those dumps into fixtures. Compiling that dumper uses the MT5-Testing install.
- **Risk to watch**: the ported pivot/structure code is by far the largest piece of this
  change and is invisible in the UI, so a defect in it shows up only as missing or misplaced
  zones. That is what the parity fixtures exist to catch, and it is why parity is scoped as a
  requirement rather than left to review.
