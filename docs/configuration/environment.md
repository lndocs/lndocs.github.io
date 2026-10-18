---
sidebar_position: 1
title: Environment Variables
description: Curated reference for LNbits v1.6.2 settings, their defaults, and how the Admin UI and database override .env
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Environment Variables

LNbits reads its configuration from environment variables and from a `.env` file in its working directory. Each setting is a field in [`lnbits/settings.py`](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/settings.py), and the variable name is the field name in upper case (`auth_https_only` becomes `AUTH_HTTPS_ONLY`). Names aren't case-sensitive and have no prefix.

LNbits v1.6.2 has 338 settings you can set. This page covers the ones most operators need, grouped by area, with the v1.6.2 default for each. The [Environment variable reference](/docs/configuration/env-reference) lists all of them, with their types, their defaults and whether the Admin UI manages them, generated from the official image. Where `.env.example` and `settings.py` disagree, the real default is the one in `settings.py`. The official docs also have an [environment page](https://docs.lnbits.com/guide/core/environment).

## Settings precedence {#settings-precedence}

:::warning The Admin UI is on by default, and the database overrides `.env`
`LNBITS_ADMIN_UI` defaults to `true` ([settings.py L1285](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/settings.py#L1285)). With it on, LNbits has two kinds of setting:

- **Env-only settings** are always read from the environment. They cover the server, paths, the database, the auth key, the first-install token and the allowed funding sources, and they're marked **env-only** below.
- **Editable settings** are everything else: the funding source, fees, auth methods, branding, rate limits, notifications and so on. LNbits copies them from the environment into the database **once**, on the first start, and reads them from the database after that. Changing them in `.env` then has **no effect** ([services/users.py L162-178](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/services/users.py#L162-L178)).

To change an editable setting on a running instance, use the [Admin UI](/docs/configuration/admin-ui) at `/admin`. To make `.env` count again, you have two options:

- Set `LNBITS_ADMIN_UI=false`. The admin pages then return 503, and admin rights come only from `SUPER_USER` and `LNBITS_ADMIN_USERS` in `.env`.
- Stop LNbits and run `lnbits-cli delete-settings`. It wipes the stored settings ([commands.py L129-135](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/commands.py#L129-L135)), so the next start copies them from the environment again. Unless `SUPER_USER` is set, that start also creates a **new** Super User and sends you through `/first_install` again ([services/users.py L198-212](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/services/users.py#L198-L212)).

The **Reset to defaults** button in the Admin UI doesn't do this. It resets editable settings to the built-in defaults in `settings.py`, not to `.env`. The same applies to settings that a new release adds: they start at their built-in default, whatever `.env` says.
:::

When a setting has more than one source, the highest one in this list wins:

1. Command-line flags to `lnbits` (`--host`, `--port`, `--forwarded-allow-ips`). They override `HOST`, `PORT` and `FORWARDED_ALLOW_IPS` ([server.py](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/server.py)).
2. The values stored in the database, for editable settings while the Admin UI is on.
3. Process environment variables.
4. The `.env` file.
5. The defaults in `settings.py`.

List values take a comma-separated string or JSON, and LNbits strips the spaces: `LNBITS_ADMIN_USERS="id1,id2"`.

## Server {#server-configuration}

All of these are **env-only** ([settings.py L1130-1160](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/settings.py#L1130-L1160)).

| Variable | Default | Notes |
|---|---|---|
| `HOST` | `127.0.0.1` | The address to bind to. Keep `127.0.0.1` when LNbits sits behind a reverse proxy. |
| `PORT` | `5000` | |
| `FORWARDED_ALLOW_IPS` | `*` | The proxies LNbits trusts to set `X-Forwarded-For` and `X-Forwarded-Proto`. `*` trusts every client. See [Security](/docs/configuration/security). |
| `AUTH_HTTPS_ONLY` | `true` | Gives auth cookies the `Secure` flag and makes SSO reject plain HTTP. Set it to `false` only for plain-HTTP test setups. |
| `DEBUG` | `false` | Sets the log level to DEBUG (INFO otherwise). LNbits has no separate log-level setting. |
| `DEBUG_DATABASE` | `false` | Logs every SQL statement. |
| `ENABLE_LOG_TO_FILE` | `true` | Writes logs to `<data folder>/logs/`. |
| `LOG_ROTATION` / `LOG_RETENTION` | `100 MB` / `3 months` | In [loguru](https://loguru.readthedocs.io/en/stable/api/logger.html#file) format. |
| `FIRST_INSTALL_TOKEN` | unset | If set, `/first_install` asks for this token before it sets the Super User's credentials. |
| `LNBITS_MAX_USERS` | `0` | A hard cap on the number of accounts. `0` means no limit. |
| `LNBITS_MAX_EXTENSIONS` | `0` | A hard cap on installed extensions. `0` means no limit. |

:::note Docker
The `lnbits/lnbits` image starts LNbits with explicit `--host`, `--port` and `--forwarded-allow-ips='*'` flags ([Dockerfile](https://github.com/lnbits/lnbits/blob/v1.6.2/Dockerfile)). Inside the container, `HOST`, `PORT` and `FORWARDED_ALLOW_IPS` therefore do nothing. The image takes its host and port from two variables of its own, shown below. To change the trusted proxies, you have to override the container's command.
:::

```bash
# Read by the start command of the lnbits/lnbits image (defaults shown)
LNBITS_HOST=0.0.0.0
LNBITS_PORT=5000
```

## Data and database {#data-directory}

**Env-only** ([settings.py L1184-1213](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/settings.py#L1184-L1213)).

| Variable | Default | Notes |
|---|---|---|
| `LNBITS_DATA_FOLDER` | `./data` | Holds the SQLite files, `.lnbits_auth_key`, `.super_user`, logs and extension files. Back up the whole folder. |
| `LNBITS_DATABASE_URL` | unset | Unset means SQLite. For PostgreSQL use `postgres://user:pass@host:5432/db`. LNbits refuses to start with `postgresql://`. CockroachDB uses `cockroachdb://`. See [Database](/docs/configuration/database). |
| `LNBITS_EXTENSIONS_PATH` | `lnbits` | Python extensions go into `<path>/extensions`. In Docker, point it at the data volume, for example `/app/data/extensions`. |
| `LNBITS_WASM_EXTENSIONS_PATH` | `<data folder>/wasm_extensions` | Must be outside the Python extension directories. |

## Admin and Super User {#admin--security}

| Variable | Default | Kind | Notes |
|---|---|---|---|
| `LNBITS_ADMIN_UI` | `true` | env-only | See [Settings precedence](#settings-precedence). |
| `SUPER_USER` | empty | env-only | The ID of an existing account to make the Super User. Leave it empty and LNbits creates one. If you set it, it replaces the Super User stored in the database. |
| `AUTH_SECRET_KEY` | empty | env-only | Signs login tokens and API tokens. Leave it empty and LNbits generates a random key and stores it in `<data folder>/.lnbits_auth_key` ([settings.py L1169-1182](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/settings.py#L1169-L1182)). To set your own, generate one with `openssl rand -hex 32`. Changing it logs everyone out. |
| `LNBITS_ADMIN_USERS` | empty | editable | Account IDs with admin rights. Admins must have a username and password. |
| `LNBITS_ALLOWED_FUNDING_SOURCES` | 23 classes | env-only | The funding sources the Admin UI offers. The default list leaves out `SparkWallet` and `ClicheWallet` ([settings.py L1215-1242](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/settings.py#L1215-L1242)). |

## Users and access {#access-control}

Editable ([settings.py L44-74](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/settings.py#L44-L74), [L467-497](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/settings.py#L467-L497)).

| Variable | Default | Notes |
|---|---|---|
| `LNBITS_ALLOW_NEW_ACCOUNTS` | `true` | Lets people sign up. |
| `LNBITS_ALLOWED_USERS` | empty | If not empty, only these users and the admins can use the instance, and sign-up is off. |
| `LNBITS_REQUIRE_USER_ACTIVATION` | `false` | New accounts need activating, by email, payment or invitation code (see the `LNBITS_USER_ACTIVATION_BY_*` settings). |
| `LNBITS_BLOCKED_IPS` | empty | Requests from these client IPs get a `403`. |
| `LNBITS_ALLOWED_IPS` | empty | Exceptions to `LNBITS_BLOCKED_IPS`. |
| `LNBITS_RATE_LIMIT_NO` / `LNBITS_RATE_LIMIT_UNIT` | `200` / `minute` | A per-IP limit that covers every route. The unit is `second`, `minute`, `hour` or `day`. |

### Limits and outbound requests {#limits}

Editable ([settings.py L467-497](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/settings.py#L467-L497)).

| Variable | Default | Notes |
|---|---|---|
| `LNBITS_CALLBACK_URL_RULES` | one regex that allows `http(s)://` plus a domain name | The origin of a webhook or LNURL callback must match a rule ([helpers.py L263-293](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/helpers.py#L263-L293)). A bare IP address or a single-label host doesn't match the default. |
| `LNBITS_CALLBACK_ALLOW_PRIVATE_IPS` | `false` | LNbits refuses webhooks that resolve to private or non-global IPs. |
| `LNBITS_LNURL_ALLOW_PRIVATE_IPS` | `false` | The same rule for LNURL requests. |
| `LNBITS_LNURL_REDIRECT_URL_RULES` | empty | LNbits follows an LNURL HTTP redirect only to an origin that matches a rule. Empty means it follows none. |
| `LNBITS_WALLET_LIMIT_MAX_BALANCE` | `0` | The highest balance a wallet may hold, in sats. `0` turns the limit off. |
| `LNBITS_WALLET_LIMIT_DAILY_MAX_WITHDRAW` | `0` | The daily outgoing cap per wallet, in sats. `0` turns it off. |
| `LNBITS_WALLET_LIMIT_SECS_BETWEEN_TRANS` | `0` | The minimum number of seconds between transactions. |
| `LNBITS_MAX_OUTGOING_PAYMENT_AMOUNT_SATS` | `10000000` | |
| `LNBITS_MAX_INCOMING_PAYMENT_AMOUNT_SATS` | `10000000` | |
| `LNBITS_ONLY_ALLOW_INCOMING_PAYMENTS` | `false` | |
| `LNBITS_WATCHDOG_SWITCH_TO_VOIDWALLET` | `false` | Switches to VoidWallet when the node balance drifts by more than `LNBITS_WATCHDOG_DELTA` (`1000000`) sats. |

## Authentication {#authentication}

Editable ([settings.py L915-983](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/settings.py#L915-L983)). For how each method works, see [Authentication](/docs/configuration/authentication).

| Variable | Default | Notes |
|---|---|---|
| `AUTH_ALLOWED_METHODS` | `username-password` | The valid values are `user-id-only`, `username-password`, `nostr-auth-nip98`, `google-auth`, `github-auth`, `keycloak-auth` and `oidc-auth`. |
| `AUTH_TOKEN_EXPIRE_MINUTES` | `525600` | One year. |
| `AUTH_CREDETIALS_UPDATE_THRESHOLD` | `120` | In seconds, and spelled this way in the code. It sets the window for changing credentials, the lifetime of a password-reset key and the maximum age of a Nostr login event. |
| `AUTH_AUTHENTICATION_CACHE_MINUTES` | `10` | |
| `NOSTR_ABSOLUTE_REQUEST_URLS` | `http://127.0.0.1:5000`, `http://localhost:5000` | Set it to your public URL to use Nostr login. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | empty | There is no `AUTH_` prefix. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | empty | |
| `KEYCLOAK_DISCOVERY_URL` / `KEYCLOAK_CLIENT_ID` / `KEYCLOAK_CLIENT_SECRET` | empty | Also `KEYCLOAK_CLIENT_CUSTOM_ORG` and `KEYCLOAK_CLIENT_CUSTOM_ICON`. |
| `OIDC_DISCOVERY_URL` / `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET` | empty | Also `OIDC_CLIENT_CUSTOM_ORG` and `OIDC_CLIENT_CUSTOM_ICON`. |

`AUTH_HTTPS_ONLY` and `AUTH_SECRET_KEY` are env-only, so they're listed under [Server](#server-configuration) and [Admin and Super User](#admin--security).

## Funding source {#funding-source}

Editable. With the Admin UI on, the Super User sets these under **Settings → Funding**, not in `.env`.

| Variable | Default | Notes |
|---|---|---|
| `LNBITS_BACKEND_WALLET_CLASS` | `VoidWallet` | VoidWallet can't create or pay invoices. For testing, use `FakeWallet` ([settings.py L821](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/settings.py#L821)). |
| `LNBITS_FUNDING_SOURCE_PAY_INVOICE_WAIT_SECONDS` | `5` | How long LNbits waits before it reports an outgoing payment as pending. |
| `FUNDING_SOURCE_MAX_RETRIES` | `4` | How many times LNbits retries the connection at startup before it falls back to VoidWallet. It's set on the Funding tab. |
| `LIGHTNING_INVOICE_EXPIRY` | `3600` | In seconds. |
| `FAKE_WALLET_SECRET` | `ToTheMoon1` | The secret FakeWallet signs its test invoices with. |
| `LNBITS_DENOMINATION` | `sats` | The unit name FakeWallet uses. |

The funding source classes in v1.6.2 ([wallets/\_\_init\_\_.py](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/wallets/__init__.py)) are `AlbyWallet`, `BarkWallet`, `BlinkWallet`, `BoltzWallet`, `BreezLiquidSdkWallet`, `BreezSdkWallet`, `CLNRestWallet`, `ClicheWallet`, `CoreLightningRestWallet`, `CoreLightningWallet`, `EclairWallet`, `FakeWallet`, `LNbitsWallet`, `LNPayWallet`, `LndRestWallet`, `LndWallet`, `LnTipsWallet`, `NWCWallet`, `OpenNodeWallet`, `PhoenixdWallet`, `SparkL2Wallet`, `SparkWallet`, `StrikeWallet`, `VoidWallet` and `ZBDWallet`.

:::caution Dead or deprecated backends
The Alby shared wallet closed on 2025-01-04. The LNPay and LN.tips services are gone. c-lightning-REST (`CoreLightningRestWallet`) is archived, and the Breez Greenlight and Breez Liquid SDKs are deprecated. Don't pick any of these for a new install. See [Funding Sources](/docs/funding-sources/overview).
:::

Each backend's own variables are on its page under [Funding Sources](/docs/funding-sources/overview). Two sets that people often get wrong:

- **LND REST:** `LND_REST_ENDPOINT`, `LND_REST_CERT`, and one of `LND_REST_MACAROON` (hex or a file path) or `LND_REST_MACAROON_ENCRYPTED` (the output of `lnbits-cli encrypt macaroon`).
- **Core Lightning (CLNRest):** `CLNREST_URL`, `CLNREST_CA` and/or `CLNREST_CERT`, and three runes: `CLNREST_READONLY_RUNE` (required), `CLNREST_INVOICE_RUNE` and `CLNREST_PAY_RUNE`. `CLNREST_RENEPAY_RUNE` is optional, and only v23.08 needs `CLNREST_NODEID`. Older guides use a single CLNREST_RUNE, which doesn't exist. `.env.example` has [least-privilege recipes for the runes](https://github.com/lnbits/lnbits/blob/v1.6.2/.env.example#L155-L166).

## Extensions {#extensions}

| Variable | Default | Kind | Notes |
|---|---|---|---|
| `LNBITS_EXTENSIONS_DEFAULT_INSTALL` | empty | env-only | Extensions the server installs at startup, and installs again if someone removes them. (`.env.example` sets `tpos`.) |
| `LNBITS_USER_DEFAULT_EXTENSIONS` | empty | editable | Extensions turned on for every new user. |
| `LNBITS_ADMIN_EXTENSIONS` | empty | editable | Extensions that only admins can use. |
| `LNBITS_EXTENSIONS_DEACTIVATE_ALL` | `false` | editable | |
| `LNBITS_EXTENSIONS_MANIFESTS` | `https://raw.githubusercontent.com/lnbits/lnbits-extensions/main/extensions.json` | editable | |
| `LNBITS_WASM_EXTENSIONS_MANIFESTS` | `https://raw.githubusercontent.com/lnbits/lnbits-extensions-wasm/refs/heads/main/extensions.json` | editable | The WASM registry is on by default and isn't vetted. |
| `LNBITS_EXT_GITHUB_TOKEN` | empty | env-only | Raises the GitHub API rate limit for extension downloads. |

The WASM runtime limits (`WASM_RUNTIME_MAX_MEMORY_BYTES` and the rest) are editable. They're listed in [settings.py L104-129](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/settings.py#L104-L129).

## Fees {#fees}

Editable ([settings.py L380-396](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/settings.py#L380-L396)).

| Variable | Default | Notes |
|---|---|---|
| `LNBITS_SERVICE_FEE` | `0` | A percentage of each outgoing payment. |
| `LNBITS_SERVICE_FEE_MAX` | `0` | A cap in sats. `0` means no cap. |
| `LNBITS_SERVICE_FEE_WALLET` | unset | The wallet that collects the fees. |
| `LNBITS_SERVICE_FEE_IGNORE_INTERNAL` | `true` | Payments between LNbits wallets pay no fee. |
| `LNBITS_RESERVE_FEE_MIN` | `2000` | The minimum routing-fee reserve, in msat. |
| `LNBITS_RESERVE_FEE_PERCENT` | `1.0` | |

See [Service Fees](/docs/guides/service-fees).

## Site customization {#site-customization}

Editable ([settings.py L292-346](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/settings.py#L292-L346)).

| Variable | Default |
|---|---|
| `LNBITS_SITE_TITLE` | `LNbits` |
| `LNBITS_SITE_TAGLINE` | `free and open-source lightning wallet` |
| `LNBITS_SITE_DESCRIPTION` | `The world's most powerful suite of bitcoin tools.` |
| `LNBITS_DEFAULT_WALLET_NAME` | `LNbits wallet` |
| `LNBITS_THEME_OPTIONS` | `classic`, `freedom`, `mint`, `salvador`, `monochrome`, `autumn`, `cyber`, `flamingo`, `bitcoin` |
| `LNBITS_DEFAULT_THEME` | `bitcoin` |
| `LNBITS_BASEURL` | `http://127.0.0.1:5000/` |
| `LNBITS_HIDE_API` | `false` |
| `LNBITS_AD_SPACE_ENABLED` | `false` |

## Node UI and block explorer {#node-ui}

Editable ([settings.py L894-912](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/settings.py#L894-L912)).

| Variable | Default | Notes |
|---|---|---|
| `LNBITS_NODE_UI` | `false` | A node management page for admins. |
| `LNBITS_PUBLIC_NODE_UI` | `false` | |
| `LNBITS_NODE_UI_TRANSACTIONS` | `false` | |
| `LNBITS_BLOCKEXPLORER_ENABLED` | `false` | New in v1.6.0. It uses an Electrum server. |
| `LNBITS_BLOCKEXPLORER_ELECTRUM_URL` | `ssl://electrum.blockstream.info:50002` | |
| `LNBITS_BLOCKEXPLORER_NETWORK` | `main` | `main`, `test`, `regtest` or `signet`. |
| `LNBITS_BLOCKEXPLORER_PUBLIC_API` | `false` | |

## Audit log {#logging}

Editable and **on by default** ([settings.py L986-1009](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/settings.py#L986-L1009)). It records HTTP requests, not named events.

| Variable | Default |
|---|---|
| `LNBITS_AUDIT_ENABLED` | `true` |
| `LNBITS_AUDIT_RETENTION_DAYS` | `7` |
| `LNBITS_AUDIT_LOG_IP_ADDRESS` | `false` |
| `LNBITS_AUDIT_LOG_REQUEST_BODY` | `false` |
| `LNBITS_AUDIT_INCLUDE_PATHS` | `.*api/v1/.*` |
| `LNBITS_AUDIT_EXCLUDE_PATHS` | `/static` |
| `LNBITS_AUDIT_HTTP_METHODS` | `POST`, `PUT`, `PATCH`, `DELETE` |
| `LNBITS_AUDIT_HTTP_RESPONSE_CODES` | `4.*`, `5.*` |

## Notifications {#notifications}

Editable. These send notifications to the **admins** (server start and stop, settings changes, large payments). They don't email users ([settings.py L499-543](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/settings.py#L499-L543)).

| Variable | Default |
|---|---|
| `LNBITS_TELEGRAM_NOTIFICATIONS_ENABLED` | `false` |
| `LNBITS_TELEGRAM_NOTIFICATIONS_ACCESS_TOKEN` | empty |
| `LNBITS_TELEGRAM_NOTIFICATIONS_CHAT_ID` | empty |
| `LNBITS_EMAIL_NOTIFICATIONS_ENABLED` | `false` |
| `LNBITS_EMAIL_NOTIFICATIONS_SERVER` | `smtp.protonmail.ch` |
| `LNBITS_EMAIL_NOTIFICATIONS_PORT` | `587` |
| `LNBITS_EMAIL_NOTIFICATIONS_USERNAME`, `LNBITS_EMAIL_NOTIFICATIONS_PASSWORD`, `LNBITS_EMAIL_NOTIFICATIONS_EMAIL` | empty |
| `LNBITS_EMAIL_NOTIFICATIONS_TO_EMAILS` | empty |
| `LNBITS_NOSTR_NOTIFICATIONS_ENABLED` | `false` |
| `LNBITS_NOSTR_NOTIFICATIONS_PRIVATE_KEY`, `LNBITS_NOSTR_NOTIFICATIONS_IDENTIFIERS` | empty |

## Exchange rates {#exchange-rates}

Editable ([settings.py L398-466](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/settings.py#L398-L466)). You configure the providers in **Settings → Exchanges**.

| Variable | Default | Notes |
|---|---|---|
| `LNBITS_PRICE_AGGREGATOR_ENABLED` | `true` | LNbits asks `LNBITS_PRICE_AGGREGATOR_URL` (`https://price.lnbits.com`) for fiat rates first, so your price lookups leave your server. |
| `LNBITS_EXCHANGE_RATE_PROVIDERS` | Binance, Blockchain, Exir, Bitfinex, Bitstamp, Coinbase, Kraken, yadio | A list of provider objects, used when the aggregator fails. |
| `LNBITS_EXCHANGE_RATE_CACHE_SECONDS` | `60` | |

## A minimal `.env` {#example-env-file}

Here is a starting point for a self-hosted instance behind a reverse proxy. With the Admin UI on, you set the funding source, branding and most other options in the browser after the first start.

```bash title=".env"
# Server (env-only)
HOST=127.0.0.1
PORT=5000
# The address of your reverse proxy, as LNbits sees it
FORWARDED_ALLOW_IPS=127.0.0.1
AUTH_HTTPS_ONLY=true

# Data (env-only)
LNBITS_DATA_FOLDER=./data
# LNBITS_DATABASE_URL=postgres://lnbits:CHANGE_ME@localhost:5432/lnbits

# Admin UI (env-only). Leave AUTH_SECRET_KEY empty and LNbits generates
# data/.lnbits_auth_key, or set your own with: openssl rand -hex 32
LNBITS_ADMIN_UI=true
AUTH_SECRET_KEY=
# Protects /first_install when other people can reach the server.
# Uncomment and fill in with the output of: openssl rand -hex 16
# FIRST_INSTALL_TOKEN=

# Copied into the database on the first start only. Change them later in /admin.
LNBITS_BACKEND_WALLET_CLASS=VoidWallet
AUTH_ALLOWED_METHODS=username-password
LNBITS_SITE_TITLE=LNbits
```

To see the settings a running instance actually uses, open **Settings** in the Admin UI. LNbits has no command that validates a configuration. `docker run lnbits/lnbits --help` doesn't do it either: it replaces the container's start command, so the container just exits.

## See Also {#see-also}

- [Admin UI](/docs/configuration/admin-ui)
- [Database](/docs/configuration/database)
- [Authentication](/docs/configuration/authentication)
- [Security](/docs/configuration/security)
- [`.env.example` at v1.6.2](https://github.com/lnbits/lnbits/blob/v1.6.2/.env.example)
