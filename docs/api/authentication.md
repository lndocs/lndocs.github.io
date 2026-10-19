---
sidebar_position: 2
title: API Authentication
description: Wallet keys, user access tokens, ACL API tokens and the login flows of the LNbits API
last_update:
  date: 2026-10-19
verified_with: v1.6.2
---

# API Authentication

:::note Checked against a running LNbits
Some statements on this page are tested against `lnbits/lnbits:v1.6.2` with FakeWallet, on every change to this site and weekly ([API claims workflow](https://github.com/lndocs/lndocs.github.io/actions/workflows/claims.yml)).
:::

LNbits has two independent ways to authenticate, and every route uses exactly one of them:

1. **Wallet keys** (invoice key or admin key) act on **one wallet**. Use them for receiving, paying and reading payments.
2. **User credentials** (a login token, a cookie, an ACL API token, or `?usr=`) act as **a user account**. Use them for account and wallet management and for the admin routes.

Wallet keys never work on user routes, and user tokens never work on wallet-key routes. If you get a 401 you did not expect, check that you are using the right kind of credential for that route. Swagger at `/docs` on your instance shows which scheme each route expects.

## Wallet keys {#api-key-types}

Every wallet has two keys. You find them in the wallet's API info panel in the web UI, or in the `adminkey` and `inkey` fields that `GET /api/v1/auth` returns to the logged-in owner.

### Admin key {#admin-key}

Everything the invoice key can do, plus spending and changing the wallet:

- Pay BOLT11 invoices (`POST /api/v1/payments` with `"out": true`)
- Pay LNURL-pay links and Lightning addresses (`POST /api/v1/payments/lnurl`)
- Settle or cancel hold invoices, set payment labels and extra data
- Rename the wallet and update its settings (`PATCH /api/v1/wallet`)
- Log in to sites with LNURL-auth (`POST /api/v1/lnurlauth`)

:::danger Treat the admin key like cash
Whoever holds an admin key can empty the wallet. Keep it server-side. Never ship it in front-end code, mobile apps or repositories. If one leaks, rotate the keys at once (see [Rotating keys](#rotating-keys)).
:::

### Invoice key {#invoice-key}

Receive and read, but not spend. The invoice key **can**:

- Create invoices (`POST /api/v1/payments` with `"out": false`)
- Read the wallet name and balance (`GET /api/v1/wallet`)
- List and page through the wallet's payments, including amounts, memos and bolt11 strings (`GET /api/v1/payments`, `GET /api/v1/payments/paginated`, `GET /api/v1/payments/history`, `GET /api/v1/payments/stats/breakdown`)
- See full payment details, including the preimage of paid payments (`GET /api/v1/payments/{payment_hash}` with the key in the header)
- Resolve an LNURL (`POST /api/v1/lnurlscan`)
- Subscribe to the wallet's WebSocket feed (the key is the WebSocket id)

So an invoice key is not a "public" key. It reveals the wallet's balance and full payment history. Share it only with systems you trust with that information.

### Sending a wallet key {#sending-keys}

Send the key in the `X-API-KEY` header. HTTP header names are case-insensitive, so `X-Api-Key` works too:

```bash
curl https://lnbits.example.com/api/v1/wallet \
  -H "X-Api-Key: $INVOICE_KEY"
```

Most wallet-key routes also accept the query parameter `?api-key=`. Avoid it, because URLs end up in proxy logs, browser history and `Referer` headers. `GET /api/v1/payments/{payment_hash}` reads the header only.

### Permission matrix {#permission-matrix}

| Route | No key | Invoice key | Admin key |
|---|---|---|---|
| `GET /api/v1/wallet` | No | Name and balance | Name, balance and `id` |
| `POST /api/v1/payments` (receive, `"out": false`) | No | Yes | Yes |
| `POST /api/v1/payments` (pay, `"out": true`) | No | No (403) | Yes |
| `GET /api/v1/payments` | No | Yes | Yes |
| `GET /api/v1/payments/{payment_hash}` | Status (and preimage once paid) | Status and `details` for its own wallet's payments, 404 for others | Same as invoice key |
| `POST /api/v1/payments/decode` | Yes | Yes | Yes |
| `POST /api/v1/payments/lnurl` | No | No (403) | Yes |
| `PATCH /api/v1/wallet` | No | No (403) | Yes |

Each key only ever acts on its own wallet.

### Wallet key errors {#error-responses}

| Situation | Status | `detail` |
|---|---|---|
| No key sent | 401 | `No Api Key provided.` |
| Key does not match any wallet | 404 | `Wallet not found.` |
| Invoice key on an admin-key route | 403 | `Invalid adminkey.` |
| Invoice key used to pay | 403 | `Invoice (or Admin) key required.` |

An unknown key returns 404, not 401. Don't treat 404 as "the route does not exist" without checking the key.

### Rotating keys {#rotating-keys}

`PUT /api/v1/wallet/reset/{wallet_id}` generates a new admin key and invoice key for the wallet. It needs **user** auth as the wallet's owner, not a wallet key. The response is the wallet with its new keys. The old keys stop working at once: the route also clears LNbits' key cache.

LNbits caches successful key and token lookups for `AUTH_AUTHENTICATION_CACHE_MINUTES` (10 by default). Key rotation clears that cache, but not every account change does. See [Users API](/docs/api/users).

## User credentials {#session-authentication}

User routes identify an account, not a wallet. They include `/api/v1/auth`, `/api/v1/wallets`, creating and deleting wallets, `/api/v1/extension`, and everything under `/users/api/v1` and `/admin/api/v1`.

They accept any of these, checked in this order:

1. `Authorization: Bearer <token>`, where the token is a login token or an ACL API token
2. The `cookie_access_token` cookie, which the browser login sets
3. `?usr=<user_id>`, only when the `user-id-only` login method is enabled

### Logging in with a username and password {#oauth2-optional}

Username and password is the only login method enabled by default (`AUTH_ALLOWED_METHODS` defaults to `username-password`).

```bash
curl -X POST https://lnbits.example.com/api/v1/auth \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "your-password"}'
```

```json
{"access_token": "eyJhbGciOiJIUzI1NiIs...", "token_type": "bearer"}
```

The `username` field also accepts the account's email address. The response also sets the `cookie_access_token` cookie (HTTP-only, `SameSite=Lax`, and `Secure` while `AUTH_HTTPS_ONLY=true`, which is the default).

A wrong username or password returns 401 `Invalid credentials.` After 5 failures for the same account within 15 minutes, logins are refused with 429 `Too many login attempts. Try again later.` for 60 seconds, doubling with each further failure up to 15 minutes.

Use the token as a bearer token:

```bash
curl https://lnbits.example.com/api/v1/auth \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Things to know about login tokens:

- They are JWTs signed with the server's auth secret. They last `AUTH_TOKEN_EXPIRE_MINUTES`, which defaults to 525,600 minutes (one year).
- A login token has the **full power of the account**. `GET /api/v1/auth` returns every wallet with its admin key. Guard it like an admin key.
- `POST /api/v1/auth/logout` clears the cookies. It does not revoke a token you copied elsewhere. For scoped or short-lived access, use an [ACL API token](#acl-api-tokens) instead.

Other login routes, each only if its method is enabled:

| Route | Method |
|---|---|
| `POST /api/v1/auth/register` | Create an account with `username`, `password`, `password_repeat` and an optional `email` |
| `POST /api/v1/auth/usr` | Log in with a user ID (`user-id-only`). Refused for admin accounts |
| `POST /api/v1/auth/nostr` | Nostr NIP-98 (`nostr-auth-nip98`), with the signed event in an `Authorization: Nostr <base64>` header |
| `GET /api/v1/auth/{provider}` | Start a browser SSO login (`google-auth`, `github-auth`, `keycloak-auth`, `oidc-auth`) |

All of these return or set the same kind of access token. Enabling methods, SSO providers and the first-install flow are covered in [Authentication configuration](/docs/configuration/authentication).

### The `?usr=` parameter {#usr-parameter}

`?usr=<user_id>` authenticates as the user whose ID it is, with no password. It only works when `user-id-only` is in `AUTH_ALLOWED_METHODS`. That method has been off by default since v1.6.0. Even when it is on, LNbits refuses `?usr=` for admin and Super User accounts.

:::caution
A user ID used with `?usr=` is a bearer secret that grants the whole account and cannot be rotated. Leave `user-id-only` off unless you have a specific reason to turn it on.
:::

### User credential errors {#user-auth-errors}

| Situation | Status | `detail` |
|---|---|---|
| No token, and `?usr=` not allowed or not sent | 401 | `Missing user ID or access token.` |
| `?usr=` with an admin's user ID | 403 | `User id only access for admins is forbidden.` |
| Token for an account that no longer exists | 401 | `User not found.` |
| Token expired | 401 | `Session expired.` |
| Token invalid | 401 | `Invalid access token.` |
| ACL token used on a path or method it does not grant | 403 | `Path not allowed.` or `Method not allowed.` |
| ACL token that was revoked, or whose ACL was deleted or overwritten | 403 | `Invalid token id.` |
| Admin route, but the account is not an admin | 403 | `User not authorized. No admin privileges.` |
| Admin route, but the admin account has no password | 403 | `Admin users must have credentials configured.` |

## ACL API tokens {#acl-api-tokens}

Since v1.0.0, a user can create **access control lists** (ACLs) and mint expiring **API tokens** bound to them. An API token is a JWT sent as `Authorization: Bearer <token>`, like a login token, but it can only reach the paths its ACL allows.

How an ACL works:

- An ACL is a list of endpoint groups. Each group has a `read` flag (GET, HEAD, OPTIONS) and a `write` flag (POST, PUT, PATCH, DELETE).
- Groups are the first three path segments, such as `/api/v1/wallets`, `/api/v1/auth` or `/users/api/v1`. One grant covers every route under that prefix.
- ACLs apply to **user-auth routes only**. Wallet-key routes such as `GET /api/v1/wallet` and `POST /api/v1/payments` check the `X-API-KEY` and ignore bearer tokens. To give a service wallet access, give it a wallet key.
- With a token that has `read` but not `write` on the group, `GET /api/v1/auth` and `GET /api/v1/wallets` return the wallets with masked keys (`********************************`). With `write`, they return the real keys.

:::warning
`write` on `/api/v1/auth` or `/api/v1/wallets` lets the token holder read the admin keys of all your wallets. Grant `read` only, unless the token really needs to manage your account.
:::

### Creating a token {#creating-a-token}

The easiest way is the **Access Control List** section of your account page (`/account`). The account must have a username and password.

Over the API, all ACL routes need user auth and your password:

| Method and path | Body | Purpose |
|---|---|---|
| `GET /api/v1/auth/acl` | None | List your ACLs, with every grantable endpoint group |
| `PUT /api/v1/auth/acl` | `{id, name, endpoints, password}` | Create or update an ACL |
| `DELETE /api/v1/auth/acl` | `{id, password}` | Delete an ACL |
| `POST /api/v1/auth/acl/token` | `{acl_id, token_name, password, expiration_time_minutes}` | Mint a token. Returns `{id, api_token}` |
| `DELETE /api/v1/auth/acl/token` | `{id, acl_id, password}` | Revoke a token |

If the `id` in `PUT /api/v1/auth/acl` doesn't match an existing ACL, LNbits creates a new one with a fresh ID and **every group set to no access**, whatever `endpoints` you sent. Send a second `PUT` with that ID and your `endpoints` to grant access.

`PUT` on an existing ACL **replaces it with the body you send**, including its `token_id_list`. Leave that field out and every token minted from the ACL stops working (`Invalid token id.`). To edit an ACL, take it from `GET /api/v1/auth/acl`, change `endpoints`, add `password`, and send the whole object back.

```bash
curl -X POST https://lnbits.example.com/api/v1/auth/acl/token \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"acl_id": "<acl id>", "token_name": "reporting", "password": "your-password", "expiration_time_minutes": 1440}'
```

The `api_token` is shown only in this response. Store it then. `expiration_time_minutes` must be greater than 0.

## Best practices {#best-practices}

### Security {#security}

- Use the invoice key wherever a client only receives or reads. Use the admin key only where it must spend.
- Use a separate wallet per integration, holding only what that integration needs. A leaked key then only exposes that wallet.
- Prefer ACL API tokens with `read` only and a short expiry over handing out a login token.
- Serve LNbits over HTTPS. Keys and tokens travel in headers.
- Rotate wallet keys after any suspected leak.

### Key storage {#key-storage}

Keep keys out of source code. Read them from the environment or a secrets manager:

```python
import os

admin_key = os.environ["LNBITS_ADMIN_KEY"]  # good
admin_key = "a1b2c3..."                     # bad: ends up in git history
```

### Rate limiting {#rate-limiting}

Requests are limited per client IP (200 per minute by default) and return 429 when over. Back off and retry. See [API Overview](/docs/api/overview).

## See also {#see-also}

- [API Overview](/docs/api/overview)
- [Users API](/docs/api/users)
- [Authentication configuration](/docs/configuration/authentication)
- [docs.lnbits.com: API authentication](https://docs.lnbits.com/api/authentication)
