---
sidebar_position: 3
title: Extension Development
description: Build a Python extension for LNbits v1.6 from the official example template
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Extension Development

This page covers **Python extensions**, the classic kind, built from the official [lnbits/example](https://github.com/lnbits/example) template. For sandboxed WebAssembly extensions see [WASM Extensions](/docs/extensions/wasm). For a no-code start, the [Extension Builder](/docs/extensions/overview#extension-builder) at `/extensions/builder` generates a Python extension for you.

:::warning Your code runs inside LNbits
A Python extension is imported into the LNbits process and can reach every wallet and the whole database. Treat it like core code: check wallet ownership on every route, validate every input, and don't trust anything that arrives over a public route or websocket.
:::

docs.lnbits.com covers this in more depth in [Building Extensions](https://docs.lnbits.com/dev/building-extensions).

## Getting started {#getting-started}

### Clone the example extension {#clone-the-example-extension}

This follows upstream's `docs/devs/extensions.md`. The extension id must be a valid Python identifier, so use no dashes:

```bash
git clone https://github.com/lnbits/example.git myextension --depth=1
cd myextension
rm -rf .git/
# rename every occurrence of "example" (GNU sed; on macOS use gsed)
find . -type f -print0 | xargs -0 sed -i 's/example/myextension/g'
mv templates/example templates/myextension
```

### Run it locally {#testing-your-extension}

LNbits loads any folder in `{LNBITS_EXTENSIONS_PATH}/extensions/` (default `lnbits/extensions/`) that has a `config.json`, using the folder name as the extension id. From your LNbits checkout:

```bash
ln -s /path/to/myextension lnbits/extensions/myextension
uv run lnbits --reload
```

Then enable **myextension** for your account on the Extensions page. `--reload` restarts the server when files change. Setting `DEBUG=true` turns on debug logging.

## Extension structure {#extension-structure}

These are the files in lnbits/example:

```text
myextension/
├── config.json          # metadata: name, short_description, tile, min_lnbits_version, ...
├── manifest.json        # registry entry for this repo: {"repos": [...]}
├── __init__.py          # router, static files, start/stop hooks
├── views.py             # HTML pages
├── views_api.py         # JSON API
├── models.py            # pydantic models
├── crud.py              # database access
├── migrations.py        # database schema
├── tasks.py             # background tasks (invoice listener)
├── static/              # images, js/index.js
├── templates/
│   └── myextension/
│       └── index.html   # Jinja template with a Vue 3 app
└── pyproject.toml       # dev tooling. Runtime dependencies come from LNbits itself
```

`config.json` holds the extension's metadata. `manifest.json` is a small registry file that lists the repository. They are different files: see [Extension Manifest](/docs/extensions/manifest).

## Registration (`__init__.py`) {#extension-registration}

LNbits imports the package and looks for names built from the extension id:

| Name | Required | Purpose |
|---|---|---|
| `<id>_ext` | yes | The `APIRouter`, with `prefix="/<id>"` |
| `db` | yes | The extension's `Database`. LNbits uses it to run `migrations.py` |
| `<id>_static_files` | no | `[{"path": "/<id>/static", "name": "<id>_static"}]` |
| `<id>_start` | no | Called when the extension is activated. Start background tasks here |
| `<id>_stop` | if `<id>_start` starts tasks | Called on deactivate, uninstall and upgrade. Cancel your tasks here |
| `<id>_redirect_paths` | no | Lets the extension answer paths outside its prefix (LNURLp uses this for `/.well-known/lnurlp`) |

From lnbits/example, renamed:

```python title="__init__.py"
import asyncio

from fastapi import APIRouter
from loguru import logger

from .crud import db
from .tasks import wait_for_paid_invoices
from .views import myextension_ext_generic
from .views_api import myextension_ext_api

myextension_ext: APIRouter = APIRouter(prefix="/myextension", tags=["myextension"])
myextension_ext.include_router(myextension_ext_generic)
myextension_ext.include_router(myextension_ext_api)

myextension_static_files = [
    {
        "path": "/myextension/static",
        "name": "myextension_static",
    }
]

scheduled_tasks: list[asyncio.Task] = []


def myextension_stop():
    for task in scheduled_tasks:
        try:
            task.cancel()
        except Exception as ex:
            logger.warning(ex)


def myextension_start():
    from lnbits.tasks import create_permanent_unique_task

    task = create_permanent_unique_task("ext_myextension", wait_for_paid_invoices)
    scheduled_tasks.append(task)
```

## Pages (`views.py`) {#web-routes-viewspy}

Use LNbits' `template_renderer` so your template can extend the LNbits `base.html`:

```python title="views.py"
from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from lnbits.core.models import User
from lnbits.decorators import check_user_exists
from lnbits.helpers import template_renderer

myextension_ext_generic = APIRouter(tags=["myextension"])


@myextension_ext_generic.get("/", response_class=HTMLResponse)
async def index(request: Request, user: User = Depends(check_user_exists)):
    return template_renderer(["myextension/templates"]).TemplateResponse(
        request, "myextension/index.html", {"user": user.json()}
    )
```

## Models (`models.py`) {#data-models-modelspy}

LNbits v1.6.2 uses **pydantic 1.10**, so use `class Config` and `.dict()`, not pydantic v2 APIs such as `model_config` or `from_attributes`.

```python title="models.py"
from pydantic import BaseModel, Field


class CreateItem(BaseModel):
    name: str
    amount: int = Field(..., gt=0)  # sats


class Item(BaseModel):
    id: str
    wallet: str
    name: str
    amount: int
```

## Database (`migrations.py`, `crud.py`) {#database-migrations-migrationspy}

Each extension gets its own database, `Database("ext_<id>")`. On SQLite that is the file `data/ext_<id>.sqlite3`, and on PostgreSQL the schema `<id>`. Either way you address tables as `<id>.<table>`.

Migrations are `async def mNNN_name(db)` functions. LNbits runs them in order and records the last version in `dbversions`. A migration runs only once, so put changes in a new `m002_...` function instead of editing old ones.

```python title="migrations.py"
async def m001_initial(db):
    await db.execute(
        """
        CREATE TABLE myextension.items (
            id TEXT PRIMARY KEY,
            wallet TEXT NOT NULL,
            name TEXT NOT NULL,
            amount INTEGER NOT NULL
        );
        """
    )
```

Queries use **named `:param` placeholders and a dict**, not `?` and tuples. Pass a model class to get typed rows back. `db.insert` and `db.update` build the SQL from a pydantic model:

```python title="crud.py"
from lnbits.db import Database
from lnbits.helpers import urlsafe_short_hash

from .models import CreateItem, Item

db = Database("ext_myextension")


async def create_item(wallet_id: str, data: CreateItem) -> Item:
    item = Item(id=urlsafe_short_hash(), wallet=wallet_id, **data.dict())
    await db.insert("myextension.items", item)
    return item


async def get_item(item_id: str) -> Item | None:
    return await db.fetchone(
        "SELECT * FROM myextension.items WHERE id = :id",
        {"id": item_id},
        Item,
    )


async def get_items(wallet_id: str) -> list[Item]:
    return await db.fetchall(
        "SELECT * FROM myextension.items WHERE wallet = :wallet",
        {"wallet": wallet_id},
        Item,
    )


async def update_item(item: Item) -> Item:
    await db.update("myextension.items", item)  # WHERE id = :id
    return item


async def delete_item(item_id: str) -> None:
    await db.execute("DELETE FROM myextension.items WHERE id = :id", {"id": item_id})
```

## API (`views_api.py`) {#api-endpoints-views_apipy}

The router has the `/<id>` prefix, so the items route below is served at `/myextension/api/v1/items`. The wallet-key decorators come from `lnbits.decorators` (see [API Integration](/docs/extensions/api-integration)). Check that the object belongs to the calling wallet before you change or delete it:

```python title="views_api.py"
from http import HTTPStatus

from fastapi import APIRouter, Depends, HTTPException
from lnbits.core.models import WalletTypeInfo
from lnbits.decorators import require_admin_key, require_invoice_key

from .crud import create_item, delete_item, get_item, get_items
from .models import CreateItem, Item

myextension_ext_api = APIRouter()


@myextension_ext_api.get("/api/v1/items")
async def api_get_items(
    key_info: WalletTypeInfo = Depends(require_invoice_key),
) -> list[Item]:
    return await get_items(key_info.wallet.id)


@myextension_ext_api.post("/api/v1/items", status_code=HTTPStatus.CREATED)
async def api_create_item(
    data: CreateItem,
    key_info: WalletTypeInfo = Depends(require_admin_key),
) -> Item:
    return await create_item(key_info.wallet.id, data)


@myextension_ext_api.delete("/api/v1/items/{item_id}")
async def api_delete_item(
    item_id: str,
    key_info: WalletTypeInfo = Depends(require_admin_key),
):
    item = await get_item(item_id)
    if not item:
        raise HTTPException(HTTPStatus.NOT_FOUND, "Item not found.")
    if item.wallet != key_info.wallet.id:
        raise HTTPException(HTTPStatus.FORBIDDEN, "Not your item.")
    await delete_item(item_id)
    return {"success": True}
```

Without the `item.wallet` check, any admin key on the server could delete any user's items.

## Frontend {#templates}

LNbits v1.x uses **Vue 3 and Quasar 2**. The template extends `base.html`, calls `window_vars(user)` and loads your script. The script creates the app with `Vue.createApp` and the `windowMixin` (which provides `this.g.user`, the user's wallets and more). `new Vue({...})` is Vue 2 and won't work.

```html title="templates/myextension/index.html"
{% extends "base.html" %} {% from "macros.jinja" import window_vars with context
%} {% block scripts %} {{ window_vars(user) }}
<script src="{{ static_url_for('myextension/static', path='js/index.js') }}"></script>
{% endblock %} {% block page %}
<q-card>
  <q-card-section>
    <q-btn unelevated color="primary" @click="loadItems">Load items</q-btn>
    <div v-for="item in items" :key="item.id" v-text="item.name"></div>
  </q-card-section>
</q-card>
{% endblock %}
```

```js title="static/js/index.js"
window.app = Vue.createApp({
  el: '#vue',
  mixins: [windowMixin],
  data() {
    return {items: []}
  },
  methods: {
    async loadItems() {
      try {
        const {data} = await LNbits.api.request(
          'GET',
          '/myextension/api/v1/items',
          this.g.user.wallets[0].inkey
        )
        this.items = data
      } catch (err) {
        LNbits.utils.notifyApiError(err)
      }
    }
  },
  created() {
    this.loadItems()
  }
})
```

## Payments and background tasks {#creating-payments}

Create invoices with `create_invoice` and tag them with your extension id in `extra`. Then listen for paid invoices in `tasks.py`, as lnbits/example does:

```python title="tasks.py"
import asyncio

from lnbits.core.models import Payment
from lnbits.tasks import register_invoice_listener


async def wait_for_paid_invoices():
    invoice_queue = asyncio.Queue()
    register_invoice_listener(invoice_queue, "ext_myextension")
    while True:
        payment = await invoice_queue.get()
        await on_invoice_paid(payment)


async def on_invoice_paid(payment: Payment) -> None:
    if payment.extra.get("tag") != "myextension":
        return
    # payment.amount is in msat
    ...
```

In v1.6.2 `register_invoice_listener` and `create_permanent_unique_task` from `lnbits.tasks` are deprecated (they still work and log a warning). The replacement is `lnbits.task_manager.task_manager`, shown in [API Integration](/docs/extensions/api-integration).

`create_invoice` and `pay_invoice` take keyword arguments only. `pay_invoice` takes `payment_request=`, not `bolt11=`. Details are in [API Integration](/docs/extensions/api-integration).

## Publishing {#publishing}

1. Set your GitHub user or org in `manifest.json` (`{"repos": [{"id": "myextension", "organisation": "<you>", "repository": "myextension"}]}`).
2. Push to GitHub and create a release with a version tag, e.g. `v0.0.1`. LNbits uses the tag as the version and the tag's zipball as the archive.
3. Add the raw URL of `manifest.json` (`https://raw.githubusercontent.com/<you>/myextension/main/manifest.json`) as an extension source in the Admin UI. Your extension then appears on the Extensions page.
4. To be listed for everyone, open a pull request to [lnbits/lnbits-extensions](https://github.com/lnbits/lnbits-extensions). Registry entries there need an archive URL and its sha256 `hash`.

## Best practices {#best-practices}

1. **Don't add dependencies.** Upstream says: "DO NOT ADD NEW DEPENDENCIES". Use what LNbits' `pyproject.toml` already has. Getting a new dependency accepted is slow and uncertain.
2. **Check ownership** on every read, update and delete.
3. **Use the invoice key for read-only routes** and the admin key only where you spend or change data.
4. **Set `min_lnbits_version`** in `config.json` to the version you tested against.
5. **Stop what you start.** If `<id>_start` creates tasks, cancel them in `<id>_stop`, or upgrades will leave old tasks running.

## See Also

- [Extension Manifest](/docs/extensions/manifest)
- [API Integration](/docs/extensions/api-integration)
- [WASM Extensions](/docs/extensions/wasm)
- [Contributing](/docs/development/contributing)
