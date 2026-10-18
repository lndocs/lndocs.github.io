---
sidebar_position: 6
title: Lightning Addresses
description: Lightning Addresses for every wallet, built into LNbits core since v1.6.0
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Lightning Addresses

Since **v1.6.0** ([#4035](https://github.com/lnbits/lnbits/pull/4035)) every LNbits wallet can have its own Lightning Address, such as `name@your-lnbits.example`, without installing an extension. Before v1.6.0 you needed the LNURLp extension for this. Both can run side by side.

## How it works {#how-it-works}

- When core addresses are allowed, each new wallet gets a random address name. Existing wallets get one the first time they are loaded.
- A payer's wallet looks up `https://<your domain>/.well-known/lnurlp/<name>` (LUD-16), then calls back to `/api/v1/lnurl/wallet/<name>/cb?amount=<msat>` for an invoice.
- The minimum payment is 1 sat (1000 msat). Payers can attach a comment of up to 799 characters. The payment is a normal incoming invoice on the wallet, with the memo `Payment to <name>@<domain>`.
- `name+tag@domain` also works. The tag is stored with the payment (`extra.lnaddress_tag`), which helps you tell payment sources apart.
- The domain in the address is the host the request arrived on. LNbits must therefore be served from the **root** of the domain (not a sub-path), and a reverse proxy must pass the original `Host` header.

## Settings {#settings}

All of these are in the Admin UI (`/admin`). As with other editable settings, after the first start the values in the database **override `.env`**.

| Setting | Default | Meaning |
|---------|---------|---------|
| `LNBITS_LN_ADDRESS_MODE` | `extension_first` | Who answers `/.well-known/lnurlp/<name>`: `extension_first`, `extension_only` or `core_first` (see below). |
| `LNBITS_ALLOW_CUSTOM_WALLET_LIGHTNING_ADDRESSES` | `false` | Let users pick their own address name. Otherwise only admins can change it. |
| `LNBITS_CHARGE_WALLET_LIGHTNING_ADDRESSES` | `false` | Charge users who pick a custom name. |
| `LNBITS_WALLET_LIGHTNING_ADDRESS_PRICE_SATS` | `1000` | The price, in sats, when charging is on. |
| `LNBITS_WALLET_LIGHTNING_ADDRESS_BLACKLIST` | `admin, info, support, help, security` | Reserved words. A name is refused if it is a reserved word, or if any part of it between `.`, `_` or `-` is one. Edit the list in the Admin UI. |

### Modes {#modes}

- **`extension_first`** (default): if an extension that serves `/.well-known/lnurlp` (such as LNURLp) answers for the name, its response wins. Otherwise the core wallet address answers.
- **`extension_only`**: core addresses are switched off. New wallets get no address, nobody can set one, and the core lookup answers "Lightning addresses are not supported on this instance." when no extension answers.
- **`core_first`**: only core wallet addresses answer. Extensions are never asked, so an LNURLp-extension address with no matching core wallet gets "Lightning address not found." In v1.6.2 the extension redirect for `/.well-known/lnurlp` is skipped by design, and the core route only consults extensions in the other two modes.

If you rely on LNURLp-extension addresses, keep the default `extension_first`.

## Changing an address {#changing-an-address}

**Users** (only when custom addresses are allowed) change it in the wallet's settings, or through the API with the wallet's admin key:

```bash
curl -X PATCH https://your-lnbits.example/api/v1/wallet \
  -H "X-Api-Key: $ADMIN_KEY" -H "Content-Type: application/json" \
  -d '{"lightning_address": "alice"}'
```

If custom addresses are not allowed, this returns 403 `Users cannot specify Lightning Addresses.` Other refusals come back as 400 with a message such as `Lightning Address is already taken.` or `Lightning Address contains a reserved word.`

Names are lower-cased. They can contain only lowercase letters, digits, `.`, `_` and `-`, up to 210 characters, and must be unique on the instance. Send only the part before `@`.

**Admins** can set any user's wallet address from the Users page in the Admin UI. That path can use reserved words and is never charged. Its API is `PUT /users/api/v1/user/{user_id}/wallet/{wallet_id}/lightning-address` with `{"lightning_address": "..."}`.

## Charging for addresses {#charging}

When charging is on and the price is above 0, a user who picks a custom name pays the price from the same wallet to the **service fee wallet**. If no service fee wallet is configured, or the user's wallet is the fee wallet, the change is refused. See [Service Fees](/docs/guides/service-fees).

## See Also

- [Service Fees](/docs/guides/service-fees)
- [Use Cases](/docs/guides/use-cases)
- [Official LNbits docs](https://docs.lnbits.com)
