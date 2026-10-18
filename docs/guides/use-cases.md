---
sidebar_position: 1
title: Use Cases
description: What people build with LNbits, which extension does each job, and a minimal API integration
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Use Cases

Most LNbits use cases are an extension on top of a wallet. This page maps common jobs to the extension that does them, by the ID you'll see under **Extensions** on your instance. Setup guides for each extension are in the [official extension docs](https://docs.lnbits.com/extensions/).

:::caution Python extensions are not sandboxed
Python extensions run inside the LNbits process, with full access to its database and every wallet's funds. Install only extensions you trust. WASM extensions (since v1.6.0) run sandboxed, with only the permissions you grant at install time.
:::

:::caution Holding other people's money
If anyone but you has a wallet on your instance, you are their custodian: you control the node and can move their funds. Read [Security](/docs/configuration/security) first.
:::

## Which extension for which job {#extension-map}

<a id="zap-integration"></a>

| Job | Extension (ID) | Notes |
|-----|----------------|-------|
| Shop or café till | TPoS (`tpos`) | A point-of-sale screen on a phone or tablet. |
| Hardware PoS terminal | LNPoS (`lnpos`) | ESP32 terminal that works offline. |
| Invoices and payment links for an online shop | SatsPay (`satspay`) | Charges with an expiry, on-chain or Lightning. |
| WooCommerce | [WordPress plugin](https://wordpress.org/plugins/lnbits-bitcoin-onchain-and-lightning-payment-gateway/) | Talks to your instance's API. |
| A reusable pay QR or Lightning Address | LNURLp (`lnurlp`) | Since v1.6.0 every wallet also has a [core Lightning Address](/docs/guides/lightning-addresses), no extension needed. |
| Vouchers, faucets, printed QR gifts | Withdraw (`withdraw`) | LNURL-withdraw links that any Lightning wallet can claim. |
| Accounts for a group | User Manager (`usermanager`) | Creates users and wallets through the API. See also [Shared Wallets](/docs/guides/shared-wallets). |
| Splitting incoming payments | Split Payments (`splitpayments`) | Forwards a percentage of each payment to other wallets. |
| Sweeping funds out automatically | Scrub (`scrub`) | Forwards incoming payments to an LNURL-pay address. |
| Lightning to on-chain | Boltz (`boltz`) | Submarine swaps. |
| Paywalled links and files | Paywall (`paywall`) | |
| Tips on a livestream | Streamer Copilot (`copilot`), Stream Alerts (`streamalerts`) | Overlays for OBS. |
| NFC tap-to-pay cards | Bolt Cards (`boltcards`) | NXP NTAG 424 DNA cards. |
| Vending machines and pay-to-switch devices | Bitcoin Switch (`bitcoinswitch`), LNURL Device (`lnurldevice`) | ESP32 plus a relay. |
| ATM | FOSSA (`fossa`) | [lnbits/fossa](https://github.com/lnbits/fossa) has the hardware build. |
| Nostr marketplace | Nostr Market (`nostrmarket`) | |
| Selling NIP-05 identities | Nostr NIP-5 (`nostrnip5`) | Needs your own domain. |
| Nostr Wallet Connect | NWC Service Provider (`nwcprovider`) | Lets Nostr clients pay from an LNbits wallet. |
| Mobile wallet apps | LNDhub (`lndhub`) | Import a wallet into apps such as BlueWallet or Zeus. The admin QR gives full spending access. |

## Classrooms and workshops {#education}

Run a separate instance with `FakeWallet` as the funding source. It issues invoices that look real but have no value. It can pay only invoices it created itself, so students can pay each other but can't pay out to real wallets. The Super User funds student wallets with the **+** button next to a wallet's balance.

For a workshop with real sats, hand out Withdraw vouchers instead, and sweep what's left afterwards.

## Your app as the backend {#api-backend}

Create an invoice with the wallet's **invoice key**, then confirm it is paid. `"out": false` is required: if you leave out `out`, the request tries to **pay** instead.

```python
import httpx

LNBITS = "https://your-lnbits.example"
invoice_key = "..."  # the wallet's invoice key, never the admin key

invoice = httpx.post(
    f"{LNBITS}/api/v1/payments",
    headers={"X-Api-Key": invoice_key},
    json={"out": False, "amount": 1000, "memo": "Order 42",
          "webhook": "https://your-app.example/webhook"},
).json()  # a Payment, with "payment_hash" and "bolt11" (amount is in sats here)

status = httpx.get(
    f"{LNBITS}/api/v1/payments/{invoice['payment_hash']}",
    headers={"X-Api-Key": invoice_key},
).json()  # {"paid": true/false, "status": ..., "details": {...}}
```

When the invoice is paid, LNbits POSTs the Payment to your `webhook` once, with no retry. In v1.6.2 the body is the Payment JSON-encoded **twice** (a JSON string that contains JSON), and amounts in it are in msat:

```python
import json
from fastapi import FastAPI, Request

app = FastAPI()

@app.post("/webhook")
async def payment_webhook(request: Request):
    data = await request.json()
    if isinstance(data, str):  # v1.6.2 double-encodes the body
        data = json.loads(data)
    if data["status"] == "success":
        # Confirm with GET /api/v1/payments/{payment_hash} before you ship,
        # and make this idempotent: the same payment can arrive twice.
        await fulfill_order(data["payment_hash"])  # your own function
```

The webhook URL must be a public host name: LAN addresses and bare IPs are refused by default. See [Troubleshooting](/docs/guides/troubleshooting) for the log lines. To develop without real funds, run a local instance with `FakeWallet`. With the Admin UI on (the default), set the funding source in `/admin`, because the database overrides `.env` after the first start.

## See Also

- [Extensions Overview](/docs/extensions/overview)
- [API Reference](/docs/api/overview)
- [Resources](/docs/resources): community guides and hardware projects
