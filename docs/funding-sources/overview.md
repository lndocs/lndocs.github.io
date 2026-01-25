---
sidebar_position: 1
title: Funding Sources Overview
description: Connect LNbits to Lightning Network backends
---

# Funding Sources Overview

A funding source is the Lightning Network backend that powers your LNbits wallets.

## What is a Funding Source?

LNbits doesn't process Lightning payments directly. Instead, it connects to a "funding source" - a Lightning node or service that handles the actual payment routing.

```
┌───────────────────────────────────────┐
│              LNbits                    │
│  (Wallet accounting, API, Extensions) │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│          Funding Source               │
│  (Lightning payments, routing)        │
└───────────────────────────────────────┘
```

## Available Funding Sources

### Self-Hosted Nodes

You run your own Lightning node:

| Backend | Protocol | Best For |
|---------|----------|----------|
| [LND REST](/docs/funding-sources/lnd) | REST API | Most common |
| LND gRPC | gRPC | Advanced setups |
| [Core Lightning](/docs/funding-sources/cln) | REST/Runes | CLN users |
| CoreLightning RPC | Unix socket | Direct connection |
| Spark | HTTP | Spark wallet |
| [Phoenixd](/docs/funding-sources/phoenixd) | REST | Easy setup |
| Eclair | REST | ACINQ node |

### Custodial Services

Third-party Lightning access:

| Backend | Type | Best For |
|---------|------|----------|
| [Alby](/docs/funding-sources/custodial) | API | Alby users |
| [OpenNode](/docs/funding-sources/custodial) | API | Merchants |
| [Blink](/docs/funding-sources/custodial) | API | El Salvador |
| [ZBD](/docs/funding-sources/custodial) | API | Gaming |
| LNPay | API | Payment processing |
| Strike | OAuth2 | Strike users |
| LN.tips | Bot | Telegram bots |

### Special Purpose

| Backend | Purpose |
|---------|---------|
| [LNbits](/docs/funding-sources/custodial) | Nested instance |
| [Fake Wallet](/docs/funding-sources/fake-wallet) | Development/testing |
| VoidWallet | Fallback (no Lightning) |
| NWC | Nostr Wallet Connect |
| Breez SDK | Greenlight-powered |
| Boltz | Submarine swaps |

## Choosing a Funding Source

### Decision Matrix

| Need | Recommended |
|------|-------------|
| Full control | LND or Core Lightning |
| Easy setup | Phoenixd or Alby |
| No node management | Custodial service |
| Testing | Fake Wallet |
| Enterprise | LND with dedicated hardware |

### Self-Hosted vs Custodial

**Self-Hosted Pros:**
- Full control
- No counterparty risk
- Better privacy
- No service fees

**Self-Hosted Cons:**
- Requires node operation
- Channel management
- Liquidity management
- Higher technical bar

**Custodial Pros:**
- Instant setup
- No maintenance
- Automatic liquidity
- Lower technical bar

**Custodial Cons:**
- Counterparty risk
- Less privacy
- Service fees
- Rate limits

## Configuration Basics

### Setting the Backend

```bash title=".env"
# Specify the backend class
LNBITS_BACKEND_WALLET_CLASS=LndRestWallet
```

### Backend-Specific Settings

Each backend has its own configuration:

```bash
# LND REST example
LND_REST_ENDPOINT=https://127.0.0.1:8080
LND_REST_CERT=/path/to/tls.cert
LND_REST_MACAROON=/path/to/admin.macaroon
```

## Testing Your Connection

After configuration:

1. Restart LNbits
2. Check the logs for connection status
3. Verify in Admin UI (if enabled)
4. Create a test invoice

```bash
# Check logs
docker logs lnbits | grep -i "funding"

# API health check
curl http://localhost:5000/api/v1/health
```

## Switching Funding Sources

### Via Environment

1. Stop LNbits
2. Update `.env` with new backend settings
3. Start LNbits
4. Verify connection

### Via Admin UI (Super User)

1. Go to Settings > Funding Source
2. Select new backend
3. Enter credentials
4. Test connection
5. Save and restart

:::warning
Switching funding sources affects all wallets. LNbits tracks internal balances - ensure your new funding source has sufficient funds.
:::

## Balance Reconciliation

LNbits maintains internal wallet balances. These should never exceed your funding source balance:

```
Funding Source: 1,000,000 sats
├── Wallet A:     400,000 sats
├── Wallet B:     350,000 sats
├── Wallet C:     200,000 sats
└── Unallocated:   50,000 sats
```

Monitor for discrepancies and investigate immediately.

## Common Issues

### Connection Failed

1. Check endpoint URL is correct
2. Verify credentials (macaroon, rune, API key)
3. Check network connectivity
4. Validate TLS certificates

### Payments Failing

1. Check funding source has balance
2. Verify channel liquidity
3. Check fee settings
4. Review funding source logs

### Slow Payments

1. Check network latency to funding source
2. Review channel health
3. Consider payment routing issues

## See Also

- [LND Configuration](/docs/funding-sources/lnd)
- [Core Lightning Configuration](/docs/funding-sources/cln)
- [Phoenixd Configuration](/docs/funding-sources/phoenixd)
- [Custodial Services](/docs/funding-sources/custodial)
