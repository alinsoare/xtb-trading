## Context

See proposal.md — Why. The behaviour already exists: a single helper derives a decimal
count from the instrument's `point_size`, and it feeds the series price format (which drives
both the price scale and the crosshair price label), the OHLC legend, and the ruler readout.
The catalog has carried `point_size` per instrument since the rebuild, sourced from the XTB
instrument model, though every seeded instrument currently uses `0.01`.

## Goals / Non-Goals

**Goals:**

- One derivation of precision, consumed by every surface that prints a price, so the
  surfaces cannot drift apart again.
- A rule a future contributor cannot unknowingly undo, because the spec now names it.

**Non-Goals:**

- Changing any `point_size` value in the seed catalog, or adding instruments purely to
  exercise finer precision.
- Rounding or otherwise altering stored prices. This is a display rule only; bars keep the
  values Yahoo returned.
- Controlling anything about the price scale beyond decimal count — tick placement, label
  density and axis autoscaling stay as the charting library computes them.
- A user-facing precision override.

## Decisions

**Derive precision from `point_size` rather than adding a display-precision field.**
The catalog already carries `point_size`, and the tick size of an instrument is exactly what
determines how many decimals are meaningful for it — a second field expressing the same idea
would be one more thing to keep in sync, with no current instrument needing the two to
differ. Considered and rejected: a dedicated `display_precision` column (duplicates
`point_size` in practice, and the failure mode is silent disagreement), and inferring
precision from the stored bars by counting decimals (fragile — it shifts as data is
resynced, and a run of round prices would collapse the precision).

**Round `-log10(point_size)`, clamped to a sane band.** This maps `1`, `0.1`, `0.01`,
`0.00001` to 0, 1, 2 and 5 decimals, and the clamp keeps a nonsensical catalog value from
producing an absurd format. The fallback is the same two decimals the UI used before precision
was derived at all. Note that catalog loading already rejects a non-positive point size and the
column is mandatory, so a valid catalog cannot reach the fallback: it guards the display layer
against data files that were hand-edited or truncated after export, which is why the
requirement is written about what the UI is served rather than about what the catalog holds.

**Apply the precision on every candle load, not once at startup.** Precision is a property
of the selected instrument, so it has to be re-applied wherever bars are loaded — the same
path that already runs on instrument and timeframe switches. This is what makes the
switching scenario hold, and it is the obvious thing to get wrong by initialising the chart
once.

**Keep the derivation in one shared helper rather than formatting at each call site.**
Local formatting is precisely how the ruler readout and the legend came to disagree; the
requirement that all readings match is only structurally true if there is one source.

## Risks / Trade-offs

**A `point_size` finer than the instrument's real tick exposes floating-point formatting
artifacts** — a two-decimal price such as `296.30` renders as `296.29999` when the catalog
claims a point size of `0.00001`. → Mitigation: this only appears when `point_size`
misdescribes the instrument. The catalog is the fix, not the formatter; documenting the
column's meaning in the README is part of this change.

**The seeded catalog is uniformly `0.01`, so the finer-precision scenarios cannot be
observed as shipped.** → Mitigation: the decimal derivation itself is covered by the
existing Node test, including the fallback cases; the wiring is confirmed by temporarily
setting one instrument to a finer point size, checking all four surfaces, and reverting.

**Precision is cosmetic, which invites treating it as a data guarantee.** → Mitigation:
recorded above as a non-goal, and the requirement is worded as a display rule.

## Migration Plan

None required. No data, API, or storage changes; the change is a spec and documentation
addition over behaviour already in place, and reverting the commit is a complete rollback.
