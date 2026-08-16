## MODIFIED Requirements

### Requirement: Two-click ruler measurement with live preview

While the ruler is active, the user SHALL define a measurement with two clicks on the chart: the first click sets the start anchor, and the second click sets the end anchor and completes the measurement. Between the two clicks, moving the pointer SHALL continuously update a preview of the measurement, so the user sees the values before committing. Each anchor SHALL take its price from the exact pointer position. The start anchor SHALL take its time from the stored bar nearest the pointer, so a measurement always starts on real data; a first click in the empty space to the right of the newest stored bar SHALL be refused, leaving no measurement in progress. The end anchor SHALL take its time from the stored bar nearest the pointer while the pointer is over the stored range, and from a bar position projected past the newest stored bar while the pointer is in the empty space to its right, so that a measurement always spans whole bars and may be extended beyond the newest bar. Projected bar positions SHALL continue the series' own bar spacing past the newest stored bar.

#### Scenario: Completing a measurement

- **WHEN** the ruler is active and the user clicks a start point, moves the pointer, and clicks a second point
- **THEN** the measurement is drawn between the two anchors with its final values, and further pointer movement no longer changes it

#### Scenario: Live preview while measuring

- **WHEN** the user has set the start anchor and moves the pointer without clicking
- **THEN** the measurement region and its readout update on every pointer move to reflect the pointer's current price and bar

#### Scenario: Cancelling an in-progress measurement

- **WHEN** the user has set the start anchor and presses Escape before the second click
- **THEN** the in-progress measurement is discarded, nothing is drawn, and the ruler remains active and ready for a new measurement

#### Scenario: Extending the preview past the newest bar

- **WHEN** the user sets the start anchor on a stored bar and moves the pointer into the empty space to the right of the newest bar
- **THEN** the measurement region keeps following the pointer past the newest bar and its readout keeps updating, rather than freezing at the newest bar

#### Scenario: Completing a measurement past the newest bar

- **WHEN** the user sets the start anchor on a stored bar and clicks a second point in the empty space to the right of the newest bar
- **THEN** the measurement completes there and stays drawn, with its region spanning from the start bar to the projected bar under that click

#### Scenario: Starting a measurement past the newest bar

- **WHEN** the ruler is active with no measurement in progress and the user clicks in the empty space to the right of the newest bar
- **THEN** no start anchor is set and no measurement begins, so the next click on a stored bar starts a measurement normally

#### Scenario: Start anchor on the newest bar

- **WHEN** the user sets the start anchor on the newest stored bar and moves the pointer to the right of it
- **THEN** the measurement is previewed and can be completed, because the start anchor is on a stored bar

### Requirement: Ruler measurement readout

A ruler measurement SHALL report all of the following between its two anchors: the price change, the percent change relative to the start anchor's price, the number of bars spanned, and the elapsed time. Price values SHALL use the same decimal precision as the chart's price scale for the selected instrument. The percent change SHALL be signed. The bar count SHALL be the number of bar positions in the range between the anchors, inclusive of both, counting stored bars within the stored range and projected bar positions beyond the newest stored bar. The elapsed time SHALL be the wall-clock span between the anchors' bar times, where a projected bar's time continues the series' bar spacing past the newest stored bar. The measurement SHALL be visually distinguishable by direction, so an upward measurement is not mistaken for a downward one.

#### Scenario: Measuring an upward move

- **WHEN** the user measures from a lower price to a higher price
- **THEN** the readout shows a positive price change, a positive percent change, the bar count, the elapsed time, and the measurement is styled as an upward move

#### Scenario: Measuring a downward move

- **WHEN** the user measures from a higher price to a lower price
- **THEN** the readout shows a negative price change and negative percent change, and the measurement is styled as a downward move

#### Scenario: Measuring backwards in time

- **WHEN** the user sets the end anchor at a bar earlier than the start anchor
- **THEN** the measurement is still drawn, with the bar count and elapsed time reported as non-negative magnitudes, and the price change reported relative to the first anchor clicked

#### Scenario: Measuring a single bar

- **WHEN** both anchors fall on the same bar
- **THEN** the readout reports a bar count of 1 and an elapsed time of zero without error

#### Scenario: Counting bars past the newest one

- **WHEN** the user measures from the newest stored bar to a point five bar positions to its right in the empty space
- **THEN** the readout reports a bar count of 6 and an elapsed time of five bar intervals, rather than a bar count of 1 and zero elapsed time

#### Scenario: Reading a measurement that spans the newest bar

- **WHEN** the user measures from a bar well inside history to a point in the empty space past the newest bar
- **THEN** the bar count is the stored bars from the start anchor to the newest bar plus the projected positions beyond it, and the price and percent change are unaffected by where the end anchor sits

### Requirement: Measurement anchors stay pinned to price and time

A drawn measurement SHALL stay anchored to the prices and bars it was taken against while the user pans and zooms the chart, so the measured region continues to mark the same candles. A measurement whose end anchor sits past the newest stored bar SHALL stay anchored to that projected position for as long as it is drawn, and SHALL remain readable when the projected position is scrolled out of view.

#### Scenario: Panning and zooming with a measurement on screen

- **WHEN** a measurement is drawn and the user pans or zooms the chart
- **THEN** the measurement moves and rescales with the candles it was taken against, keeping its reported values unchanged

#### Scenario: Panning away from a projected end anchor

- **WHEN** a measurement ending past the newest bar is drawn and the user pans back into history until that end anchor is off screen
- **THEN** the measurement keeps its reported values and its readout stays legible within the chart pane, exactly as for a measurement ending on a stored bar
