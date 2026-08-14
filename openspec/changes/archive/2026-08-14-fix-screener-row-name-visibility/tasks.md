## 1. Sidebar row rendering

- [x] 1.1 Make the sidebar row build its identity block (symbol, marks, asset class, name) once for every instrument, independent of the screening result
- [x] 1.2 Reduce the `not-screened` and `insufficient-history` results to a status line rendered where the range/position figures sit, instead of replacing the whole row
- [x] 1.3 Confirm the screened path is unchanged: marks with their reasons tooltip, plus the 30-day range and position figures
- [x] 1.4 Confirm the no-screener-result path (no screening data at all) still renders the plain identity row with sync badge and compatibility badges

## 2. Styling

- [x] 2.1 Match the status line's spacing and type treatment to the figures line it stands in for, so an unscreenable row has the same height and rhythm as a screened one
- [x] 2.2 Keep the name's single-line ellipsis truncation intact in the unscreenable row

## 3. Verification

- [x] 3.1 Verify in the browser that an instrument with insufficient history shows its symbol and name in the sidebar without selecting it, with the status where the figures would be
- [x] 3.2 Verify the same for a disabled (not screened) instrument
- [x] 3.3 Verify search, asset-class and compatible-only filters still hide such instruments entirely when they do not match, and that score sorting is unaffected
- [x] 3.4 Run the existing JS and Python test suites to confirm nothing regressed
