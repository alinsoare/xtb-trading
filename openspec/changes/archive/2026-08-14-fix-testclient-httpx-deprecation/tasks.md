## 1. Baseline

- [x] 1.1 Run `uv run pytest` and record the current result: all tests passing with exactly one `StarletteDeprecationWarning` about `httpx`/`httpx2`
- [x] 1.2 Confirm no runtime module imports `httpx` (search `src/` and `tools/`), so the swap is genuinely test-only

## 2. Dependency swap

- [x] 2.1 In `pyproject.toml`, replace `httpx>=0.28.1` with `httpx2>=2.10` in the `dev` dependency group
- [x] 2.2 Regenerate the lockfile with `uv lock` and confirm `uv.lock` now resolves `httpx2` and no longer carries `httpx` as a project dev dependency
- [x] 2.3 Sync the environment (`uv sync`) and verify `httpx2` is importable while `starlette.testclient` no longer takes its fallback branch

## 3. Verification without weakening tests

- [x] 3.1 Run `uv run pytest` and confirm the suite passes with zero warnings and the same test count as the baseline in 1.1
- [x] 3.2 If any API test fails under `httpx2`, adapt the call or assertion to the new client's surface while keeping the assertion just as strict — do not delete, skip, or loosen a test to get green
- [x] 3.3 Confirm no test was skipped, xfailed, or warning-filtered as part of this change (diff `tests/` and the pytest config)

## 4. Regression guard

- [x] 4.1 Add `filterwarnings = ["error::starlette.exceptions.StarletteDeprecationWarning"]` to `[tool.pytest.ini_options]` in `pyproject.toml`
- [x] 4.2 Prove the guard works: temporarily reinstall `httpx` in place of `httpx2` (or emit the warning manually in a scratch run) and confirm the suite now fails rather than warning, then restore `httpx2`
- [x] 4.3 Run `uv run pytest` one final time to confirm a clean, warning-free pass with the guard active

## 5. Consistency check

- [x] 5.1 Verify the release workflow's `uv sync --frozen` step is satisfied by the regenerated `uv.lock` (dry-run `uv sync --frozen` locally)
- [x] 5.2 Check `README.md` and any developer setup notes for references to `httpx` as the test client and update them if present
