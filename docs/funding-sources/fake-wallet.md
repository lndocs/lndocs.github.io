---
sidebar_position: 6
title: Fake Wallet
description: Use Fake Wallet for testing and development
---

# Fake Wallet

Fake Wallet is a testing backend that simulates Lightning payments without real money.

## What is Fake Wallet?

Fake Wallet is an in-memory Lightning simulation:
- No real Lightning network
- No real Bitcoin
- Instant "payments"
- Perfect for testing

## Configuration

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=FakeWallet

# Optional: Enable fake invoices
FAKE_WALLET_INVOICES=true
```

## How It Works

### Creating Invoices

When you create an invoice:
1. LNbits generates a fake BOLT11
2. Payment hash is stored in memory
3. Invoice is immediately "payable"

### Paying Invoices

When you pay an invoice:
1. If it's an internal (Fake Wallet) invoice, it's marked paid
2. Sender balance decreases
3. Receiver balance increases
4. Instant settlement

### External Invoices

Fake Wallet can "pay" external invoices too:
- Decodes the BOLT11
- Generates fake preimage
- Marks as successful

:::warning
External invoice payments are simulated - no real payment occurs!
:::

## Use Cases

### Development

Test your LNbits integration without:
- Running a Lightning node
- Using real funds
- Network latency

### Demos

Show LNbits features to users:
- Create wallets instantly
- Send/receive "payments"
- Test extensions

### CI/CD Testing

Automated tests without Lightning infrastructure:

```bash
# In test environment
LNBITS_BACKEND_WALLET_CLASS=FakeWallet
pytest tests/
```

### Training

Teach Lightning concepts:
- Wallet creation
- Invoice workflow
- Payment mechanics

## Simulating Payments

### From UI

1. Create invoice in one wallet
2. Copy the BOLT11
3. Pay from another wallet
4. Both balances update

### Via API

```bash
# Create invoice
INVOICE=$(curl -s -X POST http://localhost:5000/api/v1/payments \
  -H "X-Api-Key: $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"out": false, "amount": 1000, "memo": "Test"}' | jq -r .payment_request)

# Pay invoice from another wallet
curl -X POST http://localhost:5000/api/v1/payments \
  -H "X-Api-Key: $OTHER_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"out\": true, \"bolt11\": \"$INVOICE\"}"
```

## Differences from Real Lightning

| Aspect | Fake Wallet | Real Lightning |
|--------|-------------|----------------|
| Speed | Instant | Seconds |
| Fees | None | Variable |
| Failures | Never | Possible |
| Routing | N/A | Required |
| Channels | N/A | Required |

## Funding Fake Wallets

Fake wallets start with 0 balance. To add funds:

### Option 1: Super User Credit

If Admin UI enabled:
1. Go to Admin > Wallets
2. Find the wallet
3. Click Credit/Debit
4. Add desired amount

### Option 2: Topup Extension

Install the Topup extension for self-service funding.

### Option 3: Pay from Funded Wallet

1. Fund one wallet via admin
2. Create invoices from other wallets
3. Pay from funded wallet

## Persistence

Fake Wallet data persists in the database:
- Wallets survive restarts
- Transactions are recorded
- Balances are maintained

Only the "funding source state" is in-memory.

## Switching to Real Backend

When ready for production:

1. Update configuration:
```bash
LNBITS_BACKEND_WALLET_CLASS=LndRestWallet
LND_REST_ENDPOINT=...
```

2. Restart LNbits

3. Fund wallets with real sats

:::warning
Fake Wallet balances don't transfer! You're starting fresh with real Lightning.
:::

## VoidWallet Alternative

VoidWallet is similar but always fails payments:

```bash
LNBITS_BACKEND_WALLET_CLASS=VoidWallet
```

Use VoidWallet when:
- You need a valid backend but no payments
- Testing error handling
- Placeholder during setup

## Testing Scripts

### Test Suite Setup

```python
# conftest.py
import pytest
from lnbits.settings import settings

@pytest.fixture(autouse=True)
def setup_fake_wallet():
    settings.lnbits_backend_wallet_class = "FakeWallet"
```

### Payment Test

```python
async def test_internal_payment():
    # Create wallets
    wallet1 = await create_wallet()
    wallet2 = await create_wallet()

    # Fund wallet1
    await credit_wallet(wallet1.id, 10000)

    # Create invoice
    invoice = await create_invoice(wallet2, 1000)

    # Pay
    payment = await pay_invoice(wallet1, invoice.bolt11)

    # Verify
    assert payment.status == "success"
    assert await get_balance(wallet1) == 9000
    assert await get_balance(wallet2) == 1000
```

## See Also

- [Funding Sources Overview](/docs/funding-sources/overview)
- [Development Setup](/docs/development/setup)
- [Testing](/docs/development/testing)
