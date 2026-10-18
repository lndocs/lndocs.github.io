---
sidebar_position: 3
title: Backup & Restore
description: Back up and restore your LNbits data folder and database
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Backup & Restore

An LNbits backup has up to three parts: the **data folder**, the **PostgreSQL database** (only if you use one), and your **funding-source secrets**, which LNbits does not hold. Back up all of them, and test a restore before you rely on it.

## What to back up {#what-to-backup}

**The whole data folder** (`LNBITS_DATA_FOLDER`, default `./data`, or `/app/data` in Docker). Copy all of it, not single files. It holds:

| Item | Why it matters |
|------|----------------|
| `database.sqlite3` | The core database (wallets, payments, accounts, settings). Only present on SQLite. |
| `ext_<id>.sqlite3` | One database per Python extension. Only present on SQLite. |
| `.lnbits_auth_key` | The key that signs login tokens when `AUTH_SECRET_KEY` is empty. Without it, existing logins stop working. |
| `.super_user` | A copy of the Super User ID. LNbits rewrites it from the database at every start. |
| `upgrades/` | Downloaded Python extension packages. The running copy lives under `lnbits/extensions` (see `LNBITS_EXTENSIONS_PATH`), and the list of installed extensions is in the database. |
| `wasm_extensions/` | Installed WASM extensions. |
| `logs/` | Log files. |

**Your configuration:** `.env` (or your Docker `environment:` block). With the Admin UI on (the default), most settings live in the database, so the database backup carries them too.

**Funding-source secrets:** LND macaroons and TLS certs, CLN runes, the phoenixd seed, Spark or Bark mnemonics, and API keys for custodial services. These live with your node or service, not in LNbits. Back them up there.

:::danger The backup is a full-power credential
The data folder and the database contain every wallet's admin key, the auth signing key and the Super User ID. Anyone with a copy can spend from every wallet. Encrypt backups and store them where only you can read them.
:::

## Built-in backup (Super User) {#built-in-backup}

The Super User can download a backup from the Admin UI (**Download database backup** on the `/admin` page) or from the API:

```bash
# Log in as the Super User to get a bearer token
read -rp "Username: " u; read -rsp "Password: " p; echo
token=$(curl -s -X POST https://your-lnbits.example/api/v1/auth \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$u\",\"password\":\"$p\"}" | jq -r .access_token)

# Download the backup zip
curl -s -H "Authorization: Bearer $token" \
  -o lnbits-backup-$(date +%Y%m%d).zip \
  https://your-lnbits.example/admin/api/v1/backup
```

`GET /admin/api/v1/backup` returns a zip of the whole data folder. Only the Super User can call it.

When `LNBITS_DATABASE_URL` starts with `postgres://`, LNbits first runs `pg_dump --format=c` and adds the dump to the zip as `lnbits-database.dmp`. It takes the host, port, user, password and database name from `LNBITS_DATABASE_URL`, so `pg_dump` must be installed where LNbits runs.

:::note PostgreSQL backups and v1.6.2
The v1.6.0 hardening broke PostgreSQL backups, and v1.6.2 is the hotfix ([#4187](https://github.com/lnbits/lnbits/pull/4187)). If you run v1.6.0 or v1.6.1 on PostgreSQL, upgrade before you rely on this endpoint. Since v1.6.2 a failed dump returns the error "PostgreSQL database backup failed." instead of a zip without the database.
:::

:::caution Docker image and PostgreSQL 15 or later
The `lnbits/lnbits` image ships `postgresql-client-14`. `pg_dump` refuses to dump a server with a newer major version, so on Docker the built-in backup **fails against PostgreSQL 15 or later**. An open pull request, [#4206](https://github.com/lnbits/lnbits/pull/4206), would bundle a newer `pg_dump`. It had not been merged as of 2026-10-18. Until it ships, run `pg_dump` yourself with a client that matches your server, for example from inside the Postgres container (see below).
:::

## SQLite backup {#sqlite-backup}

Stop LNbits so the database files are not being written, copy the whole data folder, then start LNbits again.

```bash
# Stop LNbits first
docker compose stop

# Copy the whole data folder: database.sqlite3, one ext_<id>.sqlite3 per
# extension, and .lnbits_auth_key (without it, existing logins stop working)
mkdir -p ./backup && cp -a ./data ./backup/lnbits-data-$(date +%Y%m%d)

# Start LNbits
docker compose start
```

For a non-Docker install, stop the service instead (for example `sudo systemctl stop lnbits`).

## PostgreSQL backup {#postgresql-backup}

Dump the database with `pg_dump`, using the same credentials as `LNBITS_DATABASE_URL`. `pg_dump` accepts the `postgres://user:password@host:port/dbname` URL directly. Then back up the data folder as well, because it still holds `.lnbits_auth_key`, `upgrades/` and `wasm_extensions/`.

```bash
# Load LNBITS_DATABASE_URL from your .env (or export it yourself)
set -a; . ./.env; set +a

# Custom-format dump (the same format the built-in backup produces)
pg_dump --format=c --file=lnbits-$(date +%Y%m%d).dmp "$LNBITS_DATABASE_URL"
```

The `pg_dump` major version must be the same as the server's, or newer. If the Postgres server runs in Docker Compose, use the server's own client:

```bash
# "db" is the Postgres service name in your compose file; use your own user and database
docker compose exec -T db pg_dump -U lnbits --format=c lnbits > lnbits-$(date +%Y%m%d).dmp
```

## Restore {#restore}

Restore with the same LNbits version you backed up, or a newer one. LNbits runs its database migrations forward at startup. It cannot move a database back to an older version.

### SQLite {#sqlite}

```bash
# With LNbits stopped, put back the data folder you saved
cp -a ./backup/lnbits-data-YYYYMMDD/. ./data/
```

To restore a built-in backup zip, stop LNbits and unzip it into an empty data folder:

```bash
mkdir -p ./data && unzip lnbits-backup-YYYYMMDD.zip -d ./data
```

### PostgreSQL {#postgresql}

With LNbits stopped, restore into an empty database owned by the LNbits user, put the data folder back, then start LNbits:

```bash
pg_restore --no-owner --dbname="$LNBITS_DATABASE_URL" lnbits-YYYYMMDD.dmp
```

A built-in backup zip holds the dump as `lnbits-database.dmp`. Restore that file the same way, then delete it from the data folder: it is a full copy of your database.

## Test your restore {#test-restore}

A backup you have never restored may not work. Test a restore at least once, and again after each upgrade:

1. Restore onto a separate machine or container, with a **separate** database.
2. Start it with `LNBITS_BACKEND_WALLET_CLASS=VoidWallet` so the copy cannot pay through your real node. With the Admin UI on, the funding source stored in the restored database overrides `.env`, so check `/admin` before connecting it to anything.
3. Log in, and check that wallets, balances, payment history and extensions are all there.
4. Delete the test copy afterwards. It holds live admin keys.

## Automated Backups {#automated-backups}

```bash
#!/bin/bash
# /etc/cron.daily/lnbits-backup
set -euo pipefail

BACKUP_DIR=/var/backups/lnbits
DATE=$(date +%Y%m%d)
set -a; . /opt/lnbits/.env; set +a

# PostgreSQL
pg_dump --format=c --file="$BACKUP_DIR/lnbits-$DATE.dmp" "$LNBITS_DATABASE_URL"

# Data folder (auth key, extensions)
tar -czf "$BACKUP_DIR/lnbits-data-$DATE.tar.gz" -C /opt/lnbits data

# Keep 30 days
find "$BACKUP_DIR" -name "lnbits-*" -mtime +30 -delete
```

On SQLite, copy the data folder with LNbits stopped instead, or download the built-in backup on a schedule. Copy backups off the machine too, because a backup on the same disk is lost if the disk fails.

## See Also

- [Database Configuration](/docs/configuration/database)
- [Migration](/docs/guides/migration)
- [Upgrading](/docs/guides/upgrading)
- [Troubleshooting](/docs/guides/troubleshooting)
