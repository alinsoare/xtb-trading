## Why

Every `pytest` run ends with a `StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated; install httpx2 instead`. Starlette 1.6 still accepts `httpx`, but a future release will drop that fallback and the API tests will fail to import their client. Fixing it now costs a dev-dependency swap; fixing it later happens under a red test suite.

## What Changes

- Replace the `httpx` dev dependency with `httpx2`, the client Starlette's `TestClient` now prefers, and refresh the lockfile.
- Turn the warning class into a hard failure in the pytest configuration so a future deprecation warning cannot quietly ride along again — the suite fails instead of passing "with 1 warning".
- No test is skipped, loosened, or filtered out; the warning is removed at its source rather than suppressed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a test-tooling and dependency change with no spec-level behavior change: the HTTP surface, chart behavior, and sync behavior are untouched, and the same assertions run against the same endpoints. The change declares `skip_specs: true`, following the precedent of other non-behavioral changes in this repo.

## Impact

- `pyproject.toml`: `[dependency-groups] dev` swaps `httpx` for `httpx2`; `[tool.pytest.ini_options]` gains warning-as-error handling.
- `uv.lock`: regenerated for the new dev dependency.
- `tests/test_api.py`, `tests/test_export.py`: import `fastapi.testclient.TestClient`; they should need no edit, since `TestClient` keeps its interface — this is the main assumption to verify by running the suite.
- Runtime dependencies (`fastapi`, `pandas`, `uvicorn`, `yfinance`) and the shipped app are unaffected; `httpx`/`httpx2` is only ever installed for tests. The release workflow runs `uv sync --frozen`, so the refreshed lockfile must be committed for CI to stay installable.
- Compatibility assumption: `httpx2` 2.10 requires Python >= 3.10 and the project requires >= 3.13, so the interpreter constraint is satisfied.
