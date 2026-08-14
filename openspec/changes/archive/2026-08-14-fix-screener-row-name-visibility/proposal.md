## Why

In the sidebar list, an instrument the screener could not score loses its identity: the row shows only the words "insufficient history" (or "not screened") where its symbol, asset class and name should be. The user cannot tell which instrument a row refers to without selecting it and reading the chart header, which makes the affected rows unusable for browsing and turns a benign informational state into data loss. The intent of the existing spec was already that the unscreenable state stands in for the *figures*, not for the whole row.

## What Changes

- Every visible sidebar row SHALL show its instrument's symbol, asset class and name, regardless of screening outcome — screened-and-marked, screened-and-quiet, not screened, or insufficient history.
- The unscreenable states ("not screened", "insufficient history") replace only the 30-day range and position figures within the row, keeping the rest of the row identical to a screened row.
- Filtering and sorting behavior is unchanged: filters may still hide a row entirely, but nothing inside a visible row may hide the instrument's name.
- No change to the screener's scoring, its result states, or how those states are computed — this is a presentation fix in the sidebar row.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `charting`: the Symbol browser requirement gains an explicit guarantee that the symbol and name are present in every visible row, and its unscreenable-instrument scenario is tightened so the state text stands in for the figures only.

## Impact

- `web/app.js` — `renderScreenerRow()` / `renderList()`, which currently return a bare state element for the `not-screened` and `insufficient-history` results instead of the full row markup.
- `web/styles.css` — the `.screener-state` element now sits where `.screener-figures` sits, so its spacing should match.
- No backend, contract, export, or screener-module change; `web/screener/*` and the Python side are untouched.
