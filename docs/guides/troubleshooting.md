---
sidebar_position: 5
title: Troubleshooting
description: Common issues and solutions
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Troubleshooting

Solutions to common LNbits issues. Start with the logs: `docker logs lnbits` for Docker, `journalctl -u lnbits` for a systemd service, or the `logs/` folder inside the data folder.

## Connection Issues {#connection-issues}

### Funding Source Not Connecting {#funding-source-not-connecting}

1. Check the credentials and endpoint URL.
2. Test network connectivity from the LNbits host (or container) to the node.
3. Check TLS certificates.
4. Check where the setting actually comes from. With the Admin UI on (the default), the funding source stored in the database **overrides `.env`**. Look at it in `/admin`, not just in `.env`.

```bash
# Test LND REST from the LNbits host. Without the macaroon header LND returns an auth error.
curl --cacert tls.cert \
  -H "Grpc-Metadata-macaroon: $(xxd -ps -u -c 1000 admin.macaroon)" \
  https://127.0.0.1:8080/v1/getinfo
```

If LNbits started with the funding source unreachable, it may have fallen back to `VoidWallet`. Fix the connection, then restart LNbits (the Super User can do this from `/admin`).

### Database Connection Failed {#database-connection-failed}

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test the exact URL LNbits uses
psql "$LNBITS_DATABASE_URL" -c 'select 1'
```

`LNBITS_DATABASE_URL` must use the `postgres://` scheme.

## Payment Issues {#payment-issues}

### Payments Failing {#payments-failing}

1. Check the funding source's own balance and channel liquidity.
2. Remember the fee reserve: a payment needs the amount **plus** a routing reserve (by default the larger of 2000 msat or 1%) **plus** any service fee.
3. Check the LNbits logs:

```bash
docker logs lnbits 2>&1 | grep -i error
```

A payment that is still in flight when `LNBITS_FUNDING_SOURCE_PAY_INVOICE_WAIT_SECONDS` (default 5) runs out is returned as **pending**, not failed. LNbits keeps checking it in the background.

### Payments stuck pending {#payments-stuck-pending}

`lnbits-cli` can re-check pending payments against the funding source:

```bash
uv run lnbits-cli db check-payments --days 7 --verbose
```

In Docker, run the same command with `docker exec`. Unpaid incoming invoices are marked failed, with the label `expired`, once they expire (since v1.6.0).

### Invoice Not Received {#invoice-not-received}

1. Check the payment status in the funding source.
2. Check for pending payments in the wallet.
3. If you rely on a webhook, see below.

### Webhook not delivered {#webhook-not-delivered}

- **Private or LAN addresses are blocked.** LNbits refuses to post a webhook to any non-public IP (LAN, localhost, Docker networks) unless `LNBITS_CALLBACK_ALLOW_PRIVATE_IPS=true`. This often catches ESP32 and home-lab setups. Turn it on only if you need it: it lets LNbits users make your server call internal services.
- **Webhooks fire only for invoices.** In v1.6.2 the `webhook` field on outgoing payments is ignored ([#4113](https://github.com/lnbits/lnbits/pull/4113) fixes this on `dev`, unreleased).
- **One attempt only.** The result is stored in the payment's `webhook_status`. There is no retry, so poll `GET /api/v1/payments/{payment_hash}` as a fallback.
- **Duplicate calls.** For internal payments v1.6.2 can notify the receiver twice ([#4148](https://github.com/lnbits/lnbits/pull/4148), unreleased fix). Make your handler idempotent.

## Performance Issues {#performance-issues}

### Slow Response Times {#slow-response-times}

1. Use PostgreSQL instead of SQLite for busy instances.
2. Check server resources (CPU, memory, disk).
3. Check the rate limit (`LNBITS_RATE_LIMIT_NO`, default 200 per `LNBITS_RATE_LIMIT_UNIT` minute).
4. Run a single LNbits process. LNbits does not support several workers or replicas on one database.

## Common Errors {#common-errors}

### API key errors {#invalid-api-key}

| Message | Meaning |
|---------|---------|
| `No Api Key provided.` | Send the key in the `X-Api-Key` header. |
| `Invalid adminkey.` | The route needs the wallet's **admin** key; you sent the invoice key or a wrong key. |
| `Wallet not found.` | The key does not belong to any (non-deleted) wallet. |

### "Insufficient Balance" {#insufficient-balance}

- Check the wallet balance.
- Account for the fee reserve and any service fee.
- Pending outgoing payments already count against the balance.

### Login problems {#login-problems}

- Since v1.6.0 the only login method enabled by default is username and password. Old `?usr=` wallet links stop working unless an admin adds `user-id-only` to the allowed auth methods. See [Upgrading](/docs/guides/upgrading).
- `AUTH_HTTPS_ONLY=true` (the default) makes login cookies HTTPS-only. Over plain HTTP the login appears to succeed but does not stick.

### "Extension Not Found" {#extension-not-found}

- Check that the extension is installed **and** enabled in `/admin` or the Extensions page.
- Check the extension manifest URL in the Admin UI.
- Restart LNbits.

## Useful CLI commands {#cli}

```bash
uv run lnbits-cli superuser                 # print the Super User ID
uv run lnbits-cli db versions               # show database migration versions
uv run lnbits-cli db check-payments --help  # re-check payments against the funding source
uv run lnbits-cli --help                    # everything else
```

## Getting Help {#getting-help}

- **Official docs**: [docs.lnbits.com](https://docs.lnbits.com)
- **Community forum**: [community.lnbits.com](https://community.lnbits.com)
- **Telegram**: [t.me/lnbits](https://t.me/lnbits)
- **Bugs**: [GitHub Issues](https://github.com/lnbits/lnbits/issues). Include your LNbits version, funding source, database type and the relevant log lines, and remove keys and macaroons first.
