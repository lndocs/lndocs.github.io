---
sidebar_position: 3
title: Wallets API
description: Read, create, rename, rotate and delete LNbits wallets over the API
last_update:
  date: 2026-10-19
verified_with: v1.6.2
---

# Wallets API

:::note Checked against a running LNbits
Some statements on this page are tested against `lnbits/lnbits:v1.6.2` with FakeWallet, on every change to this site and weekly ([API claims workflow](https://github.com/lndocs/lndocs.github.io/actions/workflows/claims.yml)).
:::

Wallet routes come in two kinds:

- Routes that act on **one wallet** take that wallet's key in the `X-API-KEY` header.
- Routes that act on **your account's wallets** (listing, creating, deleting, rotating keys) take **user** credentials: a bearer token, the login cookie or `?usr=`. A wallet key is rejected there with 401 `Missing user ID or access token.`

See [Authentication](/docs/api/authentication) for both.

| Method and path | Credential | Purpose |
|---|---|---|
| `GET /api/v1/wallet` | Invoice or admin key | Name and balance |
| `PATCH /api/v1/wallet` | Admin key | Update name, icon, colour, currency, pin, Lightning address |
| `PUT /api/v1/wallet/{new_name}` | Admin key | Rename (older route) |
| `GET /api/v1/wallets` | User | All your wallets |
| `GET /api/v1/wallet/paginated` | User | Your wallets, filtered and paged |
| `POST /api/v1/wallet` | User | Create a wallet |
| `PUT /api/v1/wallet/reset/{wallet_id}` | User | Generate new keys |
| `DELETE /api/v1/wallet/{wallet_id}` | User | Delete a wallet |

## Get wallet info {#get-wallet-info}

```bash
curl https://lnbits.example.com/api/v1/wallet \
  -H "X-Api-Key: $INVOICE_KEY"
```

With an invoice key:

```json
{"name": "My Wallet", "balance": 150000}
```

With an admin key, the response also includes `"id"`.

`balance` is in **millisatoshis**. Divide by 1000 for sats. This route only returns those fields. For the full wallet object, use `GET /api/v1/wallets`.

## List your wallets {#list-user-wallets}

```bash
curl https://lnbits.example.com/api/v1/wallets \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

This returns a list of full wallet objects:

```json
[
  {
    "id": "8b2f...",
    "user": "1c4e...",
    "wallet_type": "lightning",
    "adminkey": "e5c1...",
    "inkey": "7a9d...",
    "name": "My Wallet",
    "shared_wallet_id": null,
    "deleted": false,
    "created_at": "2026-10-01T12:00:00+00:00",
    "updated_at": "2026-10-01T12:00:00+00:00",
    "currency": "EUR",
    "lightning_address": null,
    "balance_msat": 150000,
    "extra": {"icon": "flash_on", "color": "primary", "pinned": false, "shared_with": []},
    "stored_paylinks": {"links": []},
    "share_permissions": []
  }
]
```

The response includes the **admin key of every wallet**. With an [ACL API token](/docs/api/authentication) that only has `read` on `/api/v1/wallets`, the keys come back masked as asterisks.

`GET /api/v1/wallet/paginated` returns the same objects as `{"data": [...], "total": n}`. It takes the standard `limit`, `offset`, `sortby`, `direction` and `search` parameters, and filters on `id`, `name`, `currency` and `lightning_address`.

## Create a wallet {#create-wallet}

```bash
curl -X POST https://lnbits.example.com/api/v1/wallet \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Shop"}'
```

| Field | Type | Notes |
|---|---|---|
| `name` | string | Wallet name |
| `wallet_type` | string | `lightning` (default) or `lightning-shared` |
| `shared_wallet_id` | string | Required for `lightning-shared`: the wallet that was shared with you |

The response is the new wallet object, including its `adminkey` and `inkey`. Store the keys from this response.

Shared wallets let another user view, receive or send from your wallet with permissions you choose. Invitations are handled by the `/api/v1/wallet/share` routes. See [Shared wallets](/docs/guides/shared-wallets) and Swagger at `/docs` for the request shapes.

## Update a wallet {#update-wallet}

`PATCH /api/v1/wallet` changes the wallet that owns the admin key. Send only the fields you want to change:

```bash
curl -X PATCH https://lnbits.example.com/api/v1/wallet \
  -H "X-Api-Key: $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Shop till", "currency": "EUR"}'
```

| Field | Notes |
|---|---|
| `name` | New name |
| `icon`, `color` | Display settings |
| `currency` | Fiat currency shown next to the balance |
| `pinned` | `true` or `false` |
| `lightning_address` | The local part of a wallet Lightning address, such as `alice`. Refused with 403 `Users cannot specify Lightning Addresses.` unless the admin set `LNBITS_ALLOW_CUSTOM_WALLET_LIGHTNING_ADDRESSES` to true. It may cost a fee when the admin set `LNBITS_CHARGE_WALLET_LIGHTNING_ADDRESSES` |

Empty strings for `name`, `icon` and `color` are ignored. An empty `currency` clears it. The response is the updated wallet object.

A Lightning address name is lowercased and must be 1 to 210 characters of `a-z`, `0-9`, `-`, `_` and `.`, with no `+` or `@`. Names containing a reserved word, or already taken by another wallet, are refused with 400.

### Rename with the older route {#rename-wallet}

`PUT /api/v1/wallet/{new_name}` takes the **new name in the path** and ignores any body:

```bash
curl -X PUT "https://lnbits.example.com/api/v1/wallet/Shop%20till" \
  -H "X-Api-Key: $ADMIN_KEY"
```

```json
{"id": "8b2f...", "name": "Shop till", "balance": 150000}
```

:::caution
The path segment is not a wallet ID. `PUT /api/v1/wallet/<wallet_id>` renames the wallet to its own ID. The name `share` can't be set this way, because `PUT /api/v1/wallet/share` is a different route.

Prefer the `PATCH` route above.
:::

## Rotate the keys {#rotate-keys}

```bash
curl -X PUT https://lnbits.example.com/api/v1/wallet/reset/$WALLET_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

LNbits generates a new admin key and invoice key and returns the wallet with them. The old keys stop working at once, so update every integration that used them. You must own the wallet. Otherwise you get 404 `Wallet not found`.

## Delete a wallet {#delete-wallet}

```bash
curl -X DELETE https://lnbits.example.com/api/v1/wallet/$WALLET_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

The response body is `null`.

Deletion is a **soft delete**. The wallet is marked `deleted` and disappears from your account, but its row and payment history stay in the database. An admin can restore it with `PUT /users/api/v1/user/{user_id}/wallet/{wallet}/undelete` (see [Users API](/docs/api/users)).

Move the funds out before you delete a wallet. A deleted wallet's balance can't be spent until an admin restores it.

## Errors {#error-responses}

### Wallet not found {#wallet-not-found}

An unknown wallet key gives:

```json
{"detail": "Wallet not found."}
```

with HTTP **404**. Owner-checked user routes (reset, delete) also return 404 when the wallet isn't yours.

### Insufficient balance {#insufficient-balance}

Paying more than the wallet holds gives HTTP **520**:

```json
{"detail": "Insufficient balance.", "status": "failed"}
```

For an external payment, LNbits also keeps back a reserve for routing fees. If the balance covers the amount but not the reserve, you get a 520 whose `detail` starts with `You must reserve at least`.

## Code examples {#code-examples}

### Python {#python}

```python
import os
import httpx

LNBITS = "https://lnbits.example.com"
headers = {"X-Api-Key": os.environ["INVOICE_KEY"]}

r = httpx.get(f"{LNBITS}/api/v1/wallet", headers=headers)
r.raise_for_status()
wallet = r.json()
print(wallet["name"], wallet["balance"] // 1000, "sats")
```

### JavaScript {#javascript}

```javascript
const LNBITS = 'https://lnbits.example.com'

const res = await fetch(`${LNBITS}/api/v1/wallet`, {
  headers: {'X-Api-Key': process.env.INVOICE_KEY}
})
if (!res.ok) throw new Error(`${res.status}: ${(await res.json()).detail}`)
const wallet = await res.json()
console.log(wallet.name, Math.floor(wallet.balance / 1000), 'sats')
```

## See also {#see-also}

- [Payments API](/docs/api/payments)
- [Authentication](/docs/api/authentication)
- [Wallet architecture](/docs/architecture/wallets)
- [docs.lnbits.com: Wallets](https://docs.lnbits.com/api/core/wallets)
