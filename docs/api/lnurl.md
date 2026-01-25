---
sidebar_position: 6
title: LNURL API
description: LNURL protocol support in LNbits
---

# LNURL API

LNbits provides full LNURL protocol support.

## LNURL Overview

LNURL is a protocol for Lightning Network interactions:
- **LNURL-pay**: Static payment links
- **LNURL-withdraw**: Vouchers and withdrawals
- **LNURL-auth**: Authentication

## LNURL-pay

### Create Pay Link

Via LNURL-pay extension:

```http
POST /lnurlp/api/v1/links
```

**Request Body**:
```json
{
  "description": "Coffee tip jar",
  "min": 100,
  "max": 100000,
  "comment_chars": 150
}
```

### Pay Callback

When a wallet scans the LNURL:

```http
GET /lnurlp/api/v1/lnurl/callback/{link_id}?amount=1000
```

**Response**:
```json
{
  "pr": "lnbc10n1...",
  "routes": []
}
```

## LNURL-withdraw

### Create Withdraw Link

Via LNURL-withdraw extension:

```http
POST /withdraw/api/v1/links
```

**Request Body**:
```json
{
  "title": "Voucher",
  "min_withdrawable": 1000,
  "max_withdrawable": 1000,
  "uses": 1,
  "wait_time": 60
}
```

### Withdraw Callback

```http
GET /withdraw/api/v1/lnurl/callback/{link_id}?k1={k1}&pr={bolt11}
```

## Lightning Address

LNbits supports Lightning Addresses (user@domain.com):

### Get Address Info

```http
GET /.well-known/lnurlp/{username}
```

**Response**:
```json
{
  "callback": "https://lnbits.com/lnurlp/api/v1/lnurl/callback/...",
  "tag": "payRequest",
  "minSendable": 1000,
  "maxSendable": 100000000,
  "metadata": "[[\"text/plain\",\"User description\"]]"
}
```

## LNURL-auth

Authenticate users with Lightning:

```http
GET /api/v1/lnurl/auth?k1={k1}&sig={signature}&key={pubkey}
```

**Response**:
```json
{
  "status": "OK"
}
```

## Decoding LNURL

Decode an LNURL string:

```http
POST /api/v1/lnurl/decode
```

**Request Body**:
```json
{
  "lnurl": "LNURL1DP68GURN..."
}
```

**Response**:
```json
{
  "tag": "payRequest",
  "callback": "https://...",
  "minSendable": 1000,
  "maxSendable": 100000000,
  "metadata": "..."
}
```

## LNURL via Core API

### Pay to LNURL

```http
POST /api/v1/payments
```

**Request Body**:
```json
{
  "out": true,
  "lnurl": "LNURL1DP68GURN...",
  "amount": 1000
}
```

### Pay to Lightning Address

```http
POST /api/v1/payments
```

**Request Body**:
```json
{
  "out": true,
  "lnurl": "user@domain.com",
  "amount": 1000
}
```

## Code Examples

### Python - Pay to Lightning Address

```python
import httpx

async def pay_lightning_address(admin_key: str, address: str, amount: int):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://lnbits.com/api/v1/payments",
            headers={"X-Api-Key": admin_key},
            json={
                "out": True,
                "lnurl": address,
                "amount": amount
            }
        )
        return response.json()

# Usage
await pay_lightning_address(key, "alice@getalby.com", 1000)
```

### JavaScript - Decode LNURL

```javascript
async function decodeLnurl(apiKey, lnurl) {
  const response = await fetch('https://lnbits.com/api/v1/lnurl/decode', {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ lnurl })
  });
  return response.json();
}
```

## LNURL Error Handling

LNURL errors follow the spec:

```json
{
  "status": "ERROR",
  "reason": "Payment amount too low"
}
```

## See Also

- [Payments API](/docs/api/payments)
- [Extensions](/docs/extensions/overview)
- [LNURL Spec](https://github.com/lnurl/luds)
