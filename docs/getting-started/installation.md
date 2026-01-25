---
sidebar_position: 2
title: Installation
description: Install LNbits using Docker, UV, Poetry, or AppImage
---

# Installation

LNbits can be installed in several ways. Choose the method that best fits your environment.

## Quick Install Options

| Method | Best For | Difficulty |
|--------|----------|------------|
| Docker | Production, most users | Easy |
| UV | Development, contributors | Easy |
| AppImage | Linux desktop users | Easiest |
| Poetry | Legacy installations | Medium |
| Nix | NixOS users | Medium |

## Docker Installation (Recommended)

Docker is the recommended installation method for production environments.

### Prerequisites
- Docker Engine 20.10+
- Docker Compose (optional, for persistent setup)

### Quick Start

```bash
# Pull and run LNbits
docker run -d \
  --name lnbits \
  -p 5000:5000 \
  -v $(pwd)/data:/app/data \
  lnbits/lnbits

# Check the logs
docker logs -f lnbits
```

Open http://localhost:5000 in your browser.

### With Docker Compose

Create a `docker-compose.yml`:

```yaml
version: "3.8"

services:
  lnbits:
    image: lnbits/lnbits:latest
    restart: unless-stopped
    ports:
      - "5000:5000"
    volumes:
      - ./data:/app/data
      - ./.env:/app/.env
    environment:
      - HOST=0.0.0.0
      - PORT=5000
```

Then run:

```bash
docker compose up -d
```

## UV Installation (Development)

[UV](https://github.com/astral-sh/uv) is the recommended tool for development.

### Prerequisites
- Python 3.10, 3.11, or 3.12
- Git

### Steps

```bash
# Install UV
curl -LsSf https://astral.sh/uv/install.sh | sh

# Clone the repository
git clone https://github.com/lnbits/lnbits.git
cd lnbits

# Install dependencies
uv sync --all-extras

# Run LNbits
uv run lnbits
```

For development with hot reload:

```bash
uv run lnbits --reload
```

## AppImage (Linux)

The AppImage is a self-contained executable that works on most Linux distributions.

```bash
# Download the latest AppImage
wget https://github.com/lnbits/lnbits/releases/latest/download/LNbits-x86_64.AppImage

# Make it executable
chmod +x LNbits-x86_64.AppImage

# Run
./LNbits-x86_64.AppImage
```

The AppImage creates a `./data` folder in the current directory.

## Poetry Installation (Legacy)

Poetry was the original installation method. UV is now preferred.

```bash
# Install Poetry
curl -sSL https://install.python-poetry.org | python3 -

# Clone the repository
git clone https://github.com/lnbits/lnbits.git
cd lnbits

# Install dependencies
poetry install --only main

# Run LNbits
poetry run lnbits
```

## Install Script (Debian/Ubuntu)

An automated script for Debian-based systems:

```bash
wget https://raw.githubusercontent.com/lnbits/lnbits/main/lnbits.sh
chmod +x lnbits.sh
./lnbits.sh
```

This script:
- Installs system dependencies
- Sets up Python environment
- Configures systemd service
- Creates default configuration

## Nix Installation

For NixOS and Nix users:

```bash
# Run directly
nix run github:lnbits/lnbits

# Or add to your flake
{
  inputs.lnbits.url = "github:lnbits/lnbits";
}
```

## Verify Installation

After installation, verify LNbits is running:

```bash
# Check the web interface
curl http://localhost:5000/api/v1/health

# Expected response
{"status": "ok"}
```

## Next Steps

1. **[Configure your environment](/docs/configuration/environment)** - Set up .env file
2. **[Connect a funding source](/docs/funding-sources/overview)** - Choose your Lightning backend
3. **[Create your first wallet](/docs/getting-started/first-wallet)** - Start using LNbits

## Troubleshooting

### Port Already in Use

```bash
# Check what's using port 5000
lsof -i :5000

# Use a different port
docker run -p 5001:5000 lnbits/lnbits
```

### Permission Denied on Data Folder

```bash
# Fix ownership (Docker on Linux)
sudo chown -R 1000:1000 ./data
```

### Python Version Issues

LNbits requires Python 3.10, 3.11, or 3.12:

```bash
# Check your Python version
python3 --version

# Install Python 3.11 on Ubuntu
sudo apt install python3.11
```

See [Troubleshooting](/docs/guides/troubleshooting) for more solutions.
