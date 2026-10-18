---
sidebar_position: 5
title: API Integration
description: Use LNbits core auth, wallets, payments, database and websockets from a Python extension
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Extension API Integration

How a **Python extension** uses LNbits core: authentication, wallets and payments, its database, background tasks and websockets. Everything here is checked against the v1.6.2 source and the [lnbits/example](https://github.com/lnbits/example) template. WASM extensions can't import any of this. They use permissioned host functions instead (see [WASM Extensions](/docs/extensions/wasm)).

## URL prefix {#url-prefix}

LNbits includes your `<id>_ext` router as it is: the `/<ext_id>` prefix comes from the router itself (`APIRouter(prefix="/myextension")`). Keep the prefix equal to the extension id. LNbits takes the first path segment as the extension id when it checks whether a user has the extension enabled, and when it answers 404 for a deactivated extension. By convention the API routes sit under `api/v1`, so the items route of the example on the [development page](/docs/extensions/development) is served at `/myextension/api/v1/items`. Core routes such as `/api/v1/payments` are separate and unchanged.

## Authentication decorators {#authentication-decorators}

All of these are in `lnbits.decorators`:

| Dependency | Accepts | Returns |
|---|---|---|
| `require_admin_key` | The wallet **admin key** | `WalletTypeInfo` (`key_type`, `wallet`) |
| `require_invoice_key` | The admin key **or** the invoice key. Check `key_info.key_type` if it matters | `WalletTypeInfo` |
| `require_base_admin_key`, `require_base_invoice_key` | Same keys, lighter wallet object | `BaseWalletTypeInfo` |
| `check_user_exists` | A logged-in user (bearer token or cookie) | `User`, with wallets |
| `check_account_exists` | A logged-in user | `Account` |
| `check_account_id_exists` | A logged-in user | `AccountId` |
| `check_admin` | A logged-in admin or super user who has a password set | `Account` |
| `check_super_user` | The logged-in super user, with a password set | `Account` |

Wallet keys go in the `X-API-KEY` header (or the `?api-key=` query parameter). The user-level dependencies don't accept wallet keys. They take an `Authorization: Bearer` access token or the login cookie, or `?usr=<user id>` only when user-id-only login is turned on (it is off by default since v1.6.0, and never allowed for admins).

The key checks fail like this: no key gives `401 No Api Key provided.`, an unknown key gives `404 Wallet not found.`, and an invoice key where the admin key is required gives `403 Invalid adminkey.`

```python
from fastapi import Depends
from lnbits.core.models import User, WalletTypeInfo
from lnbits.decorators import check_user_exists, require_admin_key, require_invoice_key


@myextension_ext_api.post("/api/v1/action")
async def action(key_info: WalletTypeInfo = Depends(require_admin_key)):
    ...  # can spend from key_info.wallet


@myextension_ext_api.get("/api/v1/data")
async def get_data(key_info: WalletTypeInfo = Depends(require_invoice_key)):
    ...  # read-only for key_info.wallet


@myextension_ext_generic.get("/")
async def page(user: User = Depends(check_user_exists)):
    ...  # user.wallets, user.wallet_ids
```

LNbits also checks extension access for you. When a request to your paths is authenticated, by wallet key or by login, the wallet's owner must have the extension enabled, and an admin-only extension (`LNBITS_ADMIN_EXTENSIONS`) needs an admin. Otherwise the request gets a 403.

## Wallets and payments {#wallet-operations}

### Get a wallet {#get-wallet-info}

```python
from lnbits.core.crud import get_wallet

wallet = await get_wallet(wallet_id)
if wallet:
    print(wallet.balance_msat)  # millisatoshis
```

### Create an invoice {#create-invoice}

`create_invoice` takes keyword arguments only. `amount` is in the given `currency` (default `"sat"`). It returns a `Payment`:

```python
from lnbits.core.services import create_invoice

payment = await create_invoice(
    wallet_id=wallet_id,
    amount=1000,  # sats
    memo="Order 123",
    extra={"tag": "myextension", "order_id": "123"},
)
bolt11 = payment.bolt11
payment_hash = payment.payment_hash
```

Put your extension id in `extra["tag"]` so your invoice listener can pick out your payments. You can also pass `webhook=` (a URL LNbits calls when the invoice is paid), `expiry=` (seconds), `labels=` and `external_id=`. When it can't create the invoice, `create_invoice` raises `lnbits.exceptions.InvoiceError`.

### Pay an invoice {#pay-invoice}

```python
from lnbits.core.services import pay_invoice

payment = await pay_invoice(
    wallet_id=wallet_id,
    payment_request=bolt11,  # not bolt11=
    max_sat=5000,            # optional upper bound
    tag="myextension",       # refuse if the wallet owner has disabled the extension
    extra={"tag": "myextension"},
)
```

With `tag=` set to your extension id, `pay_invoice` first checks that the wallet's owner still has your extension enabled (and is an admin, for an admin-only extension), and refuses the payment otherwise. Without `tag=` it skips that check.

When a payment fails, `pay_invoice` raises `lnbits.exceptions.PaymentError`. Uncaught, LNbits returns a `PaymentError` or an `InvoiceError` as HTTP 520 with `{"detail": <message>, "status": <status>}`, where the status is usually `"failed"`.

### Check a payment {#check-payment-status}

```python
from lnbits.core.crud import get_standalone_payment

payment = await get_standalone_payment(payment_hash)  # checking id or payment hash
if payment and payment.success:
    ...
```

`payment.amount` is in **msat** (`payment.sat` gives sats). Outgoing payments have negative amounts.

## Database {#database-access}

Each extension has its own database, `Database("ext_<id>")`, with tables named `<id>.<table>` (see [Extension Development](/docs/extensions/development)). Queries take **named `:param` placeholders and a dict**. An optional model class gives typed results.

```python
from lnbits.db import Database

db = Database("ext_myextension")

await db.execute(
    "UPDATE myextension.items SET name = :name WHERE id = :id",
    {"name": name, "id": item_id},
)
item = await db.fetchone(
    "SELECT * FROM myextension.items WHERE id = :id", {"id": item_id}, Item
)
items = await db.fetchall(
    "SELECT * FROM myextension.items WHERE wallet = :wallet", {"wallet": wallet_id}, Item
)
await db.insert("myextension.items", item)   # INSERT from a pydantic model
await db.update("myextension.items", item)   # UPDATE ... WHERE id = :id
```

`db.fetch_page(...)` with `lnbits.db.Filters` gives paginated, filterable lists like the core API's.

### Connections {#transactions}

```python
async with db.connect() as conn:
    await conn.execute("UPDATE ...", {...})
    await conn.execute("INSERT ...", {...})
```

`db.connect()` gives you one connection and holds that database's lock until the block ends. In v1.6.2, `execute`, `insert` and `update` **commit straight away**, so the block is not a transaction: if the second statement fails, the first one stays committed. Write your code so that a partial write is safe.

## Background tasks {#event-handling}

Start tasks in `<id>_start()` and keep the handles, so `<id>_stop()` can cancel them. LNbits calls `<id>_stop()` on deactivate, uninstall and upgrade.

In v1.6.2 the recommended API is `lnbits.task_manager.task_manager`. `register_invoice_listener` calls your coroutine with each paid incoming payment. Filter by your tag:

```python
from loguru import logger

from lnbits.core.models import Payment
from lnbits.task_manager import task_manager

scheduled_tasks = []


async def on_invoice_paid(payment: Payment) -> None:
    if payment.extra.get("tag") != "myextension":
        return
    ...


def myextension_start():
    task = task_manager.register_invoice_listener(on_invoice_paid, "ext_myextension")
    scheduled_tasks.append(task)


def myextension_stop():
    for task in scheduled_tasks:
        try:
            task_manager.cancel_task(task)
        except Exception as ex:
            logger.warning(ex)
```

`task_manager.create_permanent_task(func, name=..., interval=...)` runs a coroutine function forever, restarts it five seconds after it fails, and waits `interval` seconds between runs if you set one. A new task with the same `name` cancels the old one, so give your tasks names that start with your extension id.

`<id>_start` must be a plain `def`. At server start LNbits calls it without awaiting it, so an `async def` start function would never run there. `<id>_stop` may be either.

lnbits/example still uses the older helpers `lnbits.tasks.create_permanent_unique_task(name, coro)` and `lnbits.tasks.register_invoice_listener(queue, name)`. They still work in v1.6.2. They log a `DEPRECATED` message at debug level only, so you see it only with `DEBUG=true`.

## Websockets {#sse-updates}

To push updates to a browser, send a string to an item id. Clients listen on `/api/v1/ws/{item_id}`:

```python
import json

from lnbits.core.services import websocket_manager

await websocket_manager.send(item_id, json.dumps({"paid": True}))
```

(`websocket_updater(item_id, data)` still exists but is deprecated.)

:::warning Websockets are not authenticated, in either direction
Anyone can push a message to any item id with
`POST /api/v1/ws/{item_id}` or
`GET /api/v1/ws/{item_id}/{data}`.
Neither route needs a key.

In the other direction, anyone who knows an item id can listen on its websocket and read what you send. Never send secrets, keys or other users' data over a websocket. Never fulfil an order, unlock content or release goods because a websocket message said "paid". Use the message as a hint, then confirm on the server, for example with `get_standalone_payment` or `GET /api/v1/payments/{payment_hash}`.
:::

## Settings {#settings-management}

LNbits has no settings framework for extensions. An extension that needs configuration keeps it in its own table and serves it from its own routes. Protect admin-wide settings with `check_admin`. lnurlp does this with its `/lnurlp/api/v1/settings` route. Don't read secrets from `config.json`: it is public metadata shown in the extension details.

## Outbound HTTP {#http-client}

LNbits depends on `httpx`, so use it rather than adding a new HTTP library:

```python
import httpx

async with httpx.AsyncClient(timeout=10) as client:
    resp = await client.get("https://api.example.com/data")
    resp.raise_for_status()
    data = resp.json()
```

## Frontend helpers {#templates-frontend}

The page loads Vue 3, Quasar 2 and the LNbits JS helpers (the global `LNbits` object). Build your app with `Vue.createApp({...})` and assign it to `window.app` (see [Extension Development](/docs/extensions/development)). LNbits then adds a global mixin that gives every component `this.g`, `this.api` and `this.utils`. `this.g.user` holds the user's wallets with their `inkey` and `adminkey`, as long as your view passes `user` to the template.

```js
// generic request: method, path, api key, body
LNbits.api.request('GET', '/myextension/api/v1/items', wallet.inkey)
LNbits.api.request('POST', '/myextension/api/v1/items', wallet.adminkey, data)

// core helpers
LNbits.api.createInvoice(wallet, amount, memo) // unit defaults to 'sat'
LNbits.api.payInvoice(wallet, bolt11)

// show an API error as a notification
LNbits.utils.notifyApiError(error)
```

## Errors and validation {#error-handling}

Raise `fastapi.HTTPException` for client errors. LNbits also turns an uncaught `ValueError` or `AssertionError` into a 400 with `{"detail": "<message>"}`, and any other uncaught exception into a 500 that says only `Unexpected error! ID: <id>`. A request body that fails pydantic validation gets **400**, not FastAPI's usual 422. Validate request bodies with pydantic (v1.10) models:

```python
from pydantic import BaseModel, Field, validator


class CreateItem(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    amount: int = Field(..., gt=0)

    @validator("name")
    def strip_name(cls, v):
        return v.strip()
```

## Security checklist {#security-considerations}

- **Check ownership.** Every route that reads, changes or deletes an object must check that it belongs to `key_info.wallet.id` (or to one of `user.wallet_ids`). The delete example in [Extension Development](/docs/extensions/development) shows how.
- **Use the weakest key that works.** Use `require_invoice_key` for reads and invoice creation, and `require_admin_key` only where you spend or change data.
- **Public routes are public.** A route with no dependency can be called by anyone. Don't return wallet ids, keys or other users' data from it.
- **Don't trust websocket messages** (see above). Confirm payments on the server.
- **Rate limits.** LNbits' global limit (`LNBITS_RATE_LIMIT_NO` per `LNBITS_RATE_LIMIT_UNIT`, default 200 per minute) applies to extension routes too.

## See Also

- [Extension Development](/docs/extensions/development)
- [WASM Extensions](/docs/extensions/wasm)
- [API Reference](/docs/api/overview)
- [Security](/docs/configuration/security)
