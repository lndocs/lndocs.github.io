---
sidebar_position: 2
title: Installation
description: Install LNbits v1.6.2 with uv, Docker, the AppImage or Nix (Poetry as legacy)
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Installation

LNbits v1.6.2 needs **Python 3.10, 3.11 or 3.12** (`requires-python = ">=3.10,<3.13"` in [pyproject.toml](https://github.com/lnbits/lnbits/blob/v1.6.2/pyproject.toml)). Upstream recommends 3.12, and the Docker image uses it. Every method below starts the same server. Once it's running, go to [Quick Start](/docs/getting-started/quick-start) for the first-start steps (`/first_install`, then a funding source).

## Install options {#quick-install-options}

| Method | Best for | Notes |
|---|---|---|
| [uv](#uv-installation) | Most self-hosters, and developers | Upstream's recommended method |
| [Docker](#docker-installation) | Servers, and Compose stacks | Pin the `v1.6.2` tag |
| [AppImage](#appimage-linux) | A quick try on a Linux desktop | A single file |
| [Nix](#nix-installation) | Nix and NixOS users | A flake in the repo |
| [Install script](#install-script-debianubuntu) | A one-shot Debian/Ubuntu setup | Tracks `main`, binds `0.0.0.0` |
| [Poetry](#poetry-installation-legacy) | Existing Poetry setups | Legacy, replaced by uv |

:::note After any install
The Admin UI is on by default. The first page you see is `/first_install`, where you create the **Super User**. After that, you set most settings (the funding source included) in the Admin UI, not in `.env`. See [Settings precedence](/docs/configuration/environment).
:::

## uv (recommended) {#uv-installation}

[uv](https://docs.astral.sh/uv/) installs the right Python for you if your system doesn't have one.

```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"

# Get LNbits at the v1.6.2 tag
git clone https://github.com/lnbits/lnbits.git
cd lnbits
git checkout v1.6.2

# Install the dependencies, including the optional extras (Breez, migration tool)
uv sync --all-extras --python 3.12

# Configuration
cp .env.example .env

# Run
uv run lnbits
```

LNbits listens on `http://127.0.0.1:5000` (from `HOST` and `PORT`). To reach it from another machine, use `uv run lnbits --host 0.0.0.0 --port 5000`, ideally behind a reverse proxy with TLS ([Reverse Proxy](/docs/deployment/reverse-proxy)).

Other useful commands:

```bash
uv run lnbits --reload        # auto-reload, for development
uv run lnbits-cli --help      # CLI: superuser, db, users, extensions, encrypt
uv run lnbits-cli superuser   # print the Super User ID
```

To run LNbits as a service, see [systemd](/docs/deployment/systemd).

### Updating {#updating-uv}

```bash
cd lnbits
git fetch --tags
git checkout v1.6.2          # or the next release tag
uv sync --all-extras
uv run lnbits
```

Back up the `data/` folder first. After an update, use **Extensions → Update All** in the UI to bring the extensions up to date.

## Docker {#docker-installation}

The official image is [`lnbits/lnbits`](https://hub.docker.com/r/lnbits/lnbits). Pin a release tag rather than `latest`.

```bash
mkdir lnbits && cd lnbits
mkdir data
wget https://raw.githubusercontent.com/lnbits/lnbits/v1.6.2/.env.example -O .env

docker run -d --name lnbits \
  -p 127.0.0.1:5000:5000 \
  -v "$PWD/.env:/app/.env" \
  -v "$PWD/data:/app/data" \
  -e LNBITS_EXTENSIONS_PATH=/app/data/extensions \
  lnbits/lnbits:v1.6.2

docker logs -f lnbits
```

- **`/app/data`** holds the databases, `.lnbits_auth_key`, `.super_user` and logs. Without this volume, `docker rm` deletes everything.
- **`/app/.env`** is the file LNbits reads in the container.
- **`LNBITS_EXTENSIONS_PATH=/app/data/extensions`** keeps installed Python extensions on the volume. Without it they live inside the container, and LNbits has to download them again whenever the container is recreated (upstream's advice: [installation.md](https://github.com/lnbits/lnbits/blob/v1.6.2/docs/guide/installation.md)).
- **`-p 127.0.0.1:5000:5000`** publishes the port on loopback only, for a reverse proxy on the same host. Use `-p 5000:5000` only on a trusted network, and see `FORWARDED_ALLOW_IPS` in [Security](/docs/configuration/security).
- The image ignores `HOST` and `PORT`. Its start command uses its own host and port variables, which default to `0.0.0.0` and `5000` ([Dockerfile](https://github.com/lnbits/lnbits/blob/v1.6.2/Dockerfile)).
- The image runs as root, so the data folder needs no `chown`.

### Docker Compose {#with-docker-compose}

```yaml title="docker-compose.yml"
services:
  lnbits:
    image: lnbits/lnbits:v1.6.2
    restart: unless-stopped
    ports:
      - "127.0.0.1:5000:5000"
    volumes:
      - ./data:/app/data
      - ./.env:/app/.env
    environment:
      - LNBITS_EXTENSIONS_PATH=/app/data/extensions
```

```bash
docker compose up -d
```

For PostgreSQL, a reverse proxy and upgrades, see [Docker Deployment](/docs/deployment/docker). The built-in backup has a known problem in the image with PostgreSQL 15 and newer: see [Database](/docs/configuration/database).

## AppImage (Linux) {#appimage-linux}

The v1.6.2 release has one asset: `LNbits-v1.6.2.AppImage` ([release page](https://github.com/lnbits/lnbits/releases/tag/v1.6.2)).

```bash
sudo apt-get install libfuse2   # AppImages need FUSE 2
wget https://github.com/lnbits/lnbits/releases/download/v1.6.2/LNbits-v1.6.2.AppImage
chmod +x LNbits-v1.6.2.AppImage

# Plain HTTP on this machine. Pass other settings the same way.
AUTH_HTTPS_ONLY=false ./LNbits-v1.6.2.AppImage
```

LNbits creates its data folder in the directory that holds the AppImage. `AUTH_HTTPS_ONLY=false` is there because you'll use plain `http://`. Leave it out when you serve LNbits over HTTPS ([Authentication](/docs/configuration/authentication)).

## Nix {#nix-installation}

The repo has a flake ([flake.nix](https://github.com/lnbits/lnbits/blob/v1.6.2/flake.nix)). Its default app is the `lnbits` server, and the `lnbits-cli` app is the CLI.

```bash
# Run v1.6.2 directly (flakes must be enabled)
nix run github:lnbits/lnbits/v1.6.2

# The CLI
nix run github:lnbits/lnbits/v1.6.2#lnbits-cli -- superuser
```

When run this way, LNbits reads `.env` from the directory you start it in and uses `./data` there as its data folder. Run the CLI from the same directory. Upstream's guide covers Cachix and a source build: [Nix install](https://docs.lnbits.com/guide/installation/nix).

## Install script (Debian/Ubuntu) {#install-script-debianubuntu}

```bash
wget https://raw.githubusercontent.com/lnbits/lnbits/v1.6.2/lnbits.sh
less lnbits.sh   # read it first
chmod +x lnbits.sh
./lnbits.sh
```

[`lnbits.sh`](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits.sh) does the following:

- installs the build packages and uv;
- clones the repo into `./lnbits` and checks out **`main`** (not a tag);
- copies `.env.example` to `.env`;
- runs `uv sync --python 3.12 --all-extras`;
- **opens the port in ufw**, if ufw is installed;
- starts LNbits in the foreground on **`0.0.0.0:5000`**.

It doesn't set up a systemd service. For that, see [systemd](/docs/deployment/systemd). Because it listens on all interfaces, set `FIRST_INSTALL_TOKEN` or finish `/first_install` right away.

## Poetry (legacy) {#poetry-installation-legacy}

Upstream has replaced Poetry with uv. Use Poetry only for an existing setup.

```bash
curl -sSL https://install.python-poetry.org | python3 -
git clone https://github.com/lnbits/lnbits.git
cd lnbits
git checkout v1.6.2
poetry env use 3.12
poetry install --only main
cp .env.example .env
poetry run lnbits
```

## Verify the installation {#verify-installation}

```bash
curl http://127.0.0.1:5000/api/v1/health
```

The response looks like this ([api.py L38-43](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/api.py#L38-L43)):

```json
{"server_time": 1760781600, "up_time": "00:02:13"}
```

Then open `http://127.0.0.1:5000` in a browser. On a fresh install it redirects to `/first_install`.

## Next Steps {#next-steps}

1. **[Quick Start](/docs/getting-started/quick-start):** create the Super User and test with FakeWallet.
2. **[Funding Sources](/docs/funding-sources/overview):** choose your Lightning backend.
3. **[Security](/docs/configuration/security):** harden the instance before it holds real funds.

## Troubleshooting {#troubleshooting}

### Port already in use {#port-already-in-use}

```bash
sudo lsof -i :5000
# Source install: another port
uv run lnbits --port 5001
# Docker: map another host port
docker run -d --name lnbits -p 127.0.0.1:5001:5000 -v "$PWD/data:/app/data" lnbits/lnbits:v1.6.2
```

### Logged straight back out after login {#logged-out-after-login}

You're on plain HTTP with `AUTH_HTTPS_ONLY=true` (the default), so the browser drops the `Secure` session cookie. Use HTTPS, or for a test box set `AUTH_HTTPS_ONLY=false` in `.env` and restart. See [Authentication](/docs/configuration/authentication).

### Python version errors {#python-version-issues}

LNbits v1.6.2 refuses to install on Python 3.13 or newer. Let uv fetch 3.12:

```bash
uv sync --all-extras --python 3.12
```

See [Troubleshooting](/docs/guides/troubleshooting) for more.
