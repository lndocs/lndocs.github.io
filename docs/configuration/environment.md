---
sidebar_position: 1
title: Environment Variables
description: Complete reference for LNbits environment configuration
---

# Environment Variables

LNbits is configured through environment variables, typically in a `.env` file.

## Server Configuration

### Basic Settings

```bash
# Host and port
HOST=0.0.0.0              # Bind address (0.0.0.0 for all interfaces)
PORT=5000                 # HTTP port

# Debug mode (development only!)
DEBUG=false
```

### Data Directory

```bash
# SQLite database location
LNBITS_DATA_FOLDER="./data"

# For PostgreSQL (overrides SQLite)
LNBITS_DATABASE_URL="postgres://user:pass@localhost:5432/lnbits"
```

## Funding Source

```bash
# Backend class name
LNBITS_BACKEND_WALLET_CLASS=FakeWallet

# Available options:
# - FakeWallet (testing)
# - VoidWallet (fallback)
# - LndRestWallet
# - LndWallet (gRPC)
# - CLNRestWallet
# - CoreLightningWallet
# - SparkWallet
# - EclairWallet
# - PhoenixdWallet
# - LNbitsWallet
# - AlbyWallet
# - OpenNodeWallet
# - BlinkWallet
# - ZBDWallet
# - LNPayWallet
# - BreezSdkWallet
# - NWCWallet
# - StrikeWallet
```

### LND Configuration

```bash
LND_REST_ENDPOINT=https://127.0.0.1:8080
LND_REST_CERT=/path/to/tls.cert
LND_REST_MACAROON=/path/to/admin.macaroon
# Or encrypted
LND_REST_MACAROON_ENCRYPTED=encrypted_macaroon_string
```

### Core Lightning Configuration

```bash
CLNREST_URL=https://127.0.0.1:3010
CLNREST_RUNE=your_rune_string
CLNREST_CERT=/path/to/ca.pem  # Optional
```

### Phoenixd Configuration

```bash
PHOENIXD_API_ENDPOINT=http://127.0.0.1:9740
PHOENIXD_API_PASSWORD=your_password
```

## Admin & Security

### Admin UI

```bash
# Enable browser-based admin interface
LNBITS_ADMIN_UI=true

# Super user ID (auto-generated if not set)
SUPER_USER=""

# Admin user IDs (comma-separated)
LNBITS_ADMIN_USERS=""
```

### Access Control

```bash
# Allow new account creation
LNBITS_ALLOW_NEW_ACCOUNTS=true

# Restrict to specific users (comma-separated IDs)
LNBITS_ALLOWED_USERS=""

# Block specific IPs
LNBITS_BLOCKED_IPS=""
```

### Rate Limiting

```bash
LNBITS_RATE_LIMIT_NO=200
LNBITS_RATE_LIMIT_UNIT=minute
# Options: second, minute, hour, day
```

## Authentication

```bash
# Secret key for JWT tokens (REQUIRED for production!)
AUTH_SECRET_KEY=your-very-secret-key-here

# Token expiration (minutes)
AUTH_TOKEN_EXPIRE_MINUTES=525600  # 1 year

# Allowed auth methods (comma-separated)
AUTH_ALLOWED_METHODS=user-id-only,username-password
# Options:
# - user-id-only
# - username-password
# - nostr-nip98
# - google-auth
# - github-auth
# - keycloak-auth
```

### OAuth Providers

```bash
# Google
AUTH_GOOGLE_CLIENT_ID=""
AUTH_GOOGLE_CLIENT_SECRET=""

# GitHub
AUTH_GITHUB_CLIENT_ID=""
AUTH_GITHUB_CLIENT_SECRET=""

# Keycloak
AUTH_KEYCLOAK_CLIENT_ID=""
AUTH_KEYCLOAK_CLIENT_SECRET=""
AUTH_KEYCLOAK_DISCOVERY_URL=""
```

## Extensions

```bash
# Default extensions to install
LNBITS_EXTENSIONS_DEFAULT_INSTALL=tpos,lnurlp

# Extension manifest URLs
LNBITS_EXTENSIONS_MANIFESTS="https://raw.github.../manifest.json"

# Deactivate all extensions
LNBITS_EXTENSIONS_DEACTIVATE_ALL=false

# Extensions path
LNBITS_EXTENSIONS_PATH="./lnbits"
```

## Fees

```bash
# Service fee (percentage)
LNBITS_SERVICE_FEE=0.0

# Maximum service fee (sats)
LNBITS_SERVICE_FEE_MAX=0

# Wallet to collect fees
LNBITS_SERVICE_FEE_WALLET=""

# Skip fee on internal transfers
LNBITS_SERVICE_FEE_IGNORE_INTERNAL=true

# Fee reserves for routing
LNBITS_RESERVE_FEE_MIN=2000
LNBITS_RESERVE_FEE_PERCENT=1.0
```

## Site Customization

```bash
# Site branding
LNBITS_SITE_TITLE="LNbits"
LNBITS_SITE_TAGLINE="Free and Open-Source Lightning Wallet"
LNBITS_SITE_DESCRIPTION="Create wallets and accept payments"

# Theme options
LNBITS_THEME_OPTIONS="classic,bitcoin,flamingo,freedom,mint,autumn,monochrome,salvador,cyber"
LNBITS_DEFAULT_WALLET_NAME="LNbits Wallet"

# Hide API documentation
LNBITS_HIDE_API=false
```

## Invoice Settings

```bash
# Default invoice expiry (seconds)
LIGHTNING_INVOICE_EXPIRY=3600

# Enable fake invoices in Fake Wallet
FAKE_WALLET_INVOICES=true
```

## Logging

```bash
# Log level
LNBITS_LOG_LEVEL=INFO
# Options: DEBUG, INFO, WARNING, ERROR, CRITICAL

# Enable audit logging
LNBITS_AUDIT_ENABLED=false
```

## Node UI

```bash
# Enable node management UI
LNBITS_NODE_UI=false

# Show transaction history in node UI
LNBITS_NODE_UI_TRANSACTIONS=false
```

## Notifications

```bash
# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASSWORD=your-password
SMTP_SENDER=noreply@example.com

# Telegram
TELEGRAM_BOT_TOKEN=""
```

## Exchange Rates

```bash
# Exchange rate source
LNBITS_EXCHANGE_RATE_SOURCE=coinbase
# Options: coinbase, blockchain.info, kraken, etc.

# Update interval (seconds)
LNBITS_EXCHANGE_RATE_CACHE_SECONDS=3600
```

## Example .env File

```bash title=".env"
# ========================================
# LNbits Configuration
# ========================================

# Server
HOST=0.0.0.0
PORT=5000

# Database
LNBITS_DATA_FOLDER="./data"

# Funding Source (LND)
LNBITS_BACKEND_WALLET_CLASS=LndRestWallet
LND_REST_ENDPOINT=https://127.0.0.1:8080
LND_REST_CERT=/path/to/tls.cert
LND_REST_MACAROON=/path/to/admin.macaroon

# Admin
LNBITS_ADMIN_UI=true
AUTH_SECRET_KEY=change-this-to-a-random-string

# Security
LNBITS_ALLOW_NEW_ACCOUNTS=true
LNBITS_RATE_LIMIT_NO=200
LNBITS_RATE_LIMIT_UNIT=minute

# Extensions
LNBITS_EXTENSIONS_DEFAULT_INSTALL=tpos

# Branding
LNBITS_SITE_TITLE="My LNbits"
```

## Validation

Check your configuration:

```bash
# Test configuration
docker run --env-file .env lnbits/lnbits --help

# View loaded settings (debug)
DEBUG=true uv run lnbits
```

## See Also

- [Database Configuration](/docs/configuration/database)
- [Authentication](/docs/configuration/authentication)
- [Security](/docs/configuration/security)
