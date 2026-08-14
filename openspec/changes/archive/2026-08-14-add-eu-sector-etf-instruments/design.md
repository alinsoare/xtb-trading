## Context

See proposal.md — Why. The work is 18 hand-curated rows in `data/symbols.csv`, and the
request supplies only five facts per instrument: XTB symbol, issuer, UCITS classification,
distribution policy, and currency. The catalog needs eleven columns. This document fixes
how the supplied five map onto those eleven and where the remaining six come from, so all
18 rows are derived the same way rather than each being improvised.

Constraints already in force (from `openspec/specs/instrument-catalog/spec.md`):

- `xtb_name` holds the name exactly as xStation shows it, because CFD detection reads that
  field.
- A row is never committed with a guessed `yahoo_symbol`; an unconfirmable ticker means
  the instrument is omitted from the catalog.
- The catalog file is edited by hand — no tool writes it.

And from `openspec/specs/charting/spec.md`: the UI derives price decimals from
`point_size`, so that column is display-visible, not decorative.

## Goals / Non-Goals

**Goals:**

- One stated derivation rule per catalog column, applied uniformly across the 18 rows.
- A verification step per requested instrument that can fail safely by omitting the row
  rather than silently producing a wrong chart.
- Leave the catalog's shape, the loader, and every consumer untouched.

**Non-Goals:**

- No new columns for issuer, UCITS status, or distribution policy.
- No automation of catalog editing, and no import tool changes.
- No decision about which of these instruments the screener should favor — they enter as
  ordinary enabled entries and are scored like any other.

## Decisions

**The request tuple maps onto existing columns; nothing structural is added.**
`symbol` → `xtb_symbol`. `currency` → `quote_currency` (all EUR). Issuer, UCITS
classification, and ACC/DIST are carried as text inside `xtb_name` and `name`, which is
where existing rows already carry them (`iShares VII PLC - iShares MSCI Canada ETF USD
Acc`, `UBS S&P 500 Scored & Screened UCITS ETF USD dis`). The alternative — adding
`issuer` and `distribution_policy` columns — was rejected because nothing in the app reads
them: no requirement, no filter, no screener input mentions issuer or payout policy, so
the columns would be write-only. If a future change needs to filter by them, that change
can add the columns for the complete catalog at once, which is cleaner than
half-populating them now.

**`xtb_name` is transcribed from xStation, not composed from the request.** The request
gives an issuer, not a fund name, so composing something like "Amundi UCITS ETF Acc" would
invent a name that xStation never shows. Since CFD classification and the symbol browser's
search both read this field, it must be the real string. This makes xStation lookup a
per-row prerequisite, not an optional polish step.

**`yahoo_symbol` is verified per row against Yahoo, never derived.** The suffix maps
predictably (`.DE`→`.DE`, `.FR`→`.PA`) but the root does not; the catalog already contains
counterexamples (`TSLA.DE`→`TL0.DE`, `IDR.ES`→`IDR.MC`). Verification means confirming
that the candidate ticker returns bars for the same fund, not that the string resolves.
The three long-root symbols (`SX7PEX.DE`, `SXEPEX.DE`, `SX6PEX.DE`) are the likeliest to
diverge, since XTB's ticker for the iShares STOXX Europe 600 sector funds does not match
the Xetra listing code those funds trade under.

**Unverifiable rows are omitted rather than added disabled.** The change can therefore
complete with fewer than 18 new catalog rows, and no unresolved instrument is presented
as a known catalog entry. This keeps the catalog limited to instruments whose identity and
data source have both been confirmed.

**`asset_class`/`instrument_type` are `ETF`/`REAL` for all 18.** A UCITS fund is a real
fund share, not a contract for difference, and none of the 18 names will contain the CFD
token. `exchange` follows the XTB suffix: `.DE` → `XETRA`, `.FR` → `Euronext Paris`,
matching the strings existing rows use.

**`point_size` is read from each instrument's own quoted precision, not copied.** Existing
rows span `0.1`, `0.01`, and `0.001` for XETRA ETFs, so there is no safe default. A wrong
value is visible to the user as prices rendered at the wrong number of decimals, which is
why this is a per-row observation rather than a batch fill. `price_divisor` stays `1`
unless an instrument is found to quote in a scaled unit, which none of these is expected to.

## Risks / Trade-offs

- **A plausible-but-wrong Yahoo ticker silently charts a different fund.** Two funds from
  the same issuer tracking neighboring sectors can look alike in a ticker list. →
  Verification compares the fund identity (name and currency Yahoo reports), not just the
  ticker's existence; the existing catalog-vs-observed currency warning catches a
  mismatched currency after the first sync.
- **Enabled instruments grow ~40%, lengthening a full sync.** → No mitigation needed
  beyond awareness: sync is user-initiated and already rate-limited and batched, so the
  effect is a longer run, not a failure.
- **A malformed row breaks catalog loading for the whole app**, since the loader raises on
  duplicate symbols or non-positive numbers. → The additions are validated by loading the
  catalog and running the existing test suite before the change is considered done.
- **Trade-off: issuer and distribution policy stay unstructured.** Filtering by "only
  accumulating funds" is not possible without a later schema change. Accepted, because no
  current requirement asks for it.
