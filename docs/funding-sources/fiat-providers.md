---
sidebar_position: 8
title: Fiat Providers
description: Accept card and bank payments into LNbits wallets with Stripe, PayPal, Square or Revolut
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Fiat Providers

Fiat providers let an LNbits wallet ask for a fiat payment (card, PayPal, bank) instead of a Lightning invoice. v1.6.2 supports four:

| Provider | Since | Settings prefix |
|---|---|---|
| Stripe (checkout, Terminal readers, subscriptions) | v1.3 | `STRIPE_*` |
| PayPal (orders, subscriptions) | v1.4.0 | `PAYPAL_*` |
| Square (payment links, subscriptions) | v1.5.5 | `SQUARE_*` |
| Revolut Merchant (orders, subscriptions) | v1.5.5 | `REVOLUT_*` |

A fiat provider is not a funding source: it works next to whichever Lightning backend you run.

## How it works {#how-it-works}

1. A wallet creates a payment request with a fiat unit and a provider, for example `POST /api/v1/payments` with `"out": false`, `"unit": "EUR"`, `"amount": 10` and `"fiat_provider": "stripe"`. The unit can't be `sat`.
2. LNbits converts the amount to sats at the current rate, checks the provider's limits, and creates an **internal** invoice for that many sats. It then asks the provider for a payment page or request tied to that invoice.
3. The payer pays the provider. The provider tells LNbits through a webhook to `POST /api/v1/callback/{provider}` (`stripe`, `paypal`, `square` or `revolut`). LNbits checks the webhook signature and marks the invoice paid.
4. On payment, LNbits credits the service fee (if any) to the fee wallet, and debits the sats from the faucet wallet (if one is set).

:::warning Where do the sats come from?
The payer pays fiat into **your** provider account; the wallet receives sats. If you set a **faucet wallet**, the sats are taken from it, and a payment is refused once it can't cover the amount. Without a faucet wallet, the sats are credited without being taken from anywhere, so they're backed only by your fiat income. Either way you, the operator, are selling sats for fiat: make sure your funding source holds them, and check what that means for you legally where you operate.
:::

## Configure a provider {#configuration}

Use the Admin UI: **Settings → Fiat providers** at `/admin`, as the Super User. Like other settings, once saved there they override `.env`.

| Setting | Stripe | PayPal | Square | Revolut |
|---|---|---|---|---|
| Enable | `STRIPE_ENABLED` | `PAYPAL_ENABLED` | `SQUARE_ENABLED` | `REVOLUT_ENABLED` |
| API endpoint (default) | `STRIPE_API_ENDPOINT` (`https://api.stripe.com`) | `PAYPAL_API_ENDPOINT` (`https://api-m.paypal.com`) | `SQUARE_API_ENDPOINT` (`https://connect.squareup.com`) | `REVOLUT_API_ENDPOINT` (`https://merchant.revolut.com`) |
| Credentials | `STRIPE_API_SECRET_KEY` | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID` | `REVOLUT_API_SECRET_KEY` |
| API version (default) | | | `SQUARE_API_VERSION` (`2026-01-22`) | `REVOLUT_API_VERSION` (`2026-04-20`) |
| Webhook verification | `STRIPE_WEBHOOK_SIGNING_SECRET` | `PAYPAL_WEBHOOK_ID` | `SQUARE_WEBHOOK_SIGNATURE_KEY` | `REVOLUT_WEBHOOK_SIGNING_SECRET` |
| Webhook URL | `STRIPE_PAYMENT_WEBHOOK_URL` | `PAYPAL_PAYMENT_WEBHOOK_URL` | `SQUARE_PAYMENT_WEBHOOK_URL` | `REVOLUT_PAYMENT_WEBHOOK_URL` |
| Page after payment | `STRIPE_PAYMENT_SUCCESS_URL` | `PAYPAL_PAYMENT_SUCCESS_URL` | `SQUARE_PAYMENT_SUCCESS_URL` | `REVOLUT_PAYMENT_SUCCESS_URL` |
| Limits | `STRIPE_LIMITS` | `PAYPAL_LIMITS` | `SQUARE_LIMITS` | `REVOLUT_LIMITS` |

The sandbox endpoints of each provider work too; set the endpoint accordingly.

The Admin UI can test a provider's connection (`PUT /api/v1/fiat/check/{provider}`, admin only). For Revolut it can also register the webhook with Revolut and store the signing secret it gets back.

### Webhook {#webhook}

At the provider, create a webhook pointing at:

```
https://your-lnbits-domain/api/v1/callback/stripe
https://your-lnbits-domain/api/v1/callback/paypal
https://your-lnbits-domain/api/v1/callback/square
https://your-lnbits-domain/api/v1/callback/revolut
```

Set the matching `*_PAYMENT_WEBHOOK_URL` to the same address; the defaults are placeholders (`https://your-lnbits-domain-here.com/...`). For Square it must match exactly, because Square signs the URL along with the body.

LNbits rejects a webhook it can't verify: without the signing secret (Stripe, Square, Revolut) or webhook ID (PayPal), payments are never marked paid. LNbits must be reachable from the internet over HTTPS for webhooks to arrive; see [Reverse proxy](/docs/deployment/reverse-proxy).

### Limits {#limits}

Each provider has a limits block (`*_LIMITS`), set in the Admin UI:

| Field | Meaning |
|---|---|
| `allowed_users` | User IDs that may use this provider. Empty means everyone |
| `service_min_amount_sats`, `service_max_amount_sats` | Per-payment bounds, in sats. 0 means no bound |
| `service_fee_percent`, `service_max_fee_sats` | Your service fee: a percentage of the amount, optionally capped |
| `service_fee_wallet_id` | Wallet that receives the fee. Required if you set a fee |
| `service_faucet_wallet_id` | Wallet the sats are taken from (see the warning above) |

## Security {#security}

- The API secret keys can move money in your provider account. They're stored in the LNbits database; protect it and its backups.
- Always set the webhook signing secret or ID. Use a restricted key at the provider if it offers one.
- Use `allowed_users` to limit who can sell sats through your account.

## See also

- [Funding sources overview](/docs/funding-sources/overview)
- [Reverse proxy](/docs/deployment/reverse-proxy)
