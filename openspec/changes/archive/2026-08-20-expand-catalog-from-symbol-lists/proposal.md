## Why

Two hand-kept shortlists of XTB instruments — `data/xtb-reports/ETFs.txt` (76 tickers) and `data/xtb-reports/STCs.txt` (16 tickers) — name instruments the maintainer wants to chart and screen, but only 20 of their 92 tickers are in `data/symbols.csv`. The remaining 72 are invisible to the app. At the same time the catalog has never been checked end to end against Yahoo Finance: a row whose `yahoo_symbol` returns nothing is dead weight that fails on every sync run and pollutes the symbol browser and the screener. Growing the catalog by more than half is the moment to make "every catalogued instrument has data" a stated property rather than an assumption.

## What Changes

- Add the tickers named in `ETFs.txt` and `STCs.txt` to `data/symbols.csv`, one row per distinct XTB ticker. Tickers the catalog already carries are left exactly as they are — the lists are candidates, not a replacement catalog.
- Make data availability a precondition for being in the catalog: a candidate row is committed only when its `yahoo_symbol` is confirmed to exist at Yahoo Finance **and** returns daily historical bars. A candidate whose ticker cannot be resolved to a working Yahoo symbol is not added at all, and is recorded in the change as rejected with the reason.
- Sweep the existing catalog with the same check and **BREAKING** remove rows whose `yahoo_symbol` returns no data. Removal is a data change, not a code change: the instrument disappears from the catalog, the symbol browser, and any stored candles for it become orphaned.
- Extend the XTB-to-Yahoo suffix mapping used by the import tooling to cover the exchanges the new lists introduce — `.BE`, `.ES`, `.NO`, `.SE` — alongside the existing `.DE`, `.FR`, `.NL`, `.FI`, `.UK`, `.US`.
- Add a maintainer-run verification tool that probes Yahoo for a set of symbols and reports, per symbol, whether it resolves and whether it has bars. Like the existing report importer it never writes `data/symbols.csv`; it produces the evidence a maintainer acts on.

## Capabilities

### New Capabilities

None. This change extends an existing capability rather than introducing one.

### Modified Capabilities

- `instrument-catalog`: adds a data-availability precondition for catalog membership, the rule that a verified curated-list candidate is added enabled while an unverifiable one is not added at all, deduplication of candidates against the catalog and each other, removal of existing rows with no data, and the widened XTB-to-Yahoo exchange suffix mapping.

## Impact

- `data/symbols.csv` — the substance of the change: roughly 72 candidate rows reviewed for addition, plus removal of any existing row that fails verification. Row count moves from 64 to well over 100.
- `tests/test_catalog.py` — `test_seed_catalog_is_valid` asserts exact catalog counts (64 total, 62 enabled) and the exact disabled set; those assertions must be updated to match the new catalog.
- `tests/test_api.py` — asserts `/data/catalog.json` returns 64 symbols; must follow the catalog.
- `tools/import_xtb_report_symbols.py` — `SUFFIX_MAP` gains the four new exchange suffixes; `guess_yahoo_symbol` and `guess_catalog_fields` inherit the widening. `tests/test_report_import.py` covers the mapping.
- New maintainer tool under `tools/` for Yahoo verification, plus its tests.
- `src/xtb_charts/fetch.py` is the only Yahoo boundary and is reused by the verification tool; no change to `catalog.py`, `sync.py`, `api.py`, or the frontend is expected.
- Sync runs get materially longer — the enabled set roughly doubles — which affects both local syncs and the once-daily release workflow. No change to when syncs happen: the offline-first rule stands.
- `README.md` — the catalog and import-tool sections describe the current workflow and gain the verification step.
