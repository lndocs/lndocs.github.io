---
sidebar_position: 7
title: Webhooks
description: How LNbits payment webhooks really behave, how to handle them safely, and the callback URL rules
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Webhooks

LNbits can call a URL of yours when an invoice is paid. Webhooks are a **notification**, not a guarantee:

- They are sent **once**, with no retries.
- They carry **no signature**, so anyone can POST the same thing to your endpoint.

Use a webhook as a prompt to check the payment, then confirm it through the API before you fulfil anything.

## Setting up a webhook {#setting-up-webhooks}

### Per-invoice webhook {#per-invoice-webhook}

Add `webhook` when you create the invoice:

```bash
curl -X POST https://lnbits.example.com/api/v1/payments \
  -H "X-Api-Key: $INVOICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "out": false,
    "amount": 1000,
    "memo": "Order #1234",
    "extra": {"order_id": "1234"},
    "webhook": "https://shop.example.com/lnbits/webhook"
  }'
```

The URL is checked against the [callback URL rules](#url-rules) at this point. A URL that fails them makes the request fail with 400.

There is no wallet-wide or global webhook in core. Each invoice carries its own.

## When it is sent {#when-it-is-sent}

When the invoice is paid, whether from outside or from another wallet on the same LNbits, LNbits sends **one** POST request to the URL:

- Timeout: **40 seconds**.
- Redirects are **not followed**.
- **No retries.** If your server is down, slow or returns an error, the webhook is lost.

The result is stored on the payment as `webhook_status`. It holds the HTTP status code as a string (for example `"200"` or `"500"`), or `"-1"` if the URL was refused or the connection failed.

## Request format {#webhook-payload}

### Headers {#webhook-headers}

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `User-Agent` | `LNbits/<version>`, for example `LNbits/1.6.2` |
| `Host` | The host of your webhook URL |

There is no signature header and no LNbits-specific header. Don't try to authenticate the sender from headers.

### Body {#body}

The body is the **full payment object**, but **JSON-encoded twice**. LNbits serialises the payment to a JSON string and then sends that string as the JSON body. On the wire it looks like this:

```text
"{\"checking_id\": \"a3f1...\", \"payment_hash\": \"a3f1...\", \"wallet_id\": \"8b2f...\", \"amount\": 1000000, \"fee\": 0, \"status\": \"success\", \"memo\": \"Order #1234\", \"extra\": {\"order_id\": \"1234\"}, \"webhook\": \"https://shop.example.com/lnbits/webhook\", ...}"
```

So a framework's JSON parser (`request.get_json()` in Flask, `express.json()` in Express) gives you a **string**, not an object. Parse it a second time. The examples below accept both forms, in case this changes in a later release.

Once decoded, the fields are those of the payment object in the [Payments API](/docs/api/payments). The ones you usually need:

| Field | Notes |
|---|---|
| `payment_hash` | Use this to confirm the payment |
| `wallet_id` | The receiving wallet |
| `amount` | **msat**. 1000 sats is `1000000` |
| `status` | `success` |
| `memo`, `extra`, `external_id`, `labels` | Whatever you set when creating the invoice |
| `tag`, `extension` | Set by extensions that created the invoice. These are top-level fields, not inside `extra` |

## Handling webhooks {#handling-webhooks}

The safe pattern is:

1. Parse the body (twice) and take `payment_hash`.
2. Call `GET /api/v1/payments/{payment_hash}` with **your** invoice key and check `paid`, the amount and the wallet.
3. Fulfil the order once. Ignore repeats.
4. Return 2xx quickly. Do slow work after you respond. LNbits waits at most 40 seconds.

### Basic handler (Python/Flask) {#basic-handler-pythonflask}

```python
import json
import os

import httpx
from flask import Flask, request

app = Flask(__name__)
LNBITS = "https://lnbits.example.com"
INVOICE_KEY = os.environ["INVOICE_KEY"]
fulfilled: set[str] = set()  # use your database in production


def parse_body() -> dict:
    data = request.get_json(force=True, silent=True)
    if isinstance(data, str):  # LNbits double-encodes the body
        data = json.loads(data)
    return data or {}


@app.post("/lnbits/webhook")
def lnbits_webhook():
    payment_hash = parse_body().get("payment_hash")
    if not payment_hash or payment_hash in fulfilled:
        return "", 200

    # Never trust the webhook body. Ask LNbits.
    r = httpx.get(
        f"{LNBITS}/api/v1/payments/{payment_hash}",
        headers={"X-Api-Key": INVOICE_KEY},
        timeout=10,
    )
    if r.status_code != 200:
        return "", 200
    status = r.json()
    details = status.get("details")
    if not status.get("paid") or not details:
        return "", 200  # not paid, or not a payment of our wallet

    fulfilled.add(payment_hash)
    order_id = details["extra"].get("order_id")
    print(f"Order {order_id} paid: {details['amount'] // 1000} sats")
    return "", 200
```

`details` is only present when the key belongs to the wallet that owns the payment. That makes it a check that the payment is yours.

### Express.js handler {#expressjs-handler}

```javascript
import express from 'express'

const app = express()
const LNBITS = 'https://lnbits.example.com'

app.post('/lnbits/webhook', express.text({type: '*/*'}), async (req, res) => {
  let body = JSON.parse(req.body || '{}')
  if (typeof body === 'string') body = JSON.parse(body) // double-encoded

  res.sendStatus(200) // answer first, then verify

  const r = await fetch(`${LNBITS}/api/v1/payments/${body.payment_hash}`, {
    headers: {'X-Api-Key': process.env.INVOICE_KEY}
  })
  const status = await r.json()
  if (!status.paid || !status.details) return
  // fulfil once, keyed by body.payment_hash
})

app.listen(3000)
```

## Security considerations {#security-considerations}

### Verify the payment, not the sender {#verify-source}

Webhook requests carry no secret, so you can't tell a real one from a forged one by looking at it. The defence is to treat the webhook only as a hint and **always confirm through the API**, as the handlers above do. A forged webhook then achieves nothing.

You can also put a hard-to-guess token in the webhook URL path to cut down on noise. That doesn't replace the API check.

### Verify the payment {#verify-payment}

When you confirm with `GET /api/v1/payments/{payment_hash}`:

- Send your wallet key in the `X-Api-Key` header, and require `details` in the response. Without it, the payment isn't in your wallet.
- Check `paid` is `true`.
- Check `details.amount` (msat) matches what you expected for the order.

The same rule applies to [WebSocket](/docs/api/overview) messages. The WebSocket push routes are unauthenticated, so their messages can be forged too.

### Idempotency {#idempotency}

Webhooks are sent at most once per payment, but your own retries, replays or forged requests can still deliver the same `payment_hash` twice. Record fulfilled payment hashes in your database and skip repeats.

## No retries: catching missed webhooks {#retry-logic}

Because there is a single attempt, run a periodic reconciliation for anything important. For example, every few minutes list recent successful incoming payments and fulfil any you missed:

```bash
curl -g "https://lnbits.example.com/api/v1/payments?status=success&amount[gt]=0&sortby=time&direction=desc&limit=50" \
  -H "X-Api-Key: $INVOICE_KEY"
```

## Webhook status {#webhook-status}

To see what happened to a webhook, read the payment with the owning wallet's key:

```bash
curl https://lnbits.example.com/api/v1/payments/$PAYMENT_HASH \
  -H "X-Api-Key: $INVOICE_KEY"
```

```json
{
  "paid": true,
  "preimage": "0f3a...",
  "details": {
    "payment_hash": "...",
    "webhook": "https://shop.example.com/lnbits/webhook",
    "webhook_status": "200",
    "...": "..."
  }
}
```

`webhook_status` is `null` before an attempt, an HTTP status code as a string after one, or `"-1"` if the URL was refused or unreachable. The LNbits log shows the reason (`Invalid webhook URL: ...` or `Could not send webhook.`).

## URL rules and private networks {#url-rules}

Two security settings decide which webhook URLs LNbits will call. With the Admin UI on (the default), they live in the database after first start and override `.env`. Change them in the Admin UI at `/admin`.

**`LNBITS_CALLBACK_URL_RULES`** is a list of regular expressions. The URL's origin (scheme, host and port) must fully match one of them. The default is:

```text
https?://([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(:\d+)?
```

That allows `http` or `https` with a dotted hostname ending in letters, such as `shop.example.com`. By default it **refuses** IP addresses (`http://192.168.1.10/...`), single-label hosts (`http://localhost`, `http://myserver`) and URLs with a username or password. An empty list allows any `http(s)` URL.

**`LNBITS_CALLBACK_ALLOW_PRIVATE_IPS`** defaults to `false`. LNbits resolves the hostname when it sends the webhook and refuses it if any address is private, loopback or otherwise non-global. Set it to `true` only if your webhook receiver really is on your own network.

These rules protect your LNbits server from being used to reach internal services (SSRF). Loosen them only as far as you need.

## Extension webhooks {#extension-webhooks}

Some extensions have their own webhook settings for their own events, and their own payload formats. They are documented with each extension on [docs.lnbits.com](https://docs.lnbits.com). Core webhook URLs, including ones that extensions set on the invoices they create, follow the rules on this page.

## Testing webhooks {#testing-webhooks}

### Local development {#local-development}

A receiver at `http://localhost:5000` or on a LAN IP is refused by the default rules. You can:

- Expose your receiver through a tunnel that gives it a public hostname, and use that URL.
- Or, on a development instance only, add a rule for your local origin to `LNBITS_CALLBACK_URL_RULES` and set `LNBITS_CALLBACK_ALLOW_PRIVATE_IPS=true`.

### Webhook tester {#webhook-tester}

A public request-inspection service with a dotted hostname works as a webhook URL. It lets you see the exact body LNbits sends, including the double encoding. Don't put real customer data through a third-party tester.

## Troubleshooting {#troubleshooting}

### Webhook not received {#webhook-not-received}

1. Check `details.webhook_status` on the payment (see [Webhook status](#webhook-status)).
2. `"-1"` means the URL was refused by the URL rules or the private-IP check, or the connection failed. Check the LNbits log.
3. A status code means LNbits reached your server. Look at your server's logs for that status.
4. `null` means no attempt has been made yet. The invoice may not be paid.
5. Remember that redirects are not followed. Use the final URL, including `https://` if your site redirects to it.

### Handler sees a string instead of an object {#handler-sees-a-string}

This is the double encoding. Parse the body again. See [Body](#body).

### Duplicate fulfilment {#duplicate-webhooks}

Key fulfilment on `payment_hash` and store it. See [Idempotency](#idempotency).

## See also {#see-also}

- [Payments API](/docs/api/payments)
- [API Overview](/docs/api/overview)
- [Security configuration](/docs/configuration/security)
