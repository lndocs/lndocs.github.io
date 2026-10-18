---
sidebar_position: 2
title: Wallets
description: How wallets, API keys, balances and wallet sharing work in LNbits v1.6.2
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Wallets Architecture

A wallet is an accounting bucket on top of the single funding source that the instance uses. Every wallet belongs to one account, has two API keys, and gets its balance from the payments recorded against it. The funding source never sees individual wallets.

## Wallet model {#wallet-model}

The `Wallet` model in `lnbits/core/models/wallets.py` (v1.6.2) has these fields:

| Field | Meaning |
|---|---|
| `id` | `uuid4().hex` |
| `user` | Owner's account ID |
| `wallet_type` | `lightning` (default) or `lightning-shared` |
| `adminkey`, `inkey` | The two API keys, each `uuid4().hex` (32 hex characters) |
| `name` | Display name |
| `shared_wallet_id` | For a `lightning-shared` wallet, the ID of the wallet it mirrors |
| `deleted` | Soft-delete flag |
| `created_at`, `updated_at` | Timestamps |
| `currency` | Accounting currency. New wallets get `LNBITS_DEFAULT_ACCOUNTING_CURRENCY`, or `USD` if that is empty |
| `lightning_address` | Local part of the wallet's core Lightning Address (new in v1.6.0) |
| `extra` | `WalletExtra`: `icon` (default `flash_on`), `color` (default `primary`), `pinned`, `shared_with` |
| `stored_paylinks` | Saved LNURL pay links |
| `balance_msat` | Not a column. Filled in from the `balances` view when the wallet is loaded |
| `share_permissions` | Not a column. For a shared wallet, the permissions the owner granted |

Labels belong to the user (`UserExtra.labels`), not to the wallet.

## Wallet types {#wallet-types}

`WalletType` has two values:

- **`lightning`**: an ordinary wallet. The owner has every permission.
- **`lightning-shared`**: a second wallet row, owned by the invited user, that points at the source wallet through `shared_wallet_id`. When a request uses the shared wallet's key, LNbits resolves it to the source wallet, and the granted permissions decide what the request may do.

Only `lightning` wallets can be shared.

## Balance tracking {#balance-tracking}

Balances are **computed, not stored**. LNbits reads them from the `balances` database view, defined in the core migration `m025_refresh_view`:

```sql
CREATE VIEW balances AS
SELECT apipayments.wallet_id,
       SUM(apipayments.amount - ABS(apipayments.fee)) AS balance
FROM wallets
LEFT JOIN apipayments ON apipayments.wallet_id = wallets.id
WHERE (wallets.deleted = false OR wallets.deleted is NULL)
AND (
    (apipayments.status = 'success' AND apipayments.amount > 0)
    OR (apipayments.status IN ('success', 'pending') AND apipayments.amount < 0)
)
GROUP BY apipayments.wallet_id
```

Incoming payments count only once they succeed. Outgoing payments count while they are still pending, so money in flight can't be spent twice. The view uses `ABS(fee)` because the sign of the stored fee isn't consistent. See [Ledger](/docs/architecture/ledger) for the details.

The balance is in **millisatoshis**. `GET /api/v1/wallet` returns it as `balance`, in msat.

### Internal accounting {#internal-accounting}

The sum of the wallet balances is not tied to the funding source's balance. LNbits doesn't enforce that the node holds enough to cover every wallet. It monitors the gap instead: the watchdog compares the two on a schedule, and an admin can read the difference from `GET /admin/api/v1/audit`. See [Funding Sources](/docs/architecture/funding-sources).

## API keys {#api-keys}

Each wallet has an **admin key** and an **invoice key**. Both are random `uuid4().hex` strings, stored in plaintext in the `wallets` table.

Send a key in the `X-Api-Key` header, or as the `api-key` query parameter:

```bash
curl -H "X-Api-Key: $INVOICE_KEY" https://your-lnbits.example/api/v1/wallet
```

Wallet keys only work on wallet routes. User and admin routes take a bearer token, a cookie or `?usr=`, never a wallet key.

### What each key can do {#permissions}

| Action | Admin key | Invoice key |
|---|---|---|
| Create an invoice | Yes | Yes |
| Read the balance (`GET /api/v1/wallet`) | Yes | **Yes** |
| List all the wallet's payments (`GET /api/v1/payments`) | Yes | **Yes** |
| Pay an invoice | Yes | No |
| Rename or update the wallet (`PATCH /api/v1/wallet`) | Yes | No |
| Share the wallet | Yes | No |

The admin key also gets the wallet `id` back from `GET /api/v1/wallet`. The invoice key doesn't.

:::warning
The invoice key can't spend, but it reveals the balance and the **full payment history** of the wallet. Share it only with services you'd trust with that information.

The admin key can spend the whole balance. Treat it like a password: keep it out of front-end code, logged URLs and screenshots.
:::

Keys can be regenerated with `PUT /api/v1/wallet/reset/{wallet_id}`. This needs the account's login, not a wallet key.

## Wallet sharing {#wallet-sharing}

A wallet owner can give other users limited access to a wallet. The permissions are the `WalletPermission` values:

| Value | Grants |
|---|---|
| `view-payments` | See the payment history, and get WebSocket payment notifications |
| `receive-payments` | Create invoices |
| `send-payments` | Pay invoices |

A share is a `WalletSharePermission` (`request_id`, `username`, `shared_with_wallet_id`, `permissions`, `status`, `comment`), kept in the source wallet's `extra.shared_with`. `status` is a `WalletShareStatus`: `invite_sent` or `approved`.

### Invite flow {#invite-flow}

1. The owner invites a user by username or email: `PUT /api/v1/wallet/share/invite` with the source wallet's **admin key**. LNbits records a share with status `invite_sent`, and adds an invite to the invited user's `extra.wallet_invite_requests`.
2. The invited user accepts by creating a wallet of type `lightning-shared` whose `shared_wallet_id` is the source wallet (`POST /api/v1/wallet`, logged in as that user). LNbits creates the mirror wallet and marks the share `approved`.
3. Or the invited user rejects it: `DELETE /api/v1/wallet/share/invite/{share_request_id}`, logged in as that user.
4. The owner can change the permissions of an approved share with `PUT /api/v1/wallet/share`.
5. The owner can revoke a share with `DELETE /api/v1/wallet/share/{share_request_id}`. This deletes the mirror wallet.

Steps 1, 4 and 5 need the source wallet's admin key.

For the user-facing steps, see [Shared Wallets](/docs/guides/shared-wallets).

## Creating and deleting wallets {#wallet-operations}

`POST /api/v1/wallet` (logged in) creates a wallet. Unless `LNBITS_LN_ADDRESS_MODE` is `extension_only`, LNbits also gives the new wallet an auto-generated Lightning Address. See [Lightning Addresses](/docs/guides/lightning-addresses).

`DELETE /api/v1/wallet/{wallet_id}` is a **soft delete**: it sets `deleted = true`. The payments stay in the database, the keys stop working, and the wallet drops out of the `balances` view.

- An admin can restore a deleted wallet from the user manager (`PUT /users/api/v1/user/{user_id}/wallet/{wallet}/undelete`).
- `lnbits-cli db cleanup-deleted-wallets` removes deleted wallets for good.

:::warning
A deleted wallet's balance no longer shows anywhere in LNbits, but the funds are still on the funding source. Withdraw the balance before you delete a wallet.
:::

## Payment notifications {#wallet-events}

When a payment on a wallet settles, LNbits:

- sends a WebSocket message for the wallet, and for each shared wallet with `view-payments`;
- queues chat notifications (Telegram, email, Nostr) and web push notifications, if they are set up;
- POSTs to the payment's `webhook`, if the invoice was created with one.

See [Payments](/docs/architecture/payments).

## See also {#see-also}

- [Architecture Overview](/docs/architecture/overview)
- [Payments](/docs/architecture/payments)
- [Ledger](/docs/architecture/ledger)
- [Users](/docs/architecture/users)
