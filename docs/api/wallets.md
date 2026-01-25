---
sidebar_position: 3
title: Wallets API
description: LNbits wallet management API endpoints
---

# Wallets API

Manage wallets via the LNbits API.

## Get Wallet Info

Get basic wallet information and balance.

```http
GET /api/v1/wallet
```

**Authentication**: Invoice Key or Admin Key

**Response**:
```json
{
  "id": "abc123",
  "name": "My Wallet",
  "balance": 50000
}
```

**Example**:
```bash
curl -H "X-Api-Key: $INVOICE_KEY" \
  https://lnbits.com/api/v1/wallet
```

## Get Wallet Details

Get detailed wallet information with user data.

```http
GET /api/v1/wallet/details
```

**Authentication**: Admin Key

**Response**:
```json
{
  "id": "abc123",
  "name": "My Wallet",
  "user": "user_id",
  "balance_msat": 50000000,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T12:00:00Z"
}
```

## List User Wallets

Get all wallets for the current user.

```http
GET /api/v1/wallets
```

**Authentication**: Admin Key (any wallet)

**Response**:
```json
[
  {
    "id": "wallet1",
    "name": "Main Wallet",
    "balance": 50000
  },
  {
    "id": "wallet2",
    "name": "Savings",
    "balance": 100000
  }
]
```

## Create Wallet

Create a new wallet for the user.

```http
POST /api/v1/wallet
```

**Authentication**: Admin Key (any existing wallet)

**Request Body**:
```json
{
  "name": "New Wallet"
}
```

**Response**:
```json
{
  "id": "new_wallet_id",
  "name": "New Wallet",
  "user": "user_id",
  "adminkey": "admin_key_here",
  "inkey": "invoice_key_here",
  "balance": 0
}
```

**Example**:
```bash
curl -X POST \
  -H "X-Api-Key: $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Wallet"}' \
  https://lnbits.com/api/v1/wallet
```

## Rename Wallet

Update wallet name.

```http
PUT /api/v1/wallet/{wallet_id}
```

**Authentication**: Admin Key (of that wallet)

**Request Body**:
```json
{
  "name": "Updated Name"
}
```

**Response**:
```json
{
  "id": "wallet_id",
  "name": "Updated Name"
}
```

## Delete Wallet

Soft delete a wallet.

```http
DELETE /api/v1/wallet/{wallet_id}
```

**Authentication**: Admin Key (of that wallet)

**Response**:
```json
{
  "success": true
}
```

:::warning
Deleted wallets cannot be recovered. Ensure balance is zero.
:::

## Balance Response

Balance is returned in satoshis by default:

```json
{
  "balance": 50000  // satoshis
}
```

For millisatoshi precision:
```json
{
  "balance_msat": 50000000  // millisatoshis
}
```

## Error Responses

### Wallet Not Found
```json
{
  "detail": "Wallet not found"
}
```
HTTP 404

### Insufficient Balance
```json
{
  "detail": "Insufficient balance"
}
```
HTTP 400

## Code Examples

### Python

```python
import httpx

async def get_wallet(api_key: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://lnbits.com/api/v1/wallet",
            headers={"X-Api-Key": api_key}
        )
        response.raise_for_status()
        return response.json()

async def create_wallet(admin_key: str, name: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://lnbits.com/api/v1/wallet",
            headers={"X-Api-Key": admin_key},
            json={"name": name}
        )
        return response.json()
```

### JavaScript

```javascript
async function getWallet(apiKey) {
  const response = await fetch('https://lnbits.com/api/v1/wallet', {
    headers: { 'X-Api-Key': apiKey }
  });
  return response.json();
}

async function createWallet(adminKey, name) {
  const response = await fetch('https://lnbits.com/api/v1/wallet', {
    method: 'POST',
    headers: {
      'X-Api-Key': adminKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name })
  });
  return response.json();
}
```

## See Also

- [Payments API](/docs/api/payments)
- [API Overview](/docs/api/overview)
