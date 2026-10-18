---
sidebar_position: 1
title: Extensions Overview
description: What LNbits extensions are, how they are enabled, and the security model of Python and WASM extensions
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Extensions Overview

Extensions add features to LNbits, such as a point-of-sale terminal, LNURL pay links or a Nostr marketplace, without changing the core code. LNbits v1.6.2 has two kinds:

- **Python extensions** are Python packages that LNbits imports into its own process. Almost all extensions are this kind.
- **WASM extensions** (new in v1.6.0) are WebAssembly components that LNbits runs in a sandbox. See [WASM Extensions](/docs/extensions/wasm).

## Security model {#security-model}

:::warning Python extensions are not sandboxed
A Python extension runs inside the LNbits process. It can read and write the whole database, read every setting (funding source credentials included), and spend from every wallet on the server. Nothing in LNbits limits what its code does. Installing one means trusting its code, and every later update of it, as much as LNbits itself.

- Install Python extensions only from the official registry or from sources you have reviewed.
- Each extra manifest URL you add is a new party you trust with your funds. The Admin UI warns: "only use the official LNbits extension source, and sources you can trust".
- An admin installs an extension for the whole server. A user only enables or disables what is already installed.
:::

:::info WASM extensions are sandboxed
A WASM extension runs in a wasmtime sandbox with fuel, time and memory limits. It reaches storage, wallets and the network only through host functions, and each needs a permission an admin grants at install. Its UI runs in a sandboxed iframe with a strict Content Security Policy. A permission can still be powerful: `wallet.pay_invoice_background` lets it spend within the grant a user creates. See [WASM Extensions](/docs/extensions/wasm).
:::

## How extensions are enabled {#lifecycle}

An extension goes through three levels. The first two are server-wide. The third is **per user, not per wallet**:

1. **Install** (admin, server-wide). LNbits downloads the release archive, checks its sha256 `hash` when the registry gives one, extracts it and runs its database migrations. Python extensions go to `{LNBITS_EXTENSIONS_PATH}/extensions/<id>` (default `lnbits/extensions/<id>`). WASM extensions go to `data/wasm_extensions/<id>`.
2. **Activate / deactivate** (admin, server-wide). A deactivated extension stays installed, but its paths answer 404 for everyone.
3. **Enable / disable** (each user, for their own account). Enabling adds the extension to that user's menu, and it can then work with any of the user's wallets. The API is `PUT /api/v1/extension/{ext_id}/enable` and `PUT /api/v1/extension/{ext_id}/disable`, with user authentication rather than a wallet key.

**Uninstall** (admin) removes the code and the installed-extension record for all users. **The extension's data stays.** Deleting it is a separate action: **Remove Data** in the UI, or `DELETE /api/v1/extension/{ext_id}/db`. See [Installing Extensions](/docs/extensions/installing).

Related settings:

| Setting | Effect |
|---|---|
| `LNBITS_EXTENSIONS_DEFAULT_INSTALL` | Installs these extension IDs server-wide at startup, and reinstalls them if removed. Environment only |
| `LNBITS_USER_DEFAULT_EXTENSIONS` | Enables these extensions for each **new** user account |
| `LNBITS_ADMIN_EXTENSIONS` | Only admins and the super user can use these extensions |
| `LNBITS_EXTENSIONS_DEACTIVATE_ALL` | Starts LNbits core only, with no extensions loaded |
| `LNBITS_MAX_EXTENSIONS` | Caps the number of installed extensions (`0` = no limit). Environment only |

Apart from the two marked "environment only", these are editable settings. With the Admin UI on (the default), the database values override `.env` after first start, so change them on the Admin UI's **Extensions** tab.

An admin can also charge users to enable an extension (pay to enable), and a registry can offer paid releases (pay to install). [docs.lnbits.com: Monetization](https://docs.lnbits.com/dev/extensions/monetization) covers both.

## Where extension routes live {#routes}

- A Python extension's routes live under `/<ext_id>`. The extension's own router sets that prefix, and LNbits reads the first path segment as the extension id. Its page is at `/<ext_id>/`, and by convention its API is at `/<ext_id>/api/v1/...`. TPoS, for example, serves `GET /tpos/api/v1/tposs`.
- A WASM extension's pages are at `/ext` plus the paths it declares, by convention `/ext/<ext_id>/...`. Its API routes are at `/api/v1/ext/{ext_id}/{path}`.

Every extension's API shows up in your instance's OpenAPI docs at `/docs`.

## Registries {#registries}

LNbits finds installable extensions in registry manifests. v1.6.2 ships with two:

| Kind | Setting | Default URL |
|---|---|---|
| Python | `LNBITS_EXTENSIONS_MANIFESTS` | `https://raw.githubusercontent.com/lnbits/lnbits-extensions/main/extensions.json` |
| WASM | `LNBITS_WASM_EXTENSIONS_MANIFESTS` | `https://raw.githubusercontent.com/lnbits/lnbits-extensions-wasm/refs/heads/main/extensions.json` |

On 2026-10-18 the Python registry listed 61 extensions (189 releases) and the WASM registry 20 (25 releases). Setting either variable **replaces** its default list, so keep the official URL in it if you still want the official extensions. The registry file format is described in [Extension Manifest](/docs/extensions/manifest).

## Some active extensions {#popular-extensions}

Each of these is in the v1.6.2 default registry with a release that installs on v1.6.2 (checked 2026-10-18):

| Extension | What it does | Repository |
|---|---|---|
| TPoS (`tpos`) | Shareable point-of-sale terminal | [lnbits/tpos](https://github.com/lnbits/tpos) |
| Pay Links (`lnurlp`) | Reusable LNURL-pay links and Lightning addresses | [lnbits/lnurlp](https://github.com/lnbits/lnurlp) |
| Withdraw Links (`withdraw`) | LNURL-withdraw links, vouchers and faucets | [lnbits/withdraw](https://github.com/lnbits/withdraw) |
| Boltz (`boltz`) | Swaps between Lightning and on-chain/Liquid | [lnbits/boltz](https://github.com/lnbits/boltz) |
| Bolt Cards (`boltcards`) | NFC Bolt Cards with one-time LNURL-withdraw | [lnbits/boltcards](https://github.com/lnbits/boltcards) |
| NWC Provider (`nwcprovider`) | Nostr Wallet Connect service for LNbits wallets | [lnbits/nwcprovider](https://github.com/lnbits/nwcprovider) |
| LndHub (`lndhub`) | Use LNbits wallets from BlueWallet or Zeus | [lnbits/lndhub](https://github.com/lnbits/lndhub) |
| Split Payments (`splitpayments`) | Split incoming payments across wallets | [lnbits/splitpayments](https://github.com/lnbits/splitpayments) |
| Events (`events`) | Sell and check event tickets | [lnbits/events](https://github.com/lnbits/events) |
| Nostr Market (`nostrmarket`) | Nostr marketplace and webshop | [lnbits/nostrmarket](https://github.com/lnbits/nostrmarket) |
| SatsPay (`satspay`) | On-chain and Lightning charges | [lnbits/satspay](https://github.com/lnbits/satspay) |
| Onchain Wallet (`watchonly`) | Watch-only on-chain wallets | [lnbits/watchonly](https://github.com/lnbits/watchonly) |

For the full catalogue, with descriptions and setup guides generated from each extension's README, see **[docs.lnbits.com/extensions](https://docs.lnbits.com/extensions/)**.

:::note Gone or replaced
`cashu`, `discordbot`, `market`, `infinity` and `sonof` are archived on GitHub. `lnurldevice` and `usermanager` have no release that installs on v1.6.2: their newest releases set `max_lnbits_version` to 1.0.0. `bitcoinswitch`, `fossa` and `lnpos` replace `lnurldevice`, and the core **Users** admin page replaces `usermanager`. Since v1.6.0, wallets can have a Lightning address without an extension.
:::

## Extension Builder {#extension-builder}

LNbits has had a no-code **Extension Builder** at `/extensions/builder` since v1.3.0. You describe the extension in a form, and it generates a **Python** extension from the [extension_builder_stub](https://github.com/lnbits/extension_builder_stub) template. You can download it as a zip (`POST /api/v1/extension/builder/zip`), and an admin can install and activate it straight away (`POST /api/v1/extension/builder/deploy`). Only admins can use it unless `LNBITS_EXTENSIONS_BUILDER_ACTIVATE_NON_ADMINS` is turned on. A generated extension is a normal Python extension, with the same trust model. See [docs.lnbits.com: Extension Builder](https://docs.lnbits.com/guide/core/extension-builder).

## See Also

- [Installing Extensions](/docs/extensions/installing)
- [WASM Extensions](/docs/extensions/wasm)
- [Extension Development](/docs/extensions/development)
- [Extension Manifest](/docs/extensions/manifest)
