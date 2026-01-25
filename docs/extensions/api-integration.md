---
sidebar_position: 5
title: API Integration
description: Integrating extensions with LNbits core APIs
---

# Extension API Integration

Learn how extensions interact with LNbits core functionality.

## Authentication Decorators

Extensions use the same authentication as core:

```python
from lnbits.decorators import (
    require_admin_key,
    require_invoice_key,
    check_user_exists
)

# Full wallet access
@router.post("/api/v1/action")
async def action(wallet: WalletTypeInfo = Depends(require_admin_key)):
    pass

# Invoice operations only
@router.get("/api/v1/data")
async def get_data(wallet: WalletTypeInfo = Depends(require_invoice_key)):
    pass

# User context only
@router.get("/")
async def page(user: User = Depends(check_user_exists)):
    pass
```

## Wallet Operations

### Get Wallet Info

```python
from lnbits.core.crud import get_wallet

wallet = await get_wallet(wallet_id)
print(wallet.balance_msat)  # Balance in millisatoshis
```

### Create Invoice

```python
from lnbits.core.services import create_invoice

result = await create_invoice(
    wallet_id=wallet_id,
    amount=1000,           # sats
    memo="Extension payment",
    extra={"tag": "myextension", "item_id": item_id}
)

payment_request = result.payment_request
payment_hash = result.payment_hash
```

### Pay Invoice

```python
from lnbits.core.services import pay_invoice

result = await pay_invoice(
    wallet_id=wallet_id,
    payment_request=bolt11,
    extra={"tag": "myextension"}
)
```

### Check Payment Status

```python
from lnbits.core.crud import get_standalone_payment

payment = await get_standalone_payment(checking_id)
if payment and payment.success:
    print("Payment completed!")
```

## Database Access

### Using Extension Database

```python
from lnbits.db import Database

# Create database instance
db = Database("ext_myextension")

# Execute queries
await db.execute(
    "INSERT INTO mytable (id, value) VALUES (?, ?)",
    (id, value)
)

# Fetch data
row = await db.fetchone(
    "SELECT * FROM mytable WHERE id = ?",
    (id,)
)

rows = await db.fetchall(
    "SELECT * FROM mytable WHERE wallet_id = ?",
    (wallet_id,)
)
```

### Transactions

```python
async with db.connect() as conn:
    await conn.execute("UPDATE ...")
    await conn.execute("INSERT ...")
    # Auto-commit on success, rollback on exception
```

## Event Handling

### Payment Webhooks

When creating invoices, specify a webhook:

```python
invoice = await create_invoice(
    wallet_id=wallet_id,
    amount=1000,
    memo="Order #123",
    webhook="https://your-server.com/webhook",
    extra={"order_id": "123"}
)
```

### Background Tasks

```python title="tasks.py"
from lnbits.tasks import register_task

async def my_background_task():
    while True:
        # Do periodic work
        await asyncio.sleep(60)

# Register on startup
register_task(my_background_task)
```

### SSE Updates

Push real-time updates to frontend:

```python
from lnbits.core.services import websocket_manager

await websocket_manager.send_data(
    message={"type": "update", "data": data},
    item_id=wallet_id
)
```

## Settings Management

### Extension Settings

```json title="config.json"
{
  "settings": [
    {
      "name": "api_key",
      "type": "string",
      "description": "External API key",
      "default": ""
    },
    {
      "name": "enabled",
      "type": "bool",
      "description": "Enable feature",
      "default": true
    }
  ]
}
```

### Accessing Settings

```python
from lnbits.extensions.myextension.config import settings

api_key = settings.api_key
```

## HTTP Client

Make external API calls:

```python
import httpx

async with httpx.AsyncClient() as client:
    response = await client.get(
        "https://api.example.com/data",
        headers={"Authorization": f"Bearer {api_key}"}
    )
    data = response.json()
```

## Templates & Frontend

### Vue.js Integration

```html
{% block scripts %}
{{ window_vars(user) }}
<script>
new Vue({
  el: '#vue',
  mixins: [windowMixin],
  data() {
    return {
      items: []
    }
  },
  methods: {
    async loadData() {
      const {data} = await LNbits.api.request(
        'GET',
        '/myextension/api/v1/items',
        this.g.user.wallets[0].inkey
      )
      this.items = data
    },
    async createItem(item) {
      const {data} = await LNbits.api.request(
        'POST',
        '/myextension/api/v1/items',
        this.g.user.wallets[0].adminkey,
        item
      )
      this.items.push(data)
    }
  }
})
</script>
{% endblock %}
```

### LNbits.api Methods

```javascript
// GET request
LNbits.api.request('GET', '/path', apiKey)

// POST request
LNbits.api.request('POST', '/path', apiKey, data)

// DELETE request
LNbits.api.request('DELETE', '/path', apiKey)

// Create invoice
LNbits.api.createInvoice(wallet, amount, memo)

// Pay invoice
LNbits.api.payInvoice(wallet, bolt11)
```

## Error Handling

### API Errors

```python
from fastapi import HTTPException

@router.get("/api/v1/item/{id}")
async def get_item(id: str):
    item = await crud.get_item(id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item
```

### Validation

```python
from pydantic import BaseModel, validator

class CreateItem(BaseModel):
    name: str
    amount: int

    @validator('amount')
    def amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        return v
```

## Security Considerations

### Wallet Ownership

Always verify wallet ownership:

```python
@router.get("/api/v1/items")
async def get_items(wallet: WalletTypeInfo = Depends(require_invoice_key)):
    # Only return items for this wallet
    return await get_items_for_wallet(wallet.wallet.id)
```

### Input Validation

Use Pydantic models for all inputs:

```python
@router.post("/api/v1/items")
async def create(data: CreateItemModel, wallet: WalletTypeInfo = Depends(require_admin_key)):
    # data is already validated
    pass
```

### Rate Limiting

Extensions inherit LNbits rate limits. For additional limits:

```python
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@router.get("/api/v1/expensive")
@limiter.limit("10/minute")
async def expensive_operation():
    pass
```

## See Also

- [Extension Development](/docs/extensions/development)
- [API Reference](/docs/api/overview)
- [Security](/docs/configuration/security)
