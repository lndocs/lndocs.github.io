---
sidebar_position: 2
title: Database
description: Configure SQLite, PostgreSQL, or CockroachDB for LNbits
---

# Database Configuration

LNbits supports multiple database backends for different scale requirements.

## Supported Databases

| Database | Best For | Requirements |
|----------|----------|--------------|
| SQLite | Development, small deployments | None (default) |
| PostgreSQL | Production, high traffic | PostgreSQL 12+ |
| CockroachDB | Distributed deployments | CockroachDB cluster |

## SQLite (Default)

SQLite is the default database, requiring no external setup.

### Configuration

```bash
# Data folder contains the SQLite database
LNBITS_DATA_FOLDER="./data"
```

The database file is created at `./data/lnbits.sqlite3`.

### Pros and Cons

**Pros:**
- Zero configuration
- Single file backup
- Works everywhere

**Cons:**
- Single writer (limited concurrency)
- Not suitable for high traffic
- No horizontal scaling

### Best Practices

```bash
# Backup the database
cp ./data/lnbits.sqlite3 ./backup/lnbits-$(date +%Y%m%d).sqlite3

# Check database integrity
sqlite3 ./data/lnbits.sqlite3 "PRAGMA integrity_check;"
```

## PostgreSQL (Recommended for Production)

PostgreSQL handles concurrent users and high transaction volumes.

### Installation

```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres psql
postgres=# CREATE USER lnbits WITH PASSWORD 'secure_password';
postgres=# CREATE DATABASE lnbits OWNER lnbits;
postgres=# \q
```

### Configuration

```bash
# Connection URL format
LNBITS_DATABASE_URL="postgres://user:password@host:port/database"

# Example
LNBITS_DATABASE_URL="postgres://lnbits:secure_password@localhost:5432/lnbits"
```

### Connection Pool Settings

PostgreSQL connections are pooled automatically. For high-traffic instances:

```bash
# Increase pool size (default: 5)
# Set via SQLAlchemy connection string
LNBITS_DATABASE_URL="postgres://user:pass@host:5432/db?pool_size=20&max_overflow=10"
```

### SSL Connections

```bash
# Require SSL
LNBITS_DATABASE_URL="postgres://user:pass@host:5432/db?sslmode=require"

# With certificate
LNBITS_DATABASE_URL="postgres://user:pass@host:5432/db?sslmode=verify-full&sslrootcert=/path/to/ca.pem"
```

## CockroachDB

For distributed, highly available deployments.

### Configuration

```bash
LNBITS_DATABASE_URL="cockroachdb://user:password@host:26257/lnbits?sslmode=verify-full"
```

### Cluster Setup

CockroachDB provides automatic failover and horizontal scaling. Consult [CockroachDB documentation](https://www.cockroachlabs.com/docs/) for cluster setup.

## Migration from SQLite to PostgreSQL

### Using the Conversion Tool

```bash
# Set the target database URL
export LNBITS_DATABASE_URL="postgres://lnbits:password@localhost:5432/lnbits"

# Run the migration tool
uv run python tools/conv.py
```

### Manual Migration

1. Export data from SQLite:
```bash
sqlite3 ./data/lnbits.sqlite3 ".dump" > lnbits_backup.sql
```

2. Convert SQL syntax (SQLite → PostgreSQL differences)

3. Import into PostgreSQL:
```bash
psql lnbits < lnbits_backup.sql
```

:::warning
Test migrations on a copy first. Some data types and constraints may need adjustment.
:::

## Database Schema

### Core Tables

```sql
-- User accounts
CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    username TEXT,
    email TEXT,
    password_hash TEXT,
    pubkey TEXT,
    extra TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Wallets
CREATE TABLE wallets (
    id TEXT PRIMARY KEY,
    name TEXT,
    user_id TEXT REFERENCES accounts(id),
    adminkey TEXT,
    inkey TEXT,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Payments
CREATE TABLE apipayments (
    checking_id TEXT PRIMARY KEY,
    payment_hash TEXT,
    wallet_id TEXT REFERENCES wallets(id),
    amount INTEGER,
    fee INTEGER,
    bolt11 TEXT,
    status TEXT,
    memo TEXT,
    preimage TEXT,
    extra TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Extension state
CREATE TABLE extensions (
    user_id TEXT,
    extension TEXT,
    active BOOLEAN,
    PRIMARY KEY (user_id, extension)
);
```

### Indexes

Important indexes for performance:

```sql
CREATE INDEX idx_payments_wallet ON apipayments(wallet_id);
CREATE INDEX idx_payments_status ON apipayments(status);
CREATE INDEX idx_payments_created ON apipayments(created_at);
CREATE INDEX idx_wallets_user ON wallets(user_id);
```

## Migrations

LNbits uses automatic migrations on startup.

### How Migrations Work

```python
# Migrations are versioned functions
async def m001_initial(db):
    """Create initial tables"""
    await db.execute("""
        CREATE TABLE IF NOT EXISTS accounts (...)
    """)

async def m002_add_email(db):
    """Add email column"""
    await db.execute("""
        ALTER TABLE accounts ADD COLUMN email TEXT
    """)
```

### Migration Tracking

Migrations are tracked in the `dbversions` table:

```sql
SELECT * FROM dbversions;
-- db        | version
-- core      | 15
-- tpos      | 3
-- lnurlp    | 5
```

### Force Re-run Migration

```bash
# Reset a specific extension's migrations
psql lnbits -c "DELETE FROM dbversions WHERE db = 'extension_name'"
```

## Backup Strategies

### SQLite

```bash
# Simple file copy (while LNbits is stopped)
cp ./data/lnbits.sqlite3 ./backup/

# Hot backup with sqlite3
sqlite3 ./data/lnbits.sqlite3 ".backup ./backup/lnbits.sqlite3"
```

### PostgreSQL

```bash
# Full backup
pg_dump lnbits > lnbits_backup.sql

# Compressed backup
pg_dump lnbits | gzip > lnbits_backup.sql.gz

# Restore
psql lnbits < lnbits_backup.sql
```

### Automated Backups

```bash
#!/bin/bash
# backup.sh - Run daily via cron

BACKUP_DIR="/var/backups/lnbits"
DATE=$(date +%Y%m%d)

# PostgreSQL backup
pg_dump lnbits | gzip > "$BACKUP_DIR/lnbits-$DATE.sql.gz"

# Keep last 30 days
find $BACKUP_DIR -name "lnbits-*.sql.gz" -mtime +30 -delete
```

## Troubleshooting

### Connection Refused

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -U lnbits -h localhost lnbits
```

### Migration Errors

```bash
# Check migration status
psql lnbits -c "SELECT * FROM dbversions"

# View migration logs
LNBITS_LOG_LEVEL=DEBUG uv run lnbits
```

### Database Locked (SQLite)

```bash
# Check for processes holding the lock
fuser ./data/lnbits.sqlite3

# Wait for lock release or restart LNbits
```

## See Also

- [Environment Variables](/docs/configuration/environment)
- [Backup & Restore](/docs/guides/backup-restore)
- [Troubleshooting](/docs/guides/troubleshooting)
