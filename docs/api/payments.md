---
sidebar_position: 4
title: Payments API
description: Create invoices, pay invoices, list and check payments, and use hold invoices with the LNbits API
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Payments API

All payment routes are under `/api/v1/payments`. They act on the wallet whose key you send in `X-API-KEY`. See [Authentication](/docs/api/authentication).

| Method and path | Credential | Purpose |
|---|---|---|
| `POST /api/v1/payments` | Invoice key to receive, admin key to pay | Create or pay a BOLT11 invoice |
| `GET /api/v1/payments` | Invoice or admin key | List payments |
| `GET /api/v1/payments/paginated` | Invoice or admin key | List payments as a page with a total |
| `GET /api/v1/payments/{payment_hash}` | None (a key adds `details`) | Status of one payment |
| `POST /api/v1/payments/decode` | None | Decode a BOLT11 invoice or LNURL |
| `GET /api/v1/payments/fee-reserve` | None | Fee reserve for an invoice |
| `POST /api/v1/payments/lnurl` | Admin key | Pay an LNURL or Lightning address (see [LNURL API](/docs/api/lnurl)) |
| `POST /api/v1/payments/settle` | Admin key | Settle a hold invoice |
| `POST /api/v1/payments/cancel` | Admin key | Cancel a hold invoice |
| `PUT /api/v1/payments/{payment_hash}/labels` | Admin key | Set labels on a payment |

## Create an invoice {#create-invoice}

```bash
curl -X POST https://lnbits.example.com/api/v1/payments \
  -H "X-Api-Key: $INVOICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"out": false, "amount": 1000, "memo": "Order #1234"}'
```

:::warning `out` defaults to true
If you leave `out` out, LNbits treats the request as a **payment**. With an invoice key you get 403 `Invoice (or Admin) key required.` With an admin key you get 400 `Missing BOLT11 invoice`. Always send `"out": false` when you want to receive.
:::

Request fields:

| Field | Type | Notes |
|---|---|---|
| `out` | boolean | **Must be `false`** to create an invoice. Default `true` |
| `amount` | number | Amount in `unit`. Must be 0 or more |
| `unit` | string | `sat` (default) or a fiat currency code such as `USD` or `EUR`, converted at the current rate. `msat` is not accepted |
| `memo` | string | Invoice description, up to 640 characters. Defaults to the site title |
| `expiry` | integer | Seconds until the invoice expires. Defaults to `LIGHTNING_INVOICE_EXPIRY` (3600) |
| `description_hash` | hex string | Put this hash in the invoice instead of a memo (as LNURL-pay does) |
| `unhashed_description` | hex string | The description to hash. LNbits hashes it for you |
| `webhook` | URL | Called once when the invoice is paid. See [Webhooks](/docs/api/webhooks) |
| `extra` | object | Your own metadata, stored with the payment |
| `labels` | list of strings | Labels for filtering |
| `external_id` | string | Your own reference, up to 256 characters. You can filter on it |
| `payment_hash` | 64 hex characters | Create a [hold invoice](#hold-invoices) for this hash |
| `fiat_provider` | string | Create a fiat payment request through an enabled fiat provider such as Stripe. `unit` must then be a fiat code |

The response is HTTP **201** with the full payment object:

```json
{
  "checking_id": "a3f1...",
  "payment_hash": "a3f1...",
  "wallet_id": "8b2f...",
  "amount": 1000000,
  "fee": 0,
  "bolt11": "lnbc10u1p...",
  "payment_request": "lnbc10u1p...",
  "fiat_provider": null,
  "status": "pending",
  "memo": "Order #1234",
  "expiry": "2026-10-18T13:00:00+00:00",
  "webhook": null,
  "webhook_status": null,
  "preimage": "...",
  "tag": null,
  "extension": null,
  "time": "2026-10-18T12:00:00+00:00",
  "created_at": "2026-10-18T12:00:00+00:00",
  "updated_at": "2026-10-18T12:00:00+00:00",
  "labels": [],
  "extra": {},
  "external_id": null
}
```

`amount` is in **msat**: 1000 sats is `1000000`. Show `bolt11` (or `payment_request`) to the payer, and keep `payment_hash` to check the status.

If the webhook URL fails the server's [callback URL rules](/docs/api/webhooks), creation fails with 400.

## Pay an invoice {#pay-invoice}

Paying needs the **admin key**:

```bash
curl -X POST https://lnbits.example.com/api/v1/payments \
  -H "X-Api-Key: $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"out": true, "bolt11": "lnbc10u1p..."}'
```

| Field | Notes |
|---|---|
| `out` | `true` |
| `bolt11` | The invoice to pay. Required |
| `extra`, `labels`, `external_id` | Optional metadata, as above |

The response is HTTP **201** with the payment object. `amount` is negative (outgoing). `fee` is negative too, in msat: the fee reserve while the payment is pending, then the routing fee plus any service fee once it settles.

Check `status` in the response:

- `success`: paid.
- `pending`: the funding source has not confirmed yet. Poll `GET /api/v1/payments/{payment_hash}` until it changes. Do **not** pay the invoice again.

Errors from the Lightning layer return HTTP **520** with `{"detail": "...", "status": "failed"}` (for example `Insufficient balance.`) or `"status": "pending"` when the outcome is unknown.

## List payments {#list-payments}

```bash
curl "https://lnbits.example.com/api/v1/payments?limit=20&offset=0" \
  -H "X-Api-Key: $INVOICE_KEY"
```

This returns a JSON array of payment objects for the wallet. The invoice key is enough.

Query parameters:

| Parameter | Meaning |
|---|---|
| `limit`, `offset` | Page size and start. **No default limit**, so without `limit` you get every payment |
| `sortby` | `created_at`, `updated_at`, `amount`, `fee`, `memo`, `time`, `tag` or `external_id` |
| `direction` | `asc` or `desc` |
| `search` | Text search over memo, amount, wallet ID, tag, status, time, labels and external ID |
| `status` | `pending`, `success` or `failed` |
| `amount[gt]=0` / `amount[lt]=0` | Incoming only / outgoing only |
| `tag`, `external_id`, `payment_hash`, `checking_id`, `memo`, `labels`, `time` | Filter on these fields, with `=` or an operator such as `[like]`, `[ge]` or `[in]` |

Unknown parameters are ignored, not rejected. The `pending=true`, `incoming=true` and `outgoing=true` parameters from older docs do nothing. Use `status=pending`, `amount[gt]=0` and `amount[lt]=0`.

```bash
# Successful incoming payments with your own reference
curl -g "https://lnbits.example.com/api/v1/payments?status=success&amount[gt]=0&external_id=order-1234" \
  -H "X-Api-Key: $INVOICE_KEY"
```

### Paginated list {#paginated-list}

`GET /api/v1/payments/paginated` takes the same parameters and returns `{"data": [...], "total": n}`. Add `recheck_pending=true` to have LNbits re-check pending payments in the page with the funding source first.

Related read-only routes, also with an invoice key:

- `GET /api/v1/payments/history?group=day` gives balance history points. `group` is `hour`, `day` or `month`.
- `GET /api/v1/payments/stats/breakdown` gives totals for the wallet.

## Check a payment {#get-payment}

```bash
curl https://lnbits.example.com/api/v1/payments/$PAYMENT_HASH
```

This route needs **no key**. It looks the payment up by payment hash or checking ID.

Without a key, or with a key for another wallet:

```json
{"paid": true, "preimage": "0f3a..."}
```

```json
{"paid": false, "preimage": null}
```

A failed payment returns `{"paid": false, "status": "failed"}`.

With the owning wallet's invoice or admin key **in the `X-Api-Key` header** (the query parameter is not read here), the response adds `details` (the full payment object) and, for pending payments, `status`:

```bash
curl https://lnbits.example.com/api/v1/payments/$PAYMENT_HASH \
  -H "X-Api-Key: $INVOICE_KEY"
```

```json
{"paid": false, "status": "pending", "preimage": null, "details": {"payment_hash": "...", "amount": 1000000, "...": "..."}}
```

The preimage is only returned once the payment has succeeded. A pending payment is re-checked with the funding source on each call, so this is also the way to refresh a stuck payment.

This is the route to use to **confirm a payment before you fulfil an order**, whatever told you it was paid (a webhook, a WebSocket message or a redirect).

## Decode an invoice {#decode-invoice}

```bash
curl -X POST https://lnbits.example.com/api/v1/payments/decode \
  -H "Content-Type: application/json" \
  -d '{"data": "lnbc10u1p..."}'
```

No key is needed. The body takes:

- `data`: a BOLT11 invoice or a bech32 LNURL.
- `filter_fields`: optional, a list of field names to return.

For a BOLT11 invoice, the response is the decoded invoice fields. For an LNURL (a string starting with `LNURL`), it returns `{"domain": "<decoded URL>"}`. On failure you get 400 with `{"message": "Failed to decode: ..."}`. The exact field list is in Swagger at `/docs`.

## Fee reserve {#fee-reserve}

`GET /api/v1/payments/fee-reserve?invoice=lnbc...` returns `{"fee_reserve": <msat>}`. That is the amount LNbits holds back for routing fees, plus any service fee, when you pay that invoice. Your balance must cover the amount plus this reserve.

## Hold invoices {#hold-invoices}

A hold invoice locks the payer's funds until you settle or cancel it. Only funding sources that implement hold invoices support them. In v1.6.2 these are LND REST and LND gRPC. Others return 520 `Hold invoices are not supported by the funding source.`

1. Generate a 32-byte preimage yourself and compute its SHA-256 hash.
2. Create the invoice with `"out": false` and `"payment_hash": "<hash>"`, using the invoice or admin key.
3. When the payer has paid, the payment stays pending. Settle it with the admin key:

   ```bash
   curl -X POST https://lnbits.example.com/api/v1/payments/settle \
     -H "X-Api-Key: $ADMIN_KEY" -H "Content-Type: application/json" \
     -d '{"preimage": "<64 hex characters>"}'
   ```

4. Or release the payer's funds with `POST /api/v1/payments/cancel`, body `{"payment_hash": "<hash>"}`, using the admin key.

Keep the preimage secret until you settle. Anyone who has it can settle the invoice.

## Labels {#labels}

`PUT /api/v1/payments/{payment_hash}/labels` with body `{"labels": ["shop", "refund"]}` and the admin key replaces the payment's labels. New label names are added to your account automatically.

## Payment status values {#payment-status-values}

| `status` | Meaning |
|---|---|
| `pending` | Invoice not yet paid, or outgoing payment not yet confirmed |
| `success` | Settled |
| `failed` | Failed or expired |

## Webhook notifications {#webhook-notifications}

Set `webhook` when you create an invoice and LNbits POSTs the payment to that URL once, when the invoice is paid. Read [Webhooks](/docs/api/webhooks) before relying on it. The body format is unusual, there are no retries, and private-network URLs are blocked by default.

## Code examples {#code-examples}

### Python {#python}

```python
import os
import time
import httpx

LNBITS = "https://lnbits.example.com"
invoice_key = os.environ["INVOICE_KEY"]

r = httpx.post(
    f"{LNBITS}/api/v1/payments",
    headers={"X-Api-Key": invoice_key},
    json={"out": False, "amount": 1000, "memo": "Order #1234"},
)
r.raise_for_status()
invoice = r.json()
print("Pay this:", invoice["bolt11"])

while True:
    status = httpx.get(
        f"{LNBITS}/api/v1/payments/{invoice['payment_hash']}",
        headers={"X-Api-Key": invoice_key},
    ).json()
    if status["paid"]:
        print("Paid", status["details"]["amount"] // 1000, "sats")
        break
    time.sleep(2)
```

### JavaScript {#javascript}

```javascript
const LNBITS = 'https://lnbits.example.com'

async function payInvoice(bolt11) {
  const res = await fetch(`${LNBITS}/api/v1/payments`, {
    method: 'POST',
    headers: {
      'X-Api-Key': process.env.ADMIN_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({out: true, bolt11})
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`${res.status}: ${body.detail}`)
  return body // body.status is 'success' or 'pending'
}
```

## See also {#see-also}

- [Wallets API](/docs/api/wallets)
- [LNURL API](/docs/api/lnurl)
- [Webhooks](/docs/api/webhooks)
- [Payment architecture](/docs/architecture/payments)
- [docs.lnbits.com: Payments](https://docs.lnbits.com/api/core/payments)
