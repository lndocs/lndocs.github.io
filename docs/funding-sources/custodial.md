---
sidebar_position: 5
title: Custodial Services
description: Configure LNbits with custodial Lightning services, NWC, or another LNbits instance
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Custodial Services

These backends let LNbits run without a Lightning node of your own: a provider's API (or another LNbits instance) sends and receives the payments.

:::warning Custodial risk
With a custodial backend, **the provider holds every sat in every LNbits wallet on your instance.** They can freeze or lose it, they can close your account, and their KYC rules and country restrictions apply to you and, in effect, to your users. Your LNbits balances are only claims on the provider's account. Keep amounts small, reconcile often, and read the provider's terms.
:::

:::note Admin UI or .env
The Admin UI is on by default, and once it has saved settings they override `.env`. Configure the provider in **Settings → Funding** at `/admin` and restart LNbits. The `.env` blocks below only apply on the first start or with `LNBITS_ADMIN_UI=false`. See [Funding sources overview](/docs/funding-sources/overview).
:::

## Status in October 2026 {#overview}

| Service | Class | Status |
|---|---|---|
| Any NWC wallet (Alby Hub and others) | `NWCWallet` | Active. Custody depends on the wallet behind it |
| Another LNbits instance | `LNbitsWallet` | Active |
| Blink | `BlinkWallet` | Active. Not available in the US and some other countries |
| Strike | `StrikeWallet` | Active |
| ZBD | `ZBDWallet` | Active |
| OpenNode | `OpenNodeWallet` | Active |
| Alby (hosted wallet) | `AlbyWallet` | **Shut down** 2025-01-04 |
| LNPay | `LNPayWallet` | **Dead** |
| LN.tips | `LnTipsWallet` | **Dead** |

The setting names and defaults below are from LNbits v1.6.2. Provider dashboards and sign-up steps change often; follow each provider's own docs for those.

## Nostr Wallet Connect (NWC) {#nostr-wallet-connect-nwc}

NWC connects LNbits to any wallet that offers a Nostr Wallet Connect pairing URL. **This is the way to use Alby today**: run [Alby Hub](https://github.com/getAlby/hub) (self-custodial) and create an NWC connection for LNbits.

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=NWCWallet
NWC_PAIRING_URL=
```

Paste the `nostr+walletconnect://...` URL after the `=`. The URL contains the connection secret, so treat it like a password. Give the connection only the permissions and budget LNbits needs. LNbits supports both NIP-04 and NIP-44 encryption and picks what the wallet advertises.

Custody depends on what's behind the URL: with Alby Hub on your own machine you hold the keys; with a hosted NWC wallet, the host does. See the [list of NWC wallets](https://github.com/getAlby/awesome-nwc#nwc-wallets).

## Another LNbits instance {#lnbits-wallet-nested}

Use a wallet on another LNbits server as your funding source:

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=LNbitsWallet
LNBITS_ENDPOINT=https://lnbits.example.com
LNBITS_KEY=
```

`LNBITS_KEY` takes the upstream wallet's admin key (needed to send). `LNBITS_ADMIN_KEY` or, for receive-only, `LNBITS_INVOICE_KEY` work too. The default endpoint is `https://demo.lnbits.com`, a public demo: don't leave it at that. The operator of the upstream instance holds the funds.

## Blink {#blink}

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=BlinkWallet
BLINK_API_ENDPOINT=https://api.blink.sv/graphql
BLINK_WS_ENDPOINT=wss://ws.blink.sv/graphql
BLINK_TOKEN=
```

Create the API key in the [Blink dashboard](https://dashboard.blink.sv). Keys have Read, Receive and Write scopes: give LNbits Read and Receive only, unless it has to send. `BLINK_SEND_WITHOUT_PROBE` (default `true`) sends a payment even when Blink can't probe the route first; Blink then reserves its maximum fee. Set it to `false` to fail such payments instead.

## Strike {#strike}

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=StrikeWallet
STRIKE_API_ENDPOINT=https://api.strike.me/v1
STRIKE_API_KEY=
```

LNbits uses a Strike **API key** from your own account (sent as a Bearer token), not OAuth. Keep `/v1` in the endpoint: LNbits appends paths such as `/balances` to it. Strike is custodial and requires KYC.

## ZBD {#zbd}

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=ZBDWallet
ZBD_API_ENDPOINT=https://api.zebedee.io/v0/
ZBD_API_KEY=
```

Keep the `/v0/` (it's the default). LNbits requests relative paths such as `wallet` and `charges`, so without it every call fails. ZBD's docs now use `api.zbdpay.com`; the old `api.zebedee.io` host still answered in October 2026. Get the key from a ZBD project in its developer dashboard.

## OpenNode {#opennode}

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=OpenNodeWallet
OPENNODE_API_ENDPOINT=https://api.opennode.com/
OPENNODE_KEY=
```

OpenNode has invoice, read-only and withdrawal keys. A withdrawal key can send; an invoice key can only receive. You can also set `OPENNODE_ADMIN_KEY` and `OPENNODE_INVOICE_KEY` instead of `OPENNODE_KEY`. Development and production accounts need separate keys.

## Dead and shut-down services {#dead-services}

:::caution Don't set these up
The classes still ship in v1.6.2, but the services behind them no longer work as a funding source.
:::

- **Alby hosted wallet (`AlbyWallet`, `ALBY_API_ENDPOINT`, `ALBY_ACCESS_TOKEN`).** Alby closed its shared custodial wallet on 2025-01-04 and moved users to Alby Hub. Use [NWC](#nostr-wallet-connect-nwc) with Alby Hub instead.
- **LNPay (`LNPayWallet`, `LNPAY_*`).** In October 2026 `api.lnpay.co` no longer resolves and no shutdown notice could be found. Treat it as dead.
- **LN.tips (`LnTipsWallet`, `LNTIPS_*`).** The `ln.tips` domain no longer resolves. Upstream points to the self-hosted [SatsMobiBot](https://github.com/massmux/SatsMobiBot) code if you want to run that service yourself.

If you're still configured on one of these, move your funds and switch (see [Switching funding sources](/docs/funding-sources/overview)).

## Common issues {#common-issues}

- **The backend doesn't connect:** check the endpoint, including its version path (`/v1`, `/v0/`), and that the key hasn't been revoked. Set `DEBUG=true` for more detail in the logs.
- **Payments fail on amount or frequency:** providers have their own per-payment, balance and rate limits. Check the provider's docs. (`LNBITS_RATE_LIMIT_NO`/`LNBITS_RATE_LIMIT_UNIT` limit requests *to* LNbits, not LNbits' calls to the provider.)
- **Small payments fail on fees:** raise `LNBITS_RESERVE_FEE_MIN` (see the [overview](/docs/funding-sources/overview)).

## Security {#security-considerations}

### API keys {#api-key-protection}

1. Never commit keys or pairing URLs to version control.
2. Give the key the smallest scope that works: receive-only if LNbits doesn't need to send.
3. Rotate a key at once if you suspect it leaked; anyone with a send-capable key can empty the account.
4. With the Admin UI on, the key is stored in the LNbits database, so protect the database and its backups.

### Monitoring {#monitoring}

1. Compare the provider balance with the sum of LNbits balances regularly. **Settings → Funding** shows both.
2. Turn on the watchdog notification (see the [overview](/docs/funding-sources/overview)).
3. Watch for transactions you don't recognise in the provider's dashboard.

## Moving to self-custody {#migration-path}

1. Set up a node or a self-custodial backend ([LND](/docs/funding-sources/lnd), [Core Lightning](/docs/funding-sources/cln), [Phoenixd](/docs/funding-sources/phoenixd)).
2. Fund it with at least the total of all LNbits balances.
3. Switch the funding source in **Settings → Funding** and restart.
4. Withdraw what's left from the custodial account.

## See also

- [Funding sources overview](/docs/funding-sources/overview)
- [Other backends](/docs/funding-sources/others)
- [Phoenixd](/docs/funding-sources/phoenixd)
