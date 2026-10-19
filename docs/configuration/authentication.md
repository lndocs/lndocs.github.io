---
sidebar_position: 3
title: Authentication
description: Configure LNbits v1.6.2 login methods, SSO callbacks, Nostr NIP-98, cookies and token expiry
last_update:
  date: 2026-10-19
verified_with: v1.6.2
---

# Authentication Configuration

:::note Checked against a running LNbits
Some statements on this page are tested against `lnbits/lnbits:v1.6.2` with FakeWallet, on every change to this site and weekly ([API claims workflow](https://github.com/lndocs/lndocs.github.io/actions/workflows/claims.yml)).
:::

This page covers how people **log in** to LNbits: accounts, sessions and SSO. Wallet API keys and ACL API tokens are covered in [API Authentication](/docs/api/authentication).

:::note Admin UI precedence
The auth settings on this page are editable. With the Admin UI on (the default), LNbits reads them from the database after the first start, so change them in **Settings → Security** at `/admin`. Editing `.env` only works on a fresh install or with `LNBITS_ADMIN_UI=false`. `AUTH_HTTPS_ONLY` and `AUTH_SECRET_KEY` are env-only. See [Settings precedence](/docs/configuration/environment).
:::

## Authentication methods {#authentication-methods}

`AUTH_ALLOWED_METHODS` takes values from the `AuthMethods` enum ([settings.py L915-935](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/settings.py#L915-L935)):

| Value | Login with | Default |
|---|---|---|
| `username-password` | A username (or email) and a password | **On** (the only default) |
| `user-id-only` | The account's user ID (`?usr=` URLs) | Off |
| `nostr-auth-nip98` | A Nostr key, through a signed NIP-98 event | Off |
| `google-auth` | Google OAuth | Off |
| `github-auth` | GitHub OAuth | Off |
| `keycloak-auth` | Keycloak (OpenID Connect) | Off |
| `oidc-auth` | Any OpenID Connect provider, such as Zitadel or Authentik | Off |

```bash title=".env (first start only)"
# Several methods, comma-separated. The default is username-password alone.
AUTH_ALLOWED_METHODS=username-password,nostr-auth-nip98,google-auth
```

On a running instance, pick the methods under **Allowed authorization methods** in **Settings → Security**; the provider fields appear once a method is selected ([security.vue](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/templates/components/admin/security.vue)).

:::caution Upgraded instances
The `username-password`-only default applies to new installs. An instance first started before v1.6.0 probably has `user-id-only` stored in its database settings, because the Admin UI copied the old default at first start. After upgrading, check **Settings → Security** in the Admin UI rather than assuming the new default. See [Upgrading](/docs/guides/upgrading).
:::

The Super User and admins must have a username and password. They can't log in with a user ID ([auth_api.py L177-191](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/auth_api.py#L177-L191)), and admin routes refuse an admin account that has no password ([decorators.py L390-419](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/decorators.py#L390-L419)).

## Tokens and cookies {#jwt-configuration}

A successful login returns a JWT and sets it as the `cookie_access_token` cookie (`HttpOnly`, `SameSite=Lax`) ([auth_api.py L664-692](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/auth_api.py#L664-L692)). Clients can also send the same token as `Authorization: Bearer <token>`.

| Setting | Default | Kind | Effect |
|---|---|---|---|
| `AUTH_SECRET_KEY` | empty | env-only | The key that signs the JWTs. If it's empty, LNbits generates a random key and stores it in `data/.lnbits_auth_key`. |
| `AUTH_HTTPS_ONLY` | `true` | env-only | Gives the cookies the `Secure` flag and makes SSO reject `http://`. |
| `AUTH_TOKEN_EXPIRE_MINUTES` | `525600` | editable | The lifetime of the token and the cookie: one year. |
| `AUTH_CREDETIALS_UPDATE_THRESHOLD` | `120` | editable | Seconds (the spelling is from the code). Changing a password or username requires a login within this window. It is also the lifetime of a password-reset key and the maximum age of a Nostr login event. |
| `AUTH_AUTHENTICATION_CACHE_MINUTES` | `10` | editable | |

To set your own key:

```bash
# Generate a key, then paste the output into .env as AUTH_SECRET_KEY=<value>.
# Leave AUTH_SECRET_KEY empty to use data/.lnbits_auth_key instead.
openssl rand -hex 32
```

Changing the key invalidates every session and every ACL API token. Wallet admin and invoice keys keep working.

:::caution Tokens aren't revoked in v1.6.2
LNbits doesn't track sessions. Logging out (`POST /api/v1/auth/logout`) deletes the cookie, but a copied token stays valid until it expires, and changing a password doesn't invalidate existing tokens. (A fix is on `dev` and isn't released.) If a token leaks, rotate `AUTH_SECRET_KEY`. Consider lowering `AUTH_TOKEN_EXPIRE_MINUTES` on shared instances.
:::

### Plain HTTP (testing only) {#plain-http}

With `AUTH_HTTPS_ONLY=true`, a browser won't send the session cookie back over plain HTTP, except to `localhost` in most browsers. As a result, login on `http://192.168.x.x:5000` seems to work and then bounces you back to the login page. For a test instance on a LAN or in a VM, set:

```bash title=".env"
AUTH_HTTPS_ONLY=false
```

Put any instance that holds real funds behind HTTPS and leave this setting `true`.

## Username and password {#usernamepassword}

The default method. Passwords must be 8 to 50 characters ([models/users.py L319-364](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/models/users.py#L319-L364)) and are hashed with bcrypt ([models/users.py](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/models/users.py)). After 5 failed attempts, logins for that account are throttled. The cooldown starts at 60 seconds and doubles each time, up to 15 minutes ([auth_api.py L83-130](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/auth_api.py#L83-L130)).

### Registration {#registration}

New users register at the home page (`POST /api/v1/auth/register`). Registration is controlled by:

```bash
LNBITS_ALLOW_NEW_ACCOUNTS=true        # false turns sign-up off
LNBITS_REQUIRE_USER_ACTIVATION=false  # true: new accounts need activating
```

### Password reset {#password-reset}

LNbits doesn't send reset emails. The **Super User** generates a reset key for a user from the Users page (`PUT /users/api/v1/user/{user_id}/reset_password`) and hands it over. The user then sets a new password with that key. The key expires after `AUTH_CREDETIALS_UPDATE_THRESHOLD` seconds (120 by default), so it has to be used right away ([user_api.py L191-209](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/user_api.py#L191-L209), [auth_api.py L529-566](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/auth_api.py#L529-L566)). The Super User's own password can't be reset this way.

## User ID only {#user-id-only}

The legacy mode. Anyone with a wallet URL such as `https://lnbits.example.com/wallet?usr=<user id>` is logged in as that user. It has been **off by default since v1.6.0**. Turn it on only if you need old bookmark-style wallet links:

```bash
AUTH_ALLOWED_METHODS=username-password,user-id-only
```

:::danger The user ID works like a password
With `user-id-only` on, the user ID alone gives full access to the account and every wallet in it. URLs leak through browser history, proxy logs, screenshots and the `Referer` header. Admins can't use this method.
:::

## Nostr (NIP-98) {#nostr-nip-98}

```bash
AUTH_ALLOWED_METHODS=username-password,nostr-auth-nip98
# Your public base URL, with no trailing slash
NOSTR_ABSOLUTE_REQUEST_URLS=https://lnbits.example.com
```

### How it works {#how-it-works}

The login page asks a NIP-07 browser signer (`window.nostr`) to sign a NIP-98 event, and posts it to `POST /api/v1/auth/nostr` as `Authorization: Nostr <base64 event>`. LNbits accepts the event only if all of these hold ([auth_api.py L778-825](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/auth_api.py#L778-L825)):

- the signature is valid, and the event kind is `27235`;
- `created_at` is within `AUTH_CREDETIALS_UPDATE_THRESHOLD` seconds (120) of the server time;
- the `method` tag is `POST`;
- the `u` tag equals one of `NOSTR_ABSOLUTE_REQUEST_URLS` with `/nostr` appended.

The browser builds the `u` tag from the page URL, so on `https://lnbits.example.com/` it signs `https://lnbits.example.com/nostr`. `NOSTR_ABSOLUTE_REQUEST_URLS` defaults to `http://127.0.0.1:5000` and `http://localhost:5000`. **On a real domain, Nostr login fails until you add your public URL.** A public key that LNbits hasn't seen before gets a new account.

## Single sign-on (Google, GitHub, Keycloak, OIDC) {#oauth}

All four providers use the same two routes ([auth_api.py L386-427](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/auth_api.py#L386-L427)):

| Step | Route |
|---|---|
| Start the login (the login button links here) | `GET /api/v1/auth/{provider}` |
| OAuth callback (register this URL with the provider) | `GET /api/v1/auth/{provider}/token` |

`{provider}` is `google`, `github`, `keycloak` or `oidc`. The redirect URI to register with the provider is therefore:

```text
https://lnbits.example.com/api/v1/auth/google/token
https://lnbits.example.com/api/v1/auth/github/token
https://lnbits.example.com/api/v1/auth/keycloak/token
https://lnbits.example.com/api/v1/auth/oidc/token
```

The variable names have **no `AUTH_` prefix** ([settings.py L960-983](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/settings.py#L960-L983)). A method is offered only when it is listed in `AUTH_ALLOWED_METHODS` **and** has both a client ID and a secret.

:::warning Behind a reverse proxy
LNbits builds the redirect URI from the incoming request: `request.base_url` plus `api/v1/auth/{provider}/token`. The proxy must pass the original `Host` header and `X-Forwarded-Proto: https`, and `FORWARDED_ALLOW_IPS` must trust the proxy. Otherwise LNbits sends an `http://` or internal-host redirect URI, and the provider rejects it as a mismatch. With `AUTH_HTTPS_ONLY=true`, SSO also refuses plain HTTP.
:::

SSO logins must include an email address. LNbits matches the account **by email**: if an account with that email exists, the SSO login signs into it and marks the email verified. Otherwise LNbits creates a new account ([auth_api.py L636-660](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/auth_api.py#L636-L660)). Only turn on providers that verify the email addresses they report.

### Google {#google-oauth}

```bash
AUTH_ALLOWED_METHODS=username-password,google-auth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an OAuth client ID of type "Web application", and add `https://<your-domain>/api/v1/auth/google/token` as an authorized redirect URI.

### GitHub {#github-oauth}

```bash
AUTH_ALLOWED_METHODS=username-password,github-auth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

In [GitHub Developer Settings](https://github.com/settings/developers), create an OAuth App. Set the "Authorization callback URL" to `https://<your-domain>/api/v1/auth/github/token`. The GitHub account needs an email address LNbits can read.

### Keycloak {#keycloak-oauth}

```bash
AUTH_ALLOWED_METHODS=username-password,keycloak-auth
KEYCLOAK_DISCOVERY_URL=https://keycloak.example.com/realms/<realm>/.well-known/openid-configuration
KEYCLOAK_CLIENT_ID=
KEYCLOAK_CLIENT_SECRET=
# Optional: login button label and icon
KEYCLOAK_CLIENT_CUSTOM_ORG=
KEYCLOAK_CLIENT_CUSTOM_ICON=
```

In Keycloak, create an OpenID Connect client with client authentication on, and add `https://<your-domain>/api/v1/auth/keycloak/token` as a valid redirect URI. LNbits requests the scopes `openid`, `email` and `profile`.

### Generic OIDC {#oidc}

```bash
AUTH_ALLOWED_METHODS=username-password,oidc-auth
OIDC_DISCOVERY_URL=https://idp.example.com/.well-known/openid-configuration
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=
# Optional, e.g. "Zitadel" shows "Login via Zitadel"
OIDC_CLIENT_CUSTOM_ORG=
OIDC_CLIENT_CUSTOM_ICON=
```

Register `https://<your-domain>/api/v1/auth/oidc/token` as the redirect URI, with the scopes `openid`, `email` and `profile`. Upstream's [OIDC guide](https://github.com/lnbits/lnbits/blob/v1.6.2/docs/guide/oidc-authentication.md) has a Zitadel walkthrough, but its variable names carry an `LNBITS_` prefix that LNbits doesn't read. Use the names above.

## Access restrictions {#access-restrictions}

```bash
# Only these users (plus admins) can use the instance; sign-up turns off
LNBITS_ALLOWED_USERS=<user id 1>,<user id 2>

# Turn off sign-up
LNBITS_ALLOW_NEW_ACCOUNTS=false

# Refuse requests from these client IPs (LNBITS_ALLOWED_IPS lists exceptions)
LNBITS_BLOCKED_IPS=203.0.113.7
```

Add your own account to `LNBITS_ALLOWED_USERS` first, or you lock yourself out of the UI. IP rules only work if LNbits sees the real client IP. See `FORWARDED_ALLOW_IPS` in [Security](/docs/configuration/security).

## Logout {#logout}

`POST /api/v1/auth/logout` deletes the auth cookies. See the caution under [Tokens and cookies](#jwt-configuration): the token itself stays valid until it expires.

## Audit log {#audit-logging}

The audit log is on by default. It records **HTTP requests**: by default, `POST`, `PUT`, `PATCH` and `DELETE` requests to `.*api/v1/.*` that return 4xx or 5xx, kept for 7 days. It has no dedicated "login event" type, but failed logins show up as 4xx requests to `/api/v1/auth`. Admins read it at `/audit`. To record client IPs, set `LNBITS_AUDIT_LOG_IP_ADDRESS=true`. The settings are in [Environment Variables](/docs/configuration/environment).

## Production checklist {#production-checklist}

- [ ] Leave `username-password` as the main method, and keep `user-id-only` off.
- [ ] Serve LNbits over HTTPS and keep `AUTH_HTTPS_ONLY=true`.
- [ ] Back up `data/.lnbits_auth_key`, or set `AUTH_SECRET_KEY` yourself and store it safely.
- [ ] Register the SSO redirect URIs exactly as `https://<domain>/api/v1/auth/<provider>/token`.
- [ ] Set `NOSTR_ABSOLUTE_REQUEST_URLS` if you allow Nostr login.
- [ ] Consider a shorter `AUTH_TOKEN_EXPIRE_MINUTES`.

## Troubleshooting {#troubleshooting}

### OAuth "redirect_uri mismatch" {#oauth-redirect-errors}

The URI must match `https://<domain>/api/v1/auth/<provider>/token` exactly: the scheme, the host, no trailing slash. If the provider shows `http://` or an internal host name, fix the proxy headers and `FORWARDED_ALLOW_IPS` (see [Single sign-on](#oauth)).

### "Login by 'google' not allowed" {#sso-not-allowed}

Either the method isn't in `AUTH_ALLOWED_METHODS`, or its client ID or secret is empty. With the Admin UI on, check **Settings → Security**, not `.env`.

### Logged out right after login {#jwt-token-expired}

You're on plain HTTP with `AUTH_HTTPS_ONLY=true`. See [Plain HTTP](#plain-http).

### Nostr: "Invalid value for tag 'u'" {#nostr-invalid-u}

Add your public base URL, with no trailing slash, to `NOSTR_ABSOLUTE_REQUEST_URLS`.

### Password reset key rejected {#password-reset-not-working}

The key expired. Reset keys last `AUTH_CREDETIALS_UPDATE_THRESHOLD` seconds (120). Generate a new one and use it right away.

## See Also {#see-also}

- [API Authentication](/docs/api/authentication)
- [Security](/docs/configuration/security)
- [Admin UI](/docs/configuration/admin-ui)
- [Official authentication guide](https://docs.lnbits.com/guide/authentication)
