---
sidebar_position: 3
title: Backup & Restore
description: Back up and restore your LNbits data
---

# Backup & Restore

Protect your LNbits data with regular backups.

## What to Backup

- **Database**: All wallet and payment data
- **Configuration**: `.env` file
- **Super User**: `.super_user` file

## SQLite Backup

```bash
# Stop LNbits first
docker compose stop

# Copy the whole data folder: database.sqlite3, one ext_<id>.sqlite3 per
# extension, and .lnbits_auth_key (without it, existing logins stop working)
mkdir -p ./backup && cp -a ./data ./backup/lnbits-data-$(date +%Y%m%d)

# Start LNbits
docker compose start
```

## PostgreSQL Backup

```bash
# Full backup
pg_dump lnbits > backup-$(date +%Y%m%d).sql

# Compressed
pg_dump lnbits | gzip > backup-$(date +%Y%m%d).sql.gz
```

## Restore

### SQLite

```bash
# With LNbits stopped, put back the data folder you saved
cp -a ./backup/lnbits-data-YYYYMMDD/. ./data/
```

### PostgreSQL

```bash
psql lnbits < backup.sql
```

## Automated Backups

```bash
#!/bin/bash
# /etc/cron.daily/lnbits-backup

BACKUP_DIR=/var/backups/lnbits
DATE=$(date +%Y%m%d)

# PostgreSQL
pg_dump lnbits | gzip > "$BACKUP_DIR/lnbits-$DATE.sql.gz"

# Keep 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

## See Also

- [Database Configuration](/docs/configuration/database)
- [Troubleshooting](/docs/guides/troubleshooting)
