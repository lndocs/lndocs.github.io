---
sidebar_position: 5
title: Funding Sources
description: How LNbits talks to Lightning backends, as of v1.6.2
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Funding Sources Architecture

A funding source is the Lightning backend behind an LNbits instance: a node you run, a hosted service, or a test stand-in. The instance uses **one** funding source at a time, and every wallet shares it. LNbits keeps the per-wallet accounting itself (see [Ledger](/docs/architecture/ledger)).

## The `Wallet` base class {#abstraction-layer}

Every backend is a subclass of `Wallet` in `lnbits/wallets/base.py`. These are the abstract methods in v1.6.2:

```python
class Wallet(ABC):
    async def cleanup(self): ...
    def status(self) -> Coroutine[None, None, StatusResponse]: ...
    def create_invoice(
        self,
        amount: int,                       # in sats
        memo: str | None = None,
        description_hash: bytes | None = None,
        unhashed_description: bytes | None = None,
        **kwargs,                          # e.g. expiry
    ) -> Coroutine[None, None, InvoiceResponse]: ...
    def pay_invoice(
        self, bolt11: str, fee_limit_msat: int
    ) -> Coroutine[None, None, PaymentResponse]: ...
    def get_invoice_status(self, checking_id: str) -> Coroutine[None, None, PaymentStatus]: ...
    def get_payment_status(self, checking_id: str) -> Coroutine[None, None, PaymentStatus]: ...
```

The base class also provides, with defaults that a backend can override:

- `paid_invoices_stream()`: yields the `checking_id` of each paid invoice. The default polls pending invoices every 5 seconds. Most node backends override it with a real stream.
- `create_hold_invoice()`, `settle_hold_invoice()` and `cancel_hold_invoice()`: raise an error unless the backend supports hold invoices.
- `features`: a list of `Feature` values (`nodemanager`, `holdinvoice`, `descriptionhash`).

### Response types {#response-types}

The responses are `NamedTuple`s, not dataclasses:

```python
class StatusResponse(NamedTuple):
    error_message: str | None
    balance_msat: int

class InvoiceResponse(NamedTuple):
    ok: bool
    checking_id: str | None = None
    payment_request: str | None = None
    error_message: str | None = None
    preimage: str | None = None
    fee_msat: int | None = None

class PaymentResponse(NamedTuple):
    ok: bool | None = None        # None means "don't know yet": the payment stays pending
    checking_id: str | None = None
    fee_msat: int | None = None
    preimage: str | None = None
    error_message: str | None = None

class PaymentStatus(NamedTuple):
    paid: bool | None = None      # True = success, False = failed, None = pending
    fee_msat: int | None = None
    preimage: str | None = None
```

`success`, `pending` and `failed` are properties computed from `ok` or `paid`.

## Available backends {#backend-categories}

`lnbits/wallets/__init__.py` in v1.6.2 exports these classes. `LNBITS_BACKEND_WALLET_CLASS` takes the class name.

### Your own node {#self-hosted-nodes}

| Class | Backend |
|---|---|
| `LndRestWallet` | LND, REST API |
| `LndWallet` | LND, gRPC |
| `CLNRestWallet` | Core Lightning's built-in `clnrest` plugin (runes) |
| `CoreLightningWallet` | Core Lightning over its local RPC socket (`CLightningWallet` is an old alias) |
| `EclairWallet` | Eclair |
| `PhoenixdWallet` | phoenixd |
| `SparkWallet` | Spark, the CLN web wallet by shesek (not Lightspark's Spark) |

### Hosted and layer-2 services {#custodial-services}

| Class | Backend |
|---|---|
| `SparkL2Wallet` | Lightspark's Spark L2, through the LNbits Spark sidecar (v1.5.0) |
| `BarkWallet` | Ark, through `barkd` (v1.6.0) |
| `BoltzWallet` | Boltz client (Liquid swaps) |
| `NWCWallet` | Any Nostr Wallet Connect wallet. Custody depends on the wallet behind it |
| `BlinkWallet` | Blink |
| `StrikeWallet` | Strike, with an API key sent as a bearer token |
| `OpenNodeWallet` | OpenNode |
| `ZBDWallet` | ZBD |
| `LNbitsWallet` | A wallet on another LNbits instance |

### Test and fallback {#special-purpose}

| Class | Purpose |
|---|---|
| `VoidWallet` | **The default.** No Lightning at all: it can't create or pay invoices |
| `FakeWallet` | For development and tests. It issues invoices it can "pay" itself, but refuses any invoice it didn't create ("Only internal invoices can be used!") |

### Deprecated or dead {#deprecated-backends}

:::caution
These classes still ship in v1.6.2, but the service behind them is gone or no longer maintained. Don't use them for new installs, and move existing ones to another backend:

- `AlbyWallet`: it talks to Alby's hosted wallet API (`ALBY_API_ENDPOINT`, default `https://api.getalby.com/`), and Alby closed its shared (custodial) wallet on 2025-01-04. Connect Alby Hub through `NWCWallet` instead.
- `LNPayWallet` and `LnTipsWallet`: the LNPay and LN.tips API hosts no longer resolve.
- `CoreLightningRestWallet`: c-lightning-REST is archived. Use `CLNRestWallet`.
- `BreezSdkWallet` (Greenlight) and `BreezLiquidSdkWallet`: both Breez SDKs are deprecated.
- `ClicheWallet`: removed on the LNbits `dev` branch, and not in the default allowed list.
:::

Which classes the Admin UI offers is controlled by `LNBITS_ALLOWED_FUNDING_SOURCES`. The default list leaves out `SparkWallet` and `ClicheWallet`.

For setup guides per backend, see [Funding Sources](/docs/funding-sources/overview).

## How a backend is loaded {#runtime-loading}

At startup LNbits looks up the class by name, `getattr(lnbits.wallets, class_name)`, and creates one instance. It then calls `status()`. If that fails, it retries up to `FUNDING_SOURCE_MAX_RETRIES` times (default 4, waiting 0.5, 1, 2 and 4 seconds), and then **falls back to `VoidWallet`** so the server still starts (`lnbits/app.py`, `check_funding_source`). Check the log for "Fallback to VoidWallet" if invoices suddenly stop working.

The funding source is only loaded at startup. After you change it, restart LNbits: the Admin UI says "Restart required!", and the Super User can restart from there or with `GET /admin/api/v1/restart`.

## Configuration {#configuration}

:::info Settings live in the database
The Admin UI is on by default (`LNBITS_ADMIN_UI=true`). After the first start, the funding source settings are stored in the database and **override `.env`**. Editing `.env` and restarting changes nothing. Change the funding source in the Admin UI (`/admin`, Funding Sources), or turn the Admin UI off if you want to manage it through `.env`.

The Admin UI shows the funding source section only to the Super User, but `PUT /admin/api/v1/settings` accepts funding source fields from any admin. See [Users & Accounts](/docs/architecture/users).
:::

With the Admin UI off, set the class and its settings in `.env`, then restart:

```bash
LNBITS_BACKEND_WALLET_CLASS=LndRestWallet
LND_REST_ENDPOINT=https://127.0.0.1:8080
LND_REST_CERT=/path/to/tls.cert
LND_REST_MACAROON=/path/to/admin.macaroon
```

Core Lightning's `clnrest` uses up to four runes, each sent in a `rune` header:

```bash
LNBITS_BACKEND_WALLET_CLASS=CLNRestWallet
CLNREST_URL=https://127.0.0.1:3010
CLNREST_READONLY_RUNE=        # required
CLNREST_INVOICE_RUNE=         # needed to create invoices
CLNREST_PAY_RUNE=             # needed to pay, unless you set the renepay rune
CLNREST_RENEPAY_RUNE=         # optional; if set, payments use renepay
```

If you use Docker, note that `docker start` doesn't re-read an env file. Recreate the container instead.

:::danger
Funding source credentials (admin macaroons, pay runes, API keys, seeds) can spend everything on the backend, across all wallets. Keep them out of shared files and screenshots. For LND you can store the macaroon encrypted with `LND_REST_MACAROON_ENCRYPTED`. Use a rune or macaroon with the narrowest permissions the backend allows.
:::

## Outgoing payment timeouts {#timeouts}

When LNbits pays an invoice, it waits `LNBITS_FUNDING_SOURCE_PAY_INVOICE_WAIT_SECONDS` (default 5) for the backend. If the backend hasn't answered by then, the payment stays **pending** and LNbits checks it again later. Pending payments are re-checked every `LNBITS_FUNDING_SOURCE_PENDING_INTERVAL_SECONDS` (default 1800).

## Balance monitoring {#health-monitoring}

LNbits doesn't stop wallets from adding up to more than the backend holds. It offers two tools to spot a gap:

- **`GET /admin/api/v1/audit`** (admin): returns `lnbits_balance_sats` (the total of all wallets) and `node_balance_sats`. It errors if the funding source's `status()` reports an error.
- **The watchdog** (`check_server_balance_against_node`): every `LNBITS_WATCHDOG_INTERVAL_MINUTES` (default 60) it compares the two. If LNbits holds more than the node by at least `LNBITS_WATCHDOG_DELTA` sats (default 1,000,000), it sends an admin notification and, if `LNBITS_WATCHDOG_SWITCH_TO_VOIDWALLET` is on, switches the instance to `VoidWallet`.

The watchdog does nothing unless `LNBITS_WATCHDOG_SWITCH_TO_VOIDWALLET` or `LNBITS_NOTIFICATION_WATCHDOG` is turned on. Both are off by default.

## See also {#see-also}

- [Funding Sources overview](/docs/funding-sources/overview)
- [LND Configuration](/docs/funding-sources/lnd)
- [Core Lightning Configuration](/docs/funding-sources/cln)
- [Custodial Services](/docs/funding-sources/custodial)
