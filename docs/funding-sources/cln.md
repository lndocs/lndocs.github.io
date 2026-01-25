---
sidebar_position: 3
title: Core Lightning
description: Configure LNbits with Core Lightning node
---

# Core Lightning Configuration

Connect LNbits to your Core Lightning (CLN) node.

## Prerequisites

- Core Lightning running and synced
- REST interface or RPC socket accessible
- Rune or socket permissions configured

## CLN REST with Runes (Recommended)

The modern way to connect using runes for authentication.

### Configuration

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=CLNRestWallet

# CLN REST URL
CLNREST_URL=https://127.0.0.1:3010

# Authentication rune
CLNREST_RUNE=your_rune_string

# Optional: TLS certificate
CLNREST_CERT=/path/to/ca.pem
```

### Creating a Rune

```bash
# Create unrestricted rune (full access)
lightning-cli createrune

# Create restricted rune (recommended)
lightning-cli createrune restrictions='[["method^list|method^get|method=pay|method=invoice"]]'

# Create rune with rate limiting
lightning-cli createrune restrictions='[["method^pay"],["rate=60"]]'
```

### Rune Restrictions Examples

```bash
# Invoice creation only
restrictions='[["method=invoice"]]'

# Payments up to 100k sats
restrictions='[["method=pay"],["pnum=1"],["pamount<=100000000msat"]]'

# Read-only
restrictions='[["method^list|method^get"]]'
```

## c-lightning-REST

For older RTL-style REST interface:

```bash
LNBITS_BACKEND_WALLET_CLASS=CoreLightningRestWallet

CORELIGHTNING_REST_URL=https://127.0.0.1:3001
CORELIGHTNING_REST_MACAROON=/path/to/access.macaroon
CORELIGHTNING_REST_CERT=/path/to/certificate.pem
```

## Direct RPC Connection

Connect via Unix socket:

```bash
LNBITS_BACKEND_WALLET_CLASS=CoreLightningWallet

CORELIGHTNING_RPC=/path/to/.lightning/bitcoin/lightning-rpc
```

This requires LNbits to run on the same machine as CLN.

## Spark Wallet

If you have Spark Wallet running:

```bash
LNBITS_BACKEND_WALLET_CLASS=SparkWallet

SPARK_URL=https://127.0.0.1:9737
SPARK_TOKEN=your_spark_access_key
```

## Enabling CLN REST

### In CLN Config

```ini title="~/.lightning/config"
# Enable REST interface
rest-port=3010
rest-host=0.0.0.0

# TLS certificates
rest-certs=/path/to/certs
```

### Using the Plugin

```bash
# Start with REST plugin
lightningd --plugin=/path/to/clnrest
```

## Testing Connection

### Check CLN Status

```bash
# Via lightning-cli
lightning-cli getinfo

# Via REST
curl -k -H "Rune: $RUNE" https://127.0.0.1:3010/v1/getinfo
```

### Check LNbits Connection

```bash
docker logs lnbits | grep -i "core\|cln"
```

## Common CLN Setups

### Umbrel

```bash
CLNREST_URL=https://umbrel.local:3010
# Get rune from Umbrel CLN app
```

### RaspiBlitz

```bash
CLNREST_URL=https://raspiblitz.local:3010
CORELIGHTNING_RPC=/mnt/hdd/app-data/.lightning/bitcoin/lightning-rpc
```

### Start9

```bash
CLNREST_URL=https://cln.embassy:3010
# Use Embassy's CLN configuration
```

## Docker Compose Example

```yaml title="docker-compose.yml"
version: "3.8"

services:
  lnbits:
    image: lnbits/lnbits:latest
    ports:
      - "5000:5000"
    volumes:
      - ./data:/app/data
      - ./.env:/app/.env
      - /path/to/cln/certs:/cln-certs:ro
    environment:
      - LNBITS_BACKEND_WALLET_CLASS=CLNRestWallet
      - CLNREST_URL=https://cln:3010
      - CLNREST_RUNE=${CLN_RUNE}
      - CLNREST_CERT=/cln-certs/ca.pem

  cln:
    image: elementsproject/lightningd:latest
    # ... CLN configuration
```

## Troubleshooting

### Connection Refused

```bash
# Check CLN is running
lightning-cli getinfo

# Check REST is enabled
ps aux | grep clnrest
```

### Rune Invalid

```bash
# List existing runes
lightning-cli showrunes

# Check rune hasn't expired or been revoked
lightning-cli checkrune rune="$RUNE"
```

### Permission Denied (RPC)

```bash
# Check socket permissions
ls -la ~/.lightning/bitcoin/lightning-rpc

# Add user to lightning group
sudo usermod -aG lightning lnbits_user
```

### Certificate Error

```bash
# Check certificate paths
openssl x509 -in /path/to/ca.pem -text -noout

# For self-signed certs, copy the CA
CLNREST_CERT=/path/to/ca.pem
```

## Security Best Practices

### Rune Restrictions

Always use restricted runes in production:

```bash
# Minimal permissions for LNbits
lightning-cli createrune restrictions='[[
  "method=invoice",
  "method=pay",
  "method=listinvoices",
  "method=listpays",
  "method=getinfo"
]]'
```

### Rate Limiting

Add rate limits to prevent abuse:

```bash
# 60 calls per minute
restrictions='[["rate=60"]]'
```

### Rune Expiration

Set expiration for temporary access:

```bash
# Expires in 24 hours
lightning-cli createrune restrictions='[["time<'$(($(date +%s) + 86400))'"]]'
```

## Performance Tips

### Connection Handling

CLN REST handles connections well, but for high traffic:

```ini title="~/.lightning/config"
# Increase concurrent requests
rest-max-connections=100
```

### Batching

For bulk operations, consider batching requests when possible.

## See Also

- [Funding Sources Overview](/docs/funding-sources/overview)
- [LND Configuration](/docs/funding-sources/lnd)
- [Security](/docs/configuration/security)
