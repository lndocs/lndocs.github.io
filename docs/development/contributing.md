---
sidebar_position: 1
title: Contributing
description: How to contribute code, docs and extensions to LNbits
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Contributing to LNbits

LNbits is MIT-licensed and developed on GitHub at [lnbits/lnbits](https://github.com/lnbits/lnbits). This page covers the workflow. The official docs at [docs.lnbits.com](https://docs.lnbits.com) are the reference for end users.

## Ways to contribute {#ways-to-contribute}

- **Code:** fix bugs and add features in core
- **Extensions:** build Python or WASM extensions (see [Extension Development](/docs/extensions/development))
- **Documentation:** the official docs live in the [`lnbits/docs`](https://github.com/lnbits/docs) repository; this site lives in [`lndocs/lndocs.github.io`](https://github.com/lndocs/lndocs.github.io)
- **Testing:** reproduce bugs and test open pull requests
- **Community:** help others on [Telegram](https://t.me/lnbits) and the [community forum](https://community.lnbits.com)

## Getting started {#getting-started}

### Fork and clone {#fork--clone}

```bash
# Fork on GitHub, then:
git clone https://github.com/YOUR_USERNAME/lnbits.git
cd lnbits
git remote add upstream https://github.com/lnbits/lnbits.git
```

The default branch is **`dev`**. Branch from it and open pull requests against it. `main` only moves at releases.

### Development setup {#development-setup}

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
uv sync --all-extras --dev
npm install

make install-pre-commit-hook   # black, ruff, prettier and basic hygiene hooks
make dev                       # uv run lnbits --reload
```

The full walkthrough is in [Development Setup](/docs/development/setup).

## Making changes {#making-changes}

### Create a branch {#create-a-branch}

```bash
git fetch upstream
git checkout -b fix/my-change upstream/dev
```

### Code quality {#code-quality}

```bash
make format   # rewrite files: prettier, black, ruff --fix
make check    # mypy, pyright, black/ruff/prettier checks, bundle check
```

`make all` is `format` followed by `check`. It does **not** run tests. There is no `make lint` target.

### Testing {#testing}

```bash
make test-unit
make test-api
make test-wallets
```

Coverage is collected on every pytest run (`--cov=lnbits` in `pyproject.toml`), so there is no separate coverage target. `make test` also runs the regtest suite, which needs the Docker regtest stack. See [Testing](/docs/development/testing).

## Pull request process {#pull-request-process}

1. Run `make format`, `make check` and the test targets that cover your change.
2. Add or update tests for new behaviour.
3. Update documentation if behaviour or settings change.
4. Open the PR against **`dev`**, with a clear description and links to related issues.
5. Respond to review feedback.

Upstream's [`AGENTS.md`](https://github.com/lnbits/lnbits/blob/v1.6.2/AGENTS.md) asks for small, surgical changes, no new dependencies without approval, and extra care around payments, balances, keys, authentication and migrations. It is written for AI agents but applies to anyone.

### Commit messages {#commit-messages}

Upstream commits mostly use conventional prefixes:

```
feat: add new payment feature
fix: resolve wallet balance issue
docs: update API documentation
refactor: simplify payment logic
test: add tests for extension
```

## Security issues {#security-issues}

Don't open a public issue, discussion or PR for a vulnerability. Report it privately through [GitHub's vulnerability reporting](https://github.com/lnbits/lnbits/security/advisories/new), as described in [`SECURITY.md`](https://github.com/lnbits/lnbits/blob/v1.6.2/SECURITY.md). Security fixes are provided for the current release and the `dev` branch only.

## Community {#community}

- **Telegram:** [t.me/lnbits](https://t.me/lnbits)
- **Forum:** [community.lnbits.com](https://community.lnbits.com)
- **Issues:** [github.com/lnbits/lnbits/issues](https://github.com/lnbits/lnbits/issues), for bug reports and feature requests
- **Discussions:** [github.com/lnbits/lnbits/discussions](https://github.com/lnbits/lnbits/discussions), for questions and ideas

## License {#license}

LNbits is released under the [MIT License](https://github.com/lnbits/lnbits/blob/v1.6.2/LICENSE). Contributions are accepted under the same license.
