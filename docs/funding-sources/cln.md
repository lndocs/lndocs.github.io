---
sidebar_position: 3
title: Core Lightning
description: Configure LNbits with a Core Lightning node over CLNRest (runes) or the RPC socket
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Core Lightning Configuration

Connect LNbits to your Core Lightning (CLN) node. v1.6.2 has three classes:

| Class | Connects through | Use it when |
|---|---|---|
| `CLNRestWallet` | CLN's built-in `clnrest` REST server, authenticated with runes | **Recommended.** LNbits and CLN can be on different machines |
| `CoreLightningWallet` | CLN's `lightning-rpc` Unix socket | LNbits runs on the same machine as CLN. Supports the Node UI |
| `CoreLightningRestWallet` | RTL's c-lightning-REST plugin | **Deprecated**, see [below](#c-lightning-rest) |

`CLightningWallet` is an old name for `CoreLightningWallet`, kept so old configs still start.

:::note Admin UI or .env
The Admin UI is on by default, and once it has saved settings they override `.env`. Configure CLN in **Settings → Funding** at `/admin` and restart LNbits. The `.env` blocks below only apply on the first start or with `LNBITS_ADMIN_UI=false`. See [Funding sources overview](/docs/funding-sources/overview).
:::

## CLNRest with runes (recommended) {#cln-rest-with-runes-recommended}

### 1. Enable clnrest in CLN {#enabling-cln-rest}

`clnrest` ships with CLN. It starts when you set a port:

```ini title="~/.lightning/config"
clnrest-port=3010
# Listens on 127.0.0.1 by default. Only widen this if LNbits runs elsewhere,
# and then only on a private network:
# clnrest-host=0.0.0.0
```

The old `rest-port`/`rest-host`/`rest-certs` names are gone; CLN v25.09 removed their auto-detection. With the default `https` protocol, CLN creates `ca.pem`, `server.pem` and `client.pem` in its network directory (for example `~/.lightning/bitcoin/`). LNbits needs `ca.pem`.

### 2. Create four runes {#creating-a-rune}

LNbits uses a separate rune for each job. These are upstream's copy-paste commands. Run them on the CLN host: `lightning-cli` talks to the socket, so it can create any rune. (Since CLN 26.06.8, a restricted rune can no longer create a less restricted one.)

```bash
# Read-only: funds, pays, invoices, info, summary, and the invoice listener
lightning-cli createrune \
  restrictions='[["method=listfunds","method=listpays","method=listinvoices","method=getinfo","method=summary","method=waitanyinvoice"]]' \
| jq -r .rune
```

```bash
# Invoice: max 1,000,001 msat, label must start with "LNbits", 60 req/min
lightning-cli createrune \
  restrictions='[["method=invoice"], ["pnameamount_msat<1000001"], ["pnamelabel^LNbits"], ["rate=60"]]' \
| jq -r .rune
```

```bash
# Pay: bolt11 amount < 1001 (msat), label must start with "LNbits", 1 req/min
lightning-cli createrune \
  restrictions='[["method=pay"], ["pinvbolt11_amount<1001"], ["pnamelabel^LNbits"], ["rate=1"]]' \
| jq -r .rune
```

```bash
# Renepay: invstring amount < 1001 (msat), label must start with "LNbits", 1 req/min
lightning-cli createrune \
  restrictions='[["method=renepay"], ["pinvinvstring_amount<1001"], ["pnamelabel^LNbits"], ["rate=1"]]' \
| jq -r .rune
```

:::caution Tune the limits before you go live
The amount and rate limits above are upstream's examples, and they are tiny: the pay rune allows about 1 sat per payment, once a minute. Raise them to what your instance should be able to move, but keep a cap. A pay rune without one can drain the node. LNbits labels every invoice and payment `LNbits_<random>`, which is what the `pnamelabel^LNbits` restriction relies on.
:::

You need the read-only rune, the invoice rune to receive, and the pay **or** renepay rune to send. If `CLNREST_RENEPAY_RUNE` is set, LNbits pays with `renepay`; otherwise it uses `pay`.

### 3. Configure LNbits {#configuration}

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=CLNRestWallet
CLNREST_URL=https://127.0.0.1:3010
CLNREST_CA=/home/lnbits/cln/ca.pem
CLNREST_READONLY_RUNE=
CLNREST_INVOICE_RUNE=
CLNREST_PAY_RUNE=
# or, to pay with renepay instead:
# CLNREST_RENEPAY_RUNE=
```

Paste the rune strings after the `=`. Notes:

- `CLNREST_READONLY_RUNE` is required: without it the backend refuses to start.
- **`CLNREST_CA` is required for `https://` URLs.** It takes a file path or the PEM text. LNbits checks the chain against this CA but not the host name, so connecting by IP works.
- Plain `http://` is only accepted for `localhost`, `127.0.0.1` or `::1`.
- `CLNREST_NODEID` (from `lightning-cli getinfo | jq -r .id`) is only needed for CLN v23.08.
- `CLNREST_LAST_PAY_INDEX` is optional. It sets where the invoice listener starts; upstream suggests `lightning-cli listinvoices | jq -r '.invoices | map(.created_index) | max'`.
- `CLNREST_CERT` exists as a setting, but the v1.6.2 wallet code doesn't use it.

### Testing the connection {#testing-connection}

clnrest methods are `POST`. Use the CA, not `-k`:

```bash
curl --cacert /home/lnbits/cln/ca.pem -X POST \
  -H "Rune: $READONLY_RUNE" \
  https://127.0.0.1:3010/v1/listfunds
```

That is the call LNbits makes for its status check.

## RPC socket {#direct-rpc-connection}

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=CoreLightningWallet
CORELIGHTNING_RPC=/home/lightning/.lightning/bitcoin/lightning-rpc
```

LNbits must run on the CLN host, as a user that can read and write the socket. The socket gives full control of the node: there are no rune restrictions on this path.

`CORELIGHTNING_PAY_COMMAND` (default `pay`) sets the RPC method LNbits calls to pay. LNbits sends `pay`-style parameters (`bolt11`, `maxfee`, `description`), so keep the default unless you know your replacement accepts them.

## CLN v26.06: `pay` is becoming `xpay` {#xpay}

CLN v26.06 started deprecating `pay` in favour of `xpay`: `xpay` now handles `pay` calls by default, and the CLN changelog says `pay` will be replaced by `xpay` in v27.03. Both LNbits paths still call `pay` (`CLNRestWallet` POSTs `/v1/pay`, `CoreLightningWallet` calls `CORELIGHTNING_PAY_COMMAND`), so on v26.06 and later your payments may go through `xpay` without any change on the LNbits side.

- Don't set `CORELIGHTNING_PAY_COMMAND=xpay`. `xpay` takes the invoice as `invstring`, not `bolt11`, so LNbits' call wouldn't match.
- If payments misbehave after a CLN upgrade, `xpay-handle-pay=false` in the CLN config restores the old `pay` until v27.03.
- Re-test payments when you move to CLN v27.03.

Run CLN v26.06.9 or later: it fixes security issues in channel handling, gossip, runes and `setconfig`.

## c-lightning-REST (deprecated) {#c-lightning-rest}

:::caution Deprecated
RTL's c-lightning-REST published its final release (v0.10.8) in July 2026 and the repository is archived: no more fixes, security fixes included. Move to `CLNRestWallet`.
:::

For existing setups only:

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=CoreLightningRestWallet
CORELIGHTNING_REST_URL=http://127.0.0.1:8185/
CORELIGHTNING_REST_MACAROON=/home/lnbits/cln/access.macaroon
CORELIGHTNING_REST_CERT=/home/lnbits/cln/certificate.pem
```

The macaroon can also be given as base64 or hex.

## Spark wallet {#spark-wallet}

`SparkWallet` connects to shesek's Spark web wallet for CLN. It is not Spark L2. See [Other backends](/docs/funding-sources/others).

## Docker Compose {#docker-compose-example}

With CLN and LNbits in one compose project, mount CLN's `ca.pem` into LNbits and point `CLNREST_URL` at the service name. CLN must then listen on the compose network (`clnrest-host=0.0.0.0` inside the container), and you must not publish port 3010 on the host.

```yaml title="docker-compose.yml"
services:
  lnbits:
    image: lnbits/lnbits:v1.6.2
    ports:
      - "127.0.0.1:5000:5000"
    volumes:
      - ./data:/app/data
      - ./cln-data/bitcoin/ca.pem:/cln/ca.pem:ro
    environment:
      - LNBITS_BACKEND_WALLET_CLASS=CLNRestWallet
      - CLNREST_URL=https://cln:3010
      - CLNREST_CA=/cln/ca.pem
      - CLNREST_READONLY_RUNE=${CLNREST_READONLY_RUNE}
      - CLNREST_INVOICE_RUNE=${CLNREST_INVOICE_RUNE}
      - CLNREST_PAY_RUNE=${CLNREST_PAY_RUNE}

  cln:
    image: elementsproject/lightningd:v26.06.9
    # Bitcoin backend, network and the rest of the CLN configuration omitted.
    volumes:
      - ./cln-data:/root/.lightning
```

The environment values only take effect on LNbits' first start (or with the Admin UI off); after that, change them in **Settings → Funding**. Check the CLN image's own docs for its data path and options.

## Node packages {#common-cln-setups}

Umbrel, Start9 and RaspiBlitz each expose CLN differently. Take the clnrest URL, `ca.pem` and runes from the platform's own CLN connection screen or docs, and create the four runes above if it doesn't give you suitable ones.

## Troubleshooting {#troubleshooting}

- **`missing clnrest_readonly_rune`** at startup: set `CLNREST_READONLY_RUNE`.
- **`CA certificate is required for secure communication`**: set `CLNREST_CA`.
- **`Insecure HTTP connections are only allowed for localhost`**: use `https://`, or run LNbits on the CLN host.
- **401 from clnrest:** the rune is wrong, revoked, or doesn't allow that method or amount. `lightning-cli showrunes` lists runes; `lightning-cli checkrune rune=... method=listfunds` tests one.
- **Socket permission denied:** check `ls -l` on `lightning-rpc`, and run LNbits as a user that has access (for example via a shared group).

## Security {#security-best-practices}

- Keep separate runes per job, with amount and rate caps on the pay rune.
- Add an expiry for temporary access: `["time<UNIX_TIMESTAMP"]` as an extra restriction.
- Revoke a leaked rune with `lightning-cli blacklistrune`.
- Keep clnrest on localhost or a private network.

## See also

- [Funding sources overview](/docs/funding-sources/overview)
- [LND](/docs/funding-sources/lnd)
- [Security](/docs/configuration/security)
- CLN: [REST](https://docs.corelightning.org/docs/rest), [createrune](https://docs.corelightning.org/reference/createrune)
