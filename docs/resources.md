---
sidebar_position: 99
title: Resources
description: Official sites, tutorials, podcasts and community resources for LNbits
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Resources

Official sites, community tutorials, podcasts and tools for LNbits. Every link here was checked on 2026-10-18. Community guides were written for older versions, so check them against the current docs before following them step by step.

## Official {#official-resources}

- [docs.lnbits.com](https://docs.lnbits.com): the official LNbits documentation. Its source is the [`lnbits/docs`](https://github.com/lnbits/docs) repository.
- [news.lnbits.com](https://news.lnbits.com): release announcements and project news
- [community.lnbits.com](https://community.lnbits.com): the community forum
- [my.lnbits.com](https://my.lnbits.com): hosted LNbits, a paid SaaS run by LNbits Inc.
- [lnbits.com](https://lnbits.com): project homepage
- [demo.lnbits.com](https://demo.lnbits.com): public demo instance. Don't keep real funds there.
- [github.com/lnbits/lnbits](https://github.com/lnbits/lnbits): source code, issues and releases
- [extensions.lnbits.com](https://extensions.lnbits.com): extension repository
- [shop.lnbits.com](https://shop.lnbits.com): official hardware and DIY kits

## Video and podcasts {#video-tutorials}

The [LNbits YouTube channel](https://youtube.com/@lnbits) has intro videos, extension demos and hardware walkthroughs.

| Episode | Show | Topics |
|---------|------|--------|
| [Episode 407](https://www.stephanlivera.com/407) | Stephan Livera Podcast | Origin story, hardware hacking |
| [S16 E17](https://bitcoin-takeover.com/s16-e-17-ben-arc-lnbits-v1-lightning-network/) | Bitcoin Takeover | The v1 release |
| [S14 E5](https://bitcoin-takeover.com/s14-e5-ben-arc-on-lnbits-and-nostr/) | Bitcoin Takeover | LNbits and Nostr |

## Written guides {#written-guides}

### Getting started {#getting-started}

| Guide | Author | Description |
|-------|--------|-------------|
| [Getting Started with LNbits](https://darthcoin.substack.com/p/getting-started-lnbits) | DarthCoin | Beginner guide |
| [Build Your Own LNbits Server](https://darthcoin.substack.com/p/build-your-own-lnbits-app-server) | DarthCoin | Node and LNbits bundle |
| [VPS Setup Guide](https://github.com/TrezorHannes/vps-lnbits) | TrezorHannes | Cloud VPS deployment |
| [VPS with WireGuard](https://github.com/TrezorHannes/VPS-LNBits-Wireguard) | TrezorHannes | Home node exposed through a VPS tunnel |

### Business and merchants {#business--merchants}

| Guide | Author | Description |
|-------|--------|-------------|
| [LNbits for Small Merchants](https://darthcoin.substack.com/p/lnbits-for-small-merchants) | DarthCoin | Merchant adoption |
| [The Bank of LNbits](https://darthcoin.substack.com/p/the-bank-of-lnbits) | DarthCoin | Running a community bank |
| [LNbits SaaS for Schools](https://darthcoin.substack.com/p/lnbits-saas-a-solution-for-schools) | DarthCoin | Education |
| [Private Banks over Lightning](https://darthcoin.substack.com/p/bitcoin-private-banks-over-lightning) | DarthCoin | Advanced banking setups |

:::caution Custodial
Running LNbits for other people makes you their custodian. Read [Security](/docs/configuration/security) before you offer wallets to anyone else.
:::

### Extensions {#extensions--features}

| Guide | Author | Description |
|-------|--------|-------------|
| [Streamer Copilot Setup](https://darthcoin.substack.com/p/lnbits-streamer-copilot) | DarthCoin | Streaming tips |
| [Nostr Market Setup](https://darthcoin.substack.com/p/lnbits-nostr-market) | DarthCoin | Nostr marketplace |

### Hardware and NFC {#hardware--nfc}

| Guide | Author | Description |
|-------|--------|-------------|
| [Write PlebTags](https://plebtag.com/write-tags/) | PlebTag | Programming NFC tags |
| [Ereignishorizont tutorials](https://ereignishorizont.xyz) | Ereignishorizont | ATM, POS and switch builds |

## Developers {#developer-resources}

- **API explorer:** every instance serves Swagger at `/docs`, for example [demo.lnbits.com/docs](https://demo.lnbits.com/docs).
- **Extension template:** [lnbits/example](https://github.com/lnbits/example), with the [Extension Development](/docs/extensions/development) guide.
- **[Lightning Decoder](https://lightningdecoder.com/):** decodes BOLT11 invoices, LNURLs and Lightning Addresses.

### Client libraries {#libraries--sdks}

| Library | Language | Repository | Status |
|---------|----------|------------|--------|
| lnbits (npm) | JavaScript | [MiguelMedeiros/lnbits-js](https://github.com/MiguelMedeiros/lnbits-js) | Unmaintained since 2021 |
| pylnbits | Python | [lightningames/pylnbits](https://github.com/lightningames/pylnbits) | Archived |

Neither tracks the v1.6 API. Calling the REST API directly is usually simpler. See [SDKs & Libraries](/docs/api/sdks).

## Hardware projects {#hardware-projects}

- [MakerBits Telegram](https://t.me/makerbits): the hardware builders' group
- [LNbits Shop](https://shop.lnbits.com): pre-built hardware and kits
- Typical projects: TPoS and LNPoS terminals, the FOSSA ATM, Bolt Cards, Bitcoin Switch relays and Gerty displays. Most DIY builds use ESP32 boards.

## Apps that connect to LNbits {#powered-by-lnbits}

With the LNDhub extension, you can import an LNbits wallet into apps that support LNDhub accounts. The extension's README names [Alby](https://getalby.com), BitBanana, [BlueWallet](https://bluewallet.io) and [Zeus](https://zeusln.com).

The admin QR code gives the app full spending access to that wallet.

### WordPress {#wordpress-plugins}

- [LNbits – Bitcoin Onchain and Lightning Payment Gateway](https://wordpress.org/plugins/lnbits-bitcoin-onchain-and-lightning-payment-gateway/) for WooCommerce

## Community {#community}

- [community.lnbits.com](https://community.lnbits.com): forum
- [Telegram: LNbits](https://t.me/lnbits): main chat
- [Telegram: MakerBits](https://t.me/makerbits): hardware projects
- [GitHub Discussions](https://github.com/lnbits/lnbits/discussions): questions and ideas
- [news.lnbits.com](https://news.lnbits.com): announcements

The [LNbits GitHub wiki](https://github.com/lnbits/lnbits/wiki) has older community material, including printable flyers.

## Removed links {#removed-links}

These links used to be on this page and no longer work: Lightning Junkies episode 51 and rayito.io (domains gone), lightsats.com (TLS failure), the Go Full Crypto episode on Podbean and the Kuroba LNURL guide (pages removed), and LightningTipBot (decommissioned).

## Contributing {#contributing}

To add a resource, open a PR against [this site's repository](https://github.com/lndocs/lndocs.github.io) or suggest it in the [LNbits Telegram](https://t.me/lnbits). To improve the official docs, use [`lnbits/docs`](https://github.com/lnbits/docs).
