---
sidebar_position: 4
title: Payments API
description: Create invoices and pay Lightning payments
---

# Payments API

Create invoices, pay invoices, and manage payments.

## Create Invoice

Create a Lightning invoice to receive payment.

```http
POST /api/v1/payments
```

**Authentication**: Invoice Key or Admin Key

**Request Body**:
```json
{
  "out": false,
  "amount": 1000,
  "memo": "Payment for coffee",
  "unit": "sat",
  "webhook": "https://your-server.com/webhook",
  "expiry": 3600
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `out` | boolean | Yes | `false` for invoice |
| `amount` | integer | Yes | Amount (in unit) |
| `memo` | string | No | Invoice description |
| `unit` | string | No | `sat` (default) or `msat` |
| `webhook` | string | No | Callback URL |
| `expiry` | integer | No | Seconds until expiry |

**Response**:
```json
{
  "payment_hash": "abc123...",
  "payment_request": "lnbc10n1pj...",
  "checking_id": "abc123..."
}
```

**Example**:
```bash
curl -X POST \
  -H "X-Api-Key: $INVOICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"out": false, "amount": 1000, "memo": "Test"}' \
  https://lnbits.com/api/v1/payments
```

## Pay Invoice

Pay a Lightning invoice.

```http
POST /api/v1/payments
```

**Authentication**: Admin Key (required)

**Request Body**:
```json
{
  "out": true,
  "bolt11": "lnbc10n1pj..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `out` | boolean | Yes | `true` for payment |
| `bolt11` | string | Yes | BOLT11 invoice |

**Response**:
```json
{
  "payment_hash": "abc123...",
  "checking_id": "abc123...",
  "fee": 10
}
```

**Example**:
```bash
curl -X POST \
  -H "X-Api-Key: $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"out": true, "bolt11": "lnbc10n1pj..."}' \
  https://lnbits.com/api/v1/payments
```

## List Payments

Get payment history.

```http
GET /api/v1/payments
```

**Authentication**: Admin Key

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | int | Max results (default: 10) |
| `offset` | int | Skip results |
| `pending` | bool | Filter pending only |
| `incoming` | bool | Filter incoming only |
| `outgoing` | bool | Filter outgoing only |

**Response**:
```json
[
  {
    "checking_id": "abc123",
    "payment_hash": "abc123",
    "amount": 1000,
    "fee": 0,
    "memo": "Test payment",
    "status": "success",
    "created_at": "2024-01-15T12:00:00Z"
  }
]
```

**Example**:
```bash
curl -H "X-Api-Key: $ADMIN_KEY" \
  "https://lnbits.com/api/v1/payments?limit=20&incoming=true"
```

## Get Payment

Get specific payment details.

```http
GET /api/v1/payments/{checking_id}
```

**Authentication**: Admin Key

**Response**:
```json
{
  "checking_id": "abc123",
  "payment_hash": "abc123",
  "bolt11": "lnbc10n1pj...",
  "amount": 1000,
  "fee": 0,
  "memo": "Test payment",
  "status": "success",
  "preimage": "def456...",
  "created_at": "2024-01-15T12:00:00Z"
}
```

## Check Payment Status

Check if a payment has been received.

```http
GET /api/v1/payments/{payment_hash}
```

**Authentication**: Invoice Key (for invoices you created)

**Response**:
```json
{
  "paid": true
}
```

or

```json
{
  "paid": false
}
```

## Decode Invoice

Decode a BOLT11 invoice.

```http
POST /api/v1/payments/decode
```

**Authentication**: Invoice Key

**Request Body**:
```json
{
  "data": "lnbc10n1pj..."
}
```

**Response**:
```json
{
  "payment_hash": "abc123",
  "amount_msat": 1000000,
  "description": "Test payment",
  "payee": "03abc...",
  "expiry": 3600,
  "timestamp": 1705320000
}
```

## Payment Status Values

| Status | Description |
|--------|-------------|
| `pending` | Awaiting confirmation |
| `success` | Payment completed |
| `failed` | Payment failed |

## Webhook Notifications

When a webhook URL is specified, LNbits sends a POST request on payment:

```json
{
  "payment_hash": "abc123",
  "checking_id": "abc123",
  "amount": 1000,
  "memo": "Test",
  "status": "success"
}
```

## Code Examples

### Python

```python
import httpx

async def create_invoice(api_key: str, amount: int, memo: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://lnbits.com/api/v1/payments",
            headers={"X-Api-Key": api_key},
            json={
                "out": False,
                "amount": amount,
                "memo": memo
            }
        )
        return response.json()

async def pay_invoice(admin_key: str, bolt11: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://lnbits.com/api/v1/payments",
            headers={"X-Api-Key": admin_key},
            json={
                "out": True,
                "bolt11": bolt11
            }
        )
        return response.json()

async def check_payment(api_key: str, payment_hash: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://lnbits.com/api/v1/payments/{payment_hash}",
            headers={"X-Api-Key": api_key}
        )
        return response.json()
```

### JavaScript

```javascript
async function createInvoice(apiKey, amount, memo) {
  const response = await fetch('https://lnbits.com/api/v1/payments', {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      out: false,
      amount,
      memo
    })
  });
  return response.json();
}

async function payInvoice(adminKey, bolt11) {
  const response = await fetch('https://lnbits.com/api/v1/payments', {
    method: 'POST',
    headers: {
      'X-Api-Key': adminKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      out: true,
      bolt11
    })
  });
  return response.json();
}
```

## See Also

- [Wallets API](/docs/api/wallets)
- [LNURL API](/docs/api/lnurl)
- [Webhooks](/docs/api/webhooks)
