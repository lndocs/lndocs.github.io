---
sidebar_position: 3
title: Extension Development
description: Build your own LNbits extensions
---

# Extension Development

Create custom extensions to add new features to LNbits.

## Getting Started

### Clone the Example Extension

```bash
git clone https://github.com/lnbits/example.git myextension
cd myextension

# Rename references
find . -type f -exec sed -i 's/example/myextension/g' {} \;
mv templates/example templates/myextension
```

## Extension Structure

```
myextension/
├── manifest.json        # Required: Extension metadata
├── __init__.py          # Required: Extension registration
├── views.py             # Required: Web routes
├── views_api.py         # API endpoints
├── models.py            # Pydantic models
├── crud.py              # Database operations
├── migrations.py        # Database schema
├── tasks.py             # Background tasks
├── config.json          # Extension settings
└── templates/
    └── myextension/
        └── index.html   # Main template
```

## Manifest File

```json title="manifest.json"
{
  "name": "My Extension",
  "id": "myextension",
  "version": "0.1.0",
  "description": "Does something awesome",
  "author": "Your Name",
  "repo": "https://github.com/you/myextension",
  "icon": "puzzle",
  "min_lnbits_version": "1.0.0"
}
```

### Manifest Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Display name |
| `id` | Yes | Unique identifier (lowercase, no spaces) |
| `version` | Yes | Semantic version |
| `description` | Yes | Short description |
| `icon` | No | Quasar icon name |
| `author` | No | Author name |
| `repo` | No | GitHub repository URL |
| `min_lnbits_version` | No | Minimum compatible version |
| `max_lnbits_version` | No | Maximum compatible version |
| `admin_only` | No | Restrict to admin users |

## Extension Registration

```python title="__init__.py"
from fastapi import APIRouter

# Import your routers
from .views import myextension_router
from .views_api import myextension_api_router

# Extension metadata
myextension_ext = APIRouter(prefix="/myextension", tags=["myextension"])

# Include routers
myextension_ext.include_router(myextension_router)
myextension_ext.include_router(myextension_api_router)

# Define static files path (optional)
myextension_static_files = [{"path": "/myextension/static", "name": "myextension_static"}]

# Scheduled tasks (optional)
scheduled_tasks = []
```

## Web Routes (views.py)

```python title="views.py"
from fastapi import APIRouter, Depends, Request
from lnbits.core.models import User
from lnbits.decorators import check_user_exists
from fastapi.templating import Jinja2Templates

myextension_router = APIRouter()
templates = Jinja2Templates(directory="templates")

@myextension_router.get("/")
async def index(request: Request, user: User = Depends(check_user_exists)):
    return templates.TemplateResponse(
        "myextension/index.html",
        {"request": request, "user": user}
    )

@myextension_router.get("/create")
async def create_page(request: Request, user: User = Depends(check_user_exists)):
    return templates.TemplateResponse(
        "myextension/create.html",
        {"request": request, "user": user}
    )
```

## API Endpoints (views_api.py)

```python title="views_api.py"
from fastapi import APIRouter, Depends, Query
from lnbits.core.models import WalletTypeInfo
from lnbits.decorators import require_admin_key, require_invoice_key

from .models import CreateItem, Item
from .crud import create_item, get_items, get_item, delete_item

myextension_api_router = APIRouter()

@myextension_api_router.get("/api/v1/items")
async def api_get_items(
    wallet: WalletTypeInfo = Depends(require_invoice_key)
) -> list[Item]:
    return await get_items(wallet.wallet.id)

@myextension_api_router.post("/api/v1/items")
async def api_create_item(
    data: CreateItem,
    wallet: WalletTypeInfo = Depends(require_admin_key)
) -> Item:
    return await create_item(wallet.wallet.id, data)

@myextension_api_router.delete("/api/v1/items/{item_id}")
async def api_delete_item(
    item_id: str,
    wallet: WalletTypeInfo = Depends(require_admin_key)
) -> None:
    await delete_item(item_id)
```

## Data Models (models.py)

```python title="models.py"
from pydantic import BaseModel
from typing import Optional

class CreateItem(BaseModel):
    name: str
    description: Optional[str] = None
    amount: int

class Item(BaseModel):
    id: str
    wallet_id: str
    name: str
    description: Optional[str]
    amount: int
    created_at: int

    class Config:
        from_attributes = True
```

## Database Operations (crud.py)

```python title="crud.py"
from typing import Optional
from lnbits.db import Database
from .models import CreateItem, Item
import uuid
import time

db = Database("ext_myextension")

async def create_item(wallet_id: str, data: CreateItem) -> Item:
    item_id = uuid.uuid4().hex
    await db.execute(
        """
        INSERT INTO myextension_items (id, wallet_id, name, description, amount, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (item_id, wallet_id, data.name, data.description, data.amount, int(time.time()))
    )
    return await get_item(item_id)

async def get_items(wallet_id: str) -> list[Item]:
    rows = await db.fetchall(
        "SELECT * FROM myextension_items WHERE wallet_id = ?",
        (wallet_id,)
    )
    return [Item(**row) for row in rows]

async def get_item(item_id: str) -> Optional[Item]:
    row = await db.fetchone(
        "SELECT * FROM myextension_items WHERE id = ?",
        (item_id,)
    )
    return Item(**row) if row else None

async def delete_item(item_id: str) -> None:
    await db.execute(
        "DELETE FROM myextension_items WHERE id = ?",
        (item_id,)
    )
```

## Database Migrations (migrations.py)

```python title="migrations.py"
from lnbits.db import Connection

async def m001_initial(db: Connection):
    """Create initial tables"""
    await db.execute("""
        CREATE TABLE IF NOT EXISTS myextension_items (
            id TEXT PRIMARY KEY,
            wallet_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            amount INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

async def m002_add_status(db: Connection):
    """Add status column"""
    await db.execute(
        "ALTER TABLE myextension_items ADD COLUMN status TEXT DEFAULT 'active'"
    )
```

## Templates

```html title="templates/myextension/index.html"
{% extends "base.html" %}
{% block page %}
<div class="row q-col-gutter-md">
  <div class="col-12">
    <q-card>
      <q-card-section>
        <div class="text-h6">My Extension</div>
      </q-card-section>
      <q-card-section>
        <q-table
          :rows="items"
          :columns="columns"
          row-key="id"
        />
      </q-card-section>
    </q-card>
  </div>
</div>
{% endblock %}

{% block scripts %}
{{ window_vars(user) }}
<script>
new Vue({
  el: '#vue',
  mixins: [windowMixin],
  data() {
    return {
      items: [],
      columns: [
        {name: 'name', label: 'Name', field: 'name'},
        {name: 'amount', label: 'Amount', field: 'amount'}
      ]
    }
  },
  async mounted() {
    await this.loadItems()
  },
  methods: {
    async loadItems() {
      const res = await LNbits.api.request(
        'GET',
        '/myextension/api/v1/items',
        this.g.user.wallets[0].inkey
      )
      this.items = res.data
    }
  }
})
</script>
{% endblock %}
```

## Creating Payments

```python
from lnbits.core.services import create_invoice, pay_invoice

# Create invoice
invoice = await create_invoice(
    wallet_id=wallet_id,
    amount=1000,
    memo="Payment for item",
    extra={"tag": "myextension"}
)

# Pay invoice
payment = await pay_invoice(
    wallet_id=wallet_id,
    bolt11=bolt11_string
)
```

## Testing Your Extension

```bash
# Install in development mode
cd lnbits
ln -s /path/to/myextension lnbits/extensions/myextension

# Run LNbits with debug
DEBUG=true uv run lnbits --reload
```

## Publishing

1. Create GitHub repository
2. Add manifest.json to releases
3. Create a release with ZIP archive
4. Share manifest URL for installation

## Best Practices

1. **Follow naming conventions** - Use lowercase, no spaces
2. **Use Pydantic models** - Type safety and validation
3. **Handle errors gracefully** - Return proper HTTP status codes
4. **Document your API** - Use FastAPI docstrings
5. **Test thoroughly** - Include unit tests
6. **Keep dependencies minimal** - Avoid adding packages

## See Also

- [Extension Manifest](/docs/extensions/manifest)
- [API Integration](/docs/extensions/api-integration)
- [Contributing](/docs/development/contributing)
