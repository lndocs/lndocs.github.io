---
sidebar_position: 4
title: Migration
description: Migrate LNbits data between databases or instances
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Migration

Move LNbits from SQLite to PostgreSQL, or from one server to another. **Make a full backup first** ([Backup & Restore](/docs/guides/backup-restore)).

## SQLite to PostgreSQL {#sqlite-to-postgresql}

LNbits ships a converter, `tools/conv.py`. It copies the core and extension SQLite databases from the data folder into PostgreSQL. It needs `psycopg2`, which comes with the `migration` extra.

1. **Stop LNbits.**
2. **Create** an empty PostgreSQL database and user for LNbits.
3. **Set** `LNBITS_DATABASE_URL` in `.env`. Include the port: the converter splits the URL by hand and expects `user:password@host:port/dbname`.
   ```bash
   LNBITS_DATABASE_URL="postgres://lnbits:YOUR_PASSWORD@localhost:5432/lnbits"
   ```
4. **Start LNbits once, then stop it.** This creates the schema in PostgreSQL. The converter checks that the SQLite and PostgreSQL schema versions match, so run the same LNbits version for both.
5. **Install the extra and run the converter** from the LNbits source folder:
   ```bash
   uv sync --extra migration
   uv run python tools/conv.py
   # or
   make migration
   ```
   By default it reads the data folder. `--extensions-only` migrates only the `ext_*.sqlite3` files, and `-i` keeps going past errors (`uv run python tools/conv.py --help`).
6. **Start LNbits** and check wallets, balances and extensions.

Keep the old data folder. It still holds `.lnbits_auth_key`, `upgrades/` and `wasm_extensions/`, which LNbits needs on PostgreSQL too.

:::note
`postgres://` is the scheme LNbits expects. The built-in backup only adds a database dump when the URL starts with `postgres://`.
:::

## Between instances {#between-instances}

1. **Stop** LNbits on the old server.
2. **Back up** the whole data folder, plus the database if you use PostgreSQL (`pg_dump --format=c "$LNBITS_DATABASE_URL"`). Or download the Super User backup from `/admin`.
3. **Install** the same LNbits version on the new server (for Docker, pin the tag, e.g. `lnbits/lnbits:v1.6.2`).
4. **Restore** the data folder and database there. See [Restore](/docs/guides/backup-restore).
5. **Update** funding-source settings if the node's address or credentials changed. With the Admin UI on, these are stored in the database and override `.env`, so change them in `/admin`.
6. **Verify** wallet balances against your node before you shut down the old server for good.

Never run both instances against the same funding source at the same time. Each one keeps its own balances, and both could spend the same node funds.

## Version upgrades {#version-upgrades}

LNbits runs its database migrations automatically at startup. Back up first, read the [upgrade notes](/docs/guides/upgrading) for every release you skip, and pin the version you move to:

```bash
# Back up first, then:
docker pull lnbits/lnbits:v1.6.2
# set image: lnbits/lnbits:v1.6.2 in docker-compose.yml, then
docker compose up -d
```

For a source install, check out the release tag rather than tracking a branch:

```bash
git fetch --tags && git checkout v1.6.2
uv sync --all-extras
```

Migrations only go forward. To roll back, restore the backup you made before upgrading.

## See Also

- [Database Configuration](/docs/configuration/database)
- [Backup & Restore](/docs/guides/backup-restore)
- [Upgrading](/docs/guides/upgrading)
