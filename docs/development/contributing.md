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

Install uv, then `uv sync --all-extras --dev` and `npm install`, and start with `make dev`. Run `make install-pre-commit-hook` once: it installs pre-commit hooks for Black, Ruff, Prettier and basic file hygiene. The full walkthrough is in [Development Setup](/docs/development/setup).

## Making changes {#making-changes}

### Create a branch {#create-a-branch}

```bash
git fetch upstream
git checkout -b fix/my-change upstream/dev
```

### Code quality {#code-quality}

`make format` rewrites files (Prettier, Black, `ruff --fix`). `make check` runs mypy, Pyright, the Black, Ruff and Prettier checks and the bundle check, without changing files. `make all` runs both, and **no tests**. See [Code Style](/docs/development/code-style).

### Testing {#testing}

Run the targeted suites, `make test-unit`, `make test-api` and `make test-wallets`. `make test` also runs the regtest suite, which needs the Docker regtest stack. See [Testing](/docs/development/testing).

## Pull request process {#pull-request-process}

1. Run `make format`, `make check` and the test targets that cover your change. CI runs the same lint targets, then the unit, API and wallet tests on Python 3.10 and 3.12, each against SQLite and PostgreSQL.
2. Add or update tests for new behaviour.
3. Update documentation if behaviour or settings change.
4. Open the PR against **`dev`**, with a clear description and links to related issues.
5. Respond to review feedback.

Upstream's [`AGENTS.md`](https://github.com/lnbits/lnbits/blob/v1.6.2/AGENTS.md) asks for small, surgical changes, no new dependencies without approval, and extra care around payments, balances, keys, authentication and migrations. It is written for AI agents but applies to anyone.

### Commit messages {#commit-messages}

Most upstream commits use conventional prefixes (`feat:`, `fix:`, `perf:`, `chore:`, `chore(deps):`), and the squash-merged PR number ends the subject. Real examples from `dev`:

```text
fix: invalidate jwt token on password reset (#4248)
feat: allow a webhook on outgoing payments (#4113)
perf: cache WASM extension compilation across restarts (#4221)
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
