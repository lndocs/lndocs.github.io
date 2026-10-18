---
sidebar_position: 5
title: Security
description: A hardening checklist for LNbits v1.6.2, with each setting mapped to the threat it addresses
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Security Configuration

This page is a hardening checklist for an LNbits v1.6.2 instance that holds real funds. Each item names the setting or step and the threat it addresses. Settings marked *editable* are stored in the database while the Admin UI is on, so you change them at `/admin`, not in `.env` (see [Settings precedence](/docs/configuration/environment)).

:::danger LNbits is custodial
Every sat in an LNbits wallet is held by the funding source you run. Whoever controls the server, the Super User account, the funding-source credentials or a wallet's admin key can move funds. Treat the host like a hot wallet.
:::

## Checklist {#essential-security-checklist}

| ✓ | Item | Threat | Section |
|---|---|---|---|
| ☐ | Run the current release | Known, fixed vulnerabilities | [Stay current](#security-updates) |
| ☐ | Set `FIRST_INSTALL_TOKEN` before the first start on a reachable server | A stranger claims the Super User | [First install](#first-install) |
| ☐ | Bind to `127.0.0.1` behind a TLS proxy | Bypassing the proxy and its protections | [Network](#network-security) |
| ☐ | Set `FORWARDED_ALLOW_IPS` to your proxy | Spoofed client IPs defeat the rate limit and IP blocks | [Proxy headers](#forwarded-allow-ips) |
| ☐ | Keep `AUTH_HTTPS_ONLY=true` | Session cookies sent over plain HTTP | [Sessions](#session-security) |
| ☐ | Keep `user-id-only` off | Leaked URLs give full account access | [Sessions](#session-security) |
| ☐ | Turn off open sign-up on private instances | Anyone can create accounts and wallets | [Accounts](#accounts) |
| ☐ | Keep the callback and LNURL URL rules at their defaults | SSRF into your network | [Outbound requests](#outbound-requests) |
| ☐ | Install only Python extensions you trust | Extension code runs with full access | [Extensions](#extensions) |
| ☐ | Use the narrowest wallet key, and rotate keys after a leak | Key theft | [Keys](#key-management) |
| ☐ | Give the funding source least-privilege credentials | Node compromise | [Funding source](#funding-source-security) |
| ☐ | Set wallet and payment limits | Draining through one wallet | [Limits](#limits) |
| ☐ | Back up the data folder, including `.lnbits_auth_key`, and encrypt the backups | Data loss, or leaked credentials | [Backups](#backup-encryption) |

## Stay current {#security-updates}

LNbits' [SECURITY.md](https://github.com/lnbits/lnbits/blob/v1.6.2/SECURITY.md) supports **only the current release and the `dev` branch**. Older releases get no fixes. Third-party funding sources and hosted instances are out of its scope.

An example of why this matters: **CVE-2025-32013** ([GHSA-qp8j-p87f-c8cc](https://github.com/advisories/GHSA-qp8j-p87f-c8cc)) is a critical-rated SSRF through the LNURL-auth callback. The LNbits advisory lists it as fixed in versions after 1.0.0. Some scanners will still flag it, because the global advisory record has no patched version.

- Watch the repository's releases and the [security advisories](https://github.com/lnbits/lnbits/security/advisories).
- Pin your Docker tag (for example `lnbits/lnbits:v1.6.2`), and move to each new release on purpose, after a backup.
- Report a vulnerability privately at [github.com/lnbits/lnbits/security/advisories/new](https://github.com/lnbits/lnbits/security/advisories/new), not in a public issue.

## First install {#first-install}

On a fresh install, whoever completes `/first_install` first sets the Super User's username and password. If the server is reachable by others during setup, set a token in `.env` before the first start:

```bash
# Generate a token with: openssl rand -hex 16, then paste it here
FIRST_INSTALL_TOKEN=
```

Alternatively, keep the port closed to the outside until you've completed `/first_install` yourself. See [Admin UI](/docs/configuration/admin-ui).

## Network {#network-security}

### HTTPS and binding {#https-configuration}

Run LNbits on `127.0.0.1` and put a TLS reverse proxy in front of it. `HOST` already defaults to `127.0.0.1` for source installs. The Docker image binds to `0.0.0.0` inside the container, so publish its port on the loopback address only:

```bash
docker run -d --name lnbits -p 127.0.0.1:5000:5000 \
  -v "$PWD/data:/app/data" -v "$PWD/.env:/app/.env" lnbits/lnbits:v1.6.2
```

```nginx title="/etc/nginx/sites-available/lnbits"
server {
    listen 443 ssl http2;
    server_name lnbits.example.com;

    ssl_certificate     /etc/letsencrypt/live/lnbits.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lnbits.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # websockets
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

For Caddy and Apache, see [Reverse Proxy](/docs/deployment/reverse-proxy).

### Proxy headers: `FORWARDED_ALLOW_IPS` {#forwarded-allow-ips}

`FORWARDED_ALLOW_IPS` defaults to `*` ([settings.py L1139](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/settings.py#L1139)), so LNbits believes the `X-Forwarded-For` and `X-Forwarded-Proto` headers from **any** client. The rate limit and `LNBITS_BLOCKED_IPS` key on the resulting client IP. If anyone can reach LNbits without going through your proxy, they can send a fake `X-Forwarded-For` and get around both.

- **Source install:** set `FORWARDED_ALLOW_IPS=127.0.0.1` (or your proxy's address) and keep `HOST=127.0.0.1`.
- **Docker:** the image's command hard-codes `--forwarded-allow-ips='*'` ([Dockerfile](https://github.com/lnbits/lnbits/blob/v1.6.2/Dockerfile)), so setting the variable in the container does nothing. Publish the port on `127.0.0.1` only (as above), so that only the proxy can reach the container. If you need a narrower value, override the command, for example in Compose:

  {/* snippet:skip: the image's own CMD variables appear in this command */}
  ```yaml
  command: ["sh", "-c", "uv --offline run --no-sync lnbits --port $LNBITS_PORT --host $LNBITS_HOST --forwarded-allow-ips=172.17.0.1"]
  ```

  The proxy address is whatever the container sees (here, the default Docker bridge gateway). Check yours.

### Firewall {#firewall-rules}

```bash
sudo ufw default deny incoming
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

:::caution Docker bypasses ufw
Ports that Docker publishes go through Docker's own iptables rules, so ufw doesn't block them ([Docker docs](https://docs.docker.com/engine/network/packet-filtering-firewalls/)). Publish on `127.0.0.1` rather than relying on ufw. Also note that `lnbits.sh` opens its port in ufw and binds to `0.0.0.0` unless you set `HOST`.
:::

### Rate limits {#rate-limiting}

LNbits applies a per-IP limit to every route: `LNBITS_RATE_LIMIT_NO=200` per `LNBITS_RATE_LIMIT_UNIT=minute` (editable). Password logins are also throttled per account: after 5 failures, the cooldown starts at 60 seconds and doubles, up to 15 minutes ([auth_api.py L83-130](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/auth_api.py#L83-L130)). Both depend on LNbits seeing the real client IP (see above).

For a stricter limit on the auth routes, add one at the proxy:

```nginx
# In the http {} block
limit_req_zone $binary_remote_addr zone=lnbits_auth:10m rate=10r/m;

# In the server {} block
location /api/v1/auth {
    limit_req zone=lnbits_auth burst=5 nodelay;
    proxy_pass http://127.0.0.1:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### IP rules {#ip-restrictions}

```bash
# Editable: set them in Settings → Security once the Admin UI is on
LNBITS_BLOCKED_IPS=203.0.113.7,198.51.100.23
LNBITS_ALLOWED_IPS=
```

`LNBITS_ALLOWED_IPS` holds exceptions to the block list, not an allow-only list. To limit who reaches the admin pages, use the proxy (see [Admin UI](/docs/configuration/admin-ui)).

## Sessions and login {#session-security}

- **`AUTH_HTTPS_ONLY=true`** (env-only, the default) makes the session cookie `Secure` and makes SSO refuse `http://`. Set it to `false` only on a plain-HTTP test box.
- **Login methods:** keep `username-password` and leave `user-id-only` off. It has been off by default since v1.6.0, but an instance first set up on an older version may still have it stored. Check **Settings → Security**.
- **Token lifetime:** `AUTH_TOKEN_EXPIRE_MINUTES` defaults to one year. Logout only clears the cookie, and v1.6.2 doesn't revoke tokens when a password changes. Shorten the lifetime on shared instances. To log out every session at once, rotate `AUTH_SECRET_KEY`. That also invalidates every ACL API token, but wallet keys keep working.
- **`AUTH_SECRET_KEY`:** leave it empty, and LNbits generates `data/.lnbits_auth_key`. Or set one with `openssl rand -hex 32`. Never reuse a value from an example.

See [Authentication](/docs/configuration/authentication).

## Accounts {#accounts}

`POST /api/v1/account` creates an account and a wallet with **no credentials and no authentication**, and returns the wallet with its keys. The only thing that gates it is `LNBITS_ALLOW_NEW_ACCOUNTS` ([api.py L82-85](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/api.py#L82-L85)). On a private instance:

```bash
# Editable: Settings → Users
LNBITS_ALLOW_NEW_ACCOUNTS=false
# or restrict the instance to listed users (this also turns sign-up off)
LNBITS_ALLOWED_USERS=<your user id>
```

On a public instance, set `LNBITS_MAX_USERS` (env-only) and the wallet limits below.

## Outbound requests (SSRF) {#outbound-requests}

LNbits fetches URLs that users supply: webhooks, LNURL callbacks and LNURL endpoints. The v1.6.2 defaults block requests into your private network ([settings.py L472-477](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/settings.py#L472-L477), [helpers.py L263-293](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/helpers.py#L263-L293)):

| Setting (editable) | Default | Effect |
|---|---|---|
| `LNBITS_CALLBACK_URL_RULES` | `https?://` + a domain with a TLD | Callback and webhook origins must match. A bare IP or a single-label host (`http://nas:8080`) is refused. |
| `LNBITS_CALLBACK_ALLOW_PRIVATE_IPS` | `false` | Webhooks that resolve to private or non-global addresses are refused. |
| `LNBITS_LNURL_ALLOW_PRIVATE_IPS` | `false` | LNURL fetches must be HTTPS to public addresses. |
| `LNBITS_LNURL_REDIRECT_URL_RULES` | empty | LNURL redirects are refused unless they match a rule. |

Keep these defaults on any multi-user instance. To deliver webhooks to a service on your LAN, you have to add a matching rule **and** set `LNBITS_CALLBACK_ALLOW_PRIVATE_IPS=true`. That lets every user's webhooks reach your LAN too. See [Webhooks](/docs/api/webhooks).

## Extensions {#extensions}

:::warning Python extensions aren't sandboxed
A Python extension is imported into the LNbits process. It can read the database (every wallet's keys included), call the funding source and touch the file system. Installing one is the same as giving its author shell access. Only install extensions from sources you trust, and review the code of anything that isn't from the official registry.
:::

- WASM extensions (v1.6.0+) run in a `wasmtime` sandbox with resource limits (the `WASM_RUNTIME_*` settings). They reach LNbits only through permissions that the admin grants at install time. Read the permission list before you click **Grant and install**.
- The WASM registry (`LNBITS_WASM_EXTENSIONS_MANIFESTS`) is on by default and isn't vetted.
- Only admins can install extensions. `LNBITS_ADMIN_EXTENSIONS` keeps sensitive ones admin-only.

See [Installing Extensions](/docs/extensions/installing).

## Keys and tokens {#key-management}

| Credential | What it can do | Handling |
|---|---|---|
| Wallet **admin key** | Everything on that wallet, including **spending** | Never share it. Give it only to backends that must send payments. |
| Wallet **invoice key** | Create invoices, and **read the balance and the full payment history** ([wallet_api.py](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/wallet_api.py), [payment_api.py](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/payment_api.py)) | Use it wherever you only receive. It can't spend, but it isn't private: whoever holds it sees all the wallet's activity. |
| ACL API token | The paths and methods its ACL grants | Grant the minimum. **Write access to `/api/v1/auth` exposes the account's wallets with their admin keys.** |
| Session JWT | The whole account | Short lifetime, HTTPS only. |

A wallet's keys are rotated with **Reset Keys** in the wallet's settings, or `PUT /api/v1/wallet/reset/{wallet_id}` as the logged-in owner ([wallet_api.py L133-147](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/wallet_api.py#L133-L147)). Integrations that use the old keys stop working. See [API Authentication](/docs/api/authentication).

## Funding source {#funding-source-security}

With the Admin UI on, the funding-source credentials are stored in the LNbits database's settings. Protect database dumps and backups accordingly.

### LND {#lnd-security}

LNbits has to create invoices **and** pay them, so a read-only or invoice-only macaroon leaves you with a broken backend. Use the admin macaroon, or bake a narrower one that keeps invoice and off-chain write rights but drops on-chain and peer control, and test it on a small amount first. Encrypt the macaroon in `.env`:

```bash
uv run lnbits-cli encrypt macaroon   # paste the output into LND_REST_MACAROON_ENCRYPTED
```

Always set `LND_REST_CERT` so that LNbits verifies the node's TLS certificate.

### Core Lightning (CLNRest) {#core-lightning-security}

Use three separate, restricted runes, as in [`.env.example`](https://github.com/lnbits/lnbits/blob/v1.6.2/.env.example#L155-L166). Generate them on the node and paste the values:

```bash
# Read-only: required
lightning-cli createrune restrictions='[["method=listfunds", "method=listpays", "method=listinvoices", "method=getinfo", "method=summary", "method=waitanyinvoice"]]'
# Invoices up to 1,000,000 msat, label prefix LNbits, 60 per minute
lightning-cli createrune restrictions='[["method=invoice"], ["pnameamount_msat<1000001"], ["pnamelabel^LNbits"], ["rate=60"]]'
# Payments of invoices under 1001 msat, 1 per minute; raise the cap to suit you
lightning-cli createrune restrictions='[["method=pay"], ["pinvbolt11_amount<1001"], ["pnamelabel^LNbits"], ["rate=1"]]'
```

Put them in `CLNREST_READONLY_RUNE`, `CLNREST_INVOICE_RUNE` and `CLNREST_PAY_RUNE`, and set `CLNREST_CA` and/or `CLNREST_CERT` so that LNbits verifies TLS. See [Core Lightning](/docs/funding-sources/cln).

### Custodial backends {#custodial-backends}

An API key for a custodial service (Blink, ZBD, OpenNode, Strike and so on) can usually spend everything on that account. Keep only working balances there.

:::caution Dead or deprecated backends
The Alby shared wallet closed on 2025-01-04. LNPay and LN.tips are gone, c-lightning-REST is archived, and the Breez Greenlight and Breez Liquid SDKs are deprecated. Move off them.
:::

## Limits {#limits}

Editable, in **Settings → Server** ([settings.py L478-490](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/settings.py#L478-L490)):

```bash
LNBITS_WALLET_LIMIT_MAX_BALANCE=0            # sats per wallet, 0 = off
LNBITS_WALLET_LIMIT_DAILY_MAX_WITHDRAW=0     # sats per wallet per day, 0 = off
LNBITS_WALLET_LIMIT_SECS_BETWEEN_TRANS=0
LNBITS_MAX_OUTGOING_PAYMENT_AMOUNT_SATS=10000000
LNBITS_MAX_INCOMING_PAYMENT_AMOUNT_SATS=10000000
LNBITS_WATCHDOG_SWITCH_TO_VOIDWALLET=false   # true: stop paying if the node balance drifts
```

## Database {#database-security}

- Give LNbits its own PostgreSQL user that owns only the LNbits database:

  ```sql
  CREATE USER lnbits WITH PASSWORD 'generated-password';
  CREATE DATABASE lnbits OWNER lnbits;
  REVOKE ALL ON DATABASE lnbits FROM PUBLIC;
  ```

- Keep PostgreSQL on localhost or a private network. LNbits documents no TLS options for its connection URL.

### Backups {#backup-encryption}

Back up the whole **data folder**. It holds the SQLite databases, `.lnbits_auth_key` (without it, every session and API token is invalid after a restore), `.super_user` and the WASM extensions. On PostgreSQL, back up the database dump as well. The Super User can also download a zip of all of this from the Admin UI (`GET /admin/api/v1/backup`). See [Database → Backups](/docs/configuration/database) for the PostgreSQL 15+ caveat with the Docker image.

Encrypt every copy that leaves the server:

```bash
tar czf - data | gpg --symmetric --cipher-algo AES256 -o lnbits-data-$(date +%F).tar.gz.gpg
# Restore
gpg -d lnbits-data-2026-10-18.tar.gz.gpg | tar xzf -
```

## Admin accounts {#admin-security}

- Use the Super User only for its reserved tasks (funding source, credits, restarts, backups). Give operators admin accounts.
- Give every admin a strong, unique password.
- Restrict `/admin`, `/users`, `/audit` and `/node`, and their API prefixes, to trusted IPs at the proxy (see [Admin UI](/docs/configuration/admin-ui)).
- Crediting a wallet creates sats that your node doesn't back. Only the Super User can do it, and an admin notification goes out when notifications are configured.

## Monitoring {#monitoring--alerts}

- The **audit log** is on by default. It records `POST`, `PUT`, `PATCH` and `DELETE` requests to `/api/v1` routes that return 4xx or 5xx, kept for 7 days. Admins read it at `/audit`. For investigations, turn on `LNBITS_AUDIT_LOG_IP_ADDRESS`.
- **Notifications** (Telegram, email, Nostr) can alert admins on server start and stop, settings changes, credits and debits, and large payments. Set them up in **Settings → Notifications**.
- **Logs** go to `data/logs/`. Set `DEBUG=true` only while you troubleshoot. LNbits has no separate log-level variable.
- **Health:** `GET /api/v1/health` returns `server_time` and `up_time`, with no authentication.

```bash
curl -fsS https://lnbits.example.com/api/v1/health
```

**Privacy:** by default, fiat price lookups go to `https://price.lnbits.com` (`LNBITS_PRICE_AGGREGATOR_ENABLED=true`). Turn it off in **Settings → Exchange Providers** if you'd rather not make those calls.

## Incident response {#incident-response}

### Suspected compromise {#suspected-compromise}

1. **Contain:** stop LNbits, or switch the funding source to VoidWallet so nothing can pay out.
2. **Preserve:** copy `data/logs/`, the audit log and a database backup before you change anything.
3. **Rotate:** the funding-source credentials (macaroon, runes, API keys), `AUTH_SECRET_KEY`, the passwords of the Super User and admins, and the keys of the affected wallets.
4. **Investigate:** review the audit log, the payments and any recently installed extensions.
5. **Recover:** upgrade to the current release, restore from a clean backup if needed, and restart.
6. **Report:** tell the affected users, and if you found a bug in LNbits, [report it privately](https://github.com/lnbits/lnbits/security/advisories/new).

### Key rotation {#key-rotation}

```bash
# Generate a new auth key, then paste it into .env as AUTH_SECRET_KEY=<value>
# (or delete data/.lnbits_auth_key while AUTH_SECRET_KEY is empty), then restart.
openssl rand -hex 32
```

This logs everyone out and invalidates every ACL API token. Wallet keys aren't affected; rotate them per wallet with **Reset Keys**.

## See Also {#see-also}

- [Authentication](/docs/configuration/authentication)
- [Admin UI](/docs/configuration/admin-ui)
- [Reverse Proxy](/docs/deployment/reverse-proxy)
- [Backup & Restore](/docs/guides/backup-restore)
- [Official security guide](https://docs.lnbits.com/guide/core/security)
