---
sidebar_position: 4
title: Code Style
description: The formatters, linters and type checkers LNbits enforces
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Code Style

LNbits' style is whatever its tooling enforces. Run `make format` before committing and `make check` before opening a PR. CI runs the same checks.

## Tools {#tools}

| Tool | Scope | Configured in | Fix | Check |
|---|---|---|---|---|
| [Black](https://black.readthedocs.io/) | Python formatting, line length 88 | `pyproject.toml` `[tool.black]` | `make black` | `make checkblack` |
| [Ruff](https://docs.astral.sh/ruff/) | Python lint and import order | `pyproject.toml` `[tool.ruff]` | `make ruff` | `make checkruff` |
| [mypy](https://mypy.readthedocs.io/) | Type checking | `pyproject.toml` `[tool.mypy]` | n/a | `make mypy` |
| [Pyright](https://microsoft.github.io/pyright/) | Type checking of `lnbits`, `tests`, `tools` | `pyproject.toml` `[tool.pyright]` | n/a | `make pyright` |
| [Prettier](https://prettier.io/) | JS, CSS, HTML, JSON | `.prettierrc` | `make prettier` | `make checkprettier` |

`make format` runs Prettier, Black and Ruff with `--fix`. `make check` runs mypy, Pyright, the three format checks and `checkbundle`. There is no `make lint`.

## Ruff rules {#linting}

`pyproject.toml` selects these rule sets: `F` (pyflakes), `E`/`W` (pycodestyle), `I` (isort), `A` (builtins), `C` (mccabe), `N` (naming), `UP` (pyupgrade), `RUF`, `B` (bugbear) and `S` (bandit). So imports are sorted by Ruff, and the bandit rules flag things like hard-coded passwords and `subprocess` calls. The mccabe limit is a complexity of 10 per function: upstream silences it for a few large functions with `# noqa: C901`, but a new function that trips it should usually be split.

Prettier's settings (`.prettierrc`) give the JavaScript its look: no semicolons, single quotes, no trailing commas, no spaces inside braces (`{items: []}`), and an 80-character line.

The formatters skip generated and third-party code: `lnbits/static` bundles, `lnbits/extensions`, `lnbits/upgrades` and the gRPC stubs in `lnbits/wallets/*_grpc_files`.

## Conventions in the codebase {#conventions}

- **Type hints** on functions, using modern syntax (`str | None`, not `Optional[str]`), since the minimum Python is 3.10.
- **Async all the way.** Database calls and HTTP requests are awaited. Don't add blocking work to async paths.
- **Keyword-only service functions.** Core services such as `create_invoice(*, wallet_id, amount, memo, ...)` and `pay_invoice(*, wallet_id, payment_request, ...)` take keyword arguments only. Follow the same pattern for new services with many parameters.
- **Layering.** Database access goes in `lnbits/core/crud/`, business logic in `lnbits/core/services/`, HTTP routes in `lnbits/core/views/`, and Pydantic models in `lnbits/core/models/`. Schema changes go in a new numbered function in `lnbits/core/migrations.py`.
- **Settings** are Pydantic fields in `lnbits/settings.py`. The environment variable is the field name in upper case.
- **CRUD functions take an optional `conn: Connection | None = None`** as their last argument, so callers can run several of them on one connection. `get_wallet_payment(wallet_id, payment_hash, conn=None)` in `lnbits/core/crud/payments.py` is a typical example.

## See also {#see-also}

- [Contributing](/docs/development/contributing)
- [Development Setup](/docs/development/setup)
