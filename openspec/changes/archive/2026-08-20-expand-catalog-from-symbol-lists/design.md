## Context

See proposal.md — Why. What shapes the approach here:

- `data/symbols.csv` is hand-maintained and hand-committed. `tools/import_xtb_report_symbols.py` reads XTB `.xlsx` statements, prints proposed rows, and verifies afterwards that the catalog's hash did not change. Nothing in the repo writes the catalog, and this change keeps it that way.
- The two shortlists are plain text, not spreadsheets, and the importer only globs `*.xlsx`. `ETFs.txt` lines are `ticker, provider, wrapper, ACC|DIST, currency`; `STCs.txt` lines are `ticker, instrument name`. Neither carries a price column, so the importer's trick of deriving `point_size` from observed price decimals does not apply.
- Of the 92 distinct tickers across both files, 20 are already catalogued and 72 are not. Their XTB suffixes are `.DE`, `.FR`, `.NL`, `.UK`, `.BE`, `.ES`, `.NO`, `.SE`. The importer's `SUFFIX_MAP` knows the first four plus `.FI` and `.US`; `.BE`, `.ES`, `.NO`, `.SE` are unmapped, even though the catalog already contains a hand-written `.ES` row (`IDR.ES` → `IDR.MC`).
- `src/xtb_charts/fetch.py` is the only Yahoo boundary. `fetch_bars` already distinguishes the two failure modes this change depends on: an empty frame with no `history_metadata` is a dead or wrong ticker and returns an error; an empty frame with metadata is a live ticker with nothing in the window and returns an empty-but-OK result. It retries `YFRateLimitError` with exponential backoff and caches under `data/.yf-cache`.
- The offline-first rule constrains where the network calls live. Verification is a maintainer-run tool and a one-time catalog edit — it is not something the app or the frontend does.

## Goals / Non-Goals

**Goals:**

- Make "has data at Yahoo" a checkable property of a catalog row, established by evidence from Yahoo rather than by the shape of a ticker.
- Reuse the existing fetch boundary for that evidence, so verification and sync agree on what "no data" means.
- Keep the catalog hand-committed: tooling produces reports, a human commits rows.
- Leave the 20 already-catalogued tickers alone, including the ones whose Yahoo symbol was hand-corrected away from the XTB root (`SX7PEX.DE` → `EXV1.DE`, and its two siblings).

**Non-Goals:**

- No automatic catalog editing, now or later. No "apply the report" mode.
- No verification at app runtime, at catalog load, or on a schedule. Nothing here changes when the app talks to the network.
- No re-derivation of `point_size` for existing rows; precision stays as committed except where a new row needs one.
- No attempt to migrate stored candles for a removed instrument. Orphaned rows in `market.db` are left alone.

## Decisions

### Verification probes daily bars through `fetch.fetch_bars`, not a new Yahoo call path

A verification tool that called `yfinance` directly could disagree with sync about what counts as data — different `auto_adjust`, a different window, no rate-limit retry. Reusing `fetch_bars(symbol, TIMEFRAMES["d1"], start)` means a symbol that verifies is a symbol sync can fetch, by construction, and it inherits the backoff and cache for free.

The three outcomes map onto the spec's vocabulary:

| `fetch_bars` result | Meaning | Catalog decision |
| --- | --- | --- |
| bars returned | resolves, has data | verified |
| no bars, error set | ticker unknown to Yahoo | rejected / removal candidate |
| no bars, no error (metadata present) | live ticker, nothing in window | inconclusive — widen the window, then treat as no data |

Alternative considered: `yf.Ticker(sym).info`, which is a single lighter call. Rejected — `info` is the flakiest surface in `yfinance`, it can return a populated dict for a symbol with no price history, and the question here is specifically whether bars exist.

### Lookback window of two years, and the third outcome is retried before it is believed

A window long enough that a thinly traded ETF still shows bars, short enough that one request per symbol stays cheap. A recently listed instrument is the case that makes a fixed window awkward, but two years is well past any listing in these lists. When a probe returns the inconclusive third outcome, the tool re-probes with a ten-year window before reporting; only a symbol that comes back empty on both is reported as having no data. This matters because that outcome is exactly what a delisted-but-still-known ticker looks like.

### The shortlist reader is a separate small parser feeding the existing candidate pipeline

`tools/import_xtb_report_symbols.py` earns its complexity from the `.xlsx` unpacking. A shortlist is `line.split(",")[0]`. The reader is a distinct function — text files in, tickers plus label hints out — that hands its candidates to the same dedupe-against-catalog and propose-row logic the workbook path uses. The alternative, teaching `collect_from_workbook` about text, would tangle two unrelated parsers.

Deduplication then falls out of the existing shape: candidates are keyed by ticker in a dict, so a ticker named twice collapses before it reaches the catalog comparison, and `load_catalog`'s existing duplicate-`xtb_symbol` check is the backstop at commit time.

### Verification is its own tool, separate from the importer

`tools/verify_catalog_symbols.py` takes a set of symbols — the catalog by default, or a candidate list, or an explicit selection — and prints a per-symbol verdict. Keeping it separate means the existing importer stays offline and fast, the catalog sweep can be run on its own without re-reading any reports, and the tool has one reason to make network calls. Both tools end by re-hashing `data/symbols.csv` and failing loudly if it changed.

### Newly verified rows are added enabled; the disabled flag keeps only its other meaning

The current spec parks an unconfirmed instrument in the catalog as a disabled row. That was the right answer when there was no way to confirm a ticker; with verification there is, and a row that survives it has no reason to be off. So the flag narrows to one meaning: an instrument the maintainer chose to exclude from sync (`GLD.US`, `OOEA.DE`). Unverifiable candidates are not added at all — they are recorded in this change's notes as rejected, with the tickers tried, so the next attempt does not re-derive the same dead guesses.

**Assumption to confirm:** the request said to add symbols that are discoverable with historical data; it did not say what enabled state they land in. Adding them enabled is what makes them actually chart and screen, and it roughly doubles the sync set.

### Removal means deleting the row, and it is decided per row by the probe

The request is explicit that entries with no data come out, so a failing row is deleted rather than disabled. Two guards keep that from over-reaching: the probe decides, so a row that is disabled or flagged portfolio-incompatible but returns bars stays; and a failing row is checked for a corrected ticker before it is deleted, because the catalog already contains three rows whose Yahoo symbol had to be hand-corrected — a wrong ticker in the catalog is at least as likely as a genuinely dead instrument.

### Suffix mapping gains `.BE`, `.ES`, `.NO`, `.SE`

| XTB suffix | Exchange | Currency | Yahoo suffix |
| --- | --- | --- | --- |
| `.BE` | Euronext Brussels | EUR | `.BR` |
| `.ES` | BME Madrid | EUR | `.MC` |
| `.NO` | Oslo Børs | NOK | `.OL` |
| `.SE` | Nasdaq Stockholm | SEK | `.ST` |

`.NO` and `.SE` bring non-EUR quote currencies into the catalog, which the compatibility rules already handle as a visible warning — `3USL.UK` and the `.US` rows are the precedent. The mapping stays a way to generate a *candidate* ticker: the row is committed only after the probe confirms it.

### The verbatim XTB name still comes from xStation

Neither shortlist carries the xStation name. `ETFs.txt` has no name at all; `STCs.txt` has a short label. Writing either into `xtb_name` would break the one thing that field exists for — CFD classification reads it — so the tasks make filling it from xStation an explicit step before the rows are committed.

**Assumption to confirm:** these lists are read as XTB's real-instrument universe, so the rows are typed `REAL`. If any of these tickers is actually a CFD in xStation, its `xtb_name` will carry the CFD token and classification will still be correct — but the `instrument_type` column would need to say so, and that has to come from a human looking at xStation.

## Risks / Trade-offs

- **A single probe misjudges a live instrument and a good row gets deleted** → No row is removed on one empty result: the ten-year re-probe and the corrected-ticker search both run first, and every removal is listed in the commit with its reason so it can be read back.
- **Verifying ~160 symbols in one run trips Yahoo's rate limiter** → `fetch_bars` already retries with exponential backoff; the tool probes serially, and a rate-limited verdict is reported as "unknown", never as "no data". A rate-limited run can be re-run; only clean verdicts are acted on.
- **Verification is a point-in-time snapshot; a ticker can die a week later** → Accepted. Sync already surfaces a dead ticker as a per-symbol error, and the verification tool can be re-run over the catalog when that happens.
- **Doubling the enabled set roughly doubles sync wall time, including the 12:00 UTC release run** → Measure the first full sync. If the release job runs long, the lever is the enabled flag or the workflow's timeout, not a change to sync scheduling.
- **Removing rows orphans candles in `market.db` and stale files in a published export** → Harmless: queries are keyed by symbol and nothing reads a symbol absent from the catalog. A vacuum of orphaned data is deliberately out of scope.
- **Committing ~72 rows with hand-typed names is a lot of surface for typos** → The catalog loader validates structure, the probe validates the Yahoo ticker, and the `name` column is filled from the metadata Yahoo returned during verification rather than typed twice.

## Migration Plan

1. Widen `SUFFIX_MAP`, add the shortlist reader, add the verification tool — code only, catalog untouched, tests green.
2. Run verification over the 72 candidates; record verdicts. Run it over the existing 64 rows; record verdicts.
3. Commit the catalog edit — additions and removals together, so the tests that assert catalog counts move once.
4. Full sync to populate the new instruments, then check the screener and symbol browser.

Rollback is `git revert` of the catalog commit: the CSV is the whole state, and orphaned candles are inert.
