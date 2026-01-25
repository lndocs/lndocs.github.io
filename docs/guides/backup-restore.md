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

# Copy database
cp ./data/lnbits.sqlite3 ./backup/lnbits-$(date +%Y%m%d).sqlite3

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
cp ./backup/lnbits-backup.sqlite3 ./data/lnbits.sqlite3
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
