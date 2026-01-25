---
sidebar_position: 2
title: Wallets
description: Understanding the wallet system in LNbits
---

# Wallets Architecture

The wallet system is at the core of LNbits, providing isolated accounting on top of a shared funding source.

## Wallet Model

```python
class Wallet:
    id: str              # Unique identifier (UUID)
    user: str            # Owner's account ID
    name: str            # Display name
    adminkey: str        # Full access API key
    inkey: str           # Invoice-only API key
    balance_msat: int    # Computed from payments
    created_at: datetime
    updated_at: datetime
    extra: WalletExtra   # Metadata, sharing info
```

## Wallet Types

### Standard Wallet (LIGHTNING)

Individual wallet owned by a single user:
- Full control via admin key
- Invoice creation via invoice key
- Complete transaction history
- Extension access

### Shared Wallet (LIGHTNING_SHARED)

Wallet with multi-user access:
- Primary owner with full control
- Shared access with granular permissions
- Audit trail for shared actions

## Balance Tracking

Wallet balances are **computed**, not stored:

```sql
SELECT COALESCE(SUM(amount), 0) - COALESCE(SUM(fee), 0)
FROM apipayments
WHERE wallet_id = :wallet_id
  AND status = 'success'
  AND NOT pending
```

This ensures balance integrity - it's always derived from actual transactions.

### Internal Accounting

LNbits maintains internal balances separate from the funding source:

```
Funding Source Balance: 1,000,000 sats
├── Wallet A: 400,000 sats
├── Wallet B: 350,000 sats
├── Wallet C: 200,000 sats
└── Unallocated: 50,000 sats
```

## API Keys

### Admin Key

```
Permissions:
- Create invoices
- Pay invoices
- View balance
- View all transactions
- Access extensions
- Wallet settings
```

Generated as a random 32-byte hex string.

### Invoice Key

```
Permissions:
- Create invoices only
- View own invoices
```

Safe to share for receiving payments (e.g., with payment processors).

### Key Security

Keys are stored as plaintext in the database (wallet-specific, not reusable elsewhere).

```python
# Key extraction from request
def get_key_from_request(request):
    # Check header first
    key = request.headers.get("X-Api-Key")
    # Then query parameter
    if not key:
        key = request.query_params.get("api-key")
    return key
```

## Wallet Permissions

### Standard Permissions

| Permission | Admin Key | Invoice Key |
|------------|-----------|-------------|
| Create Invoice | Yes | Yes |
| Pay Invoice | Yes | No |
| View Balance | Yes | No |
| View Transactions | Yes | Own only |
| Settings | Yes | No |

### Shared Wallet Permissions

```python
class WalletPermission(Enum):
    VIEW_PAYMENTS = "view_payments"
    RECEIVE_PAYMENTS = "receive_payments"
    SEND_PAYMENTS = "send_payments"
```

## Wallet Sharing

### Invite Flow

```
1. Owner initiates share
   └── Specifies: username, permissions

2. Invitation created
   └── Status: PENDING

3. Invitee receives notification
   └── Can accept or reject

4. On accept
   └── Shared wallet appears in invitee's list
```

### Share Model

```python
class WalletSharePermission:
    request_id: str
    shared_from_wallet_id: str
    shared_with_wallet_id: str
    username: str
    permissions: List[WalletPermission]
    status: WalletShareStatus
    comment: str
```

## Wallet Extra Data

The `extra` field stores additional metadata:

```python
class WalletExtra:
    icon: str           # Emoji or icon name
    color: str          # Theme color
    currency: str       # Default fiat currency
    pinned: bool        # UI pinning
    sharing: List[...]  # Sharing relationships
    labels: List[...]   # Custom labels
```

## Wallet Operations

### Create Wallet

```python
async def create_wallet(
    user_id: str,
    wallet_name: str
) -> Wallet:
    wallet = Wallet(
        id=uuid4().hex,
        user=user_id,
        name=wallet_name,
        adminkey=secrets.token_hex(32),
        inkey=secrets.token_hex(32)
    )
    await db.insert(wallet)
    return wallet
```

### Delete Wallet

Soft delete by marking `deleted=True`:

```python
async def delete_wallet(wallet_id: str):
    await db.execute(
        "UPDATE wallets SET deleted = TRUE WHERE id = :id",
        {"id": wallet_id}
    )
```

:::warning
Deleted wallets retain their transaction history but cannot be accessed.
:::

## Wallet Events

Wallets emit events for:
- Payment received
- Payment sent
- Balance change
- Settings update

Events can trigger webhooks and WebSocket notifications.

## Performance Considerations

### Balance Queries

Balance computation can be expensive with many transactions. Consider:
- Database indexing on `wallet_id` and `status`
- Caching for frequently accessed wallets
- Pagination for transaction history

### Connection Handling

Each wallet operation uses the database connection pool:

```python
async with db.connect() as conn:
    result = await conn.execute(query)
```

## See Also

- [Architecture Overview](/docs/architecture/overview)
- [Payments](/docs/architecture/payments)
- [Users](/docs/architecture/users)
