---
sidebar_position: 5
title: Users API
description: User account management API endpoints
---

# Users API

Manage user accounts and profiles.

## Get Current User

Get the authenticated user's profile.

```http
GET /api/v1/user
```

**Authentication**: Admin Key (any wallet)

**Response**:
```json
{
  "id": "user_id",
  "username": "alice",
  "email": "alice@example.com",
  "created_at": "2024-01-01T00:00:00Z"
}
```

## List User Wallets

Get all wallets for the current user.

```http
GET /api/v1/users/wallets
```

**Authentication**: Admin Key

**Response**:
```json
{
  "wallets": [
    {
      "id": "wallet1",
      "name": "Main",
      "balance": 50000
    },
    {
      "id": "wallet2",
      "name": "Savings",
      "balance": 100000
    }
  ]
}
```

## Update Profile

Update user profile information.

```http
PUT /api/v1/user
```

**Authentication**: Admin Key

**Request Body**:
```json
{
  "username": "new_username",
  "email": "new@email.com"
}
```

**Response**:
```json
{
  "id": "user_id",
  "username": "new_username",
  "email": "new@email.com"
}
```

## Get User Extensions

List enabled extensions for the user.

```http
GET /api/v1/users/extensions
```

**Authentication**: Admin Key

**Response**:
```json
{
  "extensions": [
    {
      "id": "tpos",
      "name": "TPoS",
      "enabled": true
    },
    {
      "id": "lnurlp",
      "name": "LNURL-pay",
      "enabled": false
    }
  ]
}
```

## Enable Extension

Enable an extension for the user.

```http
POST /api/v1/users/extensions/{extension_id}/enable
```

**Authentication**: Admin Key

**Response**:
```json
{
  "success": true
}
```

## Disable Extension

Disable an extension for the user.

```http
POST /api/v1/users/extensions/{extension_id}/disable
```

**Authentication**: Admin Key

**Response**:
```json
{
  "success": true
}
```

## Admin Endpoints

These endpoints require admin privileges.

### List All Users

```http
GET /api/v1/admin/users
```

**Authentication**: Admin Key (admin user)

**Response**:
```json
{
  "users": [
    {
      "id": "user1",
      "username": "alice",
      "wallets_count": 3
    },
    {
      "id": "user2",
      "username": "bob",
      "wallets_count": 1
    }
  ]
}
```

### Get User Details (Admin)

```http
GET /api/v1/admin/users/{user_id}
```

**Authentication**: Admin Key (admin user)

### Delete User (Admin)

```http
DELETE /api/v1/admin/users/{user_id}
```

**Authentication**: Admin Key (admin user)

:::warning
Deleting a user removes all their wallets and data.
:::

## Code Examples

### Python

```python
import httpx

async def get_user_profile(admin_key: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://lnbits.com/api/v1/user",
            headers={"X-Api-Key": admin_key}
        )
        return response.json()

async def list_wallets(admin_key: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://lnbits.com/api/v1/users/wallets",
            headers={"X-Api-Key": admin_key}
        )
        return response.json()
```

### JavaScript

```javascript
async function getUserProfile(adminKey) {
  const response = await fetch('https://lnbits.com/api/v1/user', {
    headers: { 'X-Api-Key': adminKey }
  });
  return response.json();
}
```

## See Also

- [API Authentication](/docs/api/authentication)
- [Wallets API](/docs/api/wallets)
