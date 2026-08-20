## 1. Change the fill opacity

- [x] 1.1 In `web/indicators/registry.js`, change the `"fill"` branch of `_drawRect` to set
  `ctx.globalAlpha = 0.1` instead of `0.5`, keeping the save/restore of the previous alpha and
  the borderless treatment.

- [x] 1.2 When the delta lands in `openspec/specs/indicators/spec.md`, rename the scenario
  heading `OB rectangle is a borderless 50% fill` to say 90%-transparent. The delta has to keep
  the old heading verbatim because OpenSpec rejects a MODIFIED block that drops a scenario name,
  so the rename can only happen on the main spec.

## 2. Sanity check

- [x] 2.1 Load the chart with `OB` enabled and confirm the demand rectangles render as a faint
  tint with the candles beneath clearly visible, no border stroke, and the `OB` labels still at
  full colour strength.
