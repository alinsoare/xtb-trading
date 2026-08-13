## ADDED Requirements

### Requirement: Price display precision follows the instrument

The number of decimals used to display prices SHALL be derived from the selected
instrument's point size in the catalog: a point size of `0.01` displays two decimals, a
point size of `0.00001` displays five. Every price the UI shows for that instrument SHALL
use that same precision — the price scale, the crosshair's price label, the crosshair OHLC
legend, and any chart tool readout — so that two readings of the same price never disagree.
Where the UI is given no usable point size for the selected instrument, it SHALL fall back to
two decimals and continue rendering, rather than failing or displaying an unbounded number of
decimals.

#### Scenario: Instrument quoted in hundredths

- **WHEN** the user charts an instrument whose point size is `0.01`
- **THEN** the price scale, the crosshair price label, and the OHLC legend each show two decimals

#### Scenario: Instrument quoted more finely

- **WHEN** the user charts an instrument whose point size is `0.00001`
- **THEN** the price scale, the crosshair price label, and the OHLC legend each show five decimals

#### Scenario: Readings of the same price agree

- **WHEN** a chart tool reports a price or a price difference for the selected instrument
- **THEN** it is shown with the same number of decimals as the OHLC legend and the price scale

#### Scenario: Switching to an instrument with different precision

- **WHEN** the user switches from an instrument quoted in five decimals to one quoted in two
- **THEN** the displayed precision changes to match the newly selected instrument

#### Scenario: Precision cannot be determined

- **WHEN** the UI is served an instrument with no usable point size, which a valid catalog cannot produce but a hand-edited or truncated data file can
- **THEN** prices are displayed with two decimals and the chart renders normally
