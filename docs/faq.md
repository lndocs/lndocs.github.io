---
sidebar_position: 100
title: FAQ
description: Frequently asked questions about LNbits
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Frequently Asked Questions

The official FAQ is at [docs.lnbits.com](https://docs.lnbits.com). This page answers the questions operators ask most, checked against LNbits v1.6.2.

## General {#general}

### What is LNbits? {#what-is-lnbits}

LNbits is a free, open-source Lightning accounts system. It sits on top of a Lightning node or service (the *funding source*) and gives you isolated wallets, each with its own API keys, plus a REST API and extensions.

### Is LNbits custodial? {#is-lnbits-custodial}

For the person running it on their own node, the funds stay on their node. For everyone else with a wallet on that instance, it is custodial: the operator controls the node and can move the funds. A wallet on someone else's LNbits is an IOU from that operator.

### How much does LNbits cost? {#how-much-does-lnbits-cost}

The software is free and MIT-licensed. You pay for hosting and Lightning fees. Operators can optionally charge a [service fee](/docs/guides/service-fees). For hosted instances, LNbits Inc. runs the paid SaaS [my.lnbits.com](https://my.lnbits.com).

### Which Lightning backends are supported? {#which-lightning-nodes-are-supported}

v1.6.2 ships 25 funding-source classes, including LND (REST and gRPC), Core Lightning (RPC and CLNRest), Phoenixd, Eclair, Bark (new in v1.6.0), Spark, NWC and several custodial APIs, plus `FakeWallet` for testing and `VoidWallet`, the default, which does nothing. See [Funding Sources](/docs/funding-sources/overview).

:::caution Dead or deprecated backends
The Alby shared wallet closed on 2025-01-04, the LNPay and LN.tips services are gone, c-lightning-REST is archived, and the Breez Greenlight and Breez Liquid SDKs are deprecated. Don't pick these for a new install.
:::

## Accounts and wallets {#wallets}

### How do I create an account and a wallet? {#how-do-i-create-a-wallet}

Register on the instance's home page, if the operator allows new accounts, then log in. Your first wallet is created with the account, and you can add more from the wallet menu. Since v1.6.0 the default login method is **username and password** only (`AUTH_ALLOWED_METHODS=username-password`).

The old model, where a secret `?usr=` URL *was* the login, is the `user-id-only` method. It is off by default since v1.6.0 (#4132). An operator can turn it back on, but anyone who sees that URL owns the account. See [Upgrading](/docs/guides/upgrading).

### Can I have multiple wallets? {#can-i-have-multiple-wallets}

Yes. Each wallet has its own balance, its own admin key (spend) and invoice key (receive, and read the balance and payment history). Wallets can also be [shared](/docs/guides/shared-wallets) with other users.

### How do I recover my account? {#how-do-i-recover-my-wallet}

Log in with your username and password. If you've forgotten the password, ask the operator: the Super User can generate a reset URL for your account from the Users page. It isn't single-use: anyone holding it can set a new password until it expires, 120 seconds after it was made (`AUTH_CREDETIALS_UPDATE_THRESHOLD`), so send it over a private channel. A lost user-ID URL with no username or password set can't be recovered on a server you don't run.

### Can I stop others from creating accounts on my instance? {#can-i-prevent-others-from-creating-wallets-on-my-instance}

Yes. Set `LNBITS_ALLOW_NEW_ACCOUNTS=false` to turn off self-registration. Admins can still create users. Setting `LNBITS_ALLOWED_USERS` to a list of user IDs also blocks new accounts and restricts access to those users (admins and the Super User are always allowed).

The Admin UI is on by default, and after the first start these settings live in the database and override `.env`. Change them in the Admin UI (`/admin`), or edit `.env` with `LNBITS_ADMIN_UI=false`.

## Payments {#payments}

### Why is my payment failing? {#why-is-my-payment-failing}

The common causes are an insufficient balance (outgoing payments also need room for the fee reserve), a funding source that is down or still on `VoidWallet`, no route, or an instance limit such as `LNBITS_MAX_OUTGOING_PAYMENT_AMOUNT_SATS`. Check the LNbits logs and your funding source. See [Troubleshooting](/docs/guides/troubleshooting).

### Are there fees? {#are-there-fees}

- **Routing fees:** set by the Lightning network and paid by the sender. LNbits holds back a fee reserve while the payment is in flight.
- **Service fees:** optional, set by the operator, and charged to the sender on outgoing payments.
- **LNbits itself:** charges nothing.

Payments between wallets on the same instance are internal: no routing fee and no Lightning payment at all.

### Can I deposit on-chain bitcoin? {#can-i-deposit-on-chain-btc-to-lnbits}

Not into a Lightning wallet balance directly in v1.6.2. The [Boltz extension](https://github.com/lnbits/boltz) swaps between on-chain bitcoin and Lightning. The **Watch Only** extension (`watchonly`) tracks a separate on-chain wallet from an xpub; it doesn't add to your LNbits balance.

A core on-chain wallet type exists only on the unreleased `dev` branch. See [Unreleased](/docs/guides/unreleased).

### How do I enable comments on LNURL-pay links? {#how-do-i-enable-comments-on-lnurl-p-payments}

In the LNURLp extension, set the comment length on the pay link: 0 to 799 characters, where 0 (the default) turns comments off. Core wallet [Lightning Addresses](/docs/guides/lightning-addresses) always accept comments of up to 799 characters.

### Does every wallet get a Lightning Address? {#lightning-address}

Since v1.6.0, core wallets can have a Lightning Address without the LNURLp extension. See [Lightning Addresses](/docs/guides/lightning-addresses).

### How do I fund my LNbits wallet from my own node? {#how-do-i-fund-my-lnbits-wallet-from-my-own-node}

With an LND funding source, an LNbits invoice is an invoice of your own node. Paying it from that same node is a circular self-payment: LND refuses it unless you allow it (`lncli payinvoice --allow_self_payment`), and then it needs a route out and back through your channels and costs routing fees. The simplest way is to pay from another wallet or node.

The Super User can also credit a wallet directly, with the **+** button next to the wallet's balance or `PUT /users/api/v1/balance`. That moves no sats on the node: only credit funds the node really holds and no other wallet is owed, or the [balance watchdog](/docs/architecture/ledger) will flag the difference.

The other direction has a v1.6.2 bug: an LNbits wallet paying an invoice created on LNbits' own LND node stays pending forever ([#4240](https://github.com/lnbits/lnbits/issues/4240), fixed on `dev`). `LND_REST_ALLOW_SELF_PAYMENT` and `LND_GRPC_ALLOW_SELF_PAYMENT` (both default `false`) let LNbits make such circular payments.

## Extensions {#extensions}

### What extensions are available? {#what-extensions-are-available}

The official registry lists 61 Python extensions, and the WASM registry (new in v1.6.0) lists 20. Browse them in **Extensions** on your instance, or at [docs.lnbits.com/extensions](https://docs.lnbits.com/extensions/).

:::warning
Python extensions run inside the LNbits process and are **not sandboxed**: an extension can read every wallet and key. Only install extensions you trust. WASM extensions run in a sandbox with permissions you grant at install time.
:::

### Can I create my own extension? {#can-i-create-my-own-extension}

Yes. See [Extension Development](/docs/extensions/development).

## Security {#security}

### Is LNbits secure? {#is-lnbits-secure}

It depends heavily on how you run it. Use HTTPS behind a reverse proxy, keep the Super User credentials private, keep LNbits off the public internet except through the proxy (`FORWARDED_ALLOW_IPS` defaults to `*`), install only trusted extensions, and keep up with releases. See [Security](/docs/configuration/security). Report vulnerabilities privately through [GitHub](https://github.com/lnbits/lnbits/security/advisories/new).

### Should I use LNbits for large amounts? {#should-i-use-lnbits-for-large-amounts}

Keep only what you need on a hot Lightning node. If you do hold larger amounts: run your own instance on your own node, take regular [backups](/docs/guides/backup-restore), and watch the balance watchdog, which compares the node balance with the sum of the wallets.

## Hosting {#hosting}

### Can I run LNbits locally? {#can-i-run-lnbits-locally}

Yes, with Docker, uv, the AppImage or Nix. See [Installation](/docs/getting-started/installation).

### What does it need? {#what-are-the-system-requirements}

Python 3.10 to 3.12 if you don't use Docker, and a funding source. A small VPS or a Raspberry Pi is enough for a personal instance. SQLite is the default database. PostgreSQL is better for busy instances.

### How do I update LNbits? {#how-do-i-update-lnbits}

Back up first, read the [upgrade notes](/docs/guides/upgrading), then move to a pinned release rather than whatever is on a branch:

```bash
# Docker: change the tag in your compose file, then
docker compose pull && docker compose up -d

# uv install
git fetch --tags && git checkout v1.6.2
uv sync --all-extras
```

Database migrations run automatically on start.

### Where is my data? {#where-is-my-data}

In the data folder: `./data` for a native install and `/app/data` inside the Docker image. It holds `database.sqlite3`, one `ext_<id>.sqlite3` per extension, `.lnbits_auth_key`, `.super_user`, the installed extensions and the logs. On PostgreSQL the core and extension tables are in the database instead. See [Backup & Restore](/docs/guides/backup-restore).

## Connectivity {#connectivity}

### What if my funding source is only reachable over Tor? {#what-if-my-funding-source-is-only-available-via-tor}

That's fine for LNbits talking to the node. What matters for users is whether *LNbits itself* is reachable: if it is only on an onion address, only Tor-enabled wallets, apps and PoS devices can use it. Expose LNbits on clearnet behind a reverse proxy if you need broad compatibility.

## Mobile wallets {#mobile-wallets}

### How do I use LNbits from a mobile wallet? {#how-do-i-use-lnbits-with-bluewallet-or-zeus}

Install the **LNDhub** extension, pick a wallet and scan one of its QR codes into a wallet app that supports LNDhub accounts. The extension's README names Alby, BitBanana, BlueWallet and Zeus.

- **Invoice QR:** create invoices and receive only.
- **Admin QR:** full spending access. Treat it like the wallet's admin key.

You can also connect over Nostr Wallet Connect with the **NWC Provider** extension.

## Hardware {#hardware}

### What hardware projects can I build with LNbits? {#what-hardware-projects-can-i-build-with-lnbits}

- **Point of sale:** TPoS, LNPoS
- **ATMs:** FOSSA
- **NFC:** Bolt Cards
- **Switches and vending:** Bitcoin Switch, LNURL Device
- **Displays:** Gerty

See [Resources](/docs/resources) and the [MakerBits Telegram](https://t.me/makerbits).

### How do I make NFC Bolt Cards? {#how-do-i-create-nfc-boltcards}

Install the **Bolt Cards** extension, get NXP NTAG 424 DNA cards, and write the keys from the extension to the card with an NFC programming app. The [extension docs](https://docs.lnbits.com/extensions/) have the walkthrough.

## Getting help {#getting-help}

### Where can I get support? {#where-can-i-get-support}

- **Docs:** [docs.lnbits.com](https://docs.lnbits.com)
- **Forum:** [community.lnbits.com](https://community.lnbits.com)
- **Telegram:** [t.me/lnbits](https://t.me/lnbits)
- **GitHub:** [issues](https://github.com/lnbits/lnbits/issues) and [discussions](https://github.com/lnbits/lnbits/discussions)
- **Demo:** [demo.lnbits.com](https://demo.lnbits.com)

### How can I contribute? {#how-can-i-contribute}

See [Contributing](/docs/development/contributing).

## See also {#see-also}

- [Resources](/docs/resources): tutorials, podcasts and community guides
- [Use Cases](/docs/guides/use-cases): real-world applications
- [Troubleshooting](/docs/guides/troubleshooting): common issues and fixes
