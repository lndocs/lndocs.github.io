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

`user_id` must be your own ID, or you get 400 `Invalid user ID.` `username` (2 to 20 characters) must be present, but may be `null` to leave it unchanged. `extra` is optional, and **replaces** the whole profile extras object (including your labels), so send it complete or leave it out. You can't change the email here. The response is the updated user object.

### Change the password {#change-password}

`PUT /api/v1/auth/password` takes `user_id`, `username`, `password_old` (if a password is already set), `password` and `password_repeat`. Passwords are 8 to 50 characters. It needs a token (bearer or cookie), not `?usr=`, and the token must come from a **recent** login: the call only works within `AUTH_CREDETIALS_UPDATE_THRESHOLD` seconds of logging in (120 by default, and the setting name is misspelt like that). Otherwise you get 400 `You can only update your credentials in the first 120 seconds...`. Log in again and retry.

### List your wallets {#list-user-wallets}

`GET /api/v1/wallets` lists your wallets, and `POST /api/v1/wallet` creates one. Both are on the [Wallets API](/docs/api/wallets) page.

### Server status {#server-status}

`GET /api/v1/status` returns server time, uptime and version to any logged-in user. For admins it also shows the funding source class, its balance in msat and any error. `GET /api/v1/health` returns server time and uptime without auth.

## Extensions for your account {#get-user-extensions}

Enabling an extension switches it on for your account. The admin must already have installed and activated it.

| Method and path | Purpose |
|---|---|
| `GET /api/v1/extension` | Extensions linked to your account, enabled **or** disabled. Each has `code`, `is_valid`, `is_wasm`, `name`, `short_description` and `tile`, with no active flag. Use `extensions` in `GET /api/v1/auth` for the enabled ones |
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

An unknown ID returns 404. An extension the admin hasn't installed or activated returns 400. A paid extension returns HTTP 402 `Extension '<id>' requires payment.` until its enable invoice is paid. Admins skip the payment. Installing extensions is an admin task, covered in [Installing extensions](/docs/extensions/installing).

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
| `PUT /users/api/v1/user/{user_id}` | Admin | Replace a user's profile and enabled extensions (see below) |
| `DELETE /users/api/v1/user/{user_id}` | Admin | Delete a user |
| `PUT /users/api/v1/user/{user_id}/activate` | Admin | Toggle activated or deactivated. Deactivating also removes admin rights |
| `PUT /users/api/v1/user/{user_id}/admin` | Super User | Toggle admin rights |
| `PUT /users/api/v1/user/{user_id}/reset_password` | Super User | Generate a password reset key (see below) |
| `GET /users/api/v1/user/{user_id}/wallet` | Admin | The user's wallets |
| `POST /users/api/v1/user/{user_id}/wallet` | Admin | Create a wallet for the user. Body `{"name": "...", "currency": "EUR"}`, both optional |
| `PUT /users/api/v1/user/{user_id}/wallet/{wallet}/lightning-address` | Admin | Set a wallet's Lightning address. Body `{"lightning_address": "alice"}`. Reserved words are allowed here, and no fee is charged |
| `PUT /users/api/v1/user/{user_id}/wallet/{wallet}/undelete` | Admin | Restore a deleted wallet |
| `DELETE /users/api/v1/user/{user_id}/wallet/{wallet}` | Admin | Soft-delete one wallet |
| `DELETE /users/api/v1/user/{user_id}/wallets` | Admin | Soft-delete all of the user's wallets |
| `PUT /users/api/v1/balance` | Super User | Credit or debit a wallet. Body `{"id": "<wallet id>", "amount": <sats>}`, negative to debit. A debit below zero, or `0`, returns 400 |

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

The body also takes `password`, `password_repeat`, `pubkey`, `external_id` and `extra`. A password needs a username. The response echoes the body with the new `id`. If you leave the password out, LNbits sets a random one and **returns it in `password` and `password_repeat`**, so treat the response as a secret.

### Update a user {#update-user}

`PUT /users/api/v1/user/{user_id}` takes the same body as create, and `id` in the body must equal `{user_id}`. It **replaces** the profile: fields you leave out are cleared, and `extensions` becomes the user's full list of enabled extensions (an empty or missing list disables them all). It refuses passwords (use reset password), and only the Super User can edit the Super User.

### Reset a password {#reset-password}

`PUT /users/api/v1/user/{user_id}/reset_password` returns a string starting `reset_key_`. Give it to the user, who sets a new password with `PUT /api/v1/auth/reset` and body `{"reset_key": "...", "password": "...", "password_repeat": "..."}`. The key is only valid for `AUTH_CREDETIALS_UPDATE_THRESHOLD` seconds after it was generated (120 by default), so generate it when the user is ready. Within that window it is **not single-use**: CI shows the same key setting a password twice, so send it privately. The Super User's own password can't be reset this way.

### Deactivate a user {#deactivate-user}

`PUT /users/api/v1/user/{user_id}/activate` flips the account between activated and deactivated, and returns `User activated.` or `User deactivated.` You can't deactivate yourself or the Super User. A deactivated user's wallet keys and logins are refused.

This takes effect at once, even for a wallet key used seconds before, despite the key cache (`AUTH_AUTHENTICATION_CACHE_MINUTES`). This site's CI checks it against the v1.6.2 image: both a just-used and an unused key get 404 right after deactivation.

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
