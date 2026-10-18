---
sidebar_position: 7
title: Ledger Specification
description: An independent lndocs proposal for a Lightning wallet ledger format. Not part of LNbits.
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Lightning Wallet Ledger Specification (proposal)

:::info Independent proposal by lndocs, not LNbits behaviour
This page is an **original proposal written for this site**. It is not an LNbits document, LNbits has not adopted it, and LNbits does not implement it. Nothing in the LNbits repository refers to a ledger specification, and no implementation of it exists.

For what LNbits actually does, read [Ledger System](/docs/architecture/ledger). Everything below the table is the proposal, not a description of LNbits.
:::

## Why it's here {#why}

LNbits' ledger works, but it makes few guarantees: fee signs vary, internal transfers aren't atomic, and `failed` isn't final (see [Ledger System](/docs/architecture/ledger)). This page writes down, in one place, the guarantees a wallet ledger could make, so that you can see which ones LNbits gives and which it doesn't. Treat it as a checklist, not a standard.

## How LNbits v1.6.2 differs {#how-lnbits-differs}

Checked against the LNbits v1.6.2 source (`lnbits/core/migrations.py`, `lnbits/core/services/payments.py`, `lnbits/core/crud/payments.py`, `lnbits/db.py`).

| Topic | This proposal | LNbits v1.6.2 |
|-------|---------------|---------------|
| Balance inclusion | Credits count on `success`; debits on `pending` or `success` | **Same** |
| Amounts | Signed 64-bit millisatoshis | **Same** (`amount` is `BIGINT`) |
| Statuses | `pending`, `success`, `failed` | **Same** |
| Primary key | An `id` primary key | No primary key; `UNIQUE (wallet_id, checking_id)` |
| Entry type | An explicit `entry_type` column | None. Direction comes from the sign of `amount`; the kind is inferred from `checking_id` prefixes (`internal_`, `service_fee_`, `fiat_`) and the memo ("Admin credit", "Admin debit") |
| Fee sign | `fee_msat` is always ≤ 0 | Usually negative, but an incoming invoice settled by the funding source's stream stores the backend's `fee_msat` as reported. The view uses `ABS(fee)` |
| Balance formula | `SUM(amount_msat + fee_msat)` | `SUM(amount - ABS(fee))` in the `balances` view, excluding deleted wallets |
| Internal transfers | Atomic: both entries or neither | **Not atomic.** Each statement commits on its own; the sender row is committed before the receiver row is updated |
| Terminal states | `success` and `failed` never change | **`failed` → `success` happens** when a payment is retried and the funding source reports the first attempt as paid |
| Immutability | Settled entries are read-only | `success` rows still get new labels, `extra` keys and hold-invoice flags |
| Linked entries | A fee entry is reversed when its payment fails | The `service_fee_` row is written while the payment may still be pending, and stays if it fails |
| Status history | Every status change recorded | None. The `audit` table logs HTTP requests, not ledger changes |
| Reconciliation | Σ balances ≤ funding source, enforced | Monitored only: `GET /admin/api/v1/audit` and the balance watchdog |

## The proposal {#proposal}

A ledger that claims to follow this proposal MUST:

1. Store one entry per wallet per event, with a unique `id`, a `wallet_id`, a `payment_hash`, a signed `amount_msat` (64-bit, positive = credit), a `fee_msat` that is always ≤ 0, a `status` (`pending`, `success`, `failed`), an `entry_type`, and `created_at` / `updated_at`.
2. Compute a balance as `Σ (amount_msat + fee_msat)` over credits in `success` and debits in `pending` or `success`.
3. Write both sides of an internal transfer in one database transaction.
4. Treat `success` and `failed` as terminal. Corrections are new entries, never edits.
5. Reverse a fee entry when the payment it belongs to fails.
6. Record every status change with a timestamp and, for manual adjustments, the actor.

It SHOULD:

- export entries as JSON Lines, one entry per line, with the field names above;
- provide a reconciliation check that compares the sum of balances with the funding source.

### Reference SQL {#23-sql-reference-implementation}

Illustrative only. LNbits' own schema and view are on [Ledger System](/docs/architecture/ledger).

```sql
CREATE TABLE ledger_entries (
    id           TEXT PRIMARY KEY,
    payment_hash TEXT NOT NULL,
    wallet_id    TEXT NOT NULL,
    amount_msat  BIGINT NOT NULL,
    fee_msat     BIGINT NOT NULL DEFAULT 0 CHECK (fee_msat <= 0),
    status       TEXT NOT NULL DEFAULT 'pending',
    entry_type   TEXT NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    extra        TEXT  -- JSON
);

CREATE VIEW wallet_balances AS
SELECT wallet_id, COALESCE(SUM(amount_msat + fee_msat), 0) AS balance_msat
FROM ledger_entries
WHERE (amount_msat > 0 AND status = 'success')
   OR (amount_msat < 0 AND status IN ('success', 'pending'))
GROUP BY wallet_id;
```

## Status {#9-reference-implementation}

There is no reference implementation. The balance inclusion rule comes from LNbits' `balances` view. LNbits meets rule 2 in effect (through `ABS(fee)`), but not rules 1, 3, 4, 5 or 6.

## See also

- [Ledger System](/docs/architecture/ledger): what LNbits actually does
- [Payments](/docs/architecture/payments)
