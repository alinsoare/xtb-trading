## 1. Build the report reader

- [x] 1.1 Add `tools/import_xtb_report_symbols.py` that reads an `.xlsx` with `zipfile` + `xml.etree.ElementTree` (shared strings resolved, no `openpyxl`) and yields each sheet's rows as column-letter-keyed dicts
- [x] 1.2 Find each sheet's header row by content — a row holding both a `Ticker` cell and an `Instrument` or `Instrument/Position` cell — and take the Instrument, Ticker, and Category column positions from it; skip a sheet with no such header and say so on stderr
- [x] 1.3 Collect instruments from every sheet of every `*.xlsx` under `data/xtb-reports/`, deduplicating by ticker across sheets and files, skipping rows with no ticker, and ignoring an instrument cell that parses as a number so a position identifier never becomes a name
- [x] 1.4 Report which collected tickers `data/symbols.csv` does not carry, and print a proposed CSV row for each: ticker as `xtb_symbol`, report label carried as a working `name`, `asset_class` from Category, and exchange / currency / `yahoo_symbol` guessed from the suffix table in design.md
- [x] 1.5 Confirm the tool leaves `data/symbols.csv` byte-identical when it runs — check the file's hash before and after
- [x] 1.6 Add `tests/test_report_import.py` covering header detection at differing row and column positions, cross-sheet and cross-file deduplication, a row with no ticker, and a numeric instrument cell resolving to the holding's name

## 2. Confirm the extraction against the report on disk

- [x] 2.1 Run the tool against `data/xtb-reports/` and confirm it finds 41 distinct tickers, of which 38 are missing from the catalog and 3 (`TSLA.DE`, `S0LR.DE`, `XAD6.DE`) are already present and left untouched
- [x] 2.2 Spot-check that `A1P0.DE` is reported once with the name "AI & Power Infrastructure" and not as any of its per-lot position identifiers
- [x] 2.3 Confirm the five catalogued instruments absent from the report (`ABEA.DE`, `NVD.DE`, `IDR.ES`, `AAPL.US`, `GLD.US`) are not touched or flagged for removal

## 3. Complete the 38 rows by hand

Take `xtb_name` verbatim from xStation for every row — never the report label. Confirm
`yahoo_symbol` against Yahoo; leave `enabled` off for any that cannot be confirmed.
Set `point_size` from the instrument's quoted precision in xStation, using the report's
observed decimals as a floor.

- [x] 3.1 XETRA ETFs, part 1: `2B76.DE` Automation & Robotics, `2B79.DE` Digitalisation, `2B7C.DE` S&P 500 Industrials Sector, `4MMR.DE` Defence Tech, `A1P0.DE` AI & Power Infrastructure, `AAKI.DE` AI & Robotics, `ASWC.DE` Future of Defense, `C8PX.DE` AI Semiconductor & Quantum, `CBUK.DE` MSCI China Tech, `CD91.DE` NYSE Arca Gold Bugs
- [x] 3.2 XETRA ETFs, part 2: `DFNC.DE` Europe Defence, `DRON.DE` Drone, `ED3F.DE` Europe Focused Def Tech, `ETLX.DE` Gold Mining, `FTGA.DE` Global Aerospace & Defence, `FVSJ.DE` AC Asia ex Japan, `H4ZP.DE` MSCI China, `IBCJ.DE` MSCI Poland, `ICNT.DE` MSCI China Technology, `IS0E.DE` Gold Producers
- [x] 3.3 XETRA ETFs, part 3: `JMLP.DE` Midstream Energy Dividend Dis, `LHTC.DE` STOXX Europe 600 Healthcare, `LI7U.DE` Lithium and Battery Tech, `S5SD.DE` S&P 500 ESG, `SPYN.DE` MSCI Europe Energy, `SXR2.DE` MSCI Canada, `V9N.DE` Data Cetr Reits and Digi Infr, `WTEH.DE` Enhanced Commodity
- [x] 3.4 XETRA ETCs: `BTCE.DE` Physical Bitcoin (report shows four decimals) and `OOEA.DE` Brent Crude — set `asset_class` to `ETC` as the seeded `XAD6.DE` does
- [x] 3.5 Euronext and Nordic entries: `BLC.FR` Bastide le Confort Medical and `CA.FR` Carrefour on Paris (`.PA`), `EEMU.FR` MSCI EMU Min TE, `ISAE.NL` Agribusiness on Amsterdam (`.AS`), `NESTE.FI` Neste on Helsinki (`.HE`)
- [x] 3.6 LSE entries `3USL.UK` S&P 500 3x Daily Leveraged (`ETN`) and `COPX.UK` Copper Miners: map to `.L`, record the line's real currency rather than assuming GBP, and check whether Yahoo quotes either in pence — if so set `price_divisor` to `100`
- [x] 3.7 `V.US` Visa: bare Yahoo ticker `V`, USD, and confirm from xStation whether the XTB name carries the CFD token, since that decides its classification
- [x] 3.8 Re-run the import and confirm it now reports nothing missing

## 4. Validate the grown catalog

- [x] 4.1 Load the 46-row catalog through `load_catalog` and confirm it raises nothing — no duplicate symbols, no empty symbol, no non-positive `point_size` or `price_divisor`
- [x] 4.2 Run `pytest tests/test_catalog.py` and the rest of the Python suite against the grown catalog, fixing any test that assumed the eight-row seed
- [x] 4.3 Open the symbol browser and confirm all 46 appear, that `3USL.UK`, `COPX.UK`, and `V.US` show a "not EUR" warning, and that no entry that should not be a CFD is flagged as one
- [x] 4.4 Chart one three-decimal instrument (for example `A1P0.DE`) and confirm the price scale and legend show three decimals rather than two

## 5. Sync at the new scale

- [x] 5.1 Sync a handful of the new symbols first and compare each one's observed currency and latest close against the report's last known price for it, to catch a `yahoo_symbol` that resolved to the wrong listing
- [x] 5.2 Run a full sync across all enabled instruments and confirm it completes without exhausting the retry budget; if the rate limiting cannot sustain 45 symbols, leave the surplus disabled and record what the ceiling turned out to be
- [x] 5.3 Confirm no per-symbol failure aborted the run and that any failed symbol is reported with its error rather than silently skipped

## 6. Documentation

- [x] 6.1 Note in the README's catalog section that `data/xtb-reports/` holds XTB statements and that `tools/import_xtb_report_symbols.py` reports which of their instruments the catalog is missing — including that it never edits the catalog and that `xtb_name` must come from xStation, not the report label
