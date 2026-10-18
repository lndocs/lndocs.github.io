---
sidebar_position: 2
title: Service Fees
description: Charge a service fee on outgoing payments from your LNbits instance
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Service Fees

An LNbits operator can charge a percentage fee on **outgoing** payments. The fee is paid by the **sender**, on top of the amount being paid, and credited to a wallet you choose. Incoming payments are never charged.

## Configuration {#configuration}

| Setting | Default | Meaning |
|---------|---------|---------|
| `LNBITS_SERVICE_FEE` | `0` | Fee as a percentage of the payment amount (`0.5` = 0.5%). |
| `LNBITS_SERVICE_FEE_MAX` | `0` | Maximum fee per payment, in **sats**. `0` means no cap. |
| `LNBITS_SERVICE_FEE_WALLET` | empty | ID of the wallet that collects fees. **No fee is charged at all unless this is set.** |
| `LNBITS_SERVICE_FEE_IGNORE_INTERNAL` | `true` | Don't charge for payments between wallets on the same instance. |

```bash
LNBITS_SERVICE_FEE=0.5
LNBITS_SERVICE_FEE_MAX=1000
LNBITS_SERVICE_FEE_WALLET=   # the fee wallet's ID
LNBITS_SERVICE_FEE_IGNORE_INTERNAL=true
```

:::info Admin UI overrides `.env`
The Admin UI is on by default (`LNBITS_ADMIN_UI=true`). After the first start these settings are stored in the database and **override `.env`**. Change them in the Admin UI (`/admin`) instead of editing `.env` and restarting.
:::

## How it works {#how-it-works}

When a wallet pays an invoice:

1. LNbits calculates the fee as `amount × LNBITS_SERVICE_FEE / 100`, capped at `LNBITS_SERVICE_FEE_MAX` sats when the cap is above 0.
2. The sender needs enough balance for the amount **plus** the routing fee reserve **plus** the service fee.
3. The recipient receives the full invoice amount.
4. The sender's payment row records the routing fee plus the service fee in its `fee` column.
5. The fee wallet gets a separate, already-settled incoming payment of the service fee, with the checking ID `service_fee_<payment_hash>`.

Internal payments (between wallets on this instance) are skipped while `LNBITS_SERVICE_FEE_IGNORE_INTERNAL` is true. Set it to `false` to charge them as well.

:::caution Known v1.6.2 behaviour
In v1.6.2 the fee wallet is credited as soon as the payment is sent, even if the payment is still pending. If the payment later fails, the fee credit stays. On the `dev` branch, [#4193](https://github.com/lnbits/lnbits/pull/4193) credits the fee only after the payment succeeds; that fix is not in a release yet.
:::

## Example {#example}

```
Invoice:            10,000 sats
Fee rate:           0.5%
Service fee:        50 sats
Recipient receives: 10,000 sats
Sender pays:        10,050 sats + routing fee
Fee wallet:         +50 sats
```

## Fee Wallet Setup {#fee-wallet-setup}

1. Create a dedicated wallet for fees, owned by an admin account.
2. Copy its wallet ID.
3. Set it as the service fee wallet in the Admin UI (or `LNBITS_SERVICE_FEE_WALLET` before the first start).
4. Set the fee rate and cap.

The same wallet also receives payments for wallet Lightning Addresses when you charge for them. See [Lightning Addresses](/docs/guides/lightning-addresses).

## Fiat providers {#fiat-providers}

Fiat payment providers (Stripe, PayPal, Square, Revolut) have their own, separate service fee, fee wallet and cap in each provider's limits. Set them in the provider's section of the Admin UI.

## See Also

- [Environment Variables](/docs/configuration/environment)
- [Ledger](/docs/architecture/ledger)
