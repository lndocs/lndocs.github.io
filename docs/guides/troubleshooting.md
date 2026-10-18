---
sidebar_position: 5
title: Troubleshooting
description: Common LNbits problems, the log lines and error messages they produce, and the fixes
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Troubleshooting

Start with the log. The messages quoted below are the exact strings LNbits v1.6.2 prints or returns, so you can search for them.

- Docker: `docker logs <container>` (or `docker compose logs -f`)
- systemd: `journalctl -u lnbits -f`
- Any install: `logs/lnbits.log` and `logs/debug.log` in the data folder. `debug.log` is written at DEBUG level even when `DEBUG=false`, so look there first.

Before you change `.env`, remember that with the Admin UI on (the default) most settings live in the database and **override `.env`**. Check the value in `/admin`.

<a id="connection-issues"></a>

## Funding source not connecting {#funding-source-not-connecting}

At startup LNbits logs `Connecting to backend <Class>...`, then one of these:

| Log line | Meaning |
|----------|---------|
| `✔️ Backend <Class> connected and with a balance of N msat.` | Working. |
| `Error connecting to <Class>: ...` or `The backend for <Class> isn't working properly: '...'` | The node refused or could not be reached. The text after the colon is the backend's own error. |
| `Retrying connection to backend in N seconds... (k/4)` | It retries `FUNDING_SOURCE_MAX_RETRIES` times (default 4). |
| `Fallback to VoidWallet, because the backend for <Class> isn't working properly` | It gave up. Every payment now fails until you fix the connection and restart. |
| `Switching to VoidWallet. Delta: N sats.` | Not a connection problem. The balance watchdog found that the node holds less than the wallets owe, and `LNBITS_WATCHDOG_SWITCH_TO_VOIDWALLET` is on. Find out why before you switch back. |

To fix a connection:

1. Check the endpoint, port and credentials in `/admin`, not only in `.env`.
2. Test from the LNbits host, or from inside the container. Inside a container, `127.0.0.1` is the container, not your node.
3. For LND REST, this should print the node's info. An auth error means the macaroon is wrong; a TLS error means the certificate is wrong.
   ```bash
   curl --cacert tls.cert \
     -H "Grpc-Metadata-macaroon: $(xxd -ps -u -c 1000 admin.macaroon)" \
     https://127.0.0.1:8080/v1/getinfo
   ```
4. Restart LNbits. The Super User can restart it from `/admin`.

## Database connection failed {#database-connection-failed}

`Please use the 'postgres://...' format for the database URL.` means `LNBITS_DATABASE_URL` uses another scheme, such as `postgresql://`. Change it to `postgres://`, then test the exact URL:

```bash
psql "$LNBITS_DATABASE_URL" -c 'select 1'
```

<a id="payment-issues"></a><a id="common-errors"></a><a id="insufficient-balance"></a>

## Payments failing {#payments-failing}

| Error | Cause and fix |
|-------|---------------|
| `Insufficient balance.` | The wallet holds less than the amount. Pending outgoing payments already count against the balance. |
| `You must reserve at least (N  sat) to cover potential routing fees.` | The amount fits, but the fee reserve doesn't. The reserve is the larger of `LNBITS_RESERVE_FEE_MIN` (2000 msat) and `LNBITS_RESERVE_FEE_PERCENT` (1%), plus any [service fee](/docs/guides/service-fees). |
| `Invoice amount N sats is too high. Max allowed: M sats.` | Over `LNBITS_MAX_OUTGOING_PAYMENT_AMOUNT_SATS` (default 10,000,000). |
| `Amountless invoices not supported.` | Ask the payee for an invoice with an amount. |
| `Only incoming payments allowed.` | `LNBITS_ONLY_ALLOW_INCOMING_PAYMENTS` is on. |
| `Wallet does not have permission to pay invoices.` | A [shared wallet](/docs/guides/shared-wallets) without the send permission. |
| `Payment failed: ...` | The funding source rejected the payment (no route, no liquidity and so on). The rest of the message is the node's error. Check the node's own balance and channels. |

## Payments stuck pending {#payments-stuck-pending}

A payment still in flight after `LNBITS_FUNDING_SOURCE_PAY_INVOICE_WAIT_SECONDS` (default 5) is returned as **pending**, not failed. LNbits logs `payment status unknown <checking_id>: ...`. A background task re-checks pending payments from the last 15 days at startup and then every `LNBITS_FUNDING_SOURCE_PENDING_INTERVAL_SECONDS` (default 1800, every 30 minutes). In v1.6.2 each run looks only at the **10 most recent** pending payments, so older ones can wait a long time or never be picked up while newer ones pile up. The task does nothing while the funding source is `VoidWallet`.

To check one payment now, call `GET /api/v1/payments/{payment_hash}`. It asks the funding source and updates the status.

**Known v1.6.2 bug:** if the invoice was created on the same LND node that LNbits uses as its funding source, the payment stays pending forever, even across restarts ([#4240](https://github.com/lnbits/lnbits/issues/4240); fixed on `dev` by [#4241](https://github.com/lnbits/lnbits/pull/4241), unreleased). Pay such invoices from another wallet.

:::caution Deleting a payment changes balances by hand
First confirm on the node that a pending payment never left. For LND, `lncli trackpayment <payment_hash>` returns `payment isn't initiated`. Then you can delete its row, so its amount and fee reserve stop counting against the wallet:

```bash
uv run lnbits-cli db delete-wallet-payment -w <wallet_id> -c <checking_id>
```

This deletes the record without asking the node. If the payment did go out, you have just given the user free money. Back up first.
:::

`lnbits-cli db check-payments` does **not** fix stuck payments. It checks the other direction: it lists incoming payments that LNbits marked as paid but the funding source still reports as pending (by default from the last 3 days). It changes nothing.

Unpaid incoming invoices are marked failed, with the label `expired`, when that check (or a status request) finds them expired (since v1.6.0). The log says `invoice <checking_id> expired, marked as failed`. Because of the 10-payment limit above, a backlog of expired invoices clears slowly, and not at all on `VoidWallet`; [#4197](https://github.com/lnbits/lnbits/pull/4197) on `dev` (unreleased) fails them all in one pass.

<a id="invoice-not-received"></a>

## Webhook not delivered {#webhook-not-delivered}

LNbits stores the outcome in the payment's `webhook_status`: the HTTP status code your server returned, or `-1` if nothing was delivered. There is **no retry**, so poll `GET /api/v1/payments/{payment_hash}` as a fallback.

| Log line | Cause |
|----------|-------|
| `Invalid webhook URL: Callback URL origin '...' is not allowed. Please check your admin settings.` | The URL fails `LNBITS_CALLBACK_URL_RULES`. The default rule only accepts host names with a top-level domain, so a bare IP such as `http://192.168.1.5:8000/hook` is refused before the IP check. |
| `Invalid webhook URL: Webhook target IP address is not allowed.` | The host resolves to a private, loopback or other non-public address (LAN, `localhost`, Docker networks). LNbits allows these only with `LNBITS_CALLBACK_ALLOW_PRIVATE_IPS=true`. Turn that on only if you need it, because it lets your LNbits users make your server call internal services. |
| `webhook returned a bad status_code: N while requesting ...` | Your endpoint answered with an error. Redirects count as errors, because LNbits doesn't follow them. |
| `Could not send webhook.` | A timeout (40 seconds) or a connection failure. |

Design around two v1.6.2 limits:

- Webhooks fire only for **incoming** invoices. The `webhook` field on outgoing payments is ignored ([#4113](https://github.com/lnbits/lnbits/pull/4113) adds it on `dev`, unreleased).
- For internal payments, the receiver can be notified twice ([#4148](https://github.com/lnbits/lnbits/pull/4148), unreleased fix). Make your handler idempotent.

## API key errors {#invalid-api-key}

| Status and message | Meaning |
|---------|---------|
| 401 `No Api Key provided.` | Send the key in the `X-Api-Key` header (or the `api-key` query parameter). |
| 404 `Wallet not found.` | The key doesn't belong to any wallet, or the wallet is deleted. Check for typos and stray spaces. |
| 403 `Invalid adminkey.` | The key is valid, but it is the **invoice** key and this route needs the admin key. |

User and admin routes (`/users/...`, `/admin/...`) don't accept wallet keys at all. They need a login token. See [API authentication](/docs/api/authentication).

## Login problems {#login-problems}

| Message | Meaning |
|---------|---------|
| 401 `Invalid credentials.` | Wrong username, email or password. |
| 429 `Too many login attempts. Try again later.` | After 5 failures the login is blocked for 60 seconds, doubling with each further failure up to 15 minutes. The counter is kept in memory, so a restart clears it. |
| 403 `Login by 'User ID' not allowed.` | `user-id-only` is not in `AUTH_ALLOWED_METHODS`. Since v1.6.0 new installs allow only username and password. See [Upgrading](/docs/guides/upgrading). |
| 403 `Admin users cannot login with user id only.` | Admins and the Super User must use a password, even when `user-id-only` is allowed. |

If the login seems to succeed but you are logged out on the next page, you are probably on plain HTTP. `AUTH_HTTPS_ONLY=true` (the default) marks the login cookie as HTTPS-only, and browsers drop it over HTTP (most make an exception for `localhost`). Serve LNbits over HTTPS rather than turning this off.

## Extension errors {#extension-not-found}

| Message | Meaning |
|---------|---------|
| 403 `Extension '<id>' not installed. Ask the admin to install it.` | The extension is in the registry but not installed on this instance. An admin installs it under **Extensions**. |
| 404 `Extension '<id>' disabled` | It is installed, but an admin has deactivated it. |

## Rate limits and slow responses {#performance-issues}

<a id="slow-response-times"></a>

- HTTP 429 on API calls means the rate limit: `LNBITS_RATE_LIMIT_NO` (default 200) requests per `LNBITS_RATE_LIMIT_UNIT` (default `minute`), per client IP. Behind a reverse proxy, make sure LNbits sees the real client IP, or all users share one limit.
- On busy instances, use PostgreSQL rather than SQLite.

## Useful CLI commands {#cli}

Run these from the LNbits source folder. On Docker, run them as `docker exec -it <container> uv --offline run --no-sync lnbits-cli ...`.

```bash
uv run lnbits-cli superuser          # print the Super User ID
uv run lnbits-cli db versions        # show database migration versions
uv run lnbits-cli db check-payments  # list incoming payments paid in LNbits but pending on the node
uv run lnbits-cli --help             # everything else
```

## Getting help {#getting-help}

- **Official docs**: [docs.lnbits.com](https://docs.lnbits.com)
- **Community forum**: [community.lnbits.com](https://community.lnbits.com)
- **Telegram**: [t.me/lnbits](https://t.me/lnbits)
- **Bugs**: [GitHub Issues](https://github.com/lnbits/lnbits/issues). Include your LNbits version, funding source, database type and the relevant log lines, and remove keys, macaroons and user IDs first.
