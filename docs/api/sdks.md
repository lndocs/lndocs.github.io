---
sidebar_position: 8
title: SDKs & Libraries
description: Official and community SDKs for integrating with LNbits
---

# SDKs & Libraries

Client libraries for integrating LNbits into your applications.

## JavaScript / TypeScript

### lnbits (npm)

The official JavaScript SDK for LNbits.

**Repository**: [MiguelMedeiros/lnbits-js](https://github.com/MiguelMedeiros/lnbits-js)

#### Installation

```bash
npm install lnbits
# or
yarn add lnbits
```

#### Configuration

```javascript
import LNBits from 'lnbits';

const { wallet, userManager, paywall, withdraw, paylink, tpos } = LNBits({
  adminKey: 'd4a35826...',
  invoiceReadKey: 'a2bc6f0e...',
  endpoint: 'https://your-lnbits.com',
});
```

#### Wallet Operations

```javascript
// Get wallet details
const walletDetails = await wallet.walletDetails();
console.log(`Balance: ${walletDetails.balance} sats`);

// Create invoice
const invoice = await wallet.createInvoice({
  amount: 1000,
  memo: 'Payment for services',
  out: false,
});
console.log(`Invoice: ${invoice.payment_request}`);

// Pay invoice
const payment = await wallet.payInvoice({
  bolt11: 'lnbc1000n1p...',
  out: true,
});

// Check invoice status
const status = await wallet.checkInvoice({
  payment_hash: invoice.payment_hash,
});
console.log(`Paid: ${status.paid}`);
```

#### User Management

```javascript
// Get all users
const users = await userManager.getUsers();

// Get user's wallets
const wallets = await userManager.getWallets({ user_id: 'user123' });

// Get transactions
const transactions = await userManager.getTransactions({
  wallet_id: 'wallet456',
});

// Create user with wallet
const newUser = await userManager.createUser({
  admin_id: 'admin123',
  user_name: 'john',
  wallet_name: 'Main Wallet',
});

// Enable extension for user
await userManager.activeExtension({
  userid: 'user123',
  extension: 'tpos',
  active: true,
});
```

#### Paywall

```javascript
// Create paywall
const paywall = await paywall.createPaywall({
  amount: 100,
  description: 'Premium content access',
  memo: 'Unlock article',
  url: 'https://example.com/premium',
});

// Generate paywall invoice
const invoice = await paywall.createInvoice({
  paywall_id: paywall.id,
});

// Check if paid
const access = await paywall.checkInvoice({
  paywall_id: paywall.id,
  payment_hash: invoice.payment_hash,
});
```

#### Withdraw Links

```javascript
// Create withdraw link
const link = await withdraw.createWithdrawLink({
  title: 'Faucet',
  min_withdrawable: 100,
  max_withdrawable: 1000,
  uses: 10,
  wait_time: 60,
});

// Get all links
const links = await withdraw.getWithdrawLinks();

// Update link
await withdraw.updateWithdrawLink({
  withdraw_id: link.id,
  title: 'Updated Faucet',
  max_withdrawable: 2000,
});

// Delete link
await withdraw.deleteWithdrawLink({ withdraw_id: link.id });
```

#### TPoS (Point of Sale)

```javascript
// Create terminal
const terminal = await tpos.createTpos({
  currency: 'USD',
  name: 'Coffee Shop',
});

// Get terminals
const terminals = await tpos.getTposs();

// Delete terminal
await tpos.deleteTpos({ tpos_id: terminal.id });
```

---

## Python

### pylnbits

Community-maintained Python SDK with async support.

**Repository**: [lightningames/pylnbits](https://github.com/lightningames/pylnbits)

#### Installation

```bash
pip install pylnbits
```

#### Usage

```python
import asyncio
from pylnbits import LNBits

async def main():
    lnbits = LNBits(
        url="https://your-lnbits.com",
        admin_key="d4a35826...",
        invoice_key="a2bc6f0e..."
    )

    # Get wallet balance
    wallet = await lnbits.get_wallet()
    print(f"Balance: {wallet['balance']} msats")

    # Create invoice
    invoice = await lnbits.create_invoice(
        amount=1000,
        memo="Test payment"
    )
    print(f"Invoice: {invoice['payment_request']}")

    # Pay invoice
    payment = await lnbits.pay_invoice(
        bolt11="lnbc1000n1p..."
    )

    # Check payment
    status = await lnbits.check_invoice(
        payment_hash=invoice['payment_hash']
    )

asyncio.run(main())
```

---

## cURL / REST API

For languages without an SDK, use the REST API directly.

### Authentication

```bash
# Admin key (full access)
curl -H "X-Api-Key: YOUR_ADMIN_KEY" \
  https://your-lnbits.com/api/v1/wallet

# Invoice key (read + create invoices only)
curl -H "X-Api-Key: YOUR_INVOICE_KEY" \
  https://your-lnbits.com/api/v1/wallet
```

### Create Invoice

```bash
curl -X POST \
  -H "X-Api-Key: YOUR_INVOICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"out": false, "amount": 1000, "memo": "Test"}' \
  https://your-lnbits.com/api/v1/payments
```

### Pay Invoice

```bash
curl -X POST \
  -H "X-Api-Key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"out": true, "bolt11": "lnbc1000n1p..."}' \
  https://your-lnbits.com/api/v1/payments
```

### Check Payment

```bash
curl -H "X-Api-Key: YOUR_INVOICE_KEY" \
  https://your-lnbits.com/api/v1/payments/PAYMENT_HASH
```

---

## WebSocket Payments

Real-time payment notifications via WebSocket.

### JavaScript

```javascript
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(`${protocol}//your-lnbits.com/api/v1/ws/${walletId}`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.payment) {
    console.log('Payment received:', data.payment);
  }
};
```

### Python

```python
import asyncio
import websockets

async def listen_payments(wallet_id):
    uri = f"wss://your-lnbits.com/api/v1/ws/{wallet_id}"
    async with websockets.connect(uri) as ws:
        async for message in ws:
            print(f"Payment: {message}")

asyncio.run(listen_payments("your-wallet-id"))
```

---

## Webhooks

Configure webhooks for payment notifications.

### Creating Invoice with Webhook

```bash
curl -X POST \
  -H "X-Api-Key: YOUR_INVOICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "out": false,
    "amount": 1000,
    "memo": "With webhook",
    "webhook": "https://your-server.com/webhook"
  }' \
  https://your-lnbits.com/api/v1/payments
```

### Webhook Payload

```json
{
  "payment_hash": "abc123...",
  "payment_request": "lnbc1000n1p...",
  "amount": 1000,
  "memo": "With webhook",
  "status": "success",
  "checking_id": "abc123..."
}
```

### Webhook Handler (Node.js)

```javascript
app.post('/webhook', (req, res) => {
  const { payment_hash, status, amount } = req.body;

  if (status === 'success') {
    console.log(`Payment ${payment_hash} received: ${amount} sats`);
    // Fulfill order, grant access, etc.
  }

  res.sendStatus(200);
});
```

---

## API Reference

For complete API documentation, see:
- [Interactive Swagger Docs](https://demo.lnbits.com/docs)
- [API Overview](/docs/api/overview)
- [Authentication](/docs/api/authentication)

## See Also

- [Payments API](/docs/api/payments)
- [Webhooks](/docs/api/webhooks)
- [Resources](/docs/resources) - More community libraries
