---
sidebar_position: 4
title: Admin UI
description: The LNbits v1.6.2 Admin UI, first-install flow, Super User and admin roles, and what the UI controls
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Admin UI

The Admin UI is the browser interface for running an LNbits instance. It's **on by default** (`LNBITS_ADMIN_UI=true`, [settings.py L1285](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/settings.py#L1285)). While it's on, most settings live in the database, and the database overrides `.env` (see [Settings precedence](/docs/configuration/environment)).

:::danger The Super User and the admins control the funds
The Super User can switch the funding source, credit any wallet with sats out of thin air, restart the server and download a backup of all data. Give that account a strong, unique password, and use it only for the tasks that need it.

Admins are powerful too (this site's CI proves it against the v1.6.2 image). The UI hides the funding-source fields from them, but the settings API doesn't: an admin can read the funding-source credentials with `GET /admin/api/v1/settings` and change the funding source, its credentials and the admin list (`lnbits_admin_users`) with `PUT` or `PATCH /admin/api/v1/settings` ([admin_api.py L70-105](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/admin_api.py#L70-L105), [settings.py L1072-1095](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/settings.py#L1072-L1095), [crud/settings.py L35-48](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/crud/settings.py#L35-L48)). Only make someone an admin if you'd trust them with the node.
:::

## First start {#first-time-setup}

### Super User creation {#super-user-creation}

On the first start with an empty settings table, LNbits does the following ([services/users.py L162-221](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/services/users.py#L162-L221)):

1. It creates a Super User account with a wallet, unless `SUPER_USER` names an existing account.
2. It copies the editable settings from the environment into the database.
3. It writes the Super User ID to `<data folder>/.super_user` (only while the Admin UI is on). That's `./data/.super_user` for a source install and `/app/data/.super_user` in Docker.
4. It switches to **first-install mode**. Every page request redirects to `/first_install` until the Super User has a username and password ([middleware.py L231-240](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/middleware.py#L231-L240)).

Open the instance in a browser. On `/first_install`, pick the Super User's username and password. LNbits saves them (`PUT /api/v1/auth/first_install`) and logs you in ([auth_api.py L601-633](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/auth_api.py#L601-L633)). Upstream's walkthrough with screenshots is on [docs.lnbits.com](https://docs.lnbits.com/guide/installation/first-setup).

:::warning Protect `/first_install` on a reachable server
Until someone completes `/first_install`, **whoever reaches the page first becomes the Super User**. If the server is reachable by others while you set it up, set a token in `.env` before the first start:

```bash
# Generate a token with: openssl rand -hex 16, then paste it here
FIRST_INSTALL_TOKEN=
```

The page then asks for that token. If you later change `FIRST_INSTALL_TOKEN` to a value different from the one that was confirmed, the next start logs "First install token is changed. Resetting admin settings.", creates a new Super User account and runs `/first_install` again ([services/users.py L188-192](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/services/users.py#L188-L192)). Upstream added this reset in v1.5.3 so that a lost Super User can be replaced.
:::

### Finding the Super User ID {#find-super-user-id}

```bash
# Source install
uv run lnbits-cli superuser

# Docker (the file sits in the mounted data folder)
docker exec lnbits cat /app/data/.super_user

# Or read the file directly
cat data/.super_user
```

The start-up log says only "Admin UI is enabled. run `uv run lnbits-cli superuser` to get the superuser". It doesn't print the ID. `lnbits-cli superuser-url` prints a `?usr=` link, but that link can't log you in: the Super User and admins must log in with a username and password ([commands.py L109-127](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/commands.py#L109-L127)).

### Where things are {#access-the-admin-ui}

After login, admins get extra entries under **Manage** in the sidebar ([components.vue](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/templates/components.vue), routes in [generic.py L190-196](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/generic.py#L190-L196)):

| Sidebar entry | Path | Page |
|---|---|---|
| **Settings** | `/admin` | Instance settings (the tabs below) |
| **Users** | `/users` | Users and their wallets |
| **API Watch** | `/audit` | Audit log |
| **Node** | `/node` | Node management (when `LNBITS_NODE_UI=true` and the backend supports it) |
| **Extensions** | `/extensions` | Install and manage extensions |
| (no entry) | `/admin/extensions/wasm`, `/admin/extensions/wasm/limits` | Installed WASM extensions and their runtime limits |

## Roles {#user-roles}

| Capability | Admin | Super User |
|---|---|---|
| Open the Admin UI, change instance settings | ✓ | ✓ |
| Manage users and wallets, read the audit log | ✓ | ✓ |
| Install and manage extensions | ✓ | ✓ |
| **Change the funding source** in the UI | — (the API allows it, see the warning above) | ✓ |
| **Credit or debit a wallet** (`PUT /users/api/v1/balance`) | — | ✓ |
| **Grant or revoke admin rights** on the Users page | — (an admin can still edit `lnbits_admin_users` through the settings API) | ✓ |
| **Generate password-reset keys** | — | ✓ |
| **Restart the server, reset settings to defaults** | — | ✓ |
| **Download the backup** (`GET /admin/api/v1/backup`) | — | ✓ |

Sources: [admin_api.py](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/admin_api.py), [user_api.py](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/user_api.py) (`check_super_user` on these routes), and the `isSuperUser` checks in the Funding tab. Upstream's role guide is [docs.lnbits.com: Super User](https://docs.lnbits.com/guide/core/super-user).

### Super User {#super-user}

There is exactly one Super User. Admins can't demote or delete it. To make a different account the Super User, set `SUPER_USER` in `.env` to that account's ID and restart. You need shell access to the host to do this.

### Admins {#admin}

The Super User makes an account an admin on the **Users** page (`PUT /users/api/v1/user/{user_id}/admin`), or you list the admins in `LNBITS_ADMIN_USERS`. Before first start that's in `.env`; afterwards it's in **Settings → Users**. An admin account must have a username and password, or every admin route refuses it ([decorators.py L390-405](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/decorators.py#L390-L405)). See the warning at the top of this page before you add one.

## What the Admin UI controls {#admin-ui-sections}

The tabs on `/admin` in v1.6.2, in the groups the page shows them in ([admin.js L48-110](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/static/js/pages/admin.js#L48-L110), [components/admin/](https://github.com/lnbits/lnbits/tree/v1.6.2/lnbits/templates/components/admin)):

| Group | Tab | What it holds |
|---|---|---|
| Money | **Funding** | Balances, node UI switches, retries, fee reserve, invoice expiry, payment timeouts, watchdog. The funding source picker and its credentials are shown to the Super User only. |
| Money | **Payments** | Service fees, Lightning Address options, currencies, payment limits, wallet limits |
| Money | **Exchanges** | The price aggregator and the fallback rate providers |
| Money | **Fiat providers** | Stripe, PayPal, Square, Revolut |
| Access | **Security** | Auth methods, token expiry, SSO credentials, Nostr URLs, base URL, IP block and allow lists, rate limiter, callback and LNURL URL rules |
| Access | **Users** | Admin users, allowed users, account creation, activation codes |
| System | **Extensions** | Manifests (Python and WASM), admin-only and default-enabled extensions, extension builder, hide API |
| System | **Notifications** | Telegram, email and Nostr notifications for admins |
| System | **API Watch** | Audit log settings |
| Appearance | **Assets** | Upload size, type and count limits |
| Appearance | **Site Customisation** | Title, tagline, description, themes, logo, ads |
| Appearance | **Block Explorer** | The Electrum-based block explorer (v1.6.0+) |

The WASM runtime limits have their own page at `/admin/extensions/wasm/limits`.

The toolbar has **Save**, **Restart server** (Super User only), **Download database backup** (the button shows for every admin, but only the Super User can use it) and **Reset to defaults** (Super User only).

## Database versus environment {#database-vs-environment}

With the Admin UI on:

- **Editable settings** (all of the tabs above) are read from the database. Changing them in `.env` does nothing after the first start.
- **Env-only settings** (`HOST`, `PORT`, `FORWARDED_ALLOW_IPS`, `AUTH_HTTPS_ONLY`, `AUTH_SECRET_KEY`, `LNBITS_DATA_FOLDER`, `LNBITS_DATABASE_URL`, `FIRST_INSTALL_TOKEN`, `SUPER_USER`, `LNBITS_ALLOWED_FUNDING_SOURCES`, `LNBITS_EXTENSIONS_DEFAULT_INSTALL` and so on) still come from the environment.

To make `.env` count again:

| Method | Effect |
|---|---|
| `lnbits-cli delete-settings` (LNbits stopped) | Deletes all stored settings. The next start copies them from the environment again and, unless `SUPER_USER` is set, creates a new Super User and runs `/first_install`. |
| `LNBITS_ADMIN_UI=false` | LNbits ignores the stored settings and uses `.env` only. The admin pages return 503. Admin rights come only from `SUPER_USER` and `LNBITS_ADMIN_USERS`. |

**Reset to defaults** (Super User) is not one of them. It deletes the stored settings except the Super User, the funding-source settings and the web-push keys, then restarts ([crud/settings.py L78-87](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/crud/settings.py#L78-L87)). Because the Super User row survives, the next start doesn't copy from `.env`: the other editable settings come back at their built-in defaults from `settings.py`.

There is no `_OVERRIDE` suffix or any other per-variable override.

## Funding source {#funding-source-management}

### Changing the backend {#changing-backend-super-user-only}

In the UI only the Super User sees the funding-source picker. Any admin can still change it through `PUT /admin/api/v1/settings` (see the warning at the top).

1. Download a backup (**Download database backup**).
2. Open **Settings → Funding** and scroll to **Funding Sources**.
3. Pick the class in the **Funding Source** drop-down and fill in its fields. Only the classes in `LNBITS_ALLOWED_FUNDING_SOURCES` are offered.
4. Click **Save**. The notice ends with "Restart required!".
5. Click **Restart server**.

If the backend fails to connect after `FUNDING_SOURCE_MAX_RETRIES` attempts (4), LNbits falls back to VoidWallet and logs why.

### Checking the connection {#testing-connection}

The Funding tab shows `Funding source: <class>` with the node balance and the LNbits balance. Admins can also call `GET /api/v1/status`, which returns the funding source class, its error message and its balance for admin accounts ([api.py L46-67](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/api.py#L46-L67)).

## Server management {#server-management}

- **Restart:** the **Restart server** button, Super User only (`GET /admin/api/v1/restart`).
- **Background tasks:** `GET /admin/api/v1/monitor` lists the running tasks (admin).
- **Health:** `GET /api/v1/health` returns `server_time` and `up_time`, with no authentication.
- **Backup:** see [Database → Backups](/docs/configuration/database).

## Extensions {#extension-management}

Admins install extensions from **Extensions** in the sidebar. Users can then enable them for their own account. For the full flow, see [Installing Extensions](/docs/extensions/installing).

:::warning Python extensions aren't sandboxed
A Python extension runs inside the LNbits process, with full access to the database, the funding source and the files. Installing one is the same as running its code on your server. Only install Python extensions you trust. WASM extensions (v1.6.0+) run in a sandbox with permissions that you grant at install time. The WASM registry is on by default and isn't vetted.
:::

Related settings:

- `LNBITS_EXTENSIONS_DEFAULT_INSTALL` (env-only): extensions the **server** installs at startup.
- `LNBITS_USER_DEFAULT_EXTENSIONS` (editable): extensions **enabled for new users**.
- `LNBITS_ADMIN_EXTENSIONS` (editable): extensions only admins can use.
- `LNBITS_EXTENSIONS_MANIFESTS` / `LNBITS_WASM_EXTENSIONS_MANIFESTS`: the registries. A manifest's entries need `id`, `name`, `version`, `archive` and `hash`. For the format, see [Extension Manifest](/docs/extensions/manifest) and [core/models/extensions.py](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/models/extensions.py).

## User management {#user-management}

### Credit or debit a wallet (Super User only) {#creditdebit-account-super-user-only}

The Super User sees a **Credit / Debit** button by the balance on the wallet page and on the Users page. Type an amount and press **Enter**; a negative amount debits. It calls `PUT /users/api/v1/balance` with `{id, amount}` ([user_api.py L398-418](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/user_api.py#L398-L418)). There is no reason field, but an admin notification is sent when notifications are configured.

:::caution
Crediting creates balance that isn't backed by your node. On a real funding source, credit only to correct errors.
:::

### Delete a user {#delete-user}

On the **Users** page, deleting a user deletes their wallets and then the account. Admins can't delete the Super User, and only the Super User can delete another admin ([user_api.py L163-188](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/user_api.py#L163-L188)).

## Best practices {#best-practices}

### Security {#security}

- Set `FIRST_INSTALL_TOKEN` on any server that others can reach during setup.
- Use the Super User only for funding, credits, restarts and backups. Give operators admin accounts only if you'd trust them with the node.
- Keep the [Security](/docs/configuration/security) checklist in view.

### Operations {#operations}

- After an upgrade, review **Settings**. New settings appear with their defaults, and old stored values stay as they were.

### Restricting access {#access}

Consider limiting the admin pages and APIs to trusted IPs at the reverse proxy. The UI calls the APIs itself, so restrict the pages and their API prefixes together:

```nginx
# Inside your LNbits server block
location ~ ^/(admin|users|audit|node)(/|$) {
    allow 192.168.1.0/24;   # your admin network
    deny all;
    proxy_pass http://127.0.0.1:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

This regex also covers `/admin/api/v1/...` and `/users/api/v1/...`. Admin actions that go through `/api/v1/...` (for example extension installs) aren't covered.

## Disabling the Admin UI {#disabling-admin-ui}

```bash title=".env"
LNBITS_ADMIN_UI=false
```

Restart LNbits. All settings then come from `.env`, and `/admin`, `/users`, `/audit` and `/node` return 503 ([decorators.py L583-587](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/decorators.py#L583-L587)). The admin APIs stay, for `SUPER_USER` and `LNBITS_ADMIN_USERS` from `.env`. The settings already stored in the database are ignored, not deleted.

## See Also {#see-also}

- [Environment Variables](/docs/configuration/environment)
- [Authentication](/docs/configuration/authentication)
- [Security](/docs/configuration/security)
- [Official Admin dashboard guide](https://docs.lnbits.com/guide/admin-dashboard)
