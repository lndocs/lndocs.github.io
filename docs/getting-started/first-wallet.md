---
sidebar_position: 4
title: Create Your First Wallet
description: Step-by-step guide to creating and managing wallets in LNbits
---

# Create Your First Wallet

This guide walks you through creating and managing your first LNbits wallet.

## Understanding Wallets

In LNbits, a **wallet** is an isolated account with its own:
- Balance (tracked in millisatoshis)
- API keys (admin and invoice)
- Transaction history
- Extension access
- Customization options

Wallets are backed by a single funding source, but each wallet has independent accounting.

## Creating a Wallet

### Step 1: Access LNbits

Open your LNbits instance (default: http://localhost:5000).

### Step 2: Create New Wallet

1. Click **"Add a new wallet"**
2. Enter a name for your wallet (e.g., "Personal Savings")
3. Click **"Create wallet"**

### Step 3: Save Your Wallet URL

:::danger Important
Your wallet URL contains your unique identifier. Save it securely!
```
http://localhost:5000/wallet?usr=abc123def456
```
If you lose this URL, you lose access to the wallet.
:::

## Wallet Dashboard

Your wallet dashboard shows:

### Balance Section
- Current balance in satoshis
- Balance in selected fiat currency (if configured)
- Receive/Send buttons

### Transaction History
- Recent incoming and outgoing payments
- Payment status (pending/success/failed)
- Memos and timestamps

### API Keys
- **Admin Key**: Full wallet control
- **Invoice Key**: Create invoices only

## API Keys Explained

### Admin Key
```
Full access to wallet:
- Send payments
- Create invoices
- View balance
- Access extensions
- View all transactions
```

**Security**: Keep this key private. Never share it.

### Invoice Key
```
Limited access:
- Create invoices only
- Cannot send payments
- Cannot view balance
```

**Security**: Safe to share for receiving payments.

## Receiving Payments

### Create an Invoice

1. Click **"Receive"**
2. Enter amount in sats (or toggle to fiat)
3. Add a memo (optional but recommended)
4. Click **"Create Invoice"**

You'll get:
- **BOLT11 invoice**: Text format for copy/paste
- **QR Code**: For mobile wallets
- **Payment link**: Shareable URL

### Invoice Options

```javascript
// Via API
POST /api/v1/payments
{
  "out": false,          // false = incoming (invoice)
  "amount": 1000,        // Amount in sats
  "memo": "Coffee",      // Description
  "webhook": "https://...", // Notification URL
  "unit": "sat"          // Currency unit
}
```

## Sending Payments

### Pay an Invoice

1. Click **"Send"**
2. Paste the BOLT11 invoice
3. Review the amount and recipient
4. Click **"Pay Invoice"**

### Pay via LNURL

1. Click **"Send"**
2. Paste the LNURL or Lightning Address
3. Enter the amount
4. Confirm payment

## Wallet Settings

### Customize Your Wallet

Click the gear icon to access settings:

- **Name**: Rename your wallet
- **Icon**: Choose an icon
- **Color**: Set a theme color
- **Currency**: Default fiat currency

### Multiple Wallets

Create additional wallets for different purposes:
- Personal spending
- Business income
- Savings
- Testing

Each wallet has independent:
- Balance and history
- API keys
- Extension configurations

## Sharing Wallets

LNbits supports wallet sharing with granular permissions.

### Share with Another User

1. Go to wallet settings
2. Click **"Share Wallet"**
3. Enter the username or email
4. Select permissions:
   - **View**: See balance and transactions
   - **Receive**: Create invoices
   - **Send**: Make payments
5. Send the invitation

### Accept a Shared Wallet

1. Check your notifications
2. Review the sharing invitation
3. Accept or decline
4. Shared wallet appears in your list

## Wallet Security

### Backup Your Access

```bash
# Save these for each wallet:
1. Wallet URL (contains user ID)
2. Admin Key
3. Invoice Key
```

### Secure Your Keys

| Key Type | Share? | Store |
|----------|--------|-------|
| Wallet URL | Never | Password manager |
| Admin Key | Never | Password manager |
| Invoice Key | Carefully | Apps that need receiving only |

### Key Rotation

If you suspect a key is compromised:
1. Note the wallet ID
2. Contact instance admin
3. Generate new keys
4. Update all integrations

## Deleting a Wallet

:::warning
Wallet deletion is permanent. Ensure balance is zero and backup transaction history.
:::

1. Go to wallet settings
2. Click **"Delete Wallet"**
3. Confirm deletion

## Common Tasks

### Check Balance

```bash
curl http://localhost:5000/api/v1/wallet \
  -H "X-Api-Key: YOUR_INVOICE_KEY"
```

### List Transactions

```bash
curl http://localhost:5000/api/v1/payments \
  -H "X-Api-Key: YOUR_ADMIN_KEY"
```

### Create Payment

```bash
curl -X POST http://localhost:5000/api/v1/payments \
  -H "X-Api-Key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"out": true, "bolt11": "lnbc..."}'
```

## Next Steps

Now that you have a wallet:

1. **[Connect a Funding Source](/docs/funding-sources/overview)** - Use real Lightning
2. **[Enable Extensions](/docs/extensions/overview)** - Add TPoS, LNURL, etc.
3. **[Learn the API](/docs/api/overview)** - Build integrations
4. **[Configure Security](/docs/configuration/security)** - Harden your instance
