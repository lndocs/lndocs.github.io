---
sidebar_position: 4
title: Phoenixd
description: Configure LNbits with Phoenixd daemon
---

# Phoenixd Configuration

Connect LNbits to Phoenixd - a lightweight, self-custodial Lightning daemon from ACINQ.

## What is Phoenixd?

Phoenixd is a headless Lightning daemon that:
- Manages channels automatically
- Handles liquidity via LSP
- Runs on minimal resources
- Provides simple REST API

It's ideal for users who want self-custody without node management complexity.

## Prerequisites

- Phoenixd running and synced
- API password configured
- Port 9740 accessible (default)

## Installation

### Download Phoenixd

```bash
# Download latest release
wget https://github.com/ACINQ/phoenixd/releases/latest/download/phoenix-<version>-linux-x64.zip

# Extract
unzip phoenix-*.zip
cd phoenix-*

# Start
./phoenixd
```

### Docker

```bash
docker run -d \
  --name phoenixd \
  -p 127.0.0.1:9740:9740 \
  -v phoenixd-data:/phoenix/.phoenix \
  acinq/phoenixd
```

:::danger Followed an earlier version of this page?
Before October 2026 this example mounted `/data`. The image doesn't use that path, so your seed is in an anonymous Docker volume, and `docker rm -v` or `docker volume prune` would delete it. Copy it out before you change anything:

```bash
docker cp phoenixd:/phoenix/.phoenix ./phoenixd-backup
```
:::

## LNbits Configuration

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=PhoenixdWallet

# Phoenixd API endpoint
PHOENIXD_API_ENDPOINT=http://127.0.0.1:9740

# API password (from phoenixd output or config)
PHOENIXD_API_PASSWORD=your_password
```

### Remote Phoenixd

```bash
PHOENIXD_API_ENDPOINT=http://192.168.1.100:9740
PHOENIXD_API_PASSWORD=your_password
```

## Finding Your API Password

Phoenixd generates a password on first run:

```bash
# Check phoenixd output
cat ~/.phoenix/phoenix.conf

# Or in logs
grep "password" ~/.phoenix/phoenixd.log
```

## Testing Connection

### Check Phoenixd Status

```bash
# Get node info
curl -u :your_password http://127.0.0.1:9740/getinfo
```

### Check LNbits Connection

```bash
docker logs lnbits | grep -i phoenix
```

## Phoenixd Features

### Automatic Channel Management

Phoenixd handles:
- Channel opening (via ACINQ LSP)
- Liquidity management
- Fee optimization
- Channel rebalancing

### Inbound Liquidity

When receiving payments exceeding capacity:
1. Phoenixd requests inbound liquidity from LSP
2. On-chain fee is deducted from payment
3. Channel capacity is increased

### Fee Structure

- On-chain fees for channel operations
- LSP fee for inbound liquidity (1%)
- Routing fees for payments

## Docker Compose Setup

```yaml title="docker-compose.yml"
version: "3.8"

services:
  lnbits:
    image: lnbits/lnbits:latest
    ports:
      - "5000:5000"
    volumes:
      - ./data:/app/data
    environment:
      - LNBITS_BACKEND_WALLET_CLASS=PhoenixdWallet
      - PHOENIXD_API_ENDPOINT=http://phoenixd:9740
      - PHOENIXD_API_PASSWORD=${PHOENIXD_PASSWORD}
    depends_on:
      - phoenixd

  phoenixd:
    image: acinq/phoenixd:latest
    volumes:
      # The image keeps its seed and channel data here. Back this volume up.
      - phoenixd-data:/phoenix/.phoenix
    # No published port: LNbits reaches phoenixd over the compose network,
    # and phoenixd listens on all interfaces inside the container.

volumes:
  phoenixd-data:
```

## Backup & Recovery

### Backup Seed

The Phoenixd seed is critical:

```bash
# Backup the seed phrase
cat ~/.phoenix/seed.dat

# Store securely offline!
```

### Recovery

```bash
# Start with existing seed
./phoenixd --seed="your seed phrase here"
```

## Troubleshooting

### Connection Refused

```bash
# Check phoenixd is running
ps aux | grep phoenixd

# Check port binding
netstat -tlnp | grep 9740
```

### Authentication Failed

```bash
# Verify password matches
grep "password" ~/.phoenix/phoenix.conf

# Test with curl
curl -u :password http://127.0.0.1:9740/getinfo
```

### Sync Issues

```bash
# Check sync status
curl -u :password http://127.0.0.1:9740/getinfo | jq .blockHeight

# Wait for sync to complete
```

### Insufficient Capacity

When receiving large payments:
1. Wait for channel operation to complete
2. Check on-chain transaction in mempool
3. Retry after confirmation

## Monitoring

### Check Balance

```bash
curl -u :password http://127.0.0.1:9740/getbalance
```

### List Channels

```bash
curl -u :password http://127.0.0.1:9740/listchannels
```

### View Payments

```bash
curl -u :password http://127.0.0.1:9740/payments/incoming
curl -u :password http://127.0.0.1:9740/payments/outgoing
```

## Limitations

- Single channel to ACINQ LSP
- No custom channel management
- Dependent on ACINQ infrastructure
- Mobile limitations on Android/iOS

## Comparison with Other Backends

| Feature | Phoenixd | LND | CLN |
|---------|----------|-----|-----|
| Setup complexity | Low | High | High |
| Channel management | Automatic | Manual | Manual |
| Resource usage | Low | High | Medium |
| Customization | Limited | Full | Full |
| Self-custody | Yes | Yes | Yes |

## Security Considerations

1. **Protect API password** - Treat like a private key
2. **Backup seed** - Store offline securely
3. **Network security** - Don't expose port 9740 publicly
4. **Monitor balance** - Check for unexpected activity

## See Also

- [Funding Sources Overview](/docs/funding-sources/overview)
- [LND Configuration](/docs/funding-sources/lnd)
- [Custodial Services](/docs/funding-sources/custodial)
