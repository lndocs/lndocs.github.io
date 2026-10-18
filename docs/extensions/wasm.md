---
sidebar_position: 6
title: WASM Extensions
description: Sandboxed WebAssembly extensions in LNbits v1.6 - sandbox limits, permissions, registry and config.json
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# WASM Extensions {#wasm-extensions}

LNbits v1.6.0 added a second kind of extension: **WASM extensions**. They are WebAssembly components that LNbits runs in a sandbox with [wasmtime](https://wasmtime.dev/). They reach wallets, storage and the network only through host functions, and each host function needs a permission that an admin granted at install time.

The v1.6.0 release notes say WASM extensions are "tightly sandboxed, meaning they can be vibe coded and shared without the security risks associated with traditional extensions". Their registry describes itself as a "Registry of extensions that do not need vetting".

:::warning The sandbox limits what an extension can do, not what you grant it
A WASM extension can't read your database or other extensions' data on its own. But if you grant `wallet.pay_invoice_background`, it can spend from the wallets a user ties to that grant, up to the grant's limit. Read the permission list in the install dialog. LNbits marks permissions that can move funds as high risk.
:::

## How WASM differs from Python extensions {#wasm-vs-python}

| | Python extension | WASM extension |
|---|---|---|
| Runs as | Python package imported into the LNbits process | WebAssembly component in a wasmtime store, one store per call |
| Access | Everything LNbits can reach: the database, settings, every wallet | Only the host functions it was granted |
| Installed to | `{LNBITS_EXTENSIONS_PATH}/extensions/<id>` (default `lnbits/extensions/<id>`) | `LNBITS_WASM_EXTENSIONS_PATH/<id>` (default `data/wasm_extensions/<id>`) |
| Registry setting | `LNBITS_EXTENSIONS_MANIFESTS` | `LNBITS_WASM_EXTENSIONS_MANIFESTS` |
| `config.json` | Display metadata (name, tile, versions) | Full runtime contract: exports, routes, events, permissions |
| UI | Jinja/Vue page at `/<id>/` inside the LNbits layout | Sandboxed iframe under `/ext/<id>/...` |
| HTTP API | Whatever the router defines, by convention `/<id>/api/v1/...` | Routes declared in `config.json`, mounted at `/api/v1/ext/{ext_id}/{path}` |
| Database | Own SQL schema, written by `migrations.py` | Owner-scoped tables declared in JSON migrations |
| Background work | `<id>_start()` / `<id>_stop()`, invoice listeners | None. It can react to the `onInvoicePaid` event |

A WASM archive may not contain Python files. Install aborts if the zip holds any `.py`, `.pyc`, `.pyo`, `.so` or `.pyd` file. A manifest listed under `LNBITS_EXTENSIONS_MANIFESTS` can't install a WASM extension, and a WASM manifest can't install a Python one.

LNbits also rejects a `LNBITS_WASM_EXTENSIONS_PATH` inside an importable Python extension directory (`{LNBITS_EXTENSIONS_PATH}/extensions` or `{LNBITS_DATA_FOLDER}/upgrades`). The error is "WASM extensions path must be outside importable extension directories."

## The sandbox {#sandbox}

Every call into an extension (an API request, a UI action or an event) is one **invocation**. For each one LNbits:

- creates a fresh wasmtime `Store` on an engine with fuel metering and epoch interruption turned on, and with a capped WebAssembly stack;
- gives it a fuel budget (`WASM_RUNTIME_MAX_FUEL`). Fuel is wasmtime's instruction budget, and the call traps when it runs out;
- applies store limits for linear memory, tables, table elements, instances and memories;
- attaches an empty WASI configuration;
- runs the export in a worker thread and stops it after `WASM_RUNTIME_MAX_EXECUTION_MS`. The invocation is then recorded as `timeout`;
- rejects requests and responses larger than the configured byte limits;
- counts host calls (all of them, and HTTP, storage and wallet calls separately) and fails the call when a count goes over its limit;
- limits how many invocations run at once: in total, per extension and per user.

Compiled components are cached in memory, so later calls don't recompile.

The UI is sandboxed too:

- The extension page at `/ext/<id>/...` is an LNbits wrapper. It loads the extension's HTML in an iframe from `/ext-frame/{ext_id}/...`, and each frame load needs a one-time token. The token is bound to the extension, the frame path and the user, and expires after 60 seconds.
- The iframe's Content Security Policy starts with `sandbox allow-scripts allow-pointer-lock; default-src 'none'`. Scripts, styles, fonts and media can load only from `/ext-assets/{ext_id}/`, and images only from there or `data:` URLs. `connect-src`, `form-action`, `frame-src`, `worker-src` and `object-src` are all `'none'`, so the page can't call LNbits or anything else directly. It talks to LNbits through the parent page's `postMessage` bridge.
- Extension code never receives the user's LNbits access token.

## Runtime limits {#runtime-limits}

These are the server-wide defaults. `0` turns a limit off.

| Setting | Default | What it limits |
|---|---|---|
| `WASM_RUNTIME_MAX_MEMORY_BYTES` | 67108864 (64 MiB) | Linear memory per store |
| `WASM_RUNTIME_MAX_EXECUTION_MS` | 5000 | Wall-clock time per invocation |
| `WASM_RUNTIME_MAX_FUEL` | 100000000 | wasmtime fuel per invocation |
| `WASM_RUNTIME_MAX_RESPONSE_BYTES` | 1048576 (1 MiB) | Size of an export's response |
| `WASM_RUNTIME_MAX_REQUEST_BYTES` | 1048576 (1 MiB) | Size of the request passed in |
| `WASM_RUNTIME_MAX_WASM_STACK_BYTES` | 1048576 (1 MiB) | WebAssembly stack |
| `WASM_RUNTIME_MAX_TABLE_ELEMENTS` | 10000 | Table elements per store |
| `WASM_RUNTIME_MAX_INSTANCES` | 8 | Instances per store |
| `WASM_RUNTIME_MAX_TABLES` | 10 | Tables per store |
| `WASM_RUNTIME_MAX_MEMORIES` | 1 | Linear memories per store |
| `WASM_RUNTIME_MAX_CONCURRENT_INVOCATIONS` | 16 | Invocations running at once, server-wide |
| `WASM_RUNTIME_MAX_CONCURRENT_INVOCATIONS_PER_EXTENSION` | 4 | Invocations at once for one extension |
| `WASM_RUNTIME_MAX_CONCURRENT_INVOCATIONS_PER_USER` | 4 | Invocations at once for one user |
| `WASM_RUNTIME_MAX_HOST_CALLS` | 1000 | Host calls per invocation |
| `WASM_RUNTIME_MAX_HTTP_CALLS` | 20 | `http.request` calls per invocation |
| `WASM_RUNTIME_MAX_STORAGE_CALLS` | 100 | Storage calls per invocation |
| `WASM_RUNTIME_MAX_WALLET_CALLS` | 20 | Wallet calls per invocation |
| `WASM_RUNTIME_HTTP_TIMEOUT_MS` | 5000 | Timeout of one outbound HTTP call |
| `WASM_RUNTIME_MAX_HTTP_RESPONSE_BYTES` | 1048576 (1 MiB) | Body size of one outbound HTTP response |
| `LNBITS_WASM_INVOCATION_RETENTION_DAYS` | 7 | How long the invocation history is kept |

These are editable settings. With the Admin UI on (the default), the values saved in the database override `.env` after first start, so change them in the Admin UI's **WASM Runtime** tab. An admin can also override any limit for one installed extension, from the Admin UI or with `PUT /api/v1/extension/wasm/runtime-limits/{ext_id}` (body `{"limits": {...}}`). The override is stored with the installed extension, not in its `config.json`.

Admins can watch invocations with `GET /api/v1/extension/wasm/invocations`, `GET /api/v1/extension/wasm/invocations/current` and `GET /api/v1/extension/wasm/invocations/stats`.
They can stop one with `POST /api/v1/extension/wasm/invocations/{invocation_id}/stop`.

## Permissions {#permissions}

LNbits v1.6.2 knows 17 permission IDs. An extension that asks for any other ID fails to install ("requests unknown permissions").

| Permission | Lets the extension |
|---|---|
| `ext.storage.read` | Read its own rows (one row, or filtered and paginated lists) for the current user |
| `ext.storage.write` | Create, update and delete its own rows for the current user |
| `ext.storage.read_public` | Read selected fields of selected tables without a logged-in user (policy: `table_name`, `public_fields`) |
| `ext.storage.append_public` | Add rows from public pages (policy: `table`, `source_table`, `source_id_field`, `allowed_fields`, `max_rows_per_source`, default 10,000, hard cap 1,000,000) |
| `wallet.list` | List the current user's wallets |
| `wallet.balance.read` | Read the balance of one of the user's wallets |
| `wallet.create_invoice` | Create an invoice on a wallet of the logged-in user |
| `wallet.create_invoice_public` | Create an invoice from a public page, on the wallet stored in a row (policy: `table`, `wallet_field`) |
| `wallet.pay_invoice` | Pay an invoice or LNURL-pay from the logged-in user's own wallet |
| `wallet.pay_invoice_background` | Pay without a logged-in user, within a grant each user creates (wallet, `max_amount`, and `own_wallets_only` or `external_allowed`) |
| `wallet.payments.watch` | Follow payments on a wallet the user grants |
| `websocket.publish` | Publish messages on the extension's own websocket channels (policy: one `max_messages_per_second`) |
| `websocket.subscribe` | Let clients connect to the extension's websocket at `/api/v1/ext/ws/{ext_id}/{item_id}` |
| `http.request` | Make outbound HTTPS requests to allow-listed origins (policy: `host`) |
| `extension.api.request` | Call another installed extension's API (policy: `id` and `access`, `read` and/or `write`) |
| `utils.basic` | Use helpers: currency lists, rates and conversion, invoice decoding and validation, preimage checks, server health |
| `ui.camera.scan_qr` | Ask the user to scan a QR code with the camera |

The host functions `system.random_id`, `system.now` and `system.log` need no permission.

Storage is owner-scoped. LNbits adds its own owner column to every extension table and fills it in itself. An extension reads and writes the current user's rows only, and reaches other rows only through the public permissions above.

### The grant flow {#grant-flow}

1. The extension lists the permissions it wants, with their policies, in the `permissions` array of its `config.json`.
2. When an admin installs it from the Extensions page, LNbits fetches that `config.json` (the registry entry's `details_link`) and the install dialog shows each permission and its policies. Permissions that can move funds get a high-risk warning.
3. The admin installs with the permissions they approve. LNbits checks the grant against the request. It rejects permissions the extension didn't ask for, and policies wider than requested. On install, an admin may raise `max_rows_per_source` and `max_messages_per_second` above the requested values. Every other policy has to stay inside the request.
4. LNbits saves the granted set with the installed extension. Admins can change it later with `PUT /api/v1/extension/{ext_id}/permissions`.
5. `wallet.pay_invoice_background` and `wallet.payments.watch` also need a per-user grant. Each user creates it for one of their own wallets (`POST /api/v1/extension/{ext_id}/permissions/background-payment` or `/permissions/wallet-payments-watch`).
They can revoke it with `DELETE /api/v1/extension/{ext_id}/permissions/user/{grant_id}`. Background payments can't come from shared wallets.

An install request that grants nothing still installs the extension, but with no permissions, so every host call that needs one fails. `lnbits-cli extensions install` sends no grants, so grant permissions in the Admin UI after a CLI install.

## Registry and install location {#registry}

WASM extensions come from their own registry. It is on by default:

```bash
# v1.6.2 default (LNBITS_WASM_EXTENSIONS_MANIFESTS)
https://raw.githubusercontent.com/lnbits/lnbits-extensions-wasm/refs/heads/main/extensions.json
```

The [lnbits/lnbits-extensions-wasm](https://github.com/lnbits/lnbits-extensions-wasm) repository calls itself a "Registry of extensions that do not need vetting". On 2026-10-18 it listed 25 releases of 20 extensions, among them `tips`, `paysplit`, `forms`, `supportchat`, `pricebot`, `wallet_sweep`, `zapgoalswasm` and several games. Some releases set a `max_lnbits_version`, so not every one installs on v1.6.2.

To turn the WASM registry off or add another one, edit **WASM source URL** on the Admin UI's Extensions tab. Setting `LNBITS_WASM_EXTENSIONS_MANIFESTS` replaces the default list instead of adding to it, and with the Admin UI on, the database value wins after first start.

Each registry entry uses the normal [manifest](/docs/extensions/manifest) fields plus `"extension_type": "wasm"` and a `details_link` to the release's raw `config.json`:

```json
{
  "id": "tips",
  "repo": "https://github.com/lnbits/tips",
  "version": "0.1.4",
  "archive": "https://github.com/lnbits/tips/archive/refs/tags/v0.1.4.zip",
  "hash": "b68e032af9f14143642c668c6c49e616fc496dbc6360f693bcf44cd2f65f5be4",
  "min_lnbits_version": "1.5.5",
  "name": "Tips",
  "short_description": "Receive Lightning tips with short messages.",
  "icon": "https://raw.githubusercontent.com/lnbits/tips/v0.1.4/static/assets/icon.png",
  "details_link": "https://raw.githubusercontent.com/lnbits/tips/v0.1.4/config.json",
  "html_url": "https://github.com/lnbits/tips/releases/tag/v0.1.4",
  "extension_type": "wasm"
}
```

Installed WASM extensions go to `LNBITS_WASM_EXTENSIONS_PATH`, which defaults to `{LNBITS_DATA_FOLDER}/wasm_extensions` (`./data/wasm_extensions`). This setting is read from the environment only. Because the folder sits in the data folder, a backup of `data/` includes your WASM extensions. A WASM extension's storage lives in the same `ext_<id>` database as a Python extension's would (`data/ext_<id>.sqlite3` on SQLite).

## `config.json` for WASM {#config-json}

A WASM extension's `config.json` is its runtime contract. LNbits v1.6.2 validates it as follows:

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Matches `^[A-Za-z0-9_-]+$` and must equal the id it is installed under |
| `name`, `short_description`, `version` | yes | Display metadata |
| `extension_type` | yes | Must be `"wasm"` |
| `wasm.module` | yes | Path of the component, e.g. `wasm/module.wasm` |
| `wasm.wit`, `wasm.world` | no | The WIT interface file and world name |
| `wasm.exports[]` | no | `{name, visibility}`, with visibility `authenticated`, `public` or `event` |
| `events.onInvoicePaid` | no | Export to call when an invoice for this extension is paid (the only event in v1.6.2) |
| `ui_routes[]` | no | `{path, entrypoint, auth, path_params}`, auth `user` or `public` |
| `api_routes[]` | no | `{method, path, export, auth, path_params, ownerContext, openapi}`, method one of DELETE/GET/PATCH/POST/PUT; `ownerContext` is `{table, idParam}` |
| `permissions[]` | no | `{id, description, policies}` |
| `openapi` | no | Path of an OpenAPI fragment that LNbits merges into `/docs` |
| `tile`, `min_lnbits_version`, `max_lnbits_version`, `ui`, `sdk` | no | Icon, version range, extra UI and SDK settings |

`max_lnbits_version` is exclusive: a release with `"max_lnbits_version": "1.6.2"` won't install on v1.6.2. The Extensions page shows a WASM extension's icon from `/ext-assets/<id>/assets/icon.png`.

This is the real `config.json` of `tips` v0.1.4, shortened (`...` marks removed entries):

{/* snippet:skip: abridged copy of a third-party config.json, not runnable */}
```json title="config.json (lnbits/tips v0.1.4, abridged)"
{
  "id": "tips",
  "name": "Tips",
  "short_description": "Receive Lightning tips with short messages.",
  "version": "0.1.4",
  "min_lnbits_version": "1.5.5",
  "extension_type": "wasm",
  "wasm": {
    "module": "wasm/module.wasm",
    "exports": [
      { "name": "create-tip-jar", "visibility": "authenticated" },
      { "name": "list-tip-jars", "visibility": "authenticated" },
      { "name": "get-public-tip-jar", "visibility": "public" },
      { "name": "create-tip-invoice", "visibility": "public" },
      { "name": "record-payment", "visibility": "event" }
    ]
  },
  "events": { "onInvoicePaid": "record-payment" },
  "ui_routes": [
    { "path": "/tips", "entrypoint": "ui/admin.html", "auth": "user" },
    {
      "path": "/tips/jars/{jar_id}",
      "entrypoint": "ui/public.html",
      "auth": "public",
      "path_params": { "jar_id": "jarId" }
    }
  ],
  "openapi": "wasm/openapi.json",
  "api_routes": [
    { "method": "POST", "path": "/jars", "export": "create-tip-jar", "auth": "user" },
    { "method": "GET", "path": "/jars", "export": "list-tip-jars", "auth": "user" },
    {
      "method": "GET",
      "path": "/jars/{jar_id}",
      "export": "get-public-tip-jar",
      "auth": "public",
      "path_params": { "jar_id": "jarId" }
    },
    { "method": "POST", "path": "/invoice", "export": "create-tip-invoice", "auth": "public" }
  ],
  "permissions": [
    { "id": "ext.storage.read", "description": "Read data in the tips extension storage namespace." },
    { "id": "ext.storage.write", "description": "Write data in the tips extension storage namespace." },
    {
      "id": "ext.storage.read_public",
      "description": "Read public tip jar fields for public pages.",
      "policies": [
        {
          "table_name": "tip_jars",
          "public_fields": ["id", "title", "description", "payment_method", "currency",
                            "suggested_amounts", "thank_you_message", "onchain_address"]
        }
      ]
    },
    {
      "id": "ext.storage.append_public",
      "description": "Create pending tip rows from public tip jar pages.",
      "policies": [
        {
          "table": "tips",
          "source_table": "tip_jars",
          "source_id_field": "jar_id",
          "allowed_fields": ["amount_sat", "name", "message", "payment_hash", "paid", "created_at"]
        }
      ]
    },
    {
      "id": "wallet.create_invoice_public",
      "description": "Create incoming Lightning invoices for selected wallets.",
      "policies": [{ "table": "tip_jars", "wallet_field": "wallet_id" }]
    },
    {
      "id": "wallet.pay_invoice_background",
      "description": "Send configured platform support payments after tips are received."
    },
    {
      "id": "http.request",
      "description": "Fetch external Bitcoin exchange rates from mempool.space.",
      "policies": [{ "host": "https://mempool.space" }]
    },
    {
      "id": "extension.api.request",
      "description": "Read Watchonly accounts and create receive addresses for onchain tip jars.",
      "policies": [{ "id": "watchonly", "access": ["read"] }]
    }
  ]
}
```

With this file, the user page is at `/ext/tips` and the public jar page at `/ext/tips/jars/{jar_id}`. The API routes are mounted under the WASM prefix:

{/* snippet:skip: WASM routes are registered from lnbits/core/wasm_ext/routes, which the snippet gate does not scan */}
```text
POST /api/v1/ext/tips/jars            -> export create-tip-jar   (logged-in user)
GET  /api/v1/ext/tips/jars            -> export list-tip-jars    (logged-in user)
GET  /api/v1/ext/tips/jars/{jar_id}   -> export get-public-tip-jar (public)
POST /api/v1/ext/tips/invoice         -> export create-tip-invoice (public)
```

The full file, with all twelve exports and eleven permissions, is at [lnbits/tips v0.1.4 config.json](https://raw.githubusercontent.com/lnbits/tips/v0.1.4/config.json).

## Building a WASM extension {#authoring}

LNbits v1.6.2 ships no WASM authoring guide. The unreleased `dev` branch adds one, [docs/wasm-extensions.md](https://github.com/lnbits/lnbits/blob/dev/docs/wasm-extensions.md), but it describes code that comes after v1.6.2. For v1.6.2 the best reference is a working extension such as [lnbits/tips](https://github.com/lnbits/tips). Its layout:

```text
tips/
├── config.json              # runtime contract (above)
├── manifest.json            # {"repos": [{"id": "tips", "organisation": "lnbits", "repository": "tips"}]}
├── wasm/
│   ├── module.wasm          # the built component LNbits loads
│   ├── lnbits-extension.wit # host imports and exports (package lnbits:extension)
│   └── openapi.json
├── ui/                      # iframe entrypoints named in ui_routes
├── static/                  # served at /ext-assets/tips/...; assets/icon.png is the tile
├── storage/
│   ├── schema.json
│   └── migrations/0001_initial.json ...
└── dev/                     # JavaScript source and build scripts
```

What the v1.6.2 source requires:

- **Storage migrations** are JSON files named `NNNN_<name>.json` in `storage/migrations/`. Each holds a `version` and a list of `operations` such as `create_table`. LNbits runs them in order at install and records the version, as it does for Python migrations.
- **Exports** named in `api_routes` and `events` must exist in the component, and a call to a missing export fails.
- **Assets** are served only from the extension's own `/ext-assets/{ext_id}/` path. LNbits checks the file type, MIME type and HTML-like content. Shared LNbits assets (Vue, Quasar, the LNbits CSS) come through `/ext-assets/{ext_id}/_lnbits/<asset>`.
- **The archive** is a zip with one top-level folder that holds `config.json`. A GitHub tag archive has this layout.

The tips repository builds its JavaScript source into a component with the Bytecode Alliance `jco componentize` tool against `wasm/lnbits-extension.wit` (see its `dev/package.json`). Other languages that produce WebAssembly components should work too, but no official example uses one. The LNbits source also has a TypeScript SDK generator at `tools/codegen/extension_sdk_typescript.py`. Its output isn't published or documented.

To publish, tag a GitHub release and ask for it to be added to [lnbits/lnbits-extensions-wasm](https://github.com/lnbits/lnbits-extensions-wasm), or run your own registry and add its URL as a WASM source.

## See Also

- [Extensions Overview](/docs/extensions/overview)
- [Installing Extensions](/docs/extensions/installing)
- [Extension Manifest](/docs/extensions/manifest)
