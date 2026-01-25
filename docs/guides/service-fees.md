---
sidebar_position: 2
title: Service Fees
description: Configure service fees for your LNbits instance
---

# Service Fees

Charge fees on payments processed through your LNbits instance.

## Configuration

```bash
# Fee percentage (0.5 = 0.5%)
LNBITS_SERVICE_FEE=0.5

# Maximum fee in satoshis
LNBITS_SERVICE_FEE_MAX=1000

# Wallet to collect fees
LNBITS_SERVICE_FEE_WALLET=wallet_id_here

# Skip fee on internal transfers
LNBITS_SERVICE_FEE_IGNORE_INTERNAL=true
```

## How It Works

When a payment is made:
1. Fee is calculated as percentage of amount
2. Capped at maximum fee
3. Deducted from payment
4. Sent to fee collection wallet

## Example

```
Payment: 10,000 sats
Fee rate: 0.5%
Calculated fee: 50 sats
Final payment: 9,950 sats to recipient
Fee wallet: +50 sats
```

## Fee Wallet Setup

1. Create a dedicated wallet
2. Copy the wallet ID
3. Set `LNBITS_SERVICE_FEE_WALLET`
4. Restart LNbits

## See Also

- [Environment Variables](/docs/configuration/environment)
