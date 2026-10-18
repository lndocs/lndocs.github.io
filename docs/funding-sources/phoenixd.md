---
sidebar_position: 4
title: Phoenixd
description: Configure LNbits with ACINQ's phoenixd daemon
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Phoenixd Configuration

Connect LNbits to [phoenixd](https://github.com/ACINQ/phoenixd), ACINQ's headless Lightning daemon: the server counterpart of the Phoenix wallet. It is self-custodial (you hold the seed), and ACINQ acts as its Lightning service provider. phoenixd opens and resizes channels to ACINQ automatically when it needs inbound liquidity, so there is no channel management for you to do.

LNbits talks to phoenixd's HTTP API and websocket. LNbits doesn't need a public URL for this.

:::note Admin UI or .env
The Admin UI is on by default, and once it has saved settings they override `.env`. Configure phoenixd in **Settings → Funding** at `/admin` and restart LNbits. The `.env` blocks below only apply on the first start or with `LNBITS_ADMIN_UI=false`. See [Funding sources overview](/docs/funding-sources/overview).
:::

## Install phoenixd {#installation}

The current release is **v0.9.3** (2026-10-13). Pin that version, and check the [release page](https://github.com/ACINQ/phoenixd/releases) before upgrading.

### Binary {#download-phoenixd}

```bash
wget https://github.com/ACINQ/phoenixd/releases/download/v0.9.3/phoenixd-0.9.3-linux-x64.zip
unzip phoenixd-0.9.3-linux-x64.zip
./phoenixd-0.9.3-linux-x64/phoenixd
```

Release assets also exist for `linux-arm64`, macOS and the JVM, plus a signed `SHA256SUMS.asc`. On first start phoenixd creates `~/.phoenix/` with `seed.dat` (your wallet seed) and `phoenix.conf` (the API passwords). By default it only listens on `127.0.0.1:9740`.

### Docker {#docker}

The official image `acinq/phoenixd` runs as user `phoenix` (uid 1000) and keeps all its state in the volume **`/phoenix/.phoenix`**. Its entrypoint binds the API to `0.0.0.0` inside the container, so publish the port on localhost only:

```bash
docker run -d \
  --name phoenixd \
  -p 127.0.0.1:9740:9740 \
  -v phoenixd-data:/phoenix/.phoenix \
  acinq/phoenixd:0.9.3
```

If you use a host directory instead of a named volume, make it writable by uid 1000.

:::danger Followed an earlier version of this page?
Before October 2026 this page mounted `/data` (or `/root/.phoenix`). The image doesn't use those paths, so your seed is in an anonymous Docker volume, and `docker rm -v`, `docker compose down -v` or `docker volume prune` would delete it. Copy it out before you change anything:

```bash
docker cp phoenixd:/phoenix/.phoenix ./phoenixd-backup
```
:::

## Configure LNbits {#lnbits-configuration}

Use the **full-access** password (the `http-password=` line in `phoenix.conf`), not `http-password-limited-access`. The limited password can't send payments or manage channels.

```bash
# Binary install
grep '^http-password=' ~/.phoenix/phoenix.conf
# Docker
docker exec phoenixd grep '^http-password=' /phoenix/.phoenix/phoenix.conf
```

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=PhoenixdWallet
PHOENIXD_API_ENDPOINT=http://127.0.0.1:9740/
PHOENIXD_API_PASSWORD=
```

Paste the password after `PHOENIXD_API_PASSWORD=`. The connection is plain HTTP with Basic auth, so keep phoenixd on the same host or the same private Docker network as LNbits.

## Docker Compose {#docker-compose-setup}

```yaml title="docker-compose.yml"
services:
  lnbits:
    image: lnbits/lnbits:v1.6.2
    ports:
      - "127.0.0.1:5000:5000"
    volumes:
      - ./data:/app/data
    environment:
      - LNBITS_BACKEND_WALLET_CLASS=PhoenixdWallet
      - PHOENIXD_API_ENDPOINT=http://phoenixd:9740/
      - PHOENIXD_API_PASSWORD=${PHOENIXD_API_PASSWORD}
    depends_on:
      - phoenixd

  phoenixd:
    image: acinq/phoenixd:0.9.3
    volumes:
      # The image keeps its seed and channel data here. Back this volume up.
      - phoenixd-data:/phoenix/.phoenix
    # No published port: LNbits reaches phoenixd over the compose network,
    # and phoenixd listens on all interfaces inside the container.

volumes:
  phoenixd-data:
```

Start phoenixd once, read the password from `/phoenix/.phoenix/phoenix.conf`, put it in the `.env` file next to the compose file, then start LNbits. As always, the LNbits environment values only apply on its first start; later changes go through **Settings → Funding**.

## Liquidity and fees {#fees}

- phoenixd buys inbound liquidity from ACINQ when an incoming payment doesn't fit in its channel. The `--auto-liquidity` amount defaults to 2,000,000 sat; phoenixd caps the mining fee at 1% of that amount and the fee credit at 2.5% (`--max-mining-fee`, `--max-fee-credit`).
- According to ACINQ's [auto-liquidity docs](https://phoenix.acinq.co/server/auto-liquidity), the cost of that liquidity is **about 1% plus the mining fee**. phoenixd warns that "the initial fee to create your channel can be quite significant". Check ACINQ's page for current numbers before relying on them.
- Payments too small to cover those fees go to a **non-refundable fee credit**, spent on future liquidity fees. The first small payments to a new phoenixd may therefore never show up as spendable balance.
- Outgoing payments pay normal Lightning routing fees.

## Node UI {#node-ui}

With phoenixd selected, enable **Node UI** in **Settings → Funding**. For phoenixd 0.7.3 or newer, the page shows channels, balance, inbound liquidity, fee credit and liquidity-fee estimates. It also offers cooperative channel close, splice-out withdrawals, fee bumps, the node's BOLT12 offer and Lightning address, and the swap-in address on phoenixd versions that have one. Admins can view it; the actions that move funds need the Super User. phoenixd manages its ACINQ channel itself, so there is no manual peer or channel opening.

## Seed backup {#backup-recovery}

`seed.dat` is the wallet. Without it, the funds behind every LNbits wallet are gone.

- Back up `~/.phoenix/seed.dat` (or the `/phoenix/.phoenix` volume) offline, and keep the file `chmod 600`. Since v0.9.3, phoenixd enforces 0700/0600 permissions on its data directory itself.
- Never run two phoenixd instances with the same seed.
- To restore, put the backed-up `seed.dat` back into the data directory before the first start. That's safer than phoenixd's `--seed` option, which leaves the seed in your shell history.

LNbits can also keep a copy: if `PHOENIXD_DATA_DIR` points at a phoenixd data directory LNbits can read, LNbits imports the mnemonic from its `seed.dat` into its own settings (`PHOENIXD_MNEMONIC`). The Admin UI then asks you to confirm you've backed it up (`PHOENIXD_MNEMONIC_BACKUP_CONFIRMED`). Remember that the seed is then also in the LNbits database and its backups, so protect them as you would the seed.

## Testing the connection {#testing-connection}

```bash
curl -u :$PHOENIXD_API_PASSWORD http://127.0.0.1:9740/getinfo
curl -u :$PHOENIXD_API_PASSWORD http://127.0.0.1:9740/getbalance
```

The user name is empty; the password follows the colon. Then restart LNbits and check **Settings → Funding** for the balance.

## Troubleshooting {#troubleshooting}

- **Connection refused:** phoenixd isn't running, or it listens somewhere else. A binary install listens on `127.0.0.1` only. In Docker, use the service name (`http://phoenixd:9740/`) from LNbits, not `localhost`.
- **401 Unauthorized:** wrong password, or you used the limited-access one.
- **An incoming payment didn't arrive:** it may have been too small to pay for a channel and gone to fee credit. Check `getinfo` and the Node UI.

## Security {#security-considerations}

1. Treat the full-access API password like a private key: it can spend everything.
2. **Never expose port 9740.** Bind it to `127.0.0.1` or keep it on an internal Docker network.
3. Back up the seed offline, and protect the LNbits database too if you use `PHOENIXD_DATA_DIR`.
4. Watch the balance gap between LNbits and phoenixd (see [balance reconciliation](/docs/funding-sources/overview)).

## See also

- [Funding sources overview](/docs/funding-sources/overview)
- [LND](/docs/funding-sources/lnd)
- [Other backends](/docs/funding-sources/others)
- ACINQ: [phoenixd](https://github.com/ACINQ/phoenixd), [server docs](https://phoenix.acinq.co/server)
