## Why

The catalog in `data/symbols.csv` carries 46 instruments, all of which arrived from the
XTB statements the user had already traded. The 18 instruments in this request are
EUR-denominated UCITS funds — European sector and regional exposure (banks, energy,
utilities, small caps, single-country and pan-European baskets) — that the user wants to
watch and screen but has not traded, so no statement will ever name them. Until they are
in the catalog they cannot be charted, synced, or picked up by the accumulation screener.

The catalog is a watchlist, not a position list, so adding never-traded instruments by
hand is the intended path. This change is that hand-curation work, done once for a
specific batch.

## What Changes

- Add up to 18 confirmed rows to `data/symbols.csv`, growing it from 46 entries by the
  number of successfully resolved instruments:

  | XTB symbol | Issuer | Policy | Currency |
  | --- | --- | --- | --- |
  | `FLXK.DE` | Franklin | ACC | EUR |
  | `VVSM.DE` | VanEck | ACC | EUR |
  | `QDVI.DE` | iShares | ACC | EUR |
  | `ZPRU.DE` | SPDR | ACC | EUR |
  | `SX7PEX.DE` | iShares | DIST | EUR |
  | `BNK.FR` | Amundi | ACC | EUR |
  | `XB4A.DE` | Xtrackers | ACC | EUR |
  | `SXEPEX.DE` | iShares | DIST | EUR |
  | `XESP.DE` | Xtrackers | ACC | EUR |
  | `QDVF.DE` | iShares | ACC | EUR |
  | `SXRS.DE` | iShares | ACC | EUR |
  | `ZPRV.DE` | SPDR | ACC | EUR |
  | `STZ.FR` | SPDR | ACC | EUR |
  | `CEMS.DE` | iShares | ACC | EUR |
  | `SXRY.DE` | iShares | ACC | EUR |
  | `PANX.FR` | Amundi | ACC | EUR |
  | `SX6PEX.DE` | iShares | DIST | EUR |
  | `C50.FR` | Amundi | ACC | EUR |

- Each row is completed by hand from xStation (for the verbatim `xtb_name`) and from
  Yahoo Finance (for the confirmed `yahoo_symbol`), per the existing catalog
  requirements. Any instrument whose Yahoo ticker cannot be confirmed is omitted rather
  than guessed or added as a disabled row.
- No new catalog columns. The request's issuer, UCITS classification, and
  accumulating/distributing policy are descriptive attributes the catalog already carries
  inside the name fields (existing rows read like `iShares VII PLC - iShares MSCI Canada
  ETF USD Acc`), so they are recorded there rather than as new structured fields.
- No code changes. The catalog loader, sync, screener, and UI all read the file as-is.

## Capabilities

### New Capabilities

None. Adding rows to the catalog is the behavior the `instrument-catalog` spec already
describes ("Adding an instrument").

### Modified Capabilities

None. This change adds data, not behavior: no requirement in `instrument-catalog`,
`sync`, `market-data`, `charting`, or `accumulation-screener` changes, and every rule the
new rows must satisfy (verbatim xStation name, confirmed data-source ticker, EUR
compatibility) is already specified. `.openspec.yaml` therefore sets
`skip_specs: true`; inventing a requirement to describe an 18-row data addition would put
instrument names into a spec that is meant to stay instrument-agnostic.

## Impact

- Data: `data/symbols.csv` grows from 46 by the number of confirmed rows. All confirmed
  rows are EUR, so none trips the "not EUR" compatibility warning, and none is a CFD.
- Sync: enabled instruments grow from 45 by the number of confirmed rows, up to 63,
  roughly a 40% increase in a full sync's fetch count against Yahoo. The existing
  rate-limit and batching behavior in `sync` absorbs this; no change is needed, but a
  full refresh takes proportionally longer.
- Screener: the accumulation screener scores enabled instruments, so the payload and the
  screening pass both grow by the same proportion.
- Risk: `yahoo_symbol` cannot be derived mechanically from the XTB ticker — the suffix
  maps predictably (`.DE`→`.DE`, `.FR`→`.PA`) but the root does not. `SX7PEX.DE`,
  `SXEPEX.DE`, and `SX6PEX.DE` in particular use a longer root than any existing entry and
  need careful verification. Unresolved tickers are omitted from the catalog.
- Risk: `point_size` drives price-decimal display in the UI, so a wrong value shows a
  price at the wrong precision. Each row's point size is set from the instrument's own
  quoted precision rather than copied from a neighboring row.
- Tests: `tests/` exercises catalog loading against the real file, so the additions must
  keep it parseable (unique symbols, positive point size and divisor).
- Docs: none. `README.md`'s catalog section already describes hand-curation.
