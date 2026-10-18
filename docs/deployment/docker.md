---
sidebar_position: 1
title: Docker Deployment
description: Deploy LNbits with Docker and Docker Compose
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Docker Deployment

The official image is `lnbits/lnbits` on Docker Hub. Pin a release tag such as `lnbits/lnbits:v1.6.2` rather than `latest`, so an update only happens when you choose it. (`latest-rc` and `vX.Y.Z-rcN` tags carry release candidates.)

## What the image does {#image}

Facts from the v1.6.2 `Dockerfile`, which matter for every example below:

- It starts `lnbits --port $LNBITS_PORT --host $LNBITS_HOST --forwarded-allow-ips='*'`, with **LNBITS_PORT=5000** and **LNBITS_HOST=0.0.0.0** set in the image. Those command-line flags win over the `HOST` and `PORT` settings, so **`HOST=` and `PORT=` in `.env` or `environment:` are ignored**. To change the port inside the container, set LNBITS_PORT.
- `--forwarded-allow-ips='*'` is hard-coded, so `FORWARDED_ALLOW_IPS` has no effect in the container: it trusts `X-Forwarded-*` headers from any client that can reach it. Don't let anything but your reverse proxy reach port 5000 (see below).
- The working directory is `/app`, and the data folder is **`/app/data`**. Mount it.
- It runs as root, includes all optional extras (Breez, Liquid/Boltz), and ships `pg_dump` from **postgresql-client-14**.
- It ships with no extensions.

:::warning Don't publish port 5000 to the world
Behind a reverse proxy on the same host, publish the port on localhost only: `127.0.0.1:5000:5000`. A plain `5000:5000` opens LNbits on every interface, without TLS, and lets anyone forge the forwarded headers LNbits trusts (client IP for rate limits and audit, and the `https` scheme for LNURL links).
:::

## Quick start {#quick-start}

```bash
mkdir lnbits && cd lnbits
mkdir data
curl -fsSL -o .env https://raw.githubusercontent.com/lnbits/lnbits/v1.6.2/.env.example

docker run -d \
  --name lnbits \
  --restart unless-stopped \
  -p 127.0.0.1:5000:5000 \
  -v "$(pwd)/data:/app/data" \
  -v "$(pwd)/.env:/app/.env" \
  -e LNBITS_EXTENSIONS_PATH=/app/data/extensions \
  lnbits/lnbits:v1.6.2
```

Then open `http://127.0.0.1:5000/first_install` (through your reverse proxy for a server) and set the Super User's username and password. Set `FIRST_INSTALL_TOKEN` in `.env` beforehand if someone else could reach the page before you.

- Leave `AUTH_SECRET_KEY` empty: LNbits generates one and stores it in `data/.lnbits_auth_key`. If you set it yourself, use `openssl rand -hex 32`. Never use a placeholder: this key signs login tokens.
- The instance starts on `VoidWallet`. Pick a funding source in **Settings → Funding**; see [Funding sources](/docs/funding-sources/overview).
- With the Admin UI on (the default), most settings are stored in the database after the first start and override `.env`. Change them in the Admin UI, not by editing `.env` and restarting.

### Keep extensions across re-creates {#extensions-path}

By default, installed extensions land in `/app/lnbits/extensions`, inside the container, and **disappear when the container is re-created** (for example on every image update). `LNBITS_EXTENSIONS_PATH=/app/data/extensions` puts them on the data volume instead; LNbits creates the `extensions` folder under that path. Set it from the first start. Extension archives are unpacked in `data/upgrades/`, but the code runs from that extensions folder, so both must be on the volume.

## Docker Compose {#docker-compose}

```yaml title="docker-compose.yml"
services:
  lnbits:
    image: lnbits/lnbits:v1.6.2
    restart: unless-stopped
    ports:
      - "127.0.0.1:5000:5000"
    volumes:
      - ./data:/app/data
      - ./.env:/app/.env:ro
    environment:
      - LNBITS_EXTENSIONS_PATH=/app/data/extensions
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
```

```bash
docker compose up -d
docker compose logs -f lnbits
```

`curl` is installed in the image, and `/api/v1/health` answers once the server is up. It doesn't check the funding source.

Run **one** LNbits container per database. LNbits guards against double spends with in-process locks, so several replicas or workers on one database are unsafe.

## With PostgreSQL {#with-postgresql}

```yaml title="docker-compose.yml"
services:
  lnbits:
    image: lnbits/lnbits:v1.6.2
    restart: unless-stopped
    depends_on:
      - postgres
    ports:
      - "127.0.0.1:5000:5000"
    volumes:
      - ./data:/app/data
      - ./.env:/app/.env:ro
    environment:
      - LNBITS_EXTENSIONS_PATH=/app/data/extensions
      - LNBITS_DATABASE_URL=postgres://lnbits:${POSTGRES_PASSWORD}@postgres:5432/lnbits

  postgres:
    image: postgres:14
    restart: unless-stopped
    environment:
      - POSTGRES_USER=lnbits
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=lnbits
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

Put `POSTGRES_PASSWORD=` followed by the output of `openssl rand -hex 32` in the `.env` next to the compose file (Compose reads it for `${...}`). Notes:

- **Keep the `./data` volume** even with PostgreSQL. It still holds `.lnbits_auth_key`, `.super_user`, the extensions, uploaded assets and logs.
- The URL must start with `postgres://`.
- **`pg_dump` version.** The LNbits image only has `pg_dump` 14, and `pg_dump` refuses to dump a newer server. The Super User backup (`GET /admin/api/v1/backup`) runs that `pg_dump`, so it fails against PostgreSQL 15 or later. That's why the example uses `postgres:14`. PostgreSQL 14 reaches end of life in November 2026. If you run a newer server, back it up with `pg_dump` from the postgres container instead (`docker compose exec postgres pg_dump -U lnbits lnbits > lnbits.sql`).
- Moving an existing SQLite instance to PostgreSQL is covered in [Database](/docs/configuration/database).

## With LND on the host {#with-lnd}

```yaml title="docker-compose.yml"
services:
  lnbits:
    image: lnbits/lnbits:v1.6.2
    restart: unless-stopped
    ports:
      - "127.0.0.1:5000:5000"
    volumes:
      - ./data:/app/data
      - ./.env:/app/.env:ro
      - /home/lnd/.lnd:/lnd:ro
    environment:
      - LNBITS_EXTENSIONS_PATH=/app/data/extensions
      - LNBITS_BACKEND_WALLET_CLASS=LndRestWallet
      - LND_REST_ENDPOINT=https://lnd:8080
      - LND_REST_CERT=/lnd/tls.cert
      - LND_REST_MACAROON=/lnd/data/chain/bitcoin/mainnet/admin.macaroon
    extra_hosts:
      - "lnd:host-gateway"
```

- LND's `tls.cert` must be valid for the name `lnd` (add `tlsextradomain=lnd` to `lnd.conf` and regenerate the cert), and LND must listen on an address the container can reach.
- The funding variables only apply on the first start; afterwards use **Settings → Funding**. See [LND](/docs/funding-sources/lnd).

## Changing the port {#port}

{/* snippet:skip: LNBITS_PORT is read by the image's start command, not by settings.py */}
```yaml
    environment:
      - LNBITS_PORT=8000
    ports:
      - "127.0.0.1:8000:8000"
```

## Updating {#updating}

1. Read the [release notes](https://github.com/lnbits/lnbits/releases).
2. Back up (below).
3. Change the tag in the compose file (for example `v1.6.2` to the next release), then:

```bash
docker compose pull
docker compose up -d
docker compose logs -f lnbits
```

Database migrations run on start. Then update your extensions in the Admin UI.

## Backup {#backup}

Copy the whole data folder while LNbits is stopped:

```bash
docker compose stop lnbits
tar -czf lnbits-backup-$(date +%Y%m%d).tar.gz data/
docker compose start lnbits
```

Or, while it runs, download a backup as the Super User: the **Download backup** button in the Admin UI, or `GET /admin/api/v1/backup`. It zips the data folder, and adds a `pg_dump` when you use PostgreSQL (see the version caveat above). With PostgreSQL, also back up the database itself. The backup contains secrets (the auth key and any funding credentials), so store it encrypted.

## Troubleshooting {#troubleshooting}

```bash
docker compose logs -f lnbits     # logs
docker compose exec lnbits bash   # shell in the container
```

- **Can't connect on the port you set with `PORT=`:** the image ignores it. See [Changing the port](#port).
- **Extensions vanish after an update:** `LNBITS_EXTENSIONS_PATH` isn't on the volume.
- **Funding settings in `.env` are ignored:** the Admin UI has saved settings; use **Settings → Funding**.
- **The funding source falls back to VoidWallet:** the logs show why the connection failed. Container names, certificate host names and file paths inside the container are the usual causes.

## See also

- [Manual deployment](/docs/deployment/manual)
- [Reverse proxy](/docs/deployment/reverse-proxy)
- [Environment variables](/docs/configuration/environment)
