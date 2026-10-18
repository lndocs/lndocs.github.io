---
sidebar_position: 7
title: Other Backends
description: Spark L2, Bark, Boltz, Eclair, Breez, Cliche and the Spark CLN wallet
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Other Backends

The self-custodial backends that don't have a page of their own. For LND, Core Lightning and phoenixd see their pages; for custodial services and NWC see [Custodial services](/docs/funding-sources/custodial).

:::note Admin UI or .env
The Admin UI is on by default, and once it has saved settings they override `.env`. Configure these in **Settings → Funding** at `/admin` and restart LNbits. The `.env` blocks below only apply on the first start or with `LNBITS_ADMIN_UI=false`. See [Funding sources overview](/docs/funding-sources/overview).
:::

Several of these backends hold a seed (mnemonic). If you enter it in LNbits, it is stored in the LNbits database: protect the database and its backups like the seed itself, and keep an offline copy. LNbits asks you to confirm the backup (`*_MNEMONIC_BACKUP_CONFIRMED`).

## Spark L2 {#spark-l2}

`SparkL2Wallet` (since v1.5.0) uses the [Spark](https://docs.spark.money) layer-2 network. It is self-custodial, with a unilateral exit to Bitcoin L1, but it depends on Spark's operators, and Spark itself still calls its mainnet beta. LNbits talks to a small Node.js [sidecar](https://github.com/lnbits/spark_sidecar) that does the Spark work; upstream also publishes a combined Docker image, `lnbits/lnbits-sparkl2`.

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=SparkL2Wallet
SPARK_L2_EXTERNAL_ENDPOINT=http://localhost:8765
SPARK_L2_EXTERNAL_API_KEY=
SPARK_L2_NETWORK=MAINNET
```

- `SPARK_L2_EXTERNAL_API_KEY` is sent as `X-Api-Key` to the sidecar; set the same key on the sidecar side.
- The seed: if the sidecar was started with its own mnemonic, that one is used. Otherwise the sidecar gets `SPARK_L2_MNEMONIC` from LNbits. Any Spark-compatible seed works.
- Tuning, with defaults: `SPARK_L2_PAY_WAIT_MS=4000`, `SPARK_L2_PAY_POLL_MS=500`, `SPARK_L2_STREAM_KEEPALIVE_MS=15000`.
- Upstream notes that Spark L2 needs a higher fee reserve and a longer payment wait than the defaults. Raise `LNBITS_RESERVE_FEE_MIN` if small payments fail.

Spark L2 is not `SparkWallet` (below), which is an old web wallet for Core Lightning.

Setup steps for the sidecar are in its [README](https://github.com/lnbits/spark_sidecar) and upstream's [backend wallets guide](https://docs.lnbits.com).

## Bark (Ark) {#bark}

`BarkWallet` (new in v1.6.0) connects to Second's [`barkd`](https://second.tech/docs/barkd), a REST daemon for the Ark protocol. Second launched Bark on mainnet in June 2026; treat it as new.

1. Create the Bark wallet with `bark create` before starting LNbits.
2. Run `barkd` separately, with a persistent data directory.
3. Give LNbits the auth token from `~/.bark/auth_token`. barkd has required a token since 0.1.0.

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=BarkWallet
BARK_API_ENDPOINT=http://localhost:3000
BARK_API_TOKEN=
```

The token is sent as a Bearer header. Bark's fee estimates can exceed LNbits' default reserve: if small payments fail with `fee of 20000 msat exceeds limit of 5000 msat`, set `LNBITS_RESERVE_FEE_MIN=20000` (upstream's advice).

## Boltz {#boltz}

`BoltzWallet` connects over gRPC to a running [boltz-client](https://github.com/BoltzExchange/boltz-client) and handles Lightning payments through submarine swaps on Liquid. Run boltz-client in standalone mode (`boltzd --standalone`). LNbits uses a boltz-client wallet named `lnbits`: on first connect it restores that wallet from `BOLTZ_MNEMONIC` if you set one, or creates a new one.

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=BoltzWallet
BOLTZ_CLIENT_ENDPOINT=127.0.0.1:9002
BOLTZ_CLIENT_MACAROON=/home/lnbits/.boltz/macaroons/admin.macaroon
BOLTZ_CLIENT_CERT=/home/lnbits/.boltz/tls.cert
BOLTZ_CLIENT_PASSWORD=
```

- The macaroon accepts a path, or the value as base64 or hex. The cert must be a file path; without it LNbits connects without TLS, so only do that on localhost.
- `BOLTZ_CLIENT_PASSWORD` is the wallet password used when restoring from the mnemonic.
- Every swap costs fees. Raise `LNBITS_RESERVE_FEE_MIN` or `LNBITS_RESERVE_FEE_PERCENT` if payments fail on fees.
- Upstream's guide also lists a BOLTZ_CLIENT_WALLET variable; that setting doesn't exist in v1.6.2.
- boltz-client v2.12.0 removed its old GDK wallet library and migrates legacy wallets. Check its release notes when upgrading.

Boltz needs the `liquid` extra; the Docker image includes all extras, and `uv sync --all-extras` does too.

## Eclair {#eclair}

`EclairWallet` connects to an [Eclair](https://github.com/ACINQ/eclair) node's API, with HTTP Basic auth and an empty user name.

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=EclairWallet
ECLAIR_URL=http://127.0.0.1:8283
ECLAIR_PASS=
```

The setting is `ECLAIR_PASS`. Upstream's guide says ECLAIR_PASSWORD, which LNbits doesn't read. Eclair 0.14 requires Bitcoin Core 30.x and anchor-output channels. Keep its API on localhost or a private network.

## Spark wallet for Core Lightning {#spark-cln}

`SparkWallet` connects to shesek's Spark web wallet running on a Core Lightning node. It is legacy, unrelated to Spark L2, and not in the default `LNBITS_ALLOWED_FUNDING_SOURCES`: add it there (in `.env`) before the Admin UI will offer it. For new CLN setups use `CLNRestWallet` ([Core Lightning](/docs/funding-sources/cln)).

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=SparkWallet
SPARK_URL=http://127.0.0.1:9737/rpc
SPARK_TOKEN=
```

## Deprecated: Breez SDK (Greenlight and Liquid) {#breez}

:::caution Deprecated by Breez
Breez has deprecated both SDKs behind these classes; the Greenlight and Liquid SDK repositories return 404 as of October 2026, and Breez recommends its Spark SDK, for which LNbits v1.6.2 has no class. The PyPI packages still install, but don't start new instances on them. Spark L2 (above) is the closest replacement inside LNbits.
:::

`BreezSdkWallet` (Greenlight):

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=BreezSdkWallet
BREEZ_API_KEY=
BREEZ_GREENLIGHT_SEED=
# Only to register a new Greenlight node: an invite code, or a partner key and cert
BREEZ_GREENLIGHT_INVITE_CODE=
BREEZ_GREENLIGHT_DEVICE_KEY=
BREEZ_GREENLIGHT_DEVICE_CERT=
```

`BREEZ_GREENLIGHT_SEED` is required.

`BreezLiquidSdkWallet` (Liquid swaps):

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=BreezLiquidSdkWallet
BREEZ_LIQUID_SEED=
# Optional: BREEZ_LIQUID_API_KEY, BREEZ_LIQUID_FEE_OFFSET_SAT (default 50)
```

Swaps cost fees, so raise the reserve fee if payments fail. Both need the `breez` extra (`uv sync --extra breez`, or `--all-extras`); the Docker image includes it.

## Unmaintained: Cliche {#cliche}

:::caution Unmaintained
`ClicheWallet` connects to fiatjaf's [Cliche](https://github.com/fiatjaf/cliche) over a websocket (`CLICHE_ENDPOINT`, for example `ws://127.0.0.1:12000`). Cliche's last release was in 2022. The class isn't in the default allowed list, and it has been removed on LNbits' development branch. Don't use it for new setups.
:::

## See also

- [Funding sources overview](/docs/funding-sources/overview)
- [Custodial services](/docs/funding-sources/custodial)
- [Phoenixd](/docs/funding-sources/phoenixd)
