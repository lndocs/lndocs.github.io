---
sidebar_position: 4
title: Migration
description: Migrate LNbits data between databases or instances
---

# Migration

Migrate LNbits data between databases or instances.

## SQLite to PostgreSQL

```bash
# Set target database
export LNBITS_DATABASE_URL="postgres://user:pass@localhost:5432/lnbits"

# Run migration tool
uv run python tools/conv.py
```

## Between Instances

1. **Export** from source:
   ```bash
   pg_dump lnbits > export.sql
   ```

2. **Transfer** to new server

3. **Import** on target:
   ```bash
   psql lnbits < export.sql
   ```

4. **Update** funding source credentials

5. **Verify** wallet balances

## Version Upgrades

LNbits handles migrations automatically on startup:

```bash
# Pull new version
docker pull lnbits/lnbits:latest

# Restart - migrations run automatically
docker compose up -d
```

## See Also

- [Database Configuration](/docs/configuration/database)
- [Backup & Restore](/docs/guides/backup-restore)
