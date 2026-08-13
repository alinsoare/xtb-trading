## 1. The suppression helper

- [x] 1.1 Add a module under `web/chart-tools/` that suppresses drag-panning on a chart and returns the function that undoes it, taking its own copy of the scroll settings before applying any change so the copy cannot be mutated by the chart
- [x] 1.2 Make the returned undo safe to call more than once: a second call is a no-op rather than a second restore

## 2. Wire the ruler to it

- [x] 2.1 Replace the ruler's inline save-and-apply on activation with a call to the helper, holding only the returned undo
- [x] 2.2 Call the undo on deactivation and drop the saved-options field, so the restore no longer depends on reading the chart back
- [x] 2.3 Reword the comment that explains the suppression to say why the copy matters, since the reason is not visible from the call site

## 3. Regression test

- [x] 3.1 Add a Node harness for the helper with a chart stub reproducing the library's behavior: `options()` returning its live internal object, and `applyOptions` deep-merging into the existing nested objects in place
- [x] 3.2 Assert the stub itself aliases, so the test cannot silently weaken into one that would pass against the bug
- [x] 3.3 Cover the round trip: drag-panning is off while suppressed and on again after the undo, repeated round trips leave it on, the other scroll flags keep whatever they were, and a stale undo called twice does not clobber a later change
- [x] 3.4 Run the harness alongside the existing ones and note it wherever the JS harnesses are listed for a contributor

## 4. Verification

- [x] 4.1 Full test suite green: `uv run pytest`, the existing `tests/js` harnesses, and the new one
- [x] 4.2 Dev mode: activate the ruler, take a measurement, switch the tool off, and confirm dragging the chart body pans it with no reload
- [x] 4.3 Dev mode: repeat the activate/measure/deactivate cycle several times and confirm panning survives every cycle
- [x] 4.4 Dev mode: with the ruler active, switch instrument and then timeframe, and confirm each deactivates the tool, clears the measurement, and leaves the chart pannable
- [x] 4.5 Dev mode: confirm the suppression still does its job — while the ruler is active, dragging the chart body neither pans it nor drops a stray anchor, and wheel zoom and axis dragging still work
- [x] 4.6 Static export: confirm the same behaviour with no backend, and that no market-data request results from any of it
