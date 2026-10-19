---
sidebar_position: 4
title: Users & Accounts
description: Accounts, roles, login methods and sessions in LNbits v1.6.2
last_update:
  date: 2026-10-19
verified_with: v1.6.2
---

# Users & Accounts

:::note Checked against a running LNbits
Some statements on this page are tested against `lnbits/lnbits:v1.6.2` with FakeWallet, on every change to this site and weekly ([API claims workflow](https://github.com/lndocs/lndocs.github.io/actions/workflows/claims.yml)).
:::

Every LNbits user is an **account**. An account owns wallets, logs in with one of the enabled login methods, and has one of three roles: Super User, admin or regular user.

:::info Settings live in the database
The Admin UI is on by default (`LNBITS_ADMIN_UI=true`). After the first start, most of the settings on this page are stored in the database and **override `.env`**. Change them in the Admin UI (`/admin`), or turn the Admin UI off if you want `.env` to be the source of truth. See [Admin UI](/docs/configuration/admin-ui).
:::

## Account model {#account-model}

The `Account` model in `lnbits/core/models/users.py`:

| Field | Meaning |
|---|---|
| `id` | `uuid4().hex` |
| `activated` | `false` for accounts waiting for activation (v1.5.0) |
| `username`, `email`, `pubkey` | Optional login identifiers. `pubkey` is a Nostr public key |
| `password_hash` | bcrypt hash, or null if the account has no password |
| `external_id` | For linking to an external system |
| `extra` | `UserExtra` (below) |
| `ui_customization` | Saved UI preferences (v1.5.0) |
| `created_at`, `updated_at` | Timestamps |
| `is_super_user`, `is_admin` | Computed from settings, not stored |

`UserExtra` holds `email_verified`, `first_name`, `last_name`, `display_name`, `picture`, `provider`, `visible_wallet_count`, `notifications`, `wallet_invite_requests` and `labels`. `provider` records how the account was created: `env` for the Super User account LNbits creates itself, `nostr` for a Nostr login, and `lnbits` (the default) otherwise, SSO sign-ups included.

API token ACLs are stored in the separate `accounts.access_control_list` column, not in the `Account` model.

## Roles {#user-roles}

### Super User {#super-user}

The instance operator. There is exactly one.

- The Super User ID is stored in the database (`system_settings`). With the Admin UI on (the default), LNbits writes a copy to `.super_user` in the data folder at every start. That file is only a mirror: editing it changes nothing, and LNbits overwrites it at the next start.
- To print the ID, run `lnbits-cli superuser` (`uv run lnbits-cli superuser` in a source install).
- The `SUPER_USER` setting, if set, overrides the ID in the database.
- On a fresh install, open `/first_install` to give the Super User a username and password. Set `FIRST_INSTALL_TOKEN` to stop anyone else from doing it first.

Only the Super User can:

- restart the server (`GET /admin/api/v1/restart`);
- reset all settings to their defaults (`DELETE /admin/api/v1/settings`);
- download a backup of the data folder (`GET /admin/api/v1/backup`);
- credit or debit a wallet (`PUT /users/api/v1/balance`);
- toggle a user's admin rights from the user manager (`PUT /users/api/v1/user/{user_id}/admin`);
- generate a password reset key for a user.

:::danger
The Super User can create money out of nothing in any wallet and can change the funding source. Give the account a strong password, and never share its user ID or a logged-in session.
:::

### Admin {#admin}

Admins are listed in `LNBITS_ADMIN_USERS`. They can:

- edit instance settings (`PUT /admin/api/v1/settings`);
- manage users and wallets (the `/users/api/v1/...` routes), including deactivating accounts;
- act as another, non-admin user (`POST /api/v1/auth/impersonate`, cookie login only);
- install, enable and disable extensions;
- read the node-vs-database balance check (`GET /admin/api/v1/audit`).

An admin can't delete another admin, and can't impersonate, deactivate or delete the Super User.

:::warning Admins are nearly as powerful as the Super User
The Admin UI shows the funding source section only to the Super User, but the settings API doesn't enforce that. `PUT /admin/api/v1/settings` only checks for admin rights, and it accepts every editable setting, including `LNBITS_BACKEND_WALLET_CLASS`, the funding source credentials and `LNBITS_ADMIN_USERS` (`lnbits/core/views/admin_api.py`, `api_update_settings`). Make someone an admin only if you'd trust them with the funding source.
:::

Admins and the Super User **must have a password**. Without one, admin routes return 403. They also can't log in with user-id-only access, even when it is enabled.

### Regular user {#regular-user}

A regular user manages their own wallets, uses the extensions enabled for them, and edits their own profile.

## Login methods {#authentication-methods}

`AUTH_ALLOWED_METHODS` lists the enabled methods. The default is `username-password` only. Setting the variable **replaces** the list, so include every method you want:

```bash
AUTH_ALLOWED_METHODS="username-password, nostr-auth-nip98"
```

The values are the `AuthMethods` enum:

| Value | How it works |
|---|---|
| `username-password` | Username or email plus password (`POST /api/v1/auth`). Passwords are bcrypt-hashed. |
| `user-id-only` | Log in with the account ID alone (`?usr=` or `POST /api/v1/auth/usr`). **Off by default since v1.6.0.** |
| `nostr-auth-nip98` | Sign a NIP-98 event (kind 27235) with your Nostr key (`POST /api/v1/auth/nostr`). An unknown key gets a new account. |
| `google-auth` | Google sign-in. Needs `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. |
| `github-auth` | GitHub sign-in. Needs `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`. |
| `keycloak-auth` | Keycloak. Needs `KEYCLOAK_DISCOVERY_URL`, `KEYCLOAK_CLIENT_ID` and `KEYCLOAK_CLIENT_SECRET`. |
| `oidc-auth` | Any OpenID Connect provider. Needs `OIDC_DISCOVERY_URL`, `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET`. |

SSO logins (Google, GitHub, Keycloak, OIDC) match accounts by email address, and create a new account when the email is unknown (if new accounts are allowed).

Failed username-and-password logins are throttled per account: after 5 failures within 15 minutes, logins are refused with 429 for 60 seconds, doubling with each further failure up to 15 minutes (`lnbits/core/views/auth_api.py`).

:::warning User-id-only access
With `user-id-only` enabled, anyone who has a user's ID, or a wallet URL containing `?usr=`, has full access to that user's wallets. LNbits refuses it for admins, but it is still risky for everyone else. Leave it off unless you need it.
:::

For setup details, see [Authentication](/docs/configuration/authentication).

### Password resets {#password-reset}

There is no email reset. The Super User generates a one-off reset key for a user (`PUT /users/api/v1/user/{user_id}/reset_password`) and passes it on. The user sets a new password with that key (`PUT /api/v1/auth/reset`). The key is only valid for `AUTH_CREDETIALS_UPDATE_THRESHOLD` seconds (default 120) after it is generated, so hand it over straight away. The Super User's own password can't be reset this way.

## Sessions {#session-management}

A successful login returns a JWT, both in the response body and in the `cookie_access_token` cookie.

- The token carries `sub` (the username), `usr` (the account ID), `email`, `auth_time` and `exp`.
- It is signed with HS256 using `AUTH_SECRET_KEY`. Leave that setting empty: LNbits then generates a key and stores it in `.lnbits_auth_key` in the data folder.
- It expires after `AUTH_TOKEN_EXPIRE_MINUTES` (default 525600, one year). There is no refresh: log in again when it expires.
- With `AUTH_HTTPS_ONLY=true` (the default) the cookie is only sent over HTTPS.
- Changing a password or Nostr key needs a recent login, within `AUTH_CREDETIALS_UPDATE_THRESHOLD` seconds (default 120; the setting name really is spelled that way).

User and admin routes accept the bearer token, the cookie, or (only when `user-id-only` is enabled) `?usr=`. They never accept wallet keys.

### API tokens and ACLs {#acl-tokens}

A user can create access control lists that allow read or write access per API path (`PUT /api/v1/auth/acl`).

The user can then mint an expiring API token bound to one list (`POST /api/v1/auth/acl/token`). This needs the account's password, and the account must have a username. The token is sent as `Authorization: Bearer`. A request to a path or method the list doesn't allow gets a 403. Deleting the token from the list (`DELETE /api/v1/auth/acl/token`) revokes it.

## Account creation {#account-creation}

| Setting | Effect |
|---|---|
| `LNBITS_ALLOW_NEW_ACCOUNTS` (default `true`) | `false` turns off self-registration. Admins can still create users. |
| `LNBITS_ALLOWED_USERS` (default empty) | If set, only these account IDs (plus admins and the Super User) can use the instance, and self-registration is off. |
| `LNBITS_REQUIRE_USER_ACTIVATION` | New accounts start inactive until activated. Activation can be by email (`LNBITS_USER_ACTIVATION_BY_EMAIL`), payment (`LNBITS_USER_ACTIVATION_BY_PAYMENT`) or invitation code (`LNBITS_USER_ACTIVATION_BY_INVITATION_CODE`). |
| `LNBITS_MAX_USERS` | Caps the number of accounts (0 = no limit). |

## Notifications {#notifications}

Instance-level notification channels are configured by the operator:

- Telegram: `LNBITS_TELEGRAM_NOTIFICATIONS_ENABLED`, `LNBITS_TELEGRAM_NOTIFICATIONS_ACCESS_TOKEN`, `LNBITS_TELEGRAM_NOTIFICATIONS_CHAT_ID`
- Email: `LNBITS_EMAIL_NOTIFICATIONS_ENABLED`, `LNBITS_EMAIL_NOTIFICATIONS_SERVER`, `LNBITS_EMAIL_NOTIFICATIONS_PORT`, `LNBITS_EMAIL_NOTIFICATIONS_USERNAME`, `LNBITS_EMAIL_NOTIFICATIONS_PASSWORD`, `LNBITS_EMAIL_NOTIFICATIONS_EMAIL`, `LNBITS_EMAIL_NOTIFICATIONS_TO_EMAILS`
- Nostr: `LNBITS_NOSTR_NOTIFICATIONS_ENABLED`, `LNBITS_NOSTR_NOTIFICATIONS_PRIVATE_KEY`, `LNBITS_NOSTR_NOTIFICATIONS_IDENTIFIERS`

Each user can then add their own destinations in `UserExtra.notifications`: `telegram_chat_id`, `email_address`, `nostr_identifier`, plus per-wallet exclusions and minimum amounts for incoming and outgoing payments.

## Labels {#labels}

Users can define labels for their payments. Each `UserLabel` has a `name`, an optional `description` and an optional `color` (`#RRGGBB`).

## Extensions per user {#access-control}

The `extensions` table records which extensions each user has turned on. Its columns are `"user"`, `extension`, `active`, `extra` and `permissions`.

Extensions listed in `LNBITS_ADMIN_EXTENSIONS` can only be used by admins. There is no manifest flag for this.

## Deleting a user {#delete-account}

An admin deletes a user with `DELETE /users/api/v1/user/{user_id}`. LNbits soft-deletes each of the user's wallets, then removes the account row. The Super User can't be deleted, and only the Super User can delete an admin.

## Rate limiting and IP blocking {#security-considerations}

These apply per client IP, not per user:

```bash
LNBITS_RATE_LIMIT_NO=200        # requests per unit, per IP (default 200)
LNBITS_RATE_LIMIT_UNIT=minute
LNBITS_BLOCKED_IPS="203.0.113.7"   # refused with 403
LNBITS_ALLOWED_IPS=""              # exceptions to the block list, not an allow-only list
```

The client IP is whatever Uvicorn reports. Behind a reverse proxy that is the real client only if the proxy sends `X-Forwarded-For` and its address is trusted by `FORWARDED_ALLOW_IPS` (default `*`). If LNbits can also be reached without the proxy, anyone can fake the header. See [Security](/docs/configuration/security).

## See also {#see-also}

- [Authentication Configuration](/docs/configuration/authentication)
- [Security Best Practices](/docs/configuration/security)
- [Admin UI](/docs/configuration/admin-ui)
