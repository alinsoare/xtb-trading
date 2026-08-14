## 1. Prepare

- [x] 1.1 Confirm none of the 18 XTB symbols is already in `data/symbols.csv` (the loader rejects duplicates, and the check is cheap to redo before editing)
- [x] 1.2 Record the current row count and enabled count of `data/symbols.csv` so the
  growth by the number of confirmed rows can be asserted at the end

## 2. Resolve each instrument's facts

For every symbol below, collect four things per design.md: the verbatim `xtb_name` from
xStation, a `yahoo_symbol` confirmed to return bars for that same fund, the instrument's
quoted `point_size`, and whether the row can be added. Note the issuer, UCITS
classification, and ACC/DIST from the request inside the `name` text; do not add columns.
Omit any symbol whose Yahoo ticker cannot be confirmed.

- [x] 2.1 Resolve `SX7PEX.DE`, `SXEPEX.DE`, `SX6PEX.DE` (iShares, DIST) — the highest-risk trio: their XTB roots are longer than any existing catalog entry and are expected to differ from the Xetra listing code Yahoo uses
- [x] 2.2 Resolve `QDVI.DE`, `QDVF.DE`, `SXRS.DE`, `SXRY.DE` (iShares, ACC)
- [x] 2.3 Resolve `CEMS.DE` (iShares, ACC)
- [x] 2.4 Resolve `ZPRU.DE`, `ZPRV.DE` (SPDR, ACC) and `STZ.FR` (SPDR, ACC, Euronext Paris)
- [x] 2.5 Resolve `BNK.FR`, `PANX.FR`, `C50.FR` (Amundi, ACC, Euronext Paris)
- [x] 2.6 Resolve `XB4A.DE`, `XESP.DE` (Xtrackers, ACC)
- [x] 2.7 Resolve `FLXK.DE` (Franklin, ACC) and `VVSM.DE` (VanEck, ACC)
- [x] 2.8 List which symbols, if any, were omitted because no Yahoo ticker could be confirmed

## 3. Write the catalog rows

- [x] 3.1 Append one row per confirmed instrument to `data/symbols.csv` using the resolved values, with `asset_class=ETF`, `instrument_type=REAL`, `quote_currency=EUR`, `price_divisor=1`, and `exchange` set to `XETRA` for `.DE` and `Euronext Paris` for `.FR`
- [x] 3.2 Keep the file's existing ordering convention and quote any `name` or `xtb_name` containing a comma, so the CSV stays well-formed
- [x] 3.3 Add only confirmed instruments; do not create rows for symbols identified in 2.8

## 4. Verify

- [x] 4.1 Load the catalog (`load_catalog`) and confirm it parses with 46 plus the number of confirmed symbols, with unique symbols and no validation error
- [x] 4.2 Run the test suite and confirm the catalog-related tests still pass against the grown file
- [x] 4.3 Open the app's symbol browser and confirm the new instruments appear, show "never synced", and carry no EUR-compatibility or CFD warning
- [x] 4.4 Sync one newly added instrument and confirm bars arrive, the observed currency is EUR with no catalog/observed mismatch warning, and prices render at the decimals implied by its `point_size`
- [x] 4.5 Confirm omitted symbols (if any) are absent from the browser and skipped by the sync run
