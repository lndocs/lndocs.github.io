---
sidebar_position: 3
title: Quick Start
description: Get LNbits running in 5 minutes with this quick start guide
---

# Quick Start

Get LNbits running in 5 minutes with this quick start guide.

## Step 1: Start LNbits

The fastest way to start is with Docker:

```bash
docker run -d --name lnbits -p 5000:5000 lnbits/lnbits
```

Or with UV (for development):

```bash
git clone https://github.com/lnbits/lnbits.git
cd lnbits
curl -LsSf https://astral.sh/uv/install.sh | sh
uv sync && uv run lnbits
```

## Step 2: Open the Web Interface

Navigate to **http://localhost:5000** in your browser.

You'll see the LNbits login screen.

## Step 3: Create an Account

By default, LNbits uses "user-id-only" authentication:

1. Click **"Add a new wallet"**
2. Enter a wallet name (e.g., "My First Wallet")
3. Click **"Create wallet"**

:::tip
Save your wallet URL! It contains your unique user ID. Bookmark it for easy access.
:::

## Step 4: Explore Your Wallet

You now have a wallet with:

- **Admin Key**: Full control (send/receive/manage)
- **Invoice Key**: Create invoices only (safe to share)
- **Balance**: 0 sats (connected to Fake Wallet by default)

### Wallet Dashboard

The wallet dashboard shows:
- Current balance
- Recent transactions
- QR code for receiving
- API key access

### Create an Invoice

1. Click **"Receive"**
2. Enter an amount in sats
3. Add an optional memo
4. Click **"Create Invoice"**
5. Copy the BOLT11 invoice or scan the QR code

### Pay an Invoice

1. Click **"Send"**
2. Paste a BOLT11 invoice
3. Click **"Pay Invoice"**

:::info
The default Fake Wallet simulates payments without real Lightning. Perfect for testing!
:::

## Step 5: Enable Extensions

Extensions add powerful features to LNbits:

1. Click **"Extensions"** in the sidebar
2. Browse available extensions
3. Click **"Enable"** on an extension (try TPoS!)
4. Configure the extension in its settings

### Popular Extensions

| Extension | Purpose |
|-----------|---------|
| TPoS | Point of sale for merchants |
| LNURL-pay | Static payment links |
| Paywall | Monetize content |
| SatsPay | Payment processor |

## Step 6: Connect a Real Funding Source

To use real Lightning payments, connect a funding source:

### Option A: LND

```bash
# In your .env file
LNBITS_BACKEND_WALLET_CLASS=LndRestWallet
LND_REST_ENDPOINT=https://your-lnd:8080
LND_REST_CERT=/path/to/tls.cert
LND_REST_MACAROON_ENCRYPTED=your-macaroon
```

### Option B: Core Lightning

```bash
LNBITS_BACKEND_WALLET_CLASS=CLNRestWallet
CLNREST_URL=https://your-cln:3010
CLNREST_RUNE=your-rune
```

### Option C: Custodial Service

```bash
# Example: Alby
LNBITS_BACKEND_WALLET_CLASS=AlbyWallet
ALBY_API_ENDPOINT=https://api.getalby.com
ALBY_ACCESS_TOKEN=your-token
```

After updating `.env`, restart LNbits:

```bash
docker restart lnbits
```

## Quick Reference

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/wallet` | Get wallet info |
| `POST /api/v1/payments` | Create invoice |
| `GET /api/v1/payments/{hash}` | Check payment status |

### Example API Call

```bash
# Create an invoice
curl -X POST http://localhost:5000/api/v1/payments \
  -H "X-Api-Key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"out": false, "amount": 1000, "memo": "Test payment"}'
```

### Environment Variables

```bash
# Essential settings
HOST=0.0.0.0
PORT=5000
LNBITS_ADMIN_UI=true
LNBITS_BACKEND_WALLET_CLASS=FakeWallet
```

## Next Steps

You're now running LNbits! Here's what to explore next:

1. **[Create Your First Wallet](/docs/getting-started/first-wallet)** - Detailed wallet walkthrough
2. **[Configuration Guide](/docs/configuration/environment)** - Customize your instance
3. **[Funding Sources](/docs/funding-sources/overview)** - Connect real Lightning
4. **[Extensions](/docs/extensions/overview)** - Add powerful features
5. **[API Reference](/docs/api/overview)** - Build integrations

## Getting Help

- **Demo**: Experiment at [demo.lnbits.com](https://demo.lnbits.com)
- **Community**: Join [t.me/lnbits](https://t.me/lnbits)
- **Issues**: Report bugs at [GitHub](https://github.com/lnbits/lnbits/issues)
