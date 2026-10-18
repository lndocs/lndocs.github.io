---
sidebar_position: 6
title: LNURL API
description: Resolve LNURLs, pay LNURL-pay links and Lightning addresses, withdraw, LNURL-auth and wallet Lightning addresses in LNbits core
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# LNURL API

LNbits core is an LNURL **client**. It can resolve LNURLs, pay LNURL-pay links and Lightning addresses, pull funds from LNURL-withdraw links, and log in to sites with LNURL-auth. Since v1.6.0, core can also **serve** Lightning addresses for wallets.

Creating your own LNURL-pay or LNURL-withdraw **links** is done by extensions, mainly **Pay Links** (`lnurlp`) and **Withdraw Links** (`withdraw`). Their routes live under `/lnurlp/api/v1/...` and `/withdraw/api/v1/...`, and take wallet keys. They are not part of core. Once an extension is installed, its routes and models appear in Swagger at `/docs` on your instance. Extension guides are on [docs.lnbits.com](https://docs.lnbits.com).

## LNURL overview {#lnurl-overview}

| Spec | What LNbits core does | Route |
|---|---|---|
| LNURL-pay (LUD-06), Lightning address (LUD-16) | Pays them | `POST /api/v1/payments/lnurl` |
| LNURL-withdraw (LUD-03) | Pulls into a new invoice | `lnurl_withdraw` field of `POST /api/v1/payments` |
| LNURL-auth (LUD-04) | Logs in as the wallet | `POST /api/v1/lnurlauth` |
| Any of the above | Resolves and validates | `POST /api/v1/lnurlscan` |
| Lightning address server | Serves wallet addresses | `GET /.well-known/lnurlp/{username}` |

## Decoding an LNURL {#decoding-lnurl}

`POST /api/v1/lnurlscan` takes a bech32 LNURL or a Lightning address. LNbits fetches it and returns the service's response. It needs an invoice or admin key.

```bash
curl -X POST https://lnbits.example.com/api/v1/lnurlscan \
  -H "X-Api-Key: $INVOICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"lnurl": "alice@example.com"}'
```

For a pay link the response is the LUD-06 pay response: `tag: "payRequest"`, `callback`, `minSendable` and `maxSendable` (msat), `metadata` and `commentAllowed`. Withdraw links return `tag: "withdrawRequest"` with `k1`, `minWithdrawable` and `maxWithdrawable`. Auth links return `tag: "login"` with `k1`. If the service returns an error or can't be reached, you get 400 with the reason in `detail`.

`GET /api/v1/lnurlscan/{code}` is the older, deprecated form of the same call.

To decode a bech32 LNURL into its URL without fetching it, use `POST /api/v1/payments/decode` (no key needed, see [Payments API](/docs/api/payments)).

## Paying an LNURL or Lightning address {#lnurl-via-core-api}

Use `POST /api/v1/payments/lnurl` with the **admin key**. `POST /api/v1/payments` does not take an LNURL. Sending one there with the admin key returns 400 `Missing BOLT11 invoice`.

### Pay to a Lightning address {#pay-to-lightning-address}

```bash
curl -X POST https://lnbits.example.com/api/v1/payments/lnurl \
  -H "X-Api-Key: $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"lnurl": "alice@example.com", "amount": 100000, "comment": "Thanks!"}'
```

### Pay to an LNURL {#pay-to-lnurl}

```bash
curl -X POST https://lnbits.example.com/api/v1/payments/lnurl \
  -H "X-Api-Key: $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"lnurl": "LNURL1DP68GURN8GHJ7...", "amount": 100000}'
```

| Field | Notes |
|---|---|
| `lnurl` | A bech32 LNURL or a Lightning address. Send this or `res` |
| `res` | A pay response you already got from `POST /api/v1/lnurlscan`. This saves a round trip |
| `amount` | **Millisatoshis**: `100000` is 100 sats. With a fiat `unit`, send the fiat amount times 1000 (for example `2500` for 2.50) |
| `unit` | Optional. `sat`, or a fiat code that is converted at the current rate |
| `comment` | Optional. Sent to the recipient if the link allows comments |

LNbits fetches the invoice from the service's callback and pays it. The response is the payment object (see [Payments API](/docs/api/payments)). Payment failures return 520. Service errors (amount out of range, comment too long, unreachable) return 400 with the service's reason.

If the service marks the link as not disposable (`"disposable": false`), LNbits also saves it in the wallet's stored pay links.

## LNURL-withdraw {#lnurl-withdraw}

To pull funds from someone else's withdraw link into your wallet, first resolve the link with `POST /api/v1/lnurlscan`. Then create an invoice and pass the withdraw response in `lnurl_withdraw`:

```bash
curl -X POST https://lnbits.example.com/api/v1/payments \
  -H "X-Api-Key: $INVOICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"out": false, "amount": 100, "memo": "Withdraw", "lnurl_withdraw": <the withdrawRequest object from lnurlscan>}'
```

LNbits creates the invoice and sends it to the link's callback. If the service rejects it, the returned payment has `status: "failed"` and the reason in `extra.lnurl_response`. Otherwise wait for the payment to arrive as usual.

To create withdraw links that others can pull from, use the Withdraw Links extension.

## LNURL-auth {#lnurl-auth}

`POST /api/v1/lnurlauth` logs in to an LNURL-auth site as your wallet. LNbits derives the linking key from the wallet's admin key, so each wallet gets a stable identity per site. Resolve the `lnurl` with `POST /api/v1/lnurlscan` first, then send the returned `login` object (`tag`, `callback`, `k1`) as the body, with the admin key:

```bash
curl -X POST https://lnbits.example.com/api/v1/lnurlauth \
  -H "X-Api-Key: $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tag": "login", "callback": "https://site.example/auth?tag=login&k1=...", "k1": "..."}'
```

LNbits does not offer LNURL-auth as a way to log in to LNbits itself. Its login methods are listed in [Authentication](/docs/api/authentication).

## Wallet Lightning addresses {#lightning-address}

Since v1.6.0, core can give a wallet a Lightning address such as `alice@lnbits.example.com` without any extension.

- `GET /.well-known/lnurlp/{username}` answers address lookups.
- The callback is `GET /api/v1/lnurl/wallet/{username}/cb?amount=<msat>`. It accepts 1000 msat or more and an optional `comment`.
- A wallet gets an address through `PATCH /api/v1/wallet` with `lightning_address` (only if `LNBITS_ALLOW_CUSTOM_WALLET_LIGHTNING_ADDRESSES` is on), or from an admin (see [Users API](/docs/api/users)).

### Get address info {#get-address-info}

```bash
curl https://lnbits.example.com/.well-known/lnurlp/alice
```

The answer is a LUD-06 pay response whose `callback` points at `/api/v1/lnurl/wallet/alice/cb`.

Who answers `/.well-known/lnurlp/...` depends on `LNBITS_LN_ADDRESS_MODE`:

| Mode | Behaviour |
|---|---|
| `extension_first` (default) | An extension that claims the path (such as Pay Links) answers first. Otherwise core answers |
| `core_first` | Core wallet addresses only. Extensions don't take part |
| `extension_only` | Only extensions answer. Core returns an error |

With the Admin UI on (the default), these settings are stored in the database after first start and override `.env`. Change them at `/admin`.

## LNURL error handling {#lnurl-error-handling}

LNURL endpoints that LNbits **serves**, such as the Lightning address callback, answer errors in the LUD format with HTTP 200:

```json
{"status": "ERROR", "reason": "Lightning address not found."}
```

The core API routes that **use** LNURLs (`/api/v1/lnurlscan`, `/api/v1/payments/lnurl`, `/api/v1/lnurlauth`) turn a remote error into HTTP 400 with `{"detail": "<reason>"}`.

### Outbound LNURL requests {#outbound-lnurl-requests}

LNbits limits where it will send LNURL requests:

- It only fetches LNURLs over HTTPS from public IP addresses, or `.onion` hosts through Tor. Private and non-global addresses are refused unless `LNBITS_LNURL_ALLOW_PRIVATE_IPS` is true.
- It follows a redirect only if the target origin matches `LNBITS_LNURL_REDIRECT_URL_RULES`, which is empty by default, so redirects are refused.
- LNURL-auth and LNURL-withdraw callbacks must also match `LNBITS_CALLBACK_URL_RULES`. See [Webhooks](/docs/api/webhooks) for how those rules work.

If paying or scanning a service on your own LAN fails with a "private or non-global IP" error, these settings are the reason.

## Code examples {#code-examples}

### Python: pay a Lightning address {#python---pay-to-lightning-address}

```python
import os
import httpx

LNBITS = "https://lnbits.example.com"

def pay_address(address: str, sats: int, comment: str | None = None) -> dict:
    r = httpx.post(
        f"{LNBITS}/api/v1/payments/lnurl",
        headers={"X-Api-Key": os.environ["ADMIN_KEY"]},
        json={"lnurl": address, "amount": sats * 1000, "comment": comment},
        timeout=60,
    )
    r.raise_for_status()
    return r.json()

payment = pay_address("alice@example.com", 100, "Thanks!")
print(payment["status"], payment["payment_hash"])
```

### JavaScript: resolve an LNURL {#javascript---decode-lnurl}

```javascript
const LNBITS = 'https://lnbits.example.com'

const res = await fetch(`${LNBITS}/api/v1/lnurlscan`, {
  method: 'POST',
  headers: {'X-Api-Key': process.env.INVOICE_KEY, 'Content-Type': 'application/json'},
  body: JSON.stringify({lnurl: 'alice@example.com'})
})
const info = await res.json()
console.log(info.tag, info.minSendable / 1000, 'to', info.maxSendable / 1000, 'sats')
```

## See also {#see-also}

- [Payments API](/docs/api/payments)
- [Wallets API](/docs/api/wallets)
- [docs.lnbits.com: LNURL](https://docs.lnbits.com/api/core/lnurl)
- [LNURL specifications (LUDs)](https://github.com/lnurl/luds)
