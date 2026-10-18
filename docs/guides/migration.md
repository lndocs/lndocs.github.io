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

LNbits ships a converter, `tools/conv.py`, in the source checkout. It copies `database.sqlite3` and every `ext_<id>.sqlite3` from the data folder into PostgreSQL, table by table, overwriting rows that already exist. It needs `psycopg2`, which comes with the `migration` extra. The commands below are for a source install. The Docker image already contains `tools/conv.py` and all extras, so on Docker run the same commands inside the container, for example `docker compose run --rm lnbits uv --offline run --no-sync python tools/conv.py`, with the database reachable from the container.

1. **Stop LNbits** and make a full backup.
2. **Create** an empty PostgreSQL database and a user that owns it.
3. **Set** `LNBITS_DATABASE_URL` in `.env`. It must start with `postgres://` (LNbits refuses anything else) and include the port, because the converter splits the URL by hand:
   ```bash
   LNBITS_DATABASE_URL="postgres://lnbits:YOUR_PASSWORD@localhost:5432/lnbits"
   ```
4. **Create the schema** by starting LNbits once against the empty database, then stop it. Upstream's own migration test (`make test-migration`) does this first start with the Admin UI off, so that no new Super User and settings are created in PostgreSQL:
   ```bash
   LNBITS_ADMIN_UI=false uv run lnbits   # wait for "Application startup complete", then Ctrl+C
   ```
5. **Install the extra and run the converter.** Use `--all-extras` (it includes `migration`): a plain `uv sync --extra migration` uninstalls any other extras you had.
   ```bash
   uv sync --all-extras
   uv run python tools/conv.py
   ```
   It first checks that every schema version in SQLite matches PostgreSQL, so keep the same LNbits version throughout. `-i` logs failed rows and keeps going; `uv run python tools/conv.py --help` lists the rest.
6. **Migrate the extensions.** In step 4 PostgreSQL had no installed extensions, so their tables don't exist yet and the converter logs `Failed to migrate extension <id>` for each one. Now that the core data (including the list of installed extensions) is in PostgreSQL, start LNbits once more so it creates those tables, stop it, and run:
   ```bash
   uv run python tools/conv.py --extensions-only
   ```
7. **Start LNbits** normally and check users, wallets, balances and extension data.

Steps 4 and 6 follow from reading `tools/conv.py` and the startup code in v1.6.2; we have not run this procedure end to end. Check the converter's log for `🛑` lines before you delete anything.

Keep the data folder. On PostgreSQL it still holds `.lnbits_auth_key`, `zips/` and `wasm_extensions/`. Keep the old `*.sqlite3` files too until you are sure the migration is complete.

## Between instances {#between-instances}

:::danger One instance per funding source
Never run the old and new instance against the same funding source at the same time. Each keeps its own copy of every balance, so users could spend the same node funds twice. Stop the old one before you start the new one.
:::

1. **Stop** LNbits on the old server.
2. **Back up** the whole data folder, plus the database if you use PostgreSQL. Or download the Super User backup from `/admin`. See [Backup & Restore](/docs/guides/backup-restore).
3. **Install** the same LNbits version on the new server (for Docker, pin the tag, e.g. `lnbits/lnbits:v1.6.2`).
4. **Restore** the data folder and database there. See [Restore](/docs/guides/backup-restore).
5. **Update** funding-source settings if the node's address or credentials changed. With the Admin UI on, these are stored in the database and override `.env`, so change them in `/admin`.
6. **Verify** wallet balances against your node before you delete the old server.

## Version upgrades {#version-upgrades}

LNbits runs its database migrations automatically at startup, and they only go forward. To roll back, restore the backup you made before upgrading. See [Upgrading](/docs/guides/upgrading) for the steps and the per-release notes.

## See Also

- [Database Configuration](/docs/configuration/database)
- [Backup & Restore](/docs/guides/backup-restore)
- [Upgrading](/docs/guides/upgrading)
