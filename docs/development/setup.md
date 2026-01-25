---
sidebar_position: 2
title: Development Setup
description: Set up your LNbits development environment
---

# Development Setup

Set up a local development environment for LNbits.

## Prerequisites

- Python 3.10, 3.11, or 3.12
- Node.js 18+ (for frontend)
- Git

## Quick Setup

```bash
# Clone repository
git clone https://github.com/lnbits/lnbits.git
cd lnbits

# Install UV
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
uv sync --all-extras --dev

# Install frontend dependencies
npm install

# Copy example config
cp .env.example .env

# Start development server
make dev
```

## Development Commands

```bash
# Start with hot reload
make dev

# Or manually
uv run lnbits --reload

# Run tests
make test

# Format code
make format

# Lint code
make lint

# Type check
make mypy

# All checks
make all
```

## VS Code Setup

### Extensions

- Python
- Pylance
- Ruff

### settings.json

```json
{
  "python.defaultInterpreterPath": ".venv/bin/python",
  "python.formatting.provider": "black",
  "editor.formatOnSave": true,
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter"
  }
}
```

## Database for Development

SQLite is used by default for development:

```bash
LNBITS_DATA_FOLDER=./data
```

For PostgreSQL testing:

```bash
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15
LNBITS_DATABASE_URL=postgres://postgres:postgres@localhost:5432/lnbits
```

## Testing with Fake Wallet

The default configuration uses Fake Wallet - perfect for development:

```bash
LNBITS_BACKEND_WALLET_CLASS=FakeWallet
```

## Hot Reload

The `--reload` flag enables hot reload:

```bash
uv run lnbits --reload
```

Changes to Python files automatically restart the server.

## See Also

- [Testing](/docs/development/testing)
- [Contributing](/docs/development/contributing)
