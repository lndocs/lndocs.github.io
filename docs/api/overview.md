---
sidebar_position: 1
title: API Overview
description: How the LNbits REST API is organised, where the authoritative reference lives, and the conventions every endpoint shares
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# API Overview

LNbits is a FastAPI application. Everything the web UI does goes through the same REST API, so anything you can click you can also script.

These pages explain the concepts and the endpoints most integrations need. For every endpoint, see the [Endpoint reference](/docs/api/endpoint-reference), which is generated from the official image's OpenAPI schema.

## The authoritative reference {#api-documentation}

Every LNbits instance publishes its own, always-current API description:

| URL on your instance | What it is |
|---|---|
| `/docs` | Swagger UI. Lists every route with its parameters and models, and lets you try calls in the browser |
| `/redoc` | The same schema rendered by ReDoc |
| `/openapi.json` | The raw OpenAPI schema. Feed it to a client generator |

The schema also covers the extensions installed on that instance, so it is the right place to look up an extension's API.

The official LNbits documentation is at [docs.lnbits.com](https://docs.lnbits.com). Its [API section](https://docs.lnbits.com/api/) has a quick reference and a page for each area.

## Base URL {#base-url}

All routes are relative to your instance, for example `https://lnbits.example.com`. Core API routes start with `/api/v1/`. A few groups have other prefixes:

- `/users/api/v1/...` for user administration (see [Users API](/docs/api/users)).
- `/admin/api/v1/...` for server settings, audit and backup (see [Admin UI](/docs/configuration/admin-ui)).
- `/<extension_id>/api/v1/...` for extensions, for example `/lnurlp/api/v1/...`.

The examples use `https://lnbits.example.com`. Replace it with your own instance.

## Two kinds of credentials {#authentication}

LNbits has two separate auth systems. Each route accepts only one of them:

| Credential | Identifies | Sent as | Used by |
|---|---|---|---|
| Wallet **invoice key** or **admin key** | One wallet | `X-API-KEY` header (or `?api-key=` query) | Wallet and payment routes such as `/api/v1/wallet` and `/api/v1/payments` |
| **User access token** (login JWT or ACL API token) | A user account | `Authorization: Bearer <token>`, the `cookie_access_token` cookie, or `?usr=<user_id>` when user-ID login is enabled | Account routes such as `/api/v1/auth` and `/api/v1/wallets`, and the admin routes |

A wallet key does not work on a user route, and a bearer token does not work on a wallet-key route. [Authentication](/docs/api/authentication) has the details.

### Invoice key versus admin key {#api-key-types}

- The **invoice key** can create invoices, read the wallet balance and list the wallet's payments. It cannot spend.
- The **admin key** can do all of that, and can also pay invoices, change the wallet and call every other admin-key route.

Hand out the invoice key whenever a client only needs to receive or read.

:::danger Admin keys spend money
Anyone holding a wallet's admin key can drain that wallet. Keep it on your server. Never put it in browser code, mobile apps or public repositories.
:::

## Core endpoints {#core-endpoints}

| Method and path | Credential | Purpose |
|---|---|---|
| `GET /api/v1/wallet` | Invoice or admin key | Wallet name and balance |
| `POST /api/v1/payments` | Invoice key (receive) or admin key (pay) | Create or pay a BOLT11 invoice |
| `GET /api/v1/payments` | Invoice or admin key | List the wallet's payments |
| `GET /api/v1/payments/{payment_hash}` | None (a key adds details) | Payment status |
| `POST /api/v1/payments/decode` | None | Decode a BOLT11 invoice or LNURL |
| `POST /api/v1/payments/lnurl` | Admin key | Pay an LNURL-pay link or Lightning address |
| `GET /api/v1/auth` | User token | The logged-in user and their wallets |
| `GET /api/v1/health` | None | Server time and uptime. Until `/first_install` is completed, every path (this one too) answers `307` to `/first_install`. |

Each is covered in [Wallets](/docs/api/wallets), [Payments](/docs/api/payments), [LNURL](/docs/api/lnurl) and [Users](/docs/api/users).

## Units {#units}

Amounts in responses are in **millisatoshis (msat)**:

- `balance` from `GET /api/v1/wallet` is in msat.
- `amount` and `fee` on a payment are in msat. Incoming payments are positive and outgoing ones negative.

The exception is input: `amount` in `POST /api/v1/payments` is in the `unit` you send (`sat` by default, or a fiat code such as `USD`).

## Requests and responses {#request-format}

Send JSON bodies with `Content-Type: application/json`. Responses are JSON.

Errors use FastAPI's shape:

```json
{"detail": "Wallet not found."}
```

### HTTP status codes {#http-status-codes}

| Code | Meaning in LNbits |
|---|---|
| 200 / 201 | Success. Creating a payment returns 201 |
| 400 | Bad input. LNbits returns 400, not 422, for request validation errors, with a list of problems in `detail` |
| 401 | Missing credential, expired or invalid token, or wrong password |
| 403 | The credential is valid but not allowed, for example an invoice key used to pay |
| 404 | Unknown wallet key, or the object does not exist (for example `Payment does not exist.`) |
| 429 | Rate limit exceeded. This body is `{"error": "Rate limit exceeded: ..."}`, not `detail`. Repeated failed logins also return 429 |
| 500 | Unhandled server error: `{"detail": "Unexpected error! ID: ..."}`. The ID matches a line in the LNbits log |
| 520 | The payment or invoice failed at the Lightning layer, for example insufficient balance. The body is `{"detail": "...", "status": "failed"}` or `"status": "pending"` |

Treat a 520 with `"status": "pending"` as "not known yet", not as a failure. Check the payment again before you retry it.

## Quick examples {#quick-examples}

### Get the wallet balance {#get-wallet-balance}

```bash
curl https://lnbits.example.com/api/v1/wallet \
  -H "X-Api-Key: $INVOICE_KEY"
```

```json
{"name": "My Wallet", "balance": 150000}
```

That `balance` is 150,000 msat, or 150 sats. With an admin key, the response also includes the wallet `id`.

### Create an invoice {#create-invoice}

```bash
curl -X POST https://lnbits.example.com/api/v1/payments \
  -H "X-Api-Key: $INVOICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"out": false, "amount": 100, "memo": "Coffee"}'
```

Always send `"out": false` to receive. [Payments](/docs/api/payments) explains why.

### Pay an invoice {#pay-invoice}

```bash
curl -X POST https://lnbits.example.com/api/v1/payments \
  -H "X-Api-Key: $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"out": true, "bolt11": "lnbc..."}'
```

## Rate limiting {#rate-limiting}

LNbits limits requests per client IP. The defaults are `LNBITS_RATE_LIMIT_NO=200` requests per `LNBITS_RATE_LIMIT_UNIT=minute`. Over the limit you get HTTP 429. No `X-RateLimit-*` headers are sent.

Behind a reverse proxy, the client IP comes from the forwarded headers. The limit only works per visitor if the proxy and `FORWARDED_ALLOW_IPS` are set up correctly. See [Security](/docs/configuration/security).

With the Admin UI on (the default), these values live in the database after first start and override `.env`. Change them in the Admin UI at `/admin`.

## Pagination, filtering and sorting {#pagination}

List routes that take filters, such as `GET /api/v1/payments`, accept these query parameters:

| Parameter | Meaning |
|---|---|
| `limit`, `offset` | Page size and start. `limit` defaults to **10** and is capped at **1000**. `limit=0` means 1000 |
| `sortby`, `direction` | Sort field, and `asc` or `desc`. Payments sort by `time`, newest first, by default. A `sortby` the route doesn't allow returns 400 |
| `search` | Free-text search over the model's search fields |
| `<field>=<value>` | Equality filter on a model field |
| `<field>[op]=<value>` | Operator filter. `op` is one of `eq`, `ne`, `gt`, `ge`, `lt`, `le`, `in`, `ex`, `like`, `every`, `any`. `in`, `ex`, `every` and `any` take comma-separated values |

Filters fail silently. An unknown field name, an unknown operator or a value of the wrong type (`amount[gt]=abc`) is dropped, and you get unfiltered results instead of an error.

To fetch everything, page through with `offset` until you have `total` items. Routes ending in `/paginated` return `{"data": [...], "total": n}`, which is what you need for that.

### Filtering examples {#filtering--sorting}

```bash
# Pending payments only
curl "https://lnbits.example.com/api/v1/payments?status=pending&limit=20" \
  -H "X-Api-Key: $INVOICE_KEY"

# Incoming payments, newest first, as a page
curl -g "https://lnbits.example.com/api/v1/payments/paginated?amount[gt]=0&sortby=time&direction=desc&limit=20" \
  -H "X-Api-Key: $INVOICE_KEY"
```

The `-g` flag stops curl from treating `[` and `]` as glob characters.

## WebSockets {#websocket-api}

For live updates, open a WebSocket to `/api/v1/ws/<id>`:

- With the wallet's **invoice key** (or admin key) as the id, you receive `{"wallet_balance": ..., "payment": {...}}` for every payment to or from that wallet. `wallet_balance` is in **sats**. The `payment` object uses msat.
- With a **payment hash** as the id, you receive `{"pending": ..., "status": ...}` when that payment changes.

The wallet ID does not work as the id. Nothing is ever sent to it.

```javascript
const ws = new WebSocket(`wss://lnbits.example.com/api/v1/ws/${invoiceKey}`)
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  console.log(msg.payment.payment_hash, msg.payment.status)
}
```

:::warning WebSocket messages are not proof of payment
The push routes need no authentication:

- `POST /api/v1/ws/{item_id}`
- `GET /api/v1/ws/{item_id}/{data}`

Anyone who knows an id, such as a payment hash shown to a customer, can send fake messages to its listeners. Before you ship goods or credit an account, confirm the payment with `GET /api/v1/payments/{payment_hash}`.

Putting an invoice key in a WebSocket URL in browser code also shows that key to the user. Only do that when the user owns the wallet.
:::

## Client libraries {#sdk--libraries}

There is no official SDK, and the community libraries are unmaintained. Plain HTTP is the most reliable option, or you can generate a client from `/openapi.json`. See [SDKs & Libraries](/docs/api/sdks).

## See also {#see-also}

- [Authentication](/docs/api/authentication)
- [Payments API](/docs/api/payments)
- [Webhooks](/docs/api/webhooks)
- [docs.lnbits.com API reference](https://docs.lnbits.com/api/)
