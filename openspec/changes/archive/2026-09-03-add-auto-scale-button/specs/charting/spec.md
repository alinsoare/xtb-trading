## ADDED Requirements

### Requirement: Automatic vertical scale

The chart SHALL offer a two-state control, labelled AUTO, that governs how the vertical (price) scale is chosen. The control SHALL sit in the lower-right corner of the chart area, overlaying the price scale, and SHALL be present whenever a chart is presented. It SHALL NOT obscure the crosshair's price label, the crosshair OHLC legend, or the empty-state message, and it SHALL NOT sit over an indicator sub-pane's own scale.

Its state SHALL be visible at a glance — which of the two states is in force SHALL be distinguishable without activating it and without relying on colour alone. Its default SHALL be off.

**While off**, the vertical scale SHALL behave exactly as it does today: the user SHALL be able to change it by hand on the price scale, and nothing about the chart's current vertical-scale behavior SHALL change. Off is the state that preserves existing behavior, and a browser that has never seen this control SHALL start in it.

**While on**, the vertical scale SHALL be derived from the bars currently visible in the horizontal view: the highest price among them SHALL be placed at 90% of the chart pane's height and the lowest price among them at 10%, measured from the bottom of the pane, leaving a tenth of the height clear above the high and a tenth below the low. Only visible bars SHALL contribute — a bar in the loaded slice but outside the horizontal view SHALL NOT influence the scale, and no bar outside the display limit SHALL be consulted at all. The placement SHALL hold at any container size, because it is expressed as a proportion of the pane's height rather than in pixels.

While on, the framing SHALL be recomputed whenever the set of visible bars changes — panning left or right, zooming in or out, jumping to the latest bar, switching instrument or timeframe, changing the display limit, reloading the series after a sync, and resizing the chart — so the 90/10 placement holds continuously during navigation rather than only at the moment the control was switched on. Recomputation SHALL read bars already loaded in the chart: it SHALL NOT cause a market-data fetch or a sync, and SHALL behave identically whether the frontend is served by the local dev backend or as a static export.

While on, changing the scale by hand SHALL NOT take effect: the framing is the control's to decide, and the user SHALL NOT be left with a scale that the next pan silently overrides. Switching the control off SHALL hand manual control back with the prices currently framed still framed, so the view does not jump at the moment of handover. Switching it on SHALL frame the current window immediately, without waiting for a pan, whatever scale was in force beforehand — including a scale the user had dragged.

The control SHALL affect the vertical scale only. Switching it on or off SHALL NOT change which bars are horizontally visible, SHALL NOT change the zoom, and SHALL NOT discard chart tool measurements or indicator drawings, which SHALL stay anchored to their own bars. Displayed price precision SHALL continue to follow the selected instrument.

Degenerate windows SHALL be defined rather than left to chance:

- Where every visible bar sits at a single price, the scale SHALL span a small range around that price so that the candles are drawn legibly near the middle of the pane and the price scale still reads as a scale, rather than collapsing to a zero-height range, dividing by zero, or blanking the pane.
- Where the visible window yields no usable price — no visible bars, or bars carrying values that are not finite numbers — the previous scale SHALL be left in force and the chart SHALL continue to render, with no error state and no fetch. The control SHALL remain in the state the user left it in, so the next window that does yield prices is framed without the user touching it again.
- Where the selected instrument and timeframe have no stored bars, the existing empty-state message SHALL remain as it is and the control SHALL be inert, retaining its state for the next series charted.

#### Scenario: Placement over the price scale

- **WHEN** the user charts an instrument
- **THEN** an AUTO control is visible in the lower-right of the chart area over the price scale, and it covers neither the crosshair price label, nor the OHLC legend, nor an indicator sub-pane's scale

#### Scenario: Off preserves today's behavior

- **WHEN** the user charts an instrument with the control off and changes the vertical scale by hand on the price scale
- **THEN** the scale changes as it does today and stays as the user set it

#### Scenario: Switching on frames the visible window

- **WHEN** the user switches the control on while a window whose visible high is 120 and visible low is 100 is displayed
- **THEN** 120 is placed at 90% of the pane's height and 100 at 10%, and the horizontally visible bars are unchanged

#### Scenario: Only visible bars count

- **WHEN** the control is on and the loaded slice contains a price far above anything in the visible window
- **THEN** the scale is derived from the visible window's own high and low, and the off-screen extreme has no effect on it

#### Scenario: Panning left recomputes the scale

- **WHEN** the control is on and the user pans left into a window whose prices are far below those of the previous window
- **THEN** the new window's high sits at 90% and its low at 10%, rather than the candles drawing squashed against the bottom of the pane

#### Scenario: Panning back right recomputes again

- **WHEN** the user pans back to the right after the scale has re-derived for an earlier window
- **THEN** the scale re-derives for each newly visible window as the user goes, ending framed on the window in view

#### Scenario: Zooming recomputes the scale

- **WHEN** the control is on and the user zooms out so that many more bars become visible
- **THEN** the scale re-derives from the wider window's high and low, keeping them at 90% and 10%

#### Scenario: Jumping to latest with AUTO on

- **WHEN** the control is on, the user has panned far back into history, and presses the jump-to-latest control
- **THEN** the view returns to the newest bar with its zoom unchanged and the scale framed on the newly visible window

#### Scenario: Switching instrument or timeframe with AUTO on

- **WHEN** the control is on and the user selects a different instrument or timeframe
- **THEN** the new series opens framed on its default zoom with its visible high at 90% and its visible low at 10%, and the control is still on

#### Scenario: Resizing the window keeps the proportions

- **WHEN** the control is on and the browser window is resized so the chart pane becomes taller
- **THEN** the visible high and low remain at 90% and 10% of the new pane height

#### Scenario: Manual scaling is inert while AUTO is on

- **WHEN** the control is on and the user tries to change the vertical scale by hand
- **THEN** the framing stays as the control derived it, rather than accepting a scale that the next pan would override

#### Scenario: Switching off hands back control without a jump

- **WHEN** the user switches the control off while a window is framed at 90/10
- **THEN** the same prices stay framed at the moment of the switch, and the user can then change the scale by hand as before

#### Scenario: Switching on after a manual scale

- **WHEN** the user has dragged the price scale to a range that hides the visible low, then switches the control on
- **THEN** the visible window is re-framed at once to 90/10 without the user panning or zooming

#### Scenario: A flat window

- **WHEN** the control is on and every bar in the visible window sits at the same price
- **THEN** the candles are drawn legibly near the middle of the pane, the price scale still shows a range around that price, and no error is shown

#### Scenario: A window with no usable prices

- **WHEN** the control is on and the visible window yields no usable price, because it contains no bars or because their values are not finite numbers
- **THEN** the previous scale stays in force, the chart continues to render without an error, and the control remains on for the next window

#### Scenario: No bars stored at all

- **WHEN** the selected instrument and timeframe have no stored bars and the control is on
- **THEN** the existing empty-state message is shown unchanged, nothing is drawn, and the control keeps its state for the next series charted

#### Scenario: A measurement survives the toggle

- **WHEN** a ruler measurement is drawn and the user switches the control on and then off
- **THEN** the measurement stays anchored to the bars it was taken against, exactly as it does when the user pans by hand

#### Scenario: Framing fetches nothing

- **WHEN** the control is on and the user pans, zooms, or toggles it repeatedly, in either dev-backend or static-export mode
- **THEN** no market-data request and no sync is made, and the behavior is identical in both modes

#### Scenario: Operating the control from the keyboard

- **WHEN** the user reaches the control by keyboard and activates it
- **THEN** it toggles, its focus is visibly indicated, and its new state is exposed to assistive technology as a pressed or unpressed toggle with a name identifying it as the automatic vertical scale

## MODIFIED Requirements

### Requirement: User settings persist across reloads

The UI SHALL remember the user's settings on the same browser and restore them on the next load: the chart display limit, the automatic vertical scale control's state, the selected instrument, the selected timeframe, the enabled indicators, and the sidebar filters (search text, asset class, quote currency, exchange, compatible-only, enabled-only, sort order). Persistence SHALL be local to the browser and SHALL NOT travel with the exported data or be shared between browsers. Only these settings persist; transient chart state SHALL NOT — neither an in-progress or completed measurement, nor the current zoom and scroll position, which start from the default framing on every load, nor the particular price range the automatic vertical scale last derived, which is recomputed from whatever is visible after the restore. Neither SHALL the sync controls' own state — the full-refresh option and the periodic-refresh control both start off on every load, so a reload can never resume fetching. A stored setting that is unusable — an instrument no longer in the catalog, an unknown timeframe, an unparseable limit, a non-boolean automatic-scale state, an unknown sort order, an asset class, quote currency or exchange no longer carried by any loaded instrument — SHALL be replaced by its default without blocking the rest of the restore. A browser holding settings written before the automatic vertical scale existed SHALL restore that control to its default of off, keeping its other settings, without a migration step and without an error. A sort order the list no longer offers SHALL be treated as unknown, so a browser holding the withdrawn sync-recency order restores the default order and keeps its other settings, without a migration step and without an error. A timeframe the system no longer supports SHALL likewise be treated as unknown, so a browser holding a withdrawn timeframe restores the default timeframe and keeps its other settings, again without a migration step and without an error. Restoring a filter SHALL NOT be able to hide the whole catalog behind a value the user cannot see in the filter's own choices. Where the browser denies persistent storage, the app SHALL operate normally with default settings.

#### Scenario: Settings survive a reload

- **WHEN** the user selects an instrument and timeframe, enables an indicator, sets a display limit, filters and sorts the sidebar, and reloads the page
- **THEN** the same instrument, timeframe, indicator state, display limit, filters and sort order are in effect after the reload

#### Scenario: The automatic vertical scale survives a reload

- **WHEN** the user switches the automatic vertical scale on and reloads the page
- **THEN** it is still on after the reload, and the restored series opens framed with its visible high at 90% and its visible low at 10%

#### Scenario: A browser that predates the control

- **WHEN** the browser holds settings written before the automatic vertical scale existed
- **THEN** the control restores to off, every other persisted setting is restored as usual, and no error is shown

#### Scenario: The derived price range is not restored

- **WHEN** the automatic vertical scale is on and the user reloads the page
- **THEN** the scale is derived afresh from the window visible after the restore, rather than from the range in force before the reload

#### Scenario: The headroom order survives a reload

- **WHEN** the user sorts the sidebar by headroom and reloads the page
- **THEN** the list is still sorted by headroom after the reload

#### Scenario: A withdrawn sort order falls back

- **WHEN** the browser holds a persisted sort order of sync recency, which the list no longer offers
- **THEN** the list restores the catalog's default order, every other persisted setting is restored as usual, and no error is shown

#### Scenario: A withdrawn timeframe falls back

- **WHEN** the browser holds a persisted timeframe of M15, which the system no longer supports
- **THEN** the chart opens on the default timeframe, every other persisted setting — instrument, indicators, display limit, filters and sort order — is restored as usual, and no error is shown

#### Scenario: Zoom is not restored

- **WHEN** the user zooms out to span the whole slice and reloads the page
- **THEN** the restored instrument and timeframe open framed on the default zoom, not the zoom in force before the reload

#### Scenario: Stored instrument is gone from the catalog

- **WHEN** the persisted instrument is no longer in the catalog on the next load
- **THEN** the app falls back to its default selection, keeps the other restored settings, and renders normally

#### Scenario: Stored filter value is gone from the catalog

- **WHEN** the persisted asset class, exchange or quote currency is no longer carried by any loaded instrument
- **THEN** that filter falls back to admitting every instrument, the other restored settings are kept, and the list is not left empty

#### Scenario: Storage is unavailable

- **WHEN** the browser blocks persistent storage
- **THEN** the app loads with default settings and continues to work, without an error state

#### Scenario: Settings are not part of the published data

- **WHEN** two different browsers load the same published site
- **THEN** each keeps its own settings, and neither is affected by the other's
