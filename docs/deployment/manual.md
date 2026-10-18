---
sidebar_position: 2
title: Manual Deployment
description: Deploy LNbits without Docker
---

# Manual Deployment

Deploy LNbits directly on your system without containers.

## Prerequisites

- Python 3.10, 3.11, or 3.12
- Git
- SQLite or PostgreSQL

## Installation with UV (Recommended)

```bash
# Install UV
curl -LsSf https://astral.sh/uv/install.sh | sh

# Clone repository
git clone https://github.com/lnbits/lnbits.git
cd lnbits

# Install dependencies
uv sync --all-extras

# Create configuration
cp .env.example .env
nano .env

# Run
uv run lnbits
```

## Installation with Poetry

```bash
# Install Poetry
curl -sSL https://install.python-poetry.org | python3 -

# Clone repository
git clone https://github.com/lnbits/lnbits.git
cd lnbits

# Install dependencies
poetry install --only main

# Create configuration
cp .env.example .env
nano .env

# Run
poetry run lnbits
```

## Configuration

Edit `.env` with your settings:

```bash
# Server
HOST=0.0.0.0
PORT=5000

# Data
LNBITS_DATA_FOLDER=./data

# Funding source
LNBITS_BACKEND_WALLET_CLASS=FakeWallet

# Security
# Leave empty to have LNbits generate a random key in data/.lnbits_auth_key,
# or set your own with: openssl rand -hex 32. Never use a placeholder: this key signs login tokens.
AUTH_SECRET_KEY=

# Admin (optional)
LNBITS_ADMIN_UI=true
```

## Running as a Service

See [Systemd Service](/docs/deployment/systemd) for running LNbits as a system service.

## Production Considerations

### Use PostgreSQL

```bash
LNBITS_DATABASE_URL=postgres://user:pass@localhost:5432/lnbits
```

### Use a Reverse Proxy

See [Reverse Proxy](/docs/deployment/reverse-proxy) for Nginx/Caddy setup.

### Process Manager

Consider using a process manager like systemd or supervisord.

## Updating

```bash
# Pull latest changes
git pull origin main

# Update dependencies
uv sync --all-extras
# or
poetry install --only main

# Restart service
sudo systemctl restart lnbits
```

## Troubleshooting

### Python Version Issues

```bash
# Check version
python3 --version

# Install specific version (Ubuntu)
sudo apt install python3.11

# Use with UV
uv run --python 3.11 lnbits
```

### Permission Denied

```bash
# Fix data folder permissions
chmod 755 ./data
chown -R $USER:$USER ./data
```

## See Also

- [Docker Deployment](/docs/deployment/docker)
- [Systemd Service](/docs/deployment/systemd)
