---
sidebar_position: 2
title: Database
description: Configure SQLite, PostgreSQL, or CockroachDB for LNbits v1.6.2, migrate from SQLite, and back up safely
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Database Configuration

LNbits stores its data in SQLite by default. It also supports PostgreSQL and CockroachDB ([db.py L31-45](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/db.py#L31-L45)). Both database settings are env-only, so the Admin UI never overrides them.

| Database | Set with | Good for |
|---|---|---|
| SQLite | `LNBITS_DATA_FOLDER` (default `./data`) | Personal and small instances, development |
| PostgreSQL | `LNBITS_DATABASE_URL=postgres://...` | Busy or multi-user instances |
| CockroachDB | `LNBITS_DATABASE_URL=cockroachdb://...` | Distributed setups |

## SQLite (default) {#sqlite-default}

With `LNBITS_DATABASE_URL` unset, LNbits keeps one SQLite file for the core and one per extension, all in the data folder ([db.py L306-308](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/db.py#L306-L308)):

```text
data/
├── database.sqlite3        # core: accounts, wallets, payments, settings
├── ext_<id>.sqlite3        # one per Python extension, e.g. ext_tpos.sqlite3
├── .lnbits_auth_key        # generated if AUTH_SECRET_KEY is empty
├── .super_user             # the Super User ID (Admin UI on)
├── logs/
├── wasm_extensions/        # WASM extensions (v1.6.0+)
├── zips/                   # downloaded Python extension archives
└── upgrades/               # scratch space for extension upgrades, emptied at startup
```

A backup that copies only `database.sqlite3` misses every extension's data. Copy the whole folder. The installed Python extension code isn't in it: it lives in `<LNBITS_EXTENSIONS_PATH>/extensions`, which is `lnbits/extensions` in a source checkout by default, and LNbits can download it again.

SQLite is a single-writer database. It's fine for one person or a small group. For many concurrent users, or many extensions writing at once, use PostgreSQL.

## PostgreSQL {#postgresql-recommended-for-production}

### Create the database {#installation}

```bash
# Debian/Ubuntu
sudo apt install postgresql

sudo -u postgres psql <<'SQL'
CREATE USER lnbits WITH PASSWORD 'CHANGE_ME';
CREATE DATABASE lnbits OWNER lnbits;
SQL
```

Replace the placeholder password with a generated one (`openssl rand -hex 24` gives one with no characters that need URL-encoding).

### Connection URL {#configuration}

```bash title=".env"
LNBITS_DATABASE_URL=postgres://lnbits:CHANGE_ME@localhost:5432/lnbits
```

- The scheme must be `postgres://`. LNbits refuses to start with `postgresql://` ("Please use the 'postgres://...' format for the database URL", [db.py L36-40](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/db.py#L36-L40)).
- LNbits swaps the scheme for `postgresql+asyncpg://` and hands the URL to SQLAlchemy with no pool options ([db.py L290-319](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/db.py#L290-L319)). It documents no connection-pool or TLS query parameters, so don't rely on them. Keep the database on localhost or a private network.
- The asyncpg driver ships with LNbits. The `migration` extra (`psycopg2-binary`) is needed only by the SQLite-to-PostgreSQL tool, and `uv sync --all-extras` installs it.

## CockroachDB {#cockroachdb}

```bash title=".env"
LNBITS_DATABASE_URL=cockroachdb://lnbits:CHANGE_ME@localhost:26257/lnbits
```

LNbits maps this to `cockroachdb+asyncpg://` ([db.py L296-304](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/db.py#L296-L304)). The built-in backup doesn't dump CockroachDB, so use CockroachDB's own backup tools. For cluster setup, see the [CockroachDB docs](https://www.cockroachlabs.com/docs/).

## Migrating from SQLite to PostgreSQL {#migration-from-sqlite-to-postgresql}

v1.6.2 has one supported path: the [`tools/conv.py`](https://github.com/lnbits/lnbits/blob/v1.6.2/tools/conv.py) script in a source checkout, which `make migration` also runs. It copies the core database and every `ext_*.sqlite3` file into PostgreSQL, and it checks first that the schema versions on both sides match. `lnbits-cli` has no migration command.

1. **Back up** the whole data folder (see [Backups](#backup-strategies)).
2. Stop LNbits.
3. Create an empty PostgreSQL database (see [Create the database](#installation)).
4. Set `LNBITS_DATABASE_URL` in `.env`. Spell out the user, password, host **and port**, because `conv.py` splits the URL by hand and fails without a port.
5. Start LNbits **once** so that it creates the schema in PostgreSQL, then stop it again.
6. Run the converter from the LNbits directory. `LNBITS_DATA_FOLDER` must still point at the SQLite folder.

   ```bash
   uv run python tools/conv.py
   # or: make migration
   ```

   Optional flags: a path argument (a SQLite folder or a single `ext_*.sqlite3`), `-e` (extensions only), `-s` (skip extensions with no migration) and `-i` (don't stop on errors). Run `uv run python tools/conv.py --help` for details.
7. Start LNbits and check the wallets, balances and extensions before you delete the SQLite files.

Upstream's write-up of the same steps is in [docs/guide/installation.md](https://github.com/lnbits/lnbits/blob/v1.6.2/docs/guide/installation.md#sqlite--postgresql-migration). Don't use `sqlite3 .dump | psql` instead: it skips the extension databases, and the column types don't match.

## Schema migrations {#migrations}

LNbits migrates the core schema and every installed extension's schema automatically at startup, and records each module's version in the `dbversions` table. The core migrations live in [core/migrations.py](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/migrations.py). Two CLI commands help ([commands.py L138-151](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/commands.py#L138-L151)):

```bash
uv run lnbits-cli db versions   # show the version of each module
uv run lnbits-cli db migrate    # run pending migrations without starting the server
```

:::danger Don't edit `dbversions` by hand
Deleting or lowering a row in `dbversions` makes LNbits rerun every migration for that module, starting at the first one, against tables that already exist. That can fail halfway and leave the schema broken. If a migration fails, restore your backup and report the error upstream.
:::

## Backups {#backup-strategies}

Back up the **data folder** whatever database you use. Even on PostgreSQL it holds `.lnbits_auth_key`, `.super_user`, the WASM extensions and the logs, and none of these are in the database. For the full procedure, see [Backup & Restore](/docs/guides/backup-restore).

### Built-in backup (Super User) {#built-in-backup}

In the Admin UI, the Super User can click **Download database backup**, which calls `GET /admin/api/v1/backup` ([admin_api.py L137-174](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/admin_api.py#L137-L174)). The response is a zip of the whole data folder. On PostgreSQL, LNbits first runs `pg_dump --format=c` into the folder, so the zip also contains `lnbits-database.dmp`. Admins see the button too, but only the Super User can use it. v1.6.2 fixed a regression from v1.6.0 that broke this backup on PostgreSQL. A failed dump now returns an error ("PostgreSQL database backup failed.") instead of an incomplete zip.

:::caution PostgreSQL 15+ and the Docker image
The `lnbits/lnbits` image installs `postgresql-client-14` ([Dockerfile](https://github.com/lnbits/lnbits/blob/v1.6.2/Dockerfile)). `pg_dump` refuses to dump a server with a newer major version, so the built-in backup **fails** when the container talks to PostgreSQL 15 or newer. Until the image changes, run `pg_dump` from the database container, or from a host whose client version matches the server. Outside Docker, the LNbits host needs a `pg_dump` at least as new as the server.
:::

### SQLite {#sqlite}

```bash
# Simplest: stop LNbits, copy the folder, start it again
sudo systemctl stop lnbits
tar czf lnbits-data-$(date +%F).tar.gz -C /path/to/lnbits data
sudo systemctl start lnbits

# Hot copy of one file while LNbits runs (repeat for each ext_*.sqlite3)
sqlite3 data/database.sqlite3 ".backup 'backup/database.sqlite3'"
```

### PostgreSQL {#postgresql}

```bash
# Dump (custom format)
pg_dump -h localhost -U lnbits -Fc lnbits > lnbits-$(date +%F).dump

# Restore into an empty database
pg_restore -h localhost -U lnbits -d lnbits lnbits-2026-10-18.dump

# With PostgreSQL in Docker Compose (service name "postgres")
docker compose exec -T postgres pg_dump -U lnbits -Fc lnbits > lnbits-$(date +%F).dump
```

### Automated backups {#automated-backups}

```bash title="backup.sh"
#!/bin/bash
# Run daily from cron. Paths are examples.
set -euo pipefail
BACKUP_DIR=/var/backups/lnbits
DATE=$(date +%Y%m%d)
mkdir -p "$BACKUP_DIR"

# PostgreSQL dump (skip this on SQLite)
pg_dump -h localhost -U lnbits -Fc lnbits > "$BACKUP_DIR/db-$DATE.dump"

# Data folder: auth key, super user, extension databases, WASM extensions
tar czf "$BACKUP_DIR/data-$DATE.tar.gz" -C /home/lnbits/lnbits data

# Keep the last 30 days
find "$BACKUP_DIR" -type f -mtime +30 -delete
```

On SQLite, a `tar` of a folder whose files are being written can catch them mid-write. Stop LNbits first, or use `sqlite3 .backup` for each file. Copy backups off the machine, and encrypt them: they contain wallet data, the auth key and any funding-source credentials stored in the settings.

## Troubleshooting {#troubleshooting}

### Connection refused {#connection-refused}

```bash
sudo systemctl status postgresql
psql "postgres://lnbits:CHANGE_ME@localhost:5432/lnbits" -c 'select 1'
```

### Migration errors {#migration-errors}

```bash
uv run lnbits-cli db versions
```

Set `DEBUG=true` for verbose logs and `DEBUG_DATABASE=true` to log every SQL statement. Don't "fix" a failed migration by editing `dbversions` (see [Schema migrations](#migrations)).

### Database locked (SQLite) {#database-locked-sqlite}

Only one process should have the files open. Make sure no second LNbits instance or `sqlite3` shell is using `data/database.sqlite3`:

```bash
fuser data/database.sqlite3
```

If locking keeps happening under load, move to PostgreSQL.

## See Also {#see-also}

- [Environment Variables](/docs/configuration/environment)
- [Backup & Restore](/docs/guides/backup-restore)
- [Docker Deployment](/docs/deployment/docker)
- [Upstream PostgreSQL guide](https://docs.lnbits.com/guide/installation/postgresql)
