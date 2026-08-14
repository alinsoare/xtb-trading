## Why

`data/symbols.csv` still holds the eight instruments seeded during the rebuild — a stub
chosen to exercise the catalog's shape (a CFD, a disabled entry, a non-XETRA exchange),
not a description of anything the user actually trades. The XTB account statements in
`data/xtb-reports/` are the authoritative record of that, and the one report present
names 41 distinct instruments. Only three of them (`TSLA.DE`, `S0LR.DE`, `XAD6.DE`) are
in the catalog, so 38 instruments the user holds or has traded cannot be charted at all.

The gap will keep reopening: the user exports a fresh statement whenever the portfolio
moves. So the answer is not a one-off paste of 38 rows, but a repeatable way to ask
"which instruments in my statements is the catalog missing?" — with the catalog itself
remaining hand-curated, because the report cannot supply most of what a catalog row needs.

## What Changes

- Add a maintainer tool that scans every `*.xlsx` in `data/xtb-reports/`, extracts the
  Instrument/Ticker pairs from every sheet, deduplicates by ticker across sheets and
  files, and reports which tickers the catalog does not yet cover. It prints proposed
  catalog rows for the missing ones; it does not rewrite `data/symbols.csv` itself.
- Grow `data/symbols.csv` from 8 to 46 entries by adding the 38 missing instruments,
  each completed by hand from xStation and Yahoo rather than from the report alone.
- Add an `instrument-catalog` requirement that a report-derived import is assistive: it
  proposes rows for a maintainer to complete and commit, and never edits the catalog as
  a side effect of running.
- Add an `instrument-catalog` requirement that the report's Instrument column is a short
  display label, not the verbatim xStation name — the report calls `XAD6.DE` "DB Physical
  Silver" where xStation calls it "Xtrackers Physical Silver ETC", and abbreviates others
  ("Data Cetr Reits and Digi Infr"). `xtb_name` must keep coming from xStation, because
  CFD classification reads that field and a truncated label could drop the "CFD" token.
- No existing catalog entry is removed. Five entries (`ABEA.DE`, `NVD.DE`, `IDR.ES`,
  `AAPL.US`, `GLD.US`) do not appear in the report and stay: the catalog is a watchlist,
  not a position list.

## Capabilities

### New Capabilities

None. The report import is a maintenance aid for an existing capability, and the rows it
produces are ordinary catalog rows.

### Modified Capabilities

- `instrument-catalog`: gains two requirements — that broker-report import is assistive
  and never writes the catalog itself, and that report display labels are not a
  substitute for the verbatim xStation name that CFD detection depends on. The existing
  requirement that the catalog is the hand-maintained single source of truth is
  reinforced rather than changed.

## Impact

- Data: `data/symbols.csv` grows from 8 to 46 rows. Enabled instruments — and therefore
  the default sync scope — grow from 7 to 45, which multiplies a full sync's fetch count
  by roughly six and makes the existing `sync` rate-limit and batching requirements load-
  bearing for the first time.
- Code: a new script under `tools/`. It can read `.xlsx` with the standard library
  (`zipfile` + `xml.etree`) since the sheets are plain shared-string XML, avoiding an
  `openpyxl` dependency that is not currently installed.
- Compatibility: the new set includes non-EUR instruments (`3USL.UK`, `COPX.UK`, `V.US`),
  so the portfolio-incompatibility warning will appear in the symbol browser for the
  first time on entries that are not CFDs. That is the flag working as specified, not a
  regression.
- Risk: `yahoo_symbol` cannot be derived mechanically from the XTB ticker. The suffix
  maps predictably (`.DE`→`.DE`, `.FR`→`.PA`, `.NL`→`.AS`, `.FI`→`.HE`, `.UK`→`.L`,
  `.US`→bare), but the root does not — the seeded `TSLA.DE` already maps to `TL0.DE`.
  Each of the 38 needs its Yahoo ticker verified, and any that cannot be resolved is
  added disabled rather than guessed.
- Docs: `README.md`'s catalog section gains a pointer to the import tool.
