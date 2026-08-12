# XTB Trading (OpenSpec Rebuild)

A ground-up rebuild of [`xtb-trading`](../xtb-trading), planned with
[OpenSpec](https://openspec.dev/) instead of implemented directly.

`../xtb-trading` is the behavioral reference, not a dependency: an offline-first
candlestick charting app for a curated list of XTB instruments, backed by Yahoo
Finance data in SQLite, with a Python/uv backend and a build-step-free vanilla JS
frontend. Nothing here copies its code or git history — the goal is to replan the
same problem from scratch, capture the requirements as living specs, and let the
implementation follow from an agreed plan.

## Status

Not yet started. OpenSpec is scaffolded; no proposal has been written yet.

## Working with this repo

- `openspec/specs/` holds the source-of-truth requirements once they exist.
- `openspec/changes/` holds in-flight proposals (see `/opsx:propose` in the
 OpenSpec docs).
- Run OpenSpec's `/opsx:explore` or `/opsx:propose` in chat to start planning the
 rebuild.
