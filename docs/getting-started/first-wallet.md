---
sidebar_position: 4
title: Create Your First Wallet
description: Wallets, API keys, receiving, sending, sharing and key rotation in LNbits v1.6.2
last_update:
  date: 2026-10-19
verified_with: v1.6.2
---

# Create Your First Wallet

Wallets in LNbits v1.6.2: creating them, what their two keys can do, and receiving, sending and sharing. It assumes you've finished the [Quick Start](/docs/getting-started/quick-start). For a UI walkthrough with screenshots, see the official [wallets and accounts guide](https://docs.lnbits.com/guide/core/wallets-and-accounts).

## Understanding wallets {#understanding-wallets}

An **account** is what you log in with (by default, a username and password). An account holds one or more **wallets**. Each wallet has:

- a balance, kept by LNbits in **millisatoshis** (the API's `balance` field is in msat);
- two API keys, an **admin key** and an **invoice key**;
- its own payment history;
- a name, icon, color, fiat currency and, if the instance allows it, a Lightning Address.

Extensions are enabled per **account**, not per wallet. Within an extension, you usually pick which wallet it uses.

All wallets share the instance's single funding source. Their balances are entries in LNbits' own ledger.

## Creating a wallet {#creating-a-wallet}

### Step 1: Log in {#step-1-access-lnbits}

Open your instance (for example `http://localhost:5000`) and log in. On a default install that's with a username and password: either the Super User you created on `/first_install`, or an account registered on the home page.

### Step 2: Add a wallet {#step-2-create-new-wallet}

1. Click **Add a new wallet** in the sidebar.
2. Enter a name, for example "Personal".
3. Click **Add wallet**.

New accounts start with one wallet, named after `LNBITS_DEFAULT_WALLET_NAME` (default "LNbits wallet").

### Step 3: Keep your login safe {#step-3-save-your-wallet-url}

Your access is your **username and password**. On a default v1.6.2 install, a wallet URL by itself doesn't log anyone in.

:::caution If your instance allows `user-id-only`
Some instances turn on the legacy `user-id-only` method, and instances set up before v1.6.0 may still have it on. There, a URL such as `.../wallet?usr=<user id>` **is** the login: anyone who has it controls the whole account. Treat such a URL like a password and never share it. See [Authentication](/docs/configuration/authentication).
:::

## Wallet dashboard {#wallet-dashboard}

### Balance {#balance-section}

The balance in sats (and in fiat, if the wallet has a currency set), with the **Receive** and **Send** buttons.

### Transaction history {#transaction-history}

Incoming and outgoing payments, with their status (pending, success or failed), memo, time and labels.

### API keys {#api-keys}

The **Node URL, API keys and API docs** panel shows the wallet ID and both keys, and has the **Reset Keys** button ([lnbits-wallet-api-docs.vue](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/templates/components/lnbits-wallet-api-docs.vue)).

## API keys explained {#api-keys-explained}

| | Admin key | Invoice key |
|---|---|---|
| Create invoices | ✓ | ✓ |
| Read the name and balance (`GET /api/v1/wallet`); the admin key also gets the wallet `id` | ✓ | ✓ |
| List the payment history (`GET /api/v1/payments`) | ✓ | ✓ |
| **Send payments** | ✓ | — |
| Change wallet settings, share the wallet | ✓ | — |

Sources: [wallet_api.py](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/wallet_api.py) and [payment_api.py](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/payment_api.py) in v1.6.2.

### Admin key {#admin-key}

Full control of the wallet, including spending. Keep it secret. Only give it to a backend service that has to send payments.

### Invoice key {#invoice-key}

The invoice key **can't spend**, but it isn't private. Whoever holds it can read the wallet's balance and its full payment history. Use it in apps that only need to receive, such as a shop's checkout, and share it only with services you'd trust to see all the wallet's activity.

## Receiving payments {#receiving-payments}

### Create an invoice {#create-an-invoice}

1. Click **Receive**.
2. Enter the amount (in sats, or in fiat if the wallet has a currency).
3. Add a memo.
4. Click **Create Invoice**.

You get a BOLT11 invoice as text and as a QR code.

### Through the API {#invoice-options}

```bash
curl -X POST https://lnbits.example.com/api/v1/payments \
  -H "X-Api-Key: <invoice key>" \
  -H "Content-Type: application/json" \
  -d '{
    "out": false,
    "amount": 1000,
    "unit": "sat",
    "memo": "Coffee",
    "webhook": "https://shop.example.com/lnbits-hook"
  }'
```

- **Always send `"out": false`** for an invoice. When `out` is missing, it defaults to `true`, which means paying ([models/payments.py L254-276](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/models/payments.py#L254-L276)).
- `amount` is in `unit`, which defaults to `sat`. Other units are fiat currency codes.
- `webhook` is called when the invoice is paid. By default, LNbits refuses webhook URLs that point at private or non-global IPs, or that use a bare IP instead of a domain (`LNBITS_CALLBACK_ALLOW_PRIVATE_IPS`, `LNBITS_CALLBACK_URL_RULES`). A refused URL makes the invoice request itself fail ([services/payments.py L191](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/services/payments.py#L191)). See [Webhooks](/docs/api/webhooks).

## Sending payments {#sending-payments}

### Pay an invoice {#pay-an-invoice}

1. Click **Send**.
2. Paste the BOLT11 invoice into the text box (or scan a QR code), then click **Read**.
3. Check the amount and description.
4. Click **Pay**.

### Pay an LNURL or Lightning Address {#pay-via-lnurl}

Paste the LNURL or Lightning Address in the same **Send** box, click **Read**, enter the amount, and confirm. By default, LNbits fetches LNURLs only over HTTPS from public addresses (plus `.onion` through Tor) ([services/lnurl.py L435-460](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/services/lnurl.py#L435-L460)).

## Wallet settings {#wallet-settings}

### Customize the wallet {#customize-your-wallet}

In the wallet's settings you can change the **name**, **icon**, **color** and **fiat currency**, and pin the wallet. You can also set a **Lightning Address** if the admin has turned on `LNBITS_ALLOW_CUSTOM_WALLET_LIGHTNING_ADDRESSES` (off by default), and the instance may charge for it. Through the API, these are `PATCH /api/v1/wallet` with the admin key ([wallet_api.py L165-199](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/wallet_api.py#L165-L199)).

### Multiple wallets {#multiple-wallets}

Create separate wallets for separate purposes, such as personal, shop and testing. Each one has its own balance, history and keys.

## Sharing wallets {#sharing-wallets}

You can share a wallet with another user on the same instance, with chosen permissions ([models/wallets.py L25-51](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/models/wallets.py#L25-L51)).

### Share with another user {#share-with-another-user}

1. Open the wallet and choose **Share Wallet**.
2. Enter the other user's **username**. Invitations go by username, not by email.
3. Pick the permissions:
   - **view-payments:** see the balance and payments
   - **receive-payments:** create invoices
   - **send-payments:** make payments
4. Send the invitation (`PUT /api/v1/wallet/share/invite`, admin key).

### Accept a shared wallet {#accept-a-shared-wallet}

The invited user sees a **Wallet Invite** badge next to **Add a new wallet** in their sidebar. They open it and accept or reject the invitation. An accepted share shows up in their wallet list. The owner can revoke it at any time. See [Shared Wallets](/docs/guides/shared-wallets).

## Wallet security {#wallet-security}

### What to back up {#backup-your-access}

- Your **username and password** (in a password manager).
- Any **admin keys** you've put into other systems, so that you know what to rotate.
- The wallets themselves live on the server. Their safety depends on the operator's backups. See [Backup & Restore](/docs/guides/backup-restore).

### Where keys belong {#secure-your-keys}

| Credential | Share? | Store |
|---|---|---|
| Username and password | Never | Password manager |
| Admin key | Never | Server-side secrets of the backend that pays |
| Invoice key | Only with services that may see the balance and history | App config of receive-only integrations |

### Key rotation {#key-rotation}

If a key may have leaked, rotate it yourself. Click **Reset Keys** in the **Node URL, API keys and API docs** panel, or call `PUT /api/v1/wallet/reset/{wallet_id}` while logged in ([wallet_api.py L133-147](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/wallet_api.py#L133-L147)). Both keys are replaced, so update every integration that used them.

## Deleting a wallet {#deleting-a-wallet}

:::warning
Move the balance out before you delete a wallet. You can't use a deleted wallet again.
:::

1. Open the wallet's settings.
2. Click **Delete wallet**.
3. Confirm.

The API equivalent is `DELETE /api/v1/wallet/{wallet_id}`, which you call as the logged-in owner.

## Common tasks {#common-tasks}

### Check the balance {#check-balance}

```bash
curl https://lnbits.example.com/api/v1/wallet -H "X-Api-Key: <invoice key>"
# {"name": "...", "balance": 1000000}  (balance in msat)
```

### List transactions {#list-transactions}

```bash
curl https://lnbits.example.com/api/v1/payments -H "X-Api-Key: <invoice key>"
```

### Pay an invoice {#create-payment}

This spends from the wallet, so it needs the admin key.

```bash
curl -X POST https://lnbits.example.com/api/v1/payments \
  -H "X-Api-Key: <admin key>" \
  -H "Content-Type: application/json" \
  -d '{"out": true, "bolt11": "lnbc..."}'
```

## Next Steps {#next-steps}

1. **[Connect a Funding Source](/docs/funding-sources/overview):** real Lightning.
2. **[Extensions](/docs/extensions/overview):** TPoS, pay links and more.
3. **[API](/docs/api/overview):** build integrations.
4. **[Security](/docs/configuration/security):** harden your instance.
