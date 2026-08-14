## Context

`tests/test_api.py` and `tests/test_export.py` drive the HTTP surface through `fastapi.testclient.TestClient`, which is Starlette's `TestClient`. Starlette 1.6 imports `httpx2` first and only falls back to `httpx` — emitting `StarletteDeprecationWarning` from `starlette/testclient.py` — when `httpx2` is absent. The repo pins `httpx>=0.28.1` in the `dev` dependency group, so the fallback path is what runs today. See `proposal.md` for motivation.

Constraints that shape the approach:

- `httpx`/`httpx2` is a test-only dependency. No runtime module imports it: the app's own dependencies are `fastapi`, `pandas`, `uvicorn`, `yfinance`.
- The environment is managed by `uv` with a committed `uv.lock`, and the release workflow installs with `uv sync --frozen`, so the lockfile must be regenerated in the same change.
- `pytest` config lives in `[tool.pytest.ini_options]` in `pyproject.toml` with `addopts = "-q"`.

## Goals / Non-Goals

**Goals:**

- The suite runs with zero warnings, with the deprecation removed at its source.
- A reappearance of this class of warning fails the suite rather than passing quietly.
- Test coverage and assertions stay exactly as they are.

**Non-Goals:**

- Rewriting the API tests to use a different client (raw ASGI transport, `httpx.ASGITransport`, or an `anyio`-based async client).
- Suppressing or ignoring the warning with a filter, `-W ignore`, or a `pytest.ini` entry that hides it.
- Introducing `httpx2` as a runtime dependency or using it anywhere outside tests.
- Broad dependency upgrades; only the test client library moves.

## Decisions

**Swap the dev dependency `httpx` → `httpx2` instead of pinning Starlette back.**
`httpx2` is the client Starlette's `TestClient` is written against going forward, and its 2.x line requires Python >= 3.10 while this project requires >= 3.13 — so the interpreter constraint is already satisfied. Alternatives considered: (a) pin `starlette<1.6` — rejected, it freezes a transitive dependency of FastAPI to dodge a one-line change and blocks future FastAPI upgrades; (b) keep `httpx` and filter the warning — rejected, it hides a real future breakage, since Starlette will eventually drop the fallback and the import will raise `RuntimeError`.

**Keep importing `TestClient` from `fastapi.testclient`; do not touch the tests unless the run proves otherwise.**
The tests use `TestClient` as a context manager plus `.get()`/`.post()` style calls, which is Starlette's own surface, not `httpx`'s. Under `httpx2` the same class is constructed over `httpx2.Client`, so the tests should be unaffected. Where `httpx2` does differ from `httpx` (its own `Response`/exception types), the tests only assert on status codes and JSON, so they do not name those types. This is the assumption the verification step exists to falsify; if a call signature did change, the fix is to adapt the affected assertion, not to relax it.

**Make this warning class an error, narrowly.**
Add `filterwarnings = ["error::starlette.exceptions.StarletteDeprecationWarning"]` to `[tool.pytest.ini_options]` rather than a blanket `error`. A blanket `error` would also promote unrelated third-party warnings from `pandas`/`yfinance` into failures, turning any upstream deprecation into a broken local suite — a maintenance cost the repo has not signed up for. The narrow filter locks in exactly the regression this change fixes.

**Remove `httpx` rather than keeping both.**
Leaving both installed means Starlette silently prefers `httpx2` while `httpx` lingers as an unused pin that later drifts or confuses a reader about which client the tests use.

## Risks / Trade-offs

- **`httpx2` turns out to be incompatible with the installed Starlette/FastAPI pair (import error or changed `TestClient` behavior)** → Verify by running the full suite right after the swap. Rollback is a one-line revert of `pyproject.toml` plus `uv lock`; the warning returns but the suite is green again, and the fallback branch still exists in Starlette 1.6.
- **`uv sync` cannot reach the index in a restricted environment** → The dependency change is inert until the lock is refreshed; if the fetch fails, stop and report rather than hand-editing `uv.lock`.
- **CI installs with `--frozen` and would fail on a stale lockfile** → Regenerating and committing `uv.lock` is part of the task list, not an afterthought.
- **The narrow `filterwarnings` entry only catches `StarletteDeprecationWarning`** → Accepted trade-off: other deprecations remain visible in the warnings summary as they are today, which is where a human reviewer already looks.
