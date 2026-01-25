---
sidebar_position: 1
title: API Overview
description: LNbits REST API introduction and concepts
---

# API Overview

LNbits provides a comprehensive REST API for wallet and payment operations.

## Base URL

```
https://your-lnbits-instance.com/api/v1/
```

## API Documentation

Interactive API docs are available at:
- **Swagger UI**: `/docs`
- **ReDoc**: `/redoc`

## Authentication

All API requests require authentication via API keys.

### API Key Types

| Key Type | Permission | Header |
|----------|------------|--------|
| Admin Key | Full access | `X-Api-Key: {admin_key}` |
| Invoice Key | Create invoices only | `X-Api-Key: {invoice_key}` |

### Sending API Key

```bash
# Header (recommended)
curl -H "X-Api-Key: your_key_here" https://lnbits.com/api/v1/wallet

# Query parameter
curl "https://lnbits.com/api/v1/wallet?api-key=your_key_here"
```

## Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/wallet` | GET | Wallet info and balance |
| `/payments` | GET | List payments |
| `/payments` | POST | Create invoice or pay |
| `/payments/{id}` | GET | Payment details |

## Request Format

### Headers

```
Content-Type: application/json
X-Api-Key: your_api_key
```

### Body

JSON format for POST/PUT:

```json
{
  "out": false,
  "amount": 1000,
  "memo": "Test payment"
}
```

## Response Format

### Success Response

```json
{
  "payment_hash": "abc123...",
  "payment_request": "lnbc10n1...",
  "checking_id": "abc123..."
}
```

### Error Response

```json
{
  "detail": "Error message here"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not found |
| 422 | Validation error |
| 500 | Server error |

## Quick Examples

### Get Wallet Balance

```bash
curl -X GET \
  https://lnbits.com/api/v1/wallet \
  -H "X-Api-Key: invoice_key"
```

Response:
```json
{
  "id": "wallet_id",
  "name": "My Wallet",
  "balance": 50000
}
```

### Create Invoice

```bash
curl -X POST \
  https://lnbits.com/api/v1/payments \
  -H "X-Api-Key: admin_key" \
  -H "Content-Type: application/json" \
  -d '{
    "out": false,
    "amount": 1000,
    "memo": "Coffee"
  }'
```

Response:
```json
{
  "payment_hash": "abc123...",
  "payment_request": "lnbc10n1pj..."
}
```

### Pay Invoice

```bash
curl -X POST \
  https://lnbits.com/api/v1/payments \
  -H "X-Api-Key: admin_key" \
  -H "Content-Type: application/json" \
  -d '{
    "out": true,
    "bolt11": "lnbc10n1pj..."
  }'
```

## Rate Limiting

API calls are rate limited:

```bash
# Default limits
LNBITS_RATE_LIMIT_NO=200
LNBITS_RATE_LIMIT_UNIT=minute
```

Rate limit headers:
```
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 199
X-RateLimit-Reset: 1609459200
```

## Pagination

List endpoints support pagination:

```bash
GET /api/v1/payments?limit=10&offset=0
```

Parameters:
- `limit`: Number of items (default: 10, max: 100)
- `offset`: Skip items (for pagination)

## Filtering & Sorting

```bash
# Filter by status
GET /api/v1/payments?pending=true

# Sort by date
GET /api/v1/payments?sortby=created_at&direction=desc
```

## WebSocket API

Real-time updates via WebSocket:

```javascript
const ws = new WebSocket('wss://lnbits.com/api/v1/ws/wallet_id');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Payment received:', data);
};
```

## SDK & Libraries

### Python

```python
import httpx

async def get_balance(api_key):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://lnbits.com/api/v1/wallet",
            headers={"X-Api-Key": api_key}
        )
        return response.json()
```

### JavaScript

```javascript
async function getBalance(apiKey) {
  const response = await fetch('https://lnbits.com/api/v1/wallet', {
    headers: { 'X-Api-Key': apiKey }
  });
  return response.json();
}
```

## See Also

- [Authentication](/docs/api/authentication)
- [Wallets API](/docs/api/wallets)
- [Payments API](/docs/api/payments)
