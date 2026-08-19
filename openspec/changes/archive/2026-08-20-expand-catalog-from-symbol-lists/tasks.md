## 1. Widen the exchange suffix mapping

- [x] 1.1 Add `.BE` (Euronext Brussels, EUR, `.BR`), `.ES` (BME Madrid, EUR, `.MC`), `.NO` (Oslo Børs, NOK, `.OL`), and `.SE` (Nasdaq Stockholm, SEK, `.ST`) to `SUFFIX_MAP` in `tools/import_xtb_report_symbols.py`
- [x] 1.2 Extend `tests/test_report_import.py` to cover the four new suffixes in `guess_yahoo_symbol` and `guess_catalog_fields`, and to assert an unmapped suffix still leaves exchange and currency empty with the ticker passed through unguessed

## 2. Read the shortlists as candidates

- [x] 2.1 Add a shortlist reader to `tools/import_xtb_report_symbols.py` that parses `*.txt` in the reports directory as one instrument per line, taking the first comma-separated field as the ticker and the rest as label hints, skipping blank lines
- [x] 2.2 Feed shortlist candidates through the same ticker-keyed collection the workbook path uses, so a ticker named twice or named in both files yields one candidate
- [x] 2.3 Keep the catalog comparison as-is: a shortlist ticker already in `data/symbols.csv` is not proposed and its row is not touched
- [x] 2.4 Add tests: `ETFs.txt` and `STCs.txt` yield 92 distinct tickers, 20 of them already catalogued and 72 proposed; a ticker repeated across files is proposed once; the catalog file hash is unchanged after a run

## 3. Build the verification tool

- [x] 3.1 Add `tools/verify_catalog_symbols.py` that probes each symbol with `fetch.fetch_bars(symbol, TIMEFRAMES["d1"], now - 2 years)` and classifies the result as has-data, unknown-ticker, or empty-window
- [x] 3.2 Re-probe an empty-window result with a ten-year lookback before reporting it, and report a rate-limited or errored probe as `unknown` rather than as no-data
- [x] 3.3 Accept a symbol source on the command line: the catalog (default), the shortlist candidates, or an explicit list of symbols
- [x] 3.4 Print a per-symbol verdict with the ticker tried, the outcome, and the quote currency Yahoo reported; end with counts per outcome
- [x] 3.5 Hash `data/symbols.csv` before and after the run and fail with a non-zero exit if it changed, matching the importer's guard
- [x] 3.6 Add `tests/test_verify_symbols.py` with `fetch_bars` mocked for all three outcomes plus the rate-limited case, asserting the empty-window re-probe happens and that no catalog write occurs

## 4. Verify the 72 candidates

- [x] 4.1 Generate proposed rows for the 72 uncatalogued shortlist tickers and run verification over their derived Yahoo tickers
- [x] 4.2 For each candidate that fails, try to find the instrument at Yahoo under another ticker; re-verify any correction
- [x] 4.3 Record every rejected candidate in `openspec/changes/expand-catalog-from-symbol-lists/rejected-candidates.md` with the tickers tried and the reason, so a later attempt does not repeat the same guesses
- [x] 4.4 Fill `xtb_name` for each surviving candidate from xStation, not from the shortlist attributes or the Yahoo name; leave a row out of this change rather than committing a placeholder name
- [x] 4.5 Fill `name`, `quote_currency`, and `asset_class` from the metadata the verification probe returned, and set `point_size` from the price precision Yahoo shows for the instrument

## 5. Sweep the existing catalog

- [x] 5.1 Run verification over all 64 existing rows, including the two disabled ones
- [x] 5.2 For each failing row, search Yahoo for a corrected ticker; if one verifies, correct `yahoo_symbol` in place and keep the row
- [x] 5.3 List the rows that fail with no correction available, with the reason each failed, in the same rejected-candidates note
- [x] 5.4 Confirm no row is being removed merely for being disabled or portfolio-incompatible: every removal must trace to a failed probe

## 6. Commit the catalog edit

- [x] 6.1 Add the verified candidate rows to `data/symbols.csv` with `enabled=true` and `instrument_type=REAL`
- [x] 6.2 Delete the rows identified in 5.3 and apply the ticker corrections from 5.2
- [x] 6.3 Run `load_catalog()` against the edited file and confirm it loads with no duplicate `xtb_symbol` and no malformed row
- [x] 6.4 Update the catalog assertions in `tests/test_catalog.py` (total count, enabled count, disabled set) and the symbol count in `tests/test_api.py` to the new figures

## 7. Validate end to end

- [x] 7.1 Run the full test suite and fix anything the catalog change broke
- [x] 7.2 Run a full sync against the new catalog; confirm every enabled instrument returns bars and no per-symbol error remains unexplained
- [x] 7.3 Note the sync wall time and flag it if it puts the 12:00 UTC release job near its timeout
- [x] 7.4 Open the app and confirm the new instruments chart correctly and appear in the screener with sane precision
- [x] 7.5 Update the catalog and import-tool sections of `README.md` to describe the shortlist source and the verification step
