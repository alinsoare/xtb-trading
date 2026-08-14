## Context

See proposal.md — Why. What shapes the approach is the shape of the statement itself and
the shape of a catalog row.

An XTB statement (`data/xtb-reports/EUR_51940879_2025-12-31_2026-08-14.xlsx`) is a three-
sheet workbook. Each sheet opens with four or seven metadata rows, then a header row, then
data. The Instrument and Ticker columns are not in fixed positions:

| Sheet | Header row | Instrument column | Ticker column | Category column |
| --- | --- | --- | --- | --- |
| Closed Positions | 5 | A | B | C |
| Cash Operations | 5 | B | C | D |
| Open Positions | 8 | B (`Instrument/Position`) | C | D |

Together the sheets name 41 distinct tickers. Three (`TSLA.DE`, `S0LR.DE`, `XAD6.DE`) are
already catalogued, leaving 38 to add.

A catalog row needs eleven fields (`src/xtb_charts/catalog.py`). The report supplies two
of them well (`xtb_symbol` from Ticker, an approximate `name` from Instrument), one
usefully (`asset_class` from Category: 36 ETF, 3 STOCK, 2 ETC, 1 ETN), and the remaining
eight not at all. That asymmetry is the whole design problem: the import is a discovery
step, and row completion is human work.

## Goals / Non-Goals

**Goals:**

- Make "what is my catalog missing?" a command a maintainer can re-run whenever a new
  statement lands, rather than a manual diff.
- Land the 38 rows with field values that are defensible, not merely plausible — in
  particular a `yahoo_symbol` that has been checked and a `point_size` that matches how
  the instrument is actually quoted.
- Keep the tool out of the runtime: nothing the app serves should read a report.

**Non-Goals:**

- Automatic catalog rewriting, watching the reports directory, or any import triggered by
  loading the app. The spec makes the non-rewriting part normative; the rest follows from
  the project's offline-first stance.
- Reading positions, volumes, P&L, or cash flows. Only the instrument identity is of
  interest here; a portfolio view is a different change.
- Supporting the `.csv` or `.pdf` statement exports XTB also offers. Only `*.xlsx` is
  scanned until a non-`.xlsx` report actually appears in the directory.

## Decisions

### Parse `.xlsx` with the standard library rather than adding `openpyxl`

An `.xlsx` is a zip of XML; these sheets use nothing beyond shared strings and inline
values, so `zipfile` + `xml.etree.ElementTree` reads them in about forty lines. `openpyxl`
is not currently a dependency of this project and is not installed in `.venv`.

Alternative considered: add `openpyxl` and read the sheets by cell reference. It is the
obvious choice for a data pipeline, but this is a maintainer script run a handful of times
a year, and a new runtime dependency is a poor trade for forty lines. If a future
statement format defeats the simple reader — merged cells, styled numbers needing format
resolution — revisit then.

### Locate the header row by content, not by index

Rather than hardcoding the row numbers and column letters in the table above, scan each
sheet's first rows for one containing both an `Instrument` (or `Instrument/Position`) cell
and a `Ticker` cell, and take the column positions from it. The three sheets already
disagree on both, which is evidence the layout is per-report-type rather than fixed, and a
future statement adding a metadata line would silently shift every index.

The reader consequently needs no per-sheet configuration: it applies the same search to
every sheet in the workbook and skips sheets with no such header. That is what makes
"scan all sheets" cheap.

### Reject numeric instrument cells rather than filtering by sheet

The per-lot rows under an open position carry the holding's ticker with a position
identifier (`2613329144`) where the name belongs. Filtering these by knowing that Open
Positions has sub-rows would re-encode sheet-specific knowledge the previous decision just
removed. Instead: a cell that parses as a number is not an instrument name. Since the
ticker still deduplicates to the same entry, the name simply comes from whichever row
carries a real one.

### Derive `point_size` from observed price decimals, treated as a floor

Displayed price precision is derived from `point_size` (the `charting` spec's
instrument-derived precision requirement), so getting it wrong makes prices render wrong.
The seed catalog uses `0.01` for everything, but the report's own prices show most XETRA
ETFs here quote three decimals (`7.847`, `5.729`, `11.652`) and `BTCE.DE` four.

Observed decimals are a *lower* bound, not the tick size: `SXR2.DE` shows zero decimals
only because its few prices happened to be round. So the rule is: take the maximum
decimals observed across the report's open, close, and current prices as a floor, then
confirm the instrument's actual quoted precision in xStation before committing the row.
Where the report gives no signal, default to `0.01` as the seed catalog does.

Alternative considered: leave every row at `0.01` and fix precision when someone notices.
Rejected — 27 of the 38 already show more than two decimals, so the wrong value would be
the common case, not the exception.

### Map exchange, currency, and Yahoo suffix from the XTB suffix; never the root

The XTB ticker's suffix maps predictably; its root does not. The seeded `TSLA.DE` →
`TL0.DE` is the existing proof, and `IDR.ES` → `IDR.MC` shows the suffix rule already in
use.

| XTB suffix | Exchange | Expected currency | Yahoo suffix |
| --- | --- | --- | --- |
| `.DE` | XETRA | EUR | `.DE` |
| `.FR` | Euronext Paris | EUR | `.PA` |
| `.NL` | Euronext Amsterdam | EUR | `.AS` |
| `.FI` | Nasdaq Helsinki | EUR | `.HE` |
| `.UK` | London Stock Exchange | GBP or USD (per line) | `.L` |
| `.US` | NYSE / NASDAQ | USD | *(none)* |

So the tool proposes `<root><yahoo-suffix>` as a *starting guess* and the maintainer
confirms each one. Where confirmation fails, the spec's rule applies: commit the row with
`enabled` off rather than an unverified ticker.

### Two LSE lines need `price_divisor` attention

`3USL.UK` and `COPX.UK` are the first LSE entries. Yahoo reports some LSE instruments in
pence (GBp) while quoting the currency as GBP, which is exactly what the `price_divisor`
column exists for. Both of these are USD-denominated lines, so they likely need no
divisor — but "likely" is why this is called out as a per-row check rather than assumed.
Their non-EUR currency will trip the portfolio-incompatibility warning, which is correct
behavior and not something to suppress.

### `xtb_name` is left as work, not filled from the report

The specs make this normative and proposal.md explains why. Operationally: the tool prints
the report label in a comment column so the maintainer knows which instrument a row is,
and the row is not committed until the xStation name replaces it. `S0LR.DE` is the
cautionary example — the report says "Solar Energy", xStation says "Invesco Solar Energy
UCITS ETF" — and the existing catalog already holds the correct form for all three
overlapping tickers, which is why the import must not touch existing rows.

## Risks / Trade-offs

- **38 rows of hand-completed data is a lot of surface for a typo** → The catalog loader
  already rejects duplicates, empty symbols, and non-positive numerics. Add a check that
  runs the loader over the finished file and, separately, that every ticker the report
  names is either present or deliberately absent, so a dropped row is caught.
- **Yahoo tickers guessed from the suffix table may resolve to the wrong listing** — a
  root that exists on the target exchange as a different instrument is worse than one that
  does not resolve at all, because it fails silently with plausible bars → Confirm each
  against Yahoo, and sanity-check the first sync's observed currency and recent price
  against the report's last known price for that instrument.
- **The default sync scope grows from 7 to 45 enabled symbols** → The `sync` spec already
  requires backoff and inter-batch pauses; this change is the first real test of them.
  Verify a full sync completes without exhausting the retry budget before enabling all
  rows, and leave rows disabled if it does not.
- **Reader breaks on a future statement layout** → Header detection is by content, and a
  sheet with no recognisable header is skipped rather than misread. A statement whose
  layout defeats it produces "no instruments found in <sheet>", which is a visible failure
  rather than a silent one.
- **`3USL.UK` is a 3x daily leveraged product** → Nothing in the catalog flags leverage,
  and the compatibility rules only cover currency and CFD status. It is charted like any
  other instrument; noting it here so the absence is a known gap rather than an oversight.

## Migration Plan

No migration. The catalog is a CSV read at load; adding rows takes effect on the next
reload, and reverting is a `git revert` of the data file. Rows can be landed in batches by
committing them disabled and flipping `enabled` once their first sync is verified.

## Open Questions

- Whether the import should also warn about the reverse direction — catalogued
  instruments the reports never mention. Five exist today (`ABEA.DE`, `NVD.DE`, `IDR.ES`,
  `AAPL.US`, `GLD.US`) and they stay by design, so this is informational only and can be
  added later without changing the specs or the approach.
