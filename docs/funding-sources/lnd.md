---
sidebar_position: 2
title: LND
description: Configure LNbits with an LND Lightning node over REST or gRPC
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# LND Configuration

Connect LNbits to your LND (Lightning Network Daemon) node. LNbits supports two classes:

| Class | Transport | Extras in v1.6.2 |
|---|---|---|
| `LndRestWallet` | REST (default port 8080) | Node UI, hold invoices |
| `LndWallet` | gRPC (default port 10009) | Hold invoices |

Both use `SendPaymentV2`/`TrackPaymentV2` (REST: `/v2/router/send` and `/v2/router/track`), so the RPCs that LND 0.21 removed don't affect them. Pick REST unless you have a reason to prefer gRPC.

:::note Admin UI or .env
The Admin UI is on by default, and once it has saved settings they override `.env`. Configure LND in **Settings → Funding** at `/admin` and restart LNbits. The `.env` blocks below only apply on the first start or with `LNBITS_ADMIN_UI=false`. See [Funding sources overview](/docs/funding-sources/overview).
:::

## What you need {#prerequisites}

- LND running and synced, with REST (`restlisten`) or gRPC (`rpclisten`) reachable from LNbits.
- LND's `tls.cert`.
- A macaroon. Use `admin.macaroon`, or bake one with only the permissions LNbits needs ([below](#macaroon-permissions)).

## REST {#rest-api-recommended}

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=LndRestWallet
LND_REST_ENDPOINT=https://127.0.0.1:8080
LND_REST_CERT=/home/lnbits/lnd/tls.cert
LND_REST_MACAROON=/home/lnbits/lnd/admin.macaroon
```

- `LND_REST_MACAROON` takes a file path ending in `.macaroon`, or the macaroon itself as hex or base64.
- `LND_REST_ROUTE_HINTS` (default `true`) adds route hints to invoices, which private channels need.
- `LND_REST_ALLOW_SELF_PAYMENT` (default `false`) lets LND pay an invoice issued by the same node, for example by another app on it. Payments between wallets on the same LNbits instance are internal and don't need it.

## gRPC {#grpc-api}

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=LndWallet
LND_GRPC_ENDPOINT=127.0.0.1
LND_GRPC_PORT=10009
LND_GRPC_CERT=/home/lnbits/lnd/tls.cert
LND_GRPC_MACAROON=/home/lnbits/lnd/admin.macaroon
```

`LND_GRPC_ENDPOINT` is a host name or IP, without a port; the port goes in `LND_GRPC_PORT`. Both, and the cert, are required. `LND_GRPC_ALLOW_SELF_PAYMENT` (default `false`) works as on REST.

## TLS certificate {#tls-certificate}

LND generates a self-signed `tls.cert`. Point `LND_REST_CERT` or `LND_GRPC_CERT` at a copy of it.

- The certificate must be valid for the host name in your endpoint. If you connect to `https://lnd:8080` or `https://umbrel.local:8080`, add that name with `tlsextradomain=` (or the IP with `tlsextraip=`) in `lnd.conf`, then regenerate the cert.
- **An empty `LND_REST_CERT` doesn't turn verification off.** LNbits then verifies against the public CA store, which only works if LND serves a publicly issued certificate (for example, behind a TLS-terminating proxy). There is no setting that skips verification, and that is how it should be.
- For gRPC the cert is mandatory.
- Use absolute paths. `.env` values aren't shell-expanded, so `~/.lnd/tls.cert` won't be found.

To regenerate an expired or mismatched cert, stop LND, delete `tls.cert` and `tls.key` from its data directory, and start LND again (for example `sudo systemctl restart lnd`). Then copy the new cert to LNbits.

## Macaroon permissions {#macaroon-permissions}

`admin.macaroon` works for everything, including the Node UI. It is also the most powerful credential on your node, so keep it on the LNbits host only, readable only by the LNbits user.

For the wallet functions alone, a baked macaroon is enough. These are the permissions behind the calls LNbits makes in v1.6.2 (channel balance, add/lookup/subscribe invoices, hold invoices, send and track payments):

```bash
lncli bakemacaroon --root_key_id 42 --save_to /home/lnbits/lnd/lnbits.macaroon \
  invoices:read invoices:write offchain:read offchain:write
```

- Without `offchain:write`, LNbits can receive but not send.
- Don't drop `offchain:read`: LNbits' status check reads the channel balance, and fails without it.
- The Node UI needs more (peers, channels, on-chain). Use the admin macaroon if you enable it.

LNbits doesn't publish an official minimal set; this list is derived from the v1.6.2 code (`lndrest.py`, `lndgrpc.py`).

## Encrypted macaroon {#encrypted-macaroon}

Instead of storing the macaroon in clear, you can store it AES-encrypted and type the key at startup:

```bash
uv run lnbits-cli encrypt macaroon
```

The command asks for the macaroon (a file path, hex or base64) and an encryption key, then prints the encrypted string. Put that in `LND_REST_MACAROON_ENCRYPTED` (or `LND_GRPC_MACAROON_ENCRYPTED`) and leave the plain macaroon setting empty.

:::warning Only for interactive starts
With an encrypted macaroon set, LNbits stops at every startup and prompts `Enter the macaroon decryption key:` on its terminal. Under `docker run -d`, systemd or any other service manager there is no terminal, so the backend can't load. Use it only if you start LNbits by hand. For services, protect the plain macaroon with file permissions instead.
:::

## Remote LND {#remote-lnd}

Copy the cert and macaroon from the LND host, then point the endpoint at it:

```bash
scp user@lnd-host:.lnd/tls.cert /home/lnbits/lnd/tls.cert
scp user@lnd-host:.lnd/data/chain/bitcoin/mainnet/admin.macaroon /home/lnbits/lnd/admin.macaroon
```

```bash title=".env"
LND_REST_ENDPOINT=https://192.168.1.100:8080
LND_REST_CERT=/home/lnbits/lnd/tls.cert
LND_REST_MACAROON=/home/lnbits/lnd/admin.macaroon
```

Remember the cert's host-name rule above, and don't expose LND's REST or gRPC port to the internet; use a LAN, VPN or SSH tunnel.

For node packages (Umbrel, Start9, RaspiBlitz, myNode) and hosted nodes (Voltage), the paths and host names differ per platform. Get the REST endpoint, `tls.cert` and macaroon from the platform's own LND connection screen or docs. A hosted node like Voltage gives you a normal macaroon: it goes in `LND_REST_MACAROON`, not the `_ENCRYPTED` field.

## Testing the connection {#testing-connection}

From the LNbits host, check that LND answers with the same cert and macaroon:

```bash
curl --cacert /home/lnbits/lnd/tls.cert \
  --header "Grpc-Metadata-macaroon: $(xxd -ps -u -c 1000 /home/lnbits/lnd/admin.macaroon)" \
  https://127.0.0.1:8080/v1/balance/channels
```

That is the call LNbits makes for its status check. Then restart LNbits and look at **Settings → Funding** for the node balance, or call `GET /api/v1/status` as an admin user.

## Troubleshooting {#troubleshooting}

- **Connection refused:** LND isn't listening where you think. Check `restlisten=` (or `rpclisten=`) in `lnd.conf`, and any firewall in between.
- **Certificate verify failed:** the cert doesn't match the host name, is out of date, or `LND_REST_CERT` is empty while LND uses its self-signed cert. See [TLS certificate](#tls-certificate).
- **Permission denied or macaroon errors:** the macaroon is for another network (mainnet vs testnet), or lacks a permission. `ls .lnd/data/chain/bitcoin/` shows which networks exist.
- **Payments stuck or failing:** check channel liquidity with `lncli listchannels` and LND's own logs. LNbits reports a payment as pending if LND hasn't finished within `LNBITS_FUNDING_SOURCE_PAY_INVOICE_WAIT_SECONDS`.

## Security {#security-best-practices}

1. Keep the macaroon and cert readable only by the LNbits user (`chmod 600`).
2. Use a baked macaroon when you don't need the Node UI.
3. Never expose LND's REST or gRPC ports publicly.
4. If a macaroon leaks, revoke it. A macaroon baked with its own `--root_key_id` (as above) is revoked with `lncli deletemacaroonid 42`. The admin macaroon shares root key ID 0 with LND's other default macaroons; see LND's [macaroon docs](https://docs.lightning.engineering/lightning-network-tools/lnd/macaroons) before you rotate it.

## See also

- [Funding sources overview](/docs/funding-sources/overview)
- [Core Lightning](/docs/funding-sources/cln)
- [Security](/docs/configuration/security)
