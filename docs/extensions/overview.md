---
sidebar_position: 1
title: Extensions Overview
description: Extend LNbits functionality with modular extensions
---

# Extensions Overview

Extensions add powerful features to LNbits without modifying core code.

## What are Extensions?

Extensions are self-contained modules that:
- Add new functionality (TPoS, Paywall, etc.)
- Have their own API endpoints
- Store data in dedicated tables
- Integrate with the wallet system

```
┌─────────────────────────────────────────┐
│              LNbits Core                 │
│  (Wallets, Payments, Authentication)    │
└──────────────────┬──────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    ▼              ▼              ▼
┌────────┐   ┌──────────┐   ┌──────────┐
│  TPoS  │   │ LNURL-p  │   │ Paywall  │
└────────┘   └──────────┘   └──────────┘
```

## Popular Extensions

### Payment & Commerce

| Extension | Purpose |
|-----------|---------|
| **TPoS** | Point of Sale terminal |
| **SatsPay** | Payment processor |
| **Paywall** | Content monetization |
| **Invoices** | Invoice management |

### LNURL Protocol

| Extension | Purpose |
|-----------|---------|
| **LNURL-pay** | Static payment links |
| **LNURL-withdraw** | Vouchers and withdrawals |
| **LNURLdevice** | Hardware integration |

### Tools & Utilities

| Extension | Purpose |
|-----------|---------|
| **Boltz** | Submarine swaps |
| **Watch Only** | Balance monitoring |
| **Scheduler** | Automated payments |

### Fun & Social

| Extension | Purpose |
|-----------|---------|
| **Jukebox** | Music jukebox |
| **LNticket** | Event ticketing |
| **Gerty** | Bitcoin display |

## Extension Architecture

Each extension follows a standard structure:

```
extension/
├── manifest.json     # Metadata and version
├── __init__.py       # Extension registration
├── views.py          # Web UI routes
├── views_api.py      # API endpoints
├── models.py         # Data models
├── crud.py           # Database operations
├── migrations.py     # Schema migrations
├── tasks.py          # Background tasks
└── templates/        # HTML templates
    └── extension/
        └── index.html
```

## Managing Extensions

### Via Web UI

1. Go to **Extensions** in sidebar
2. Browse available extensions
3. Click **Enable** to activate
4. Configure in extension settings

### Via Admin UI

Administrators can:
- Install new extensions
- Set default extensions for users
- Disable extensions globally
- Manage extension sources

### Via Environment

```bash
# Default extensions for new users
LNBITS_EXTENSIONS_DEFAULT_INSTALL=tpos,lnurlp

# Disable all extensions
LNBITS_EXTENSIONS_DEACTIVATE_ALL=true
```

## Extension Sources

Extensions are distributed via manifests:

```bash
# Add custom manifest
LNBITS_EXTENSIONS_MANIFESTS="https://example.com/extensions.json"
```

### Official Registry

The official extension registry is at:
- https://extensions.lnbits.com

### Custom Sources

Create your own manifest:

```json
{
  "extensions": [
    {
      "id": "myext",
      "name": "My Extension",
      "version": "1.0.0",
      "archive": "https://github.com/.../myext.zip"
    }
  ]
}
```

## Per-User Extensions

Each user can:
- Enable/disable extensions for themselves
- See only enabled extensions in sidebar
- Have separate extension configurations

## Admin-Only Extensions

Some extensions are restricted to admins:

```json title="manifest.json"
{
  "name": "Admin Tool",
  "admin_only": true
}
```

Examples:
- Server management tools
- Global analytics
- System integrations

## Extension API

Extensions expose APIs at:
```
/api/v1/{extension_id}/...
```

Example (TPoS):
```
GET /api/v1/tpos/
POST /api/v1/tpos/
GET /api/v1/tpos/{tpos_id}
```

## Extension Data

Each extension has isolated tables:

```sql
-- TPoS example
CREATE TABLE tpos (
    id TEXT PRIMARY KEY,
    wallet_id TEXT,
    name TEXT,
    currency TEXT,
    ...
);
```

## Webhooks from Extensions

Extensions can fire webhooks:

```python
# In extension code
await send_webhook(
    url=webhook_url,
    data={"event": "payment_received", ...}
)
```

## Security Model

Extensions:
- Can only access wallets user has enabled them for
- Cannot access other users' data
- Must use wallet API for payments
- Are sandboxed from core internals

## Extension Lifecycle

1. **Install** - Downloaded and extracted
2. **Migrate** - Database tables created
3. **Enable** - User activates for wallet
4. **Use** - Extension functions available
5. **Disable** - Hidden but data retained
6. **Uninstall** - Removed (admin)

## See Also

- [Installing Extensions](/docs/extensions/installing)
- [Extension Development](/docs/extensions/development)
- [Extension Manifest](/docs/extensions/manifest)
