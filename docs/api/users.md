---
sidebar_position: 5
title: Users API
description: Account routes under /api/v1/auth and admin user management under /users/api/v1
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Users API

These routes act on **user accounts**, not on single wallets. They never accept wallet keys. Send one of these instead:

- `Authorization: Bearer <token>` with a login token from `POST /api/v1/auth` or an ACL API token
- the `cookie_access_token` cookie that the browser login sets
- `?usr=<user_id>`, only when the `user-id-only` login method is enabled (off by default since v1.6.0), and never for admin accounts

[Authentication](/docs/api/authentication) explains how to get a token and how ACL tokens restrict it.

## Your own account {#get-current-user}

Account routes live under the `/api/v1/auth` prefix.

| Method and path | Purpose |
|---|---|
| `GET /api/v1/auth` | The logged-in user, with wallets |
| `PATCH /api/v1/auth` | Update username and profile extras |
| `PUT /api/v1/auth/password` | Set or change the password |
| `PUT /api/v1/auth/pubkey` | Set the Nostr public key |
| `PATCH /api/v1/auth/ui` | Save UI customisation |
| `POST /api/v1/auth/logout` | Clear the login cookies |

### Get the current user {#get-user}

```bash
curl https://lnbits.example.com/api/v1/auth \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

The response is the user object:

| Field | Notes |
|---|---|
| `id` | User ID |
| `username`, `email`, `pubkey`, `external_id` | Identity fields, any of which may be null |
| `activated` | `false` if an admin deactivated the account |
| `admin`, `super_user` | Role flags |
| `has_password` | Whether a password is set. Admin routes require one |
| `extensions` | IDs of the extensions this user has enabled |
| `wallets` | Full wallet objects, **including `adminkey` and `inkey`** |
| `extra` | Profile extras such as `email_verified`, `provider` and `labels` |
| `fiat_providers` | Fiat providers available to the user |
| `created_at`, `updated_at` | Timestamps |

With an ACL token that has only `read` on `/api/v1/auth`, the wallet keys come back masked.

### Update the profile {#update-profile}

```bash
curl -X PATCH https://lnbits.example.com/api/v1/auth \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "<your user id>", "username": "alice"}'
```

`user_id` must be your own ID. `username` (2 to 20 characters) is required. `extra` is optional. You can't change the email here. The response is the updated user object.

### Change the password {#change-password}

`PUT /api/v1/auth/password` takes `user_id`, `username`, `password_old` (if a password is already set), `password` and `password_repeat`. Passwords are 8 to 50 characters. The token must come from a **recent** login: the call only works within `AUTH_CREDETIALS_UPDATE_THRESHOLD` seconds of logging in (120 by default, and the setting name is misspelt like that). Otherwise log in again first.

### List your wallets {#list-user-wallets}

`GET /api/v1/wallets` lists your wallets, and `POST /api/v1/wallet` creates one. Both are on the [Wallets API](/docs/api/wallets) page.

### Server status {#server-status}

`GET /api/v1/status` returns server time, uptime and version to any logged-in user. For admins it also shows the funding source class, its balance in msat and any error. `GET /api/v1/health` returns server time and uptime without auth.

## Extensions for your account {#get-user-extensions}

Enabling an extension switches it on for your account. The admin must already have installed and activated it.

| Method and path | Purpose |
|---|---|
| `GET /api/v1/extension` | Extensions you have enabled |
| `GET /api/v1/extension/all` | The extension catalogue, with install status |
| `PUT /api/v1/extension/{ext_id}/enable` | Enable one for your account |
| `PUT /api/v1/extension/{ext_id}/disable` | Disable one for your account |

```bash
curl -X PUT https://lnbits.example.com/api/v1/extension/lnurlp/enable \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

```json
{"success": true, "message": "Extension 'lnurlp' enabled."}
```

A paid extension returns HTTP 402 `Extension '<id>' requires payment.` until its enable invoice is paid. Admins skip the payment. Installing extensions is an admin task, covered in [Installing extensions](/docs/extensions/installing).

## Creating accounts {#creating-accounts}

| Method and path | Auth | Purpose |
|---|---|---|
| `POST /api/v1/auth/register` | None | Create an account with `username`, `password`, `password_repeat` and an optional `email`. Needs `username-password` login enabled. If user activation is required, it may also need an `invitation_code`. Returns an access token |
| `POST /api/v1/account` | None | Create an account with one wallet and **no credentials**. Body `{"name": "<wallet name>"}`. Returns the wallet with its keys |

Both are refused when `LNBITS_ALLOW_NEW_ACCOUNTS` is false or `LNBITS_ALLOWED_USERS` is not empty. An account made with `POST /api/v1/account` has no username or password, so its owner can only reach it with the wallet keys, or by user ID if `user-id-only` login is on.

## Admin: manage users {#admin-endpoints}

User administration is under the `/users/api/v1` prefix. Every route there needs an **admin** account: the Super User, or a user listed in `LNBITS_ADMIN_USERS`. The account must have a password set. A wallet admin key does **not** make you an admin. Some routes need the Super User specifically.

:::danger
These routes can read every user's wallet keys, create and delete accounts, and (for the Super User) change wallet balances. Use them only from trusted tooling. Prefer an ACL API token limited to `/users/api/v1` with `read` only for reporting.
:::

| Method and path | Who | Purpose |
|---|---|---|
| `GET /users/api/v1/user` | Admin | Paged list of accounts with wallet count, balance and last payment |
| `GET /users/api/v1/user/{user_id}` | Admin | One user, with wallets and keys |
| `POST /users/api/v1/user` | Admin | Create a user |
| `PUT /users/api/v1/user/{user_id}` | Admin | Update a user's profile and enabled extensions |
| `DELETE /users/api/v1/user/{user_id}` | Admin | Delete a user |
| `PUT /users/api/v1/user/{user_id}/activate` | Admin | Toggle activated or deactivated |
| `PUT /users/api/v1/user/{user_id}/admin` | Super User | Toggle admin rights |
| `PUT /users/api/v1/user/{user_id}/reset_password` | Super User | Generate a password reset key |
| `GET /users/api/v1/user/{user_id}/wallet` | Admin | The user's wallets |
| `POST /users/api/v1/user/{user_id}/wallet` | Admin | Create a wallet for the user (`name`, `currency`) |
| `PUT /users/api/v1/user/{user_id}/wallet/{wallet}/lightning-address` | Admin | Set a wallet's Lightning address |
| `PUT /users/api/v1/user/{user_id}/wallet/{wallet}/undelete` | Admin | Restore a deleted wallet |
| `DELETE /users/api/v1/user/{user_id}/wallet/{wallet}` | Admin | Delete one wallet |
| `DELETE /users/api/v1/user/{user_id}/wallets` | Admin | Delete all of the user's wallets |
| `PUT /users/api/v1/balance` | Super User | Credit or debit a wallet. Body `{"id": "<wallet id>", "amount": <sats>}`, negative to debit |

### List users {#list-all-users}

```bash
curl "https://lnbits.example.com/users/api/v1/user?limit=50&offset=0&sortby=created_at&direction=desc" \
  -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN"
```

The response is `{"data": [...], "total": n}`. `search` matches ID, email, username, pubkey, external ID and wallet ID.

### Create a user {#create-user}

```bash
curl -X POST https://lnbits.example.com/users/api/v1/user \
  -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username": "bob", "email": "bob@example.com", "extensions": ["lnurlp"]}'
```

The body also takes `password` and `password_repeat`. A password needs a username. If you leave the password out, LNbits sets a random one. The response echoes the body with the new `id`.

### Delete a user {#delete-user-admin}

`DELETE /users/api/v1/user/{user_id}` soft-deletes all of the user's wallets, deletes the account row and returns `{"success": true, "message": "User deleted."}`. You can't delete the Super User, and only the Super User can delete another admin. The wallets' payment history stays in the database.

### Impersonate a user {#impersonate}

From a browser session, an admin can act as another (non-admin) user:

- `POST /api/v1/auth/impersonate` with body `{"usr": "<user id>"}` starts it.
- `DELETE /api/v1/auth/impersonate` returns to the admin account.

This only works with the login cookie, not with a bearer token.

## Code examples {#code-examples}

### Python {#python}

```python
import os
import httpx

LNBITS = "https://lnbits.example.com"

login = httpx.post(
    f"{LNBITS}/api/v1/auth",
    json={"username": "alice", "password": os.environ["LNBITS_PASSWORD"]},
)
login.raise_for_status()
token = login.json()["access_token"]

me = httpx.get(f"{LNBITS}/api/v1/auth", headers={"Authorization": f"Bearer {token}"})
for wallet in me.json()["wallets"]:
    print(wallet["name"], wallet["balance_msat"] // 1000, "sats")
```

### JavaScript {#javascript}

```javascript
const LNBITS = 'https://lnbits.example.com'

const res = await fetch(`${LNBITS}/api/v1/extension`, {
  headers: {Authorization: `Bearer ${process.env.ACCESS_TOKEN}`}
})
const extensions = await res.json()
console.log(extensions.map((e) => e.code))
```

## See also {#see-also}

- [Authentication](/docs/api/authentication)
- [Wallets API](/docs/api/wallets)
- [User architecture](/docs/architecture/users)
- [docs.lnbits.com: Users & Accounts](https://docs.lnbits.com/api/core/users)
- [docs.lnbits.com: Admin users](https://docs.lnbits.com/api/admin/users)
