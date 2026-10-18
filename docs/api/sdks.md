---
sidebar_position: 8
title: SDKs & Libraries
description: There is no official LNbits SDK. The community libraries are unmaintained, so use plain HTTP or generate a client from the OpenAPI schema
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# SDKs & Libraries

**LNbits has no official client SDK.** The API is plain HTTP and JSON, and every instance publishes an OpenAPI schema. For most integrations, a few lines of HTTP code, as in the examples below, are the most reliable choice.

## Community libraries (unmaintained) {#community-libraries}

Two community packages exist. Both are **unofficial** and **unmaintained**, and both were written for LNbits 0.x:

| Package | Author | Last release | Status |
|---|---|---|---|
| [`lnbits` on npm](https://www.npmjs.com/package/lnbits) ([source](https://github.com/MiguelMedeiros/lnbits-js)) | Miguel Medeiros | 1.1.5, February 2021 | Not updated since 2021. Its user-manager calls target the `usermanager` extension, which has no release that installs on LNbits 1.x |
| [`pylnbits` on PyPI](https://pypi.org/project/pylnbits/) ([source](https://github.com/lightningames/pylnbits)) | bitkarrot | 0.0.8, December 2023 | The repository is archived. Tested up to LNbits 0.11.2 |

:::caution
Don't use these for new projects without reviewing them yourself. They predate LNbits 1.x and may not match today's routes, auth or units. For example, `balance` is in msat, not sats.
:::

Earlier versions of this page showed sample code for these libraries, including a Python `LNBits` class. That class does not exist in `pylnbits`, so the samples have been removed.

## Generate a client from OpenAPI {#generate-a-client}

Every instance serves its schema at `/openapi.json`, and an interactive explorer at `/docs` (Swagger UI). Point any OpenAPI client generator at `https://lnbits.example.com/openapi.json` to get typed models and methods for your language. The schema includes the extensions installed on that instance.

Pin the schema to the LNbits version you run, and regenerate when you upgrade.

## Plain HTTP {#curl--rest-api}

The curl calls for the common jobs are on [API Overview](/docs/api/overview) and [Payments API](/docs/api/payments). The two wrappers below cover the same jobs: balance, create an invoice, pay one, check one.

### A minimal Python client {#python}

This is a small wrapper you can copy, not a published package:

```python
import httpx


class LnbitsClient:
    def __init__(self, url: str, invoice_key: str, admin_key: str | None = None):
        self.url = url.rstrip("/")
        self.invoice_key = invoice_key
        self.admin_key = admin_key

    def _request(self, method: str, path: str, key: str, **kwargs) -> dict:
        r = httpx.request(
            method, f"{self.url}{path}", headers={"X-Api-Key": key}, timeout=60, **kwargs
        )
        r.raise_for_status()
        return r.json()

    def balance_sats(self) -> int:
        return self._request("GET", "/api/v1/wallet", self.invoice_key)["balance"] // 1000

    def create_invoice(self, sats: int, memo: str = "", webhook: str | None = None) -> dict:
        body = {"out": False, "amount": sats, "memo": memo}
        if webhook:
            body["webhook"] = webhook
        return self._request("POST", "/api/v1/payments", self.invoice_key, json=body)

    def pay_invoice(self, bolt11: str) -> dict:
        if not self.admin_key:
            raise ValueError("paying needs the admin key")
        return self._request(
            "POST", "/api/v1/payments", self.admin_key, json={"out": True, "bolt11": bolt11}
        )

    def is_paid(self, payment_hash: str) -> bool:
        # 404 (raised here) if the payment is not in this wallet
        return self._request("GET", f"/api/v1/payments/{payment_hash}", self.invoice_key)["paid"]
```

### A minimal JavaScript client {#javascript--typescript}

```javascript
export function lnbits(url, {invoiceKey, adminKey}) {
  const call = async (method, path, key, body) => {
    const res = await fetch(`${url}${path}`, {
      method,
      headers: {'X-Api-Key': key, 'Content-Type': 'application/json'},
      body: body ? JSON.stringify(body) : undefined
    })
    const data = await res.json()
    if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(data.detail)}`)
    return data
  }
  return {
    wallet: () => call('GET', '/api/v1/wallet', invoiceKey), // balance in msat
    createInvoice: (sats, memo = '') =>
      call('POST', '/api/v1/payments', invoiceKey, {out: false, amount: sats, memo}),
    payInvoice: (bolt11) =>
      call('POST', '/api/v1/payments', adminKey, {out: true, bolt11}),
    payment: (hash) => call('GET', `/api/v1/payments/${hash}`, invoiceKey)
  }
}
```

Keep the admin key on the server. Don't use this from browser code with an admin key.

## WebSocket payments {#websocket-payments}

Connect to `/api/v1/ws/<invoice key>` to get a message for every payment to or from the wallet. The message is `{"wallet_balance": <sats>, "payment": {...}}`, and `payment.amount` is in msat. The wallet ID does not work as the id.

### JavaScript {#javascript}

```javascript
const ws = new WebSocket(`wss://lnbits.example.com/api/v1/ws/${invoiceKey}`)

ws.onmessage = (event) => {
  const {wallet_balance, payment} = JSON.parse(event.data)
  if (payment.amount > 0 && payment.status === 'success') {
    console.log(`Received ${payment.amount / 1000} sats, balance ${wallet_balance} sats`)
  }
}
```

### Python {#python-websocket}

```python
import asyncio
import json
import os

import websockets


async def listen():
    url = f"wss://lnbits.example.com/api/v1/ws/{os.environ['INVOICE_KEY']}"
    async with websockets.connect(url) as ws:
        async for message in ws:
            data = json.loads(message)
            payment = data["payment"]
            print(payment["payment_hash"], payment["status"], payment["amount"] // 1000, "sats")


asyncio.run(listen())
```

:::warning
WebSocket messages can be forged, because the WebSocket push routes need no authentication (see [API Overview](/docs/api/overview)).
Before fulfilling an order, confirm the payment with `GET /api/v1/payments/{payment_hash}`.
:::

## Webhooks {#webhooks}

Pass `webhook` when you create an invoice, and LNbits POSTs the payment to it once when it's paid. The body is the payment object **JSON-encoded twice**, with `amount` in msat. There are no retries and no signature, and private-network URLs are blocked by default. [Webhooks](/docs/api/webhooks) has working handlers and the URL rules.

## API reference {#api-reference}

- `/docs` on your instance: interactive Swagger UI with every route, including installed extensions
- `/openapi.json` on your instance: the machine-readable schema
- [docs.lnbits.com API reference](https://docs.lnbits.com/api/)

## See also {#see-also}

- [API Overview](/docs/api/overview)
- [Authentication](/docs/api/authentication)
- [Payments API](/docs/api/payments)
- [Webhooks](/docs/api/webhooks)
