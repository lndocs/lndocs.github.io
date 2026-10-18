---
sidebar_position: 6
title: Fake Wallet
description: Use Fake Wallet for testing and development
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Fake Wallet

`FakeWallet` is a testing backend. There is no Lightning node and no Bitcoin behind it: LNbits signs invoices with a made-up node key, and balances are only numbers in the LNbits database. Upstream describes it as minting "accounting units".

:::danger Never on a public instance
On a FakeWallet instance, balances can be created out of nothing (the Super User can credit any wallet), and nothing they "pay" is real. Don't run it where real users could mistake it for a real wallet, and don't connect it to anything that hands out goods or real sats for those balances.
:::

## Configuration {#configuration}

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=FakeWallet
# Optional, both shown with their defaults:
FAKE_WALLET_SECRET=ToTheMoon1
LNBITS_DENOMINATION=sats
```

- `FAKE_WALLET_SECRET` is the seed for the fake node key that signs FakeWallet invoices.
- `LNBITS_DENOMINATION` is the unit name the UI shows. Anything other than `sats` is displayed as a currency with two decimals.

With the Admin UI on (the default), these are set in **Settings → Funding** after the first start; `.env` changes are ignored then. See [Funding sources overview](/docs/funding-sources/overview).

## How it works {#how-it-works}

- **Creating invoices:** LNbits builds a BOLT11 invoice signed with the fake key and remembers its preimage in memory.
- **Paying invoices from the same instance:** works. LNbits settles payments between its own wallets internally, so the sender's balance goes down and the receiver's goes up at once.
- **Paying anything else:** fails with `Only internal invoices can be used!`. FakeWallet can't pay external invoices, and no payment leaves the instance.
- **Funding status:** FakeWallet always reports a balance of 1,000,000,000 msat (1,000,000 sats), whatever the wallets hold.

Wallets, balances and payment history live in the database and survive restarts like on any other backend.

## Funding test wallets {#funding-fake-wallets}

New wallets start at 0. To give one a balance:

- As the Super User, use **Credit / Debit** on the wallet in the UI, or call `PUT /users/api/v1/balance` with your login (bearer token or cookie, not a wallet key) and a body like `{"id": "<wallet_id>", "amount": 100000}` (sats; negative to debit). This works on every backend, not only FakeWallet, so on a real instance it creates unbacked balance.
- Then pay other wallets on the same instance from it.

## Simulating payments with the API {#simulating-payments}

```bash
# Create an invoice in wallet B (its invoice key is enough)
bolt11=$(curl -s -X POST http://localhost:5000/api/v1/payments \
  -H "X-Api-Key: $WALLET_B_INVOICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"out": false, "amount": 1000, "memo": "Test"}' | jq -r .bolt11)

# Pay it from wallet A (needs A's admin key)
curl -X POST http://localhost:5000/api/v1/payments \
  -H "X-Api-Key: $WALLET_A_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"out\": true, \"bolt11\": \"$bolt11\"}"
```

Always send `"out": false` to create an invoice: if you leave `out` out, LNbits treats the request as a payment.

## Use cases {#use-cases}

- **Development:** build and test extensions and integrations without a node.
- **Demos and training:** show the wallet, invoice and payment flow.
- **Automated tests:** LNbits' own test suite runs on FakeWallet. The `Makefile` sets it for `make test-unit`, `make test-api` and `make test-wallets`, and `tests/conftest.py` has the fixtures. See [Testing](/docs/development/testing).

## Differences from real Lightning {#differences}

| | Fake Wallet | Real Lightning |
|---|---|---|
| Speed | Instant | Usually seconds |
| Routing fees | None (internal payments) | Yes |
| External invoices | Fail | Paid over the network |
| Failures | Only bad, expired or external invoices | Routing, liquidity, timeouts |
| Channels | None | Required |

## Switching to a real backend {#switching-to-real-backend}

Select the new funding source in **Settings → Funding**, enter its credentials, save, and restart. See the per-backend pages and [Switching funding sources](/docs/funding-sources/overview).

:::warning
FakeWallet balances don't become real. If you switch an instance that has fake balances to a real node, those balances become claims on real sats that don't exist. Start the real instance with a fresh database, or zero the test wallets first.
:::

## VoidWallet {#voidwallet-alternative}

`VoidWallet` is the default backend of a fresh install. It refuses to create invoices or pay, so every Lightning action fails. LNbits can also switch to it on its own: the watchdog does that when the LNbits balances run too far ahead of the funding source, if you turn the option on.

## See also

- [Funding sources overview](/docs/funding-sources/overview)
- [Development setup](/docs/development/setup)
- [Testing](/docs/development/testing)
