---
sidebar_position: 3
title: Quick Start
description: Run LNbits v1.6.2, create the Super User, switch from VoidWallet to FakeWallet, and make a test payment
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Quick Start

From a fresh LNbits v1.6.2 to a test payment between two wallets, on your own machine. It runs over plain `http://localhost` and uses **FakeWallet**, so no real funds are involved.

## Step 1: Start LNbits {#step-1-start-lnbits}

With Docker:

```bash
mkdir -p lnbits-data
docker run -d --name lnbits \
  -p 127.0.0.1:5000:5000 \
  -v "$PWD/lnbits-data:/app/data" \
  -e AUTH_HTTPS_ONLY=false \
  -e LNBITS_EXTENSIONS_PATH=/app/data/extensions \
  lnbits/lnbits:v1.6.2
```

Or from source with [uv](/docs/getting-started/installation):

```bash
git clone https://github.com/lnbits/lnbits.git
cd lnbits
git checkout v1.6.2
uv sync --all-extras --python 3.12
cp .env.example .env
AUTH_HTTPS_ONLY=false uv run lnbits
```

- `AUTH_HTTPS_ONLY=false` lets the login cookie work over plain HTTP. **Remove it** once you serve LNbits over HTTPS ([Authentication](/docs/configuration/authentication)).
- A variable set on the command line wins over the same line in `.env`.
- Wait until `curl http://localhost:5000/api/v1/health` answers before you open the browser.

## Step 2: Create the Super User {#step-2-open-the-web-interface}

Open **http://localhost:5000**. A fresh install redirects every page to **`/first_install`** ([middleware.py L231-240](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/middleware.py#L231-L240)).

1. Choose a **username** (2 to 20 characters) and a **password** (8 to 50 characters), then repeat the password.
2. If the server has `FIRST_INSTALL_TOKEN` set, a **First Install Token** field appears. Enter the token.
3. Click **Login**.

You're now logged in as the **Super User**, the account that controls the instance, with one empty wallet ([first-install.vue](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/templates/pages/first-install.vue), [auth_api.py L601-633](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/core/views/auth_api.py#L601-L633)).

:::warning Keep these credentials safe
The Super User can change the funding source and credit any wallet. It can only log in with this username and password, never with a user ID. To read its ID later, run `lnbits-cli superuser`, or look in `.super_user` in the data folder. See [Admin UI](/docs/configuration/admin-ui).
:::

## Step 3: Notice VoidWallet {#step-3-create-an-account}

A fresh install runs on **VoidWallet** (`LNBITS_BACKEND_WALLET_CLASS` defaults to `VoidWallet`, [settings.py L821](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/settings.py#L821)). VoidWallet has no Lightning connection, so creating an invoice now fails with "VoidWallet cannot create invoices." ([wallets/void.py L20](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/wallets/void.py#L20)). That's expected.

## Step 4: Switch to FakeWallet {#step-4-explore-your-wallet}

The Admin UI is on by default. The funding source is stored in the database, so you change it in the browser, not in `.env`:

1. Open **Settings** in the sidebar (`/admin`). It opens on the **Funding** tab.
2. Scroll to **Funding Sources** and pick **FakeWallet** in the **Funding Source** drop-down.
3. Click **Save**. The notice ends with "Restart required!".
4. Click **Restart server**, then reload the page.

After the restart, the Funding tab shows `Funding source: FakeWallet`.

:::info What FakeWallet does
FakeWallet creates real-looking BOLT11 invoices, but it can only pay invoices created by this same LNbits instance. Paying any other invoice fails with "Only internal invoices can be used!" ([wallets/fake.py](https://github.com/lnbits/lnbits/blob/v1.6.2/lnbits/wallets/fake.py)). That makes it good for UI, API and extension testing, and useless for real payments.
:::

## Step 5: Make a test payment {#create-an-invoice}

1. **Create a second wallet:** click **Add a new wallet** in the sidebar and name it, for example "Shop".
2. **Fund the first wallet:** open it. As the Super User you see a **Credit / Debit** button by the balance. Click it, type `10000` and press **Enter**. (Crediting creates sats from nothing, so only do it on a test instance.)
3. **Create an invoice:** in the "Shop" wallet, click **Receive**, enter 1000 sats and a memo, then click **Create Invoice**. Copy the invoice.
4. **Pay it:** switch to the first wallet, click **Send**, paste the invoice into the text box, click **Read**, check the amount and click **Send**.

Both balances update, and both wallets list the payment.

## Step 6: Try the API {#quick-reference}

Each wallet has two keys. You'll find them under the wallet's **Node URL, API keys and API docs** panel:

| Key | Can do |
|---|---|
| **Invoice key** | Create invoices, **and read the balance and the payment history** |
| **Admin key** | Everything, including **sending payments** |

The invoice key can't spend, but it isn't private: whoever holds it sees all the wallet's activity. Never share the admin key.

```bash
# Wallet name and balance (balance is in msat)
curl http://localhost:5000/api/v1/wallet -H "X-Api-Key: <invoice key>"

# Create an invoice. Always send "out": false: if you leave "out" out, it defaults to paying.
curl -X POST http://localhost:5000/api/v1/payments \
  -H "X-Api-Key: <invoice key>" \
  -H "Content-Type: application/json" \
  -d '{"out": false, "amount": 1000, "unit": "sat", "memo": "Test payment"}'

# Check a payment
curl http://localhost:5000/api/v1/payments/<payment_hash> -H "X-Api-Key: <invoice key>"
```

The interactive API docs are at **http://localhost:5000/docs**. See also the [API overview](/docs/api/overview).

## Step 7: Extensions {#step-5-enable-extensions}

:::warning Before you install
Python extensions run inside LNbits with full access to the data and the funding source. Install only extensions you trust.
:::

Extensions take two steps:

1. **An admin installs** the extension. Open **Extensions** in the sidebar, find it (try **TPoS**), and install it. A source install that copied `.env.example` already has TPoS, because that file sets `LNBITS_EXTENSIONS_DEFAULT_INSTALL="tpos"`.
2. **Each user enables** it for their own account, on the same page.

Admins can make an extension available to everyone, or limit it to admins. See [Installing Extensions](/docs/extensions/installing) and the [catalogue on docs.lnbits.com](https://docs.lnbits.com/guide/using-extensions).

## Step 8: Connect a real funding source {#step-6-connect-a-real-funding-source}

Before real sats touch this instance:

- Put LNbits behind HTTPS and **remove `AUTH_HTTPS_ONLY=false`**.
- Mount a `.env` file and the data folder as shown in [Installation](/docs/getting-started/installation), and back up the data folder.
- Work through the [Security checklist](/docs/configuration/security).

Then go back to **Settings → Funding** as the Super User, pick your backend, fill in its fields, **Save**, and **Restart server**. Each backend's fields are described on its own page:

- [LND](/docs/funding-sources/lnd): REST endpoint, TLS cert and macaroon (it needs one that can both create and pay invoices)
- [Core Lightning](/docs/funding-sources/cln): CLNRest URL, CA/cert, and the three runes (read-only, invoice, pay)
- [Phoenixd](/docs/funding-sources/phoenixd)
- [Custodial services](/docs/funding-sources/custodial)
- [All funding sources](/docs/funding-sources/overview)

:::note `.env` versus the Admin UI
Settings such as `LNBITS_BACKEND_WALLET_CLASS` in `.env` are only read on the **first** start while the Admin UI is on. After that, the Admin UI is the source of truth. See [Settings precedence](/docs/configuration/environment).
:::

## Next Steps {#next-steps}

1. **[Create Your First Wallet](/docs/getting-started/first-wallet):** wallets, keys and sharing in detail.
2. **[Environment Variables](/docs/configuration/environment):** what `.env` still controls.
3. **[Admin UI](/docs/configuration/admin-ui):** roles and settings.
4. **[API Reference](/docs/api/overview):** build integrations.

## Getting Help {#getting-help}

- **Official docs:** [docs.lnbits.com](https://docs.lnbits.com)
- **Community:** [t.me/lnbits](https://t.me/lnbits)
- **Bugs:** [GitHub issues](https://github.com/lnbits/lnbits/issues). Report security problems [privately](https://github.com/lnbits/lnbits/security/advisories/new).
