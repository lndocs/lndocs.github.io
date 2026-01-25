---
sidebar_position: 5
title: Custodial Services
description: Configure LNbits with custodial Lightning services
---

# Custodial Services

Connect LNbits to third-party Lightning services for easy setup without running your own node.

## Overview

Custodial services provide Lightning access without node operation:

| Service | Best For | Features |
|---------|----------|----------|
| Alby | Browser wallet users | NWC, Webhooks |
| OpenNode | Merchants | Payment processing |
| Blink | El Salvador users | USD conversion |
| ZBD | Gaming | Fast payouts |
| LNPay | Developers | Simple API |
| Strike | Strike users | OAuth2 |

:::warning Custodial Risk
Using custodial services means trusting a third party with your funds. Consider the trade-offs between convenience and self-custody.
:::

## Alby

### Setup

1. Create account at [getalby.com](https://getalby.com)
2. Get API access token from settings
3. Configure LNbits:

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=AlbyWallet
ALBY_API_ENDPOINT=https://api.getalby.com
ALBY_ACCESS_TOKEN=your_access_token
```

### Nostr Wallet Connect (NWC)

Alby also supports NWC:

```bash
LNBITS_BACKEND_WALLET_CLASS=NWCWallet
NWC_PAIRING_URL=nostr+walletconnect://...
```

## OpenNode

### Setup

1. Create account at [opennode.com](https://opennode.com)
2. Generate API key in dashboard
3. Configure LNbits:

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=OpenNodeWallet
OPENNODE_API_ENDPOINT=https://api.opennode.com
OPENNODE_KEY=your_api_key
```

### API Key Permissions

- **Invoice permission** - For receiving
- **Withdrawal permission** - For sending

## Blink

### Setup

1. Create account at [blink.sv](https://www.blink.sv)
2. Get API token from settings
3. Configure LNbits:

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=BlinkWallet
BLINK_API_ENDPOINT=https://api.blink.sv/graphql
BLINK_TOKEN=your_api_token
```

## ZBD

### Setup

1. Create account at [zebedee.io](https://zebedee.io)
2. Create project and get API key
3. Configure LNbits:

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=ZBDWallet
ZBD_API_ENDPOINT=https://api.zebedee.io
ZBD_API_KEY=your_api_key
```

## LNPay

### Setup

1. Create account at [lnpay.co](https://lnpay.co)
2. Get wallet access key
3. Configure LNbits:

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=LNPayWallet
LNPAY_API_ENDPOINT=https://api.lnpay.co
LNPAY_API_KEY=your_api_key
LNPAY_WALLET_KEY=waka_your_wallet_access_key
```

## Strike

Strike uses OAuth2 for authentication:

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=StrikeWallet
STRIKE_API_ENDPOINT=https://api.strike.me
STRIKE_API_KEY=your_api_key
```

## LNbits Wallet (Nested)

Use another LNbits instance as your funding source:

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=LNbitsWallet
LNBITS_ENDPOINT=https://another-lnbits.com
LNBITS_KEY=admin_key_from_parent_wallet
```

### Use Cases

- Multi-tier deployments
- Testing without real nodes
- Delegation to managed service

## Nostr Wallet Connect (NWC)

Connect to any NWC-compatible wallet:

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=NWCWallet
NWC_PAIRING_URL=nostr+walletconnect://pubkey?relay=wss://...&secret=...
```

### Getting NWC URL

- Alby: Settings > Nostr Wallet Connect
- Other wallets: Check for NWC support

## Breez SDK

Greenlight-powered non-custodial:

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=BreezSdkWallet
BREEZ_API_KEY=your_breez_api_key
BREEZ_GREENLIGHT_DEVICE_KEY=your_device_key
BREEZ_GREENLIGHT_DEVICE_CERT=your_device_cert
```

## Comparing Services

| Service | Fees | Limits | Speed |
|---------|------|--------|-------|
| Alby | Low | Moderate | Fast |
| OpenNode | 1% | High | Fast |
| Blink | Low | High | Fast |
| ZBD | Low | Gaming | Fast |
| LNPay | 0.5% | Moderate | Fast |
| Strike | Low | High | Fast |

## Common Issues

### Rate Limiting

Many services have API rate limits:

```bash
# Reduce request frequency
LNBITS_RATE_LIMIT_NO=100
LNBITS_RATE_LIMIT_UNIT=minute
```

### Balance Limits

Custodial services may have:
- Maximum wallet balance
- Per-transaction limits
- Daily/monthly limits

Check your service's documentation.

### API Errors

```bash
# Enable debug logging
LNBITS_LOG_LEVEL=DEBUG

# Check service status pages
# Review API documentation for error codes
```

## Security Considerations

### API Key Protection

1. **Never commit keys** to version control
2. **Use environment variables** or secrets management
3. **Rotate keys** if suspected compromise
4. **Use minimal permissions** when possible

### Monitoring

1. Set up balance alerts
2. Monitor for unexpected transactions
3. Review service audit logs
4. Regular reconciliation

## Migration Path

When ready for self-custody:

1. Set up LND or CLN node
2. Create new LNbits instance
3. Migrate wallets via payment
4. Update API integrations
5. Decommission custodial setup

## See Also

- [Funding Sources Overview](/docs/funding-sources/overview)
- [LND Configuration](/docs/funding-sources/lnd)
- [Phoenixd](/docs/funding-sources/phoenixd)
