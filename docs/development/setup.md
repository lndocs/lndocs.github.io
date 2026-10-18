---
sidebar_position: 2
title: Development Setup
description: Set up a local LNbits development environment with uv, npm and the Makefile
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Development Setup

This page sets up a local checkout of LNbits for working on core. To write an extension, see [Extension Development](/docs/extensions/development). Upstream's own notes are in [`docs/devs/development.md`](https://github.com/lnbits/lnbits/blob/v1.6.2/docs/devs/development.md).

## Prerequisites {#prerequisites}

- Python **3.10, 3.11 or 3.12** (`requires-python = ">=3.10,<3.13"` in `pyproject.toml`)
- [uv](https://docs.astral.sh/uv/). The Poetry setup still exists, but upstream calls it legacy.
- Node.js and npm, for Prettier, Pyright and the frontend bundle
- Git

On a clean Debian or Ubuntu machine you may also need `autoconf`, `libtool` and `libpq-dev` to build some dependencies.

## Quick setup {#quick-setup}

```bash
git clone https://github.com/lnbits/lnbits.git
cd lnbits
# Pin a release to match these docs, or stay on `dev` to contribute
git checkout v1.6.2

curl -LsSf https://astral.sh/uv/install.sh | sh

uv sync --all-extras --dev   # Python deps, all extras, and the dev group
npm install                  # Prettier, Pyright and the bundler

cp .env.example .env
make dev                     # = uv run lnbits --reload
```

LNbits listens on `http://127.0.0.1:5000`. On first start, open it in a browser: you are sent to `/first_install` to set the Super User's username and password. `uv run lnbits-cli superuser` prints the Super User ID.

:::note Branches
The default branch on GitHub is **`dev`**, and pull requests target it. `main` only moves when a release is cut, so code on `dev` can differ from the release these docs describe.
:::

## Make targets {#development-commands}

These are the targets in the v1.6.2 `Makefile`:

| Target | What it does |
|---|---|
| `make dev` | `uv run lnbits --reload` (hot reload) |
| `make format` | Rewrites files: `prettier`, `black`, `ruff --fix` |
| `make check` | Lint and type-check without changing files: `mypy`, `pyright`, `checkblack`, `checkruff`, `checkprettier`, `checkbundle` |
| `make all` | `format` then `check`. **It runs no tests.** |
| `make test-unit` | `pytest tests/unit` with FakeWallet |
| `make test-api` | `pytest tests/api` with FakeWallet |
| `make test-wallets` | `pytest tests/wallets` (funding-source clients against mocked servers) |
| `make test-regtest` | `pytest tests/regtest`; needs the regtest Docker stack in `docker/regtest` |
| `make test` | `test-unit`, `test-wallets`, `test-api` **and** `test-regtest` |
| `make test-e2e` | Playwright browser tests (`npm run test:e2e`) |
| `make mypy`, `make pyright` | One type checker each |
| `make checkruff`, `make ruff` | Ruff check only, or with `--fix` |
| `make bundle`, `make checkbundle` | Rebuild the frontend bundle, or check that it is up to date |
| `make openapi` | Start a throwaway instance and validate its OpenAPI schema |
| `make migration` | Run `tools/conv.py` (SQLite to PostgreSQL) |
| `make install-pre-commit-hook`, `make pre-commit` | Install the pre-commit hooks, or run them on all files |
| `make docker` | `docker build -t lnbits/lnbits .` |

There is no `make lint` or `make test-cov`. Upstream's `AGENTS.md` recommends the targeted test targets (`test-unit`, `test-api`, `test-wallets`) over `make test`, which needs the regtest stack. See [Testing](/docs/development/testing).

## Configuration while developing {#configuration}

- **Funding source.** The default is `LNBITS_BACKEND_WALLET_CLASS=VoidWallet`, which can't send or receive. For local work set `FakeWallet`. It issues invoices signed with `FAKE_WALLET_SECRET` and can only "pay" invoices it issued itself.
- **The Admin UI is on by default** (`LNBITS_ADMIN_UI=true`). After the first start, editable settings, including the funding source, are stored in the database and **override `.env`**. Change them in `/admin`, or set `LNBITS_ADMIN_UI=false` while developing so that `.env` stays authoritative.
- **Cookies.** `AUTH_HTTPS_ONLY=true` (the default) marks auth cookies `Secure`. Browsers normally accept that on `http://localhost`. If you reach the dev server by a LAN IP over plain HTTP, set `AUTH_HTTPS_ONLY=false`, for development only.
- **Logs** go to the console and to `LNBITS_DATA_FOLDER/logs/`. `DEBUG=true` turns on debug logging.

```bash title=".env (development)"
LNBITS_BACKEND_WALLET_CLASS=FakeWallet
LNBITS_ADMIN_UI=false
DEBUG=true
```

## Database {#database-for-development}

SQLite is the default. The core database is `database.sqlite3` inside `LNBITS_DATA_FOLDER` (default `./data`), and each extension gets its own `ext_<id>.sqlite3` there.

To develop against PostgreSQL:

```bash
docker run -d --name lnbits-pg -p 5432:5432 \
  -e POSTGRES_USER=lnbits -e POSTGRES_PASSWORD=lnbits -e POSTGRES_DB=lnbits \
  postgres:15
```

```bash title=".env"
LNBITS_DATABASE_URL=postgres://lnbits:lnbits@localhost:5432/lnbits
```

LNbits expects the `postgres://` scheme. These credentials are for a throwaway local container only.

## Editor setup {#vs-code-setup}

The project is formatted with Black and linted with Ruff, both configured in `pyproject.toml` with a line length of 88. Pyright and mypy are the type checkers. In VS Code, point the interpreter at `.venv/bin/python` and use the Black Formatter and Ruff extensions:

```json title=".vscode/settings.json"
{
  "python.defaultInterpreterPath": ".venv/bin/python",
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter",
    "editor.formatOnSave": true
  }
}
```

## See also {#see-also}

- [Testing](/docs/development/testing)
- [Contributing](/docs/development/contributing)
- [Code Style](/docs/development/code-style)
