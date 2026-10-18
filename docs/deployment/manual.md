---
sidebar_position: 2
title: Manual Deployment
description: Deploy LNbits from source with uv, without Docker
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Manual Deployment

Run LNbits from a git checkout, without containers. Upstream recommends [uv](https://docs.astral.sh/uv/) for this.

## Prerequisites {#prerequisites}

- Python 3.10, 3.11 or 3.12 (v1.6.2 requires `>=3.10,<3.13`; upstream recommends 3.12). uv can install it for you.
- Git
- SQLite (built in) or PostgreSQL

## Install with uv {#installation-with-uv-recommended}

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh

git clone https://github.com/lnbits/lnbits.git
cd lnbits
git checkout v1.6.2
uv sync --all-extras

cp .env.example .env
```

Checking out a release tag gives you a tested version; the `main` branch moves. `--all-extras` installs the optional Breez and Liquid/Boltz dependencies; leave it off if you don't need those backends.

Run it:

```bash
uv run lnbits
```

That listens on `127.0.0.1:5000`. The command takes `--host`, `--port`, `--forwarded-allow-ips`, `--ssl-keyfile`/`--ssl-certfile` and `--reload` (development only). The flags override the `HOST`, `PORT` and `FORWARDED_ALLOW_IPS` settings from `.env`.

Then open `http://127.0.0.1:5000/first_install` and set the Super User's username and password. `uv run lnbits-cli superuser` prints the Super User ID later if you need it.

Over plain HTTP, mind `AUTH_HTTPS_ONLY=true` (the default): the login cookie is `Secure`, which browsers generally accept on `localhost`/`127.0.0.1` but not on a LAN address. Use the reverse proxy, or set `AUTH_HTTPS_ONLY=false` for a local test instance only.

## Configuration {#configuration}

The settings that matter for a deployment live in `.env` and are read at every start:

```bash title=".env"
# Bind to localhost and put a reverse proxy in front (the default)
HOST=127.0.0.1
PORT=5000
# Trust X-Forwarded-* headers only from the proxy
FORWARDED_ALLOW_IPS=127.0.0.1

LNBITS_DATA_FOLDER=./data
# Leave empty to have LNbits generate a random key in data/.lnbits_auth_key,
# or set your own with: openssl rand -hex 32. Never use a placeholder: this key signs login tokens.
AUTH_SECRET_KEY=
```

- `LNBITS_ADMIN_UI` is `true` by default. After the first start, the Admin UI keeps most other settings (funding source, auth methods, fees and so on) in the database, and those override `.env`. Change them at `/admin`.
- The funding source starts as `VoidWallet`. Set one in **Settings → Funding**; see [Funding sources](/docs/funding-sources/overview).
- Don't set `HOST=0.0.0.0` unless something else (a firewall, a private network) keeps the port away from the internet. `FORWARDED_ALLOW_IPS` defaults to `*`, which trusts forwarded headers from anyone who can reach LNbits.

## Production checklist {#production-considerations}

- **Reverse proxy with HTTPS:** see [Reverse proxy](/docs/deployment/reverse-proxy). `AUTH_HTTPS_ONLY=true` (the default) makes login cookies HTTPS-only.
- **Service manager:** see [systemd](/docs/deployment/systemd).
- **PostgreSQL** for larger instances: `LNBITS_DATABASE_URL=postgres://user:password@localhost:5432/lnbits`. See [Database](/docs/configuration/database).
- **One process per database.** LNbits' double-spend protection uses in-process locks, so don't run several LNbits processes on one database.
- **Backups:** the whole `data/` folder (plus the PostgreSQL database if you use one).

## Updating {#updating}

Read the [release notes](https://github.com/lnbits/lnbits/releases) first and back up `data/`. For the [systemd](/docs/deployment/systemd) layout (checkout in `/home/lnbits/lnbits`, owned by the `lnbits` user):

```bash
sudo systemctl stop lnbits
sudo -iu lnbits bash -c 'cd ~/lnbits && git fetch --tags && git checkout v1.6.2 && ~/.local/bin/uv sync --all-extras'
sudo systemctl start lnbits
```

Replace `v1.6.2` with the release you're moving to. Run git and uv as the user that owns the checkout, or the files end up owned by someone else. Migrations run on start. Then update extensions in the Admin UI.

## Poetry (legacy) {#installation-with-poetry}

Upstream has replaced Poetry with uv and labels the Poetry path legacy. `poetry.lock` still ships in v1.6.2, so `poetry install` and `poetry run lnbits` still work for existing installs, but new installs should use uv.

## Troubleshooting {#troubleshooting}

- **Wrong Python version:** `uv python install 3.12`, then `uv sync --python 3.12 --all-extras`.
- **Permission errors on `data/`:** the user running LNbits must own it: `chown -R lnbits:lnbits data`.
- **`.env` changes have no effect:** the setting is managed by the Admin UI. Change it at `/admin`, or start with `LNBITS_ADMIN_UI=false`.

## See also

- [Docker deployment](/docs/deployment/docker)
- [systemd service](/docs/deployment/systemd)
- [Reverse proxy](/docs/deployment/reverse-proxy)
