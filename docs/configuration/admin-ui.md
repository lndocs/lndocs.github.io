---
sidebar_position: 4
title: Admin UI
description: Configure and use the LNbits Admin User Interface
---

# Admin UI

The Admin UI provides a web interface for managing your LNbits instance.

## Enabling Admin UI

```bash
LNBITS_ADMIN_UI=true
```

When enabled:
- Settings are stored in database (not just .env)
- Super User can manage instance via browser
- Admin users can access management features

## First-Time Setup

### Super User Creation

On first run with Admin UI enabled:

1. LNbits generates a Super User ID
2. ID is saved to `.super_user` file
3. ID is logged to console

```bash
# View Super User ID
cat .super_user

# Or check logs
docker logs lnbits | grep "Super User"
```

### Access the Admin UI

1. Log in with the Super User ID
2. Navigate to `/admin/ui` in the sidebar
3. Complete initial configuration

## User Roles

### Super User

The instance operator with full control:

| Action | Super User |
|--------|:----------:|
| Change funding source | Yes |
| Restart server | Yes |
| Credit/debit accounts | Yes |
| All admin actions | Yes |

### Admin

Instance administrators (can have multiple):

| Action | Admin |
|--------|:-----:|
| Manage users | Yes |
| Manage wallets | Yes |
| Install extensions | Yes |
| Change settings | Yes |
| View audit logs | Yes |

```bash
# Designate admin users
LNBITS_ADMIN_USERS=user_id_1,user_id_2
```

## Admin UI Sections

### Dashboard

Overview of instance health:
- Total users and wallets
- Funding source status
- Recent activity
- System alerts

### Users

Manage user accounts:
- View all users
- Search and filter
- Edit user details
- Delete users
- Promote to admin

### Wallets

Manage all wallets:
- View wallet balances
- View transaction history
- Delete wallets
- Credit/debit (Super User)

### Extensions

Manage extensions:
- View installed extensions
- Install new extensions
- Update extensions
- Remove extensions
- Set default extensions

### Settings

Configure instance settings:

**Site Settings:**
- Site title
- Tagline
- Description
- Theme options

**Security Settings:**
- Allowed users
- Blocked IPs
- Rate limits
- Auth methods

**Funding Source:**
- Select backend
- Configure credentials
- Test connection

**Fees:**
- Service fee percentage
- Maximum fee
- Fee wallet

### Audit Log

View admin actions (if enabled):

```bash
LNBITS_AUDIT_ENABLED=true
```

Logged events:
- User creation/deletion
- Wallet operations
- Setting changes
- Funding source changes
- Extension management

## Database vs Environment

When Admin UI is enabled:

| Setting | Source |
|---------|--------|
| Database settings | Admin UI |
| Environment variables | `.env` file |
| **Priority** | Database wins |

To override database settings:

```bash
# Add _OVERRIDE suffix
LNBITS_SITE_TITLE_OVERRIDE="My LNbits"
```

## Funding Source Management

### Changing Backend (Super User Only)

1. Go to Settings > Funding Source
2. Select new backend
3. Enter credentials
4. Click "Test Connection"
5. Save changes
6. Confirm restart

:::warning
Changing funding source affects all wallets. Ensure:
- Backup current state
- Test new credentials
- Schedule during low usage
:::

### Testing Connection

Before saving, always test:

```
[Test Connection] → Checking...

✓ Connection successful
  Balance: 1,234,567 sats
  Node: 03abc...def
```

## Server Management

### Restart Server (Super User Only)

1. Go to Settings > Server
2. Click "Restart Server"
3. Confirm action
4. Wait for restart

Server restarts are needed after:
- Changing funding source
- Installing some extensions
- Major setting changes

### Server Status

View current status:
- Uptime
- Memory usage
- Active connections
- Background tasks

## Extension Management

### Install Extension

1. Go to Extensions
2. Click "Add Source" (if needed)
3. Browse available extensions
4. Click "Install"
5. Enable for users

### Extension Sources

Add custom manifest URLs:

```json
{
  "extensions": [
    {
      "id": "custom-ext",
      "name": "Custom Extension",
      "version": "1.0.0",
      "url": "https://github.com/user/repo/releases/download/v1.0.0/custom-ext.zip"
    }
  ]
}
```

### Default Extensions

Set extensions for new users:

```bash
LNBITS_EXTENSIONS_DEFAULT_INSTALL=tpos,lnurlp,boltz
```

Or via Admin UI:
1. Go to Settings > Extensions
2. Select default extensions
3. Save

## User Management

### Credit/Debit Account (Super User Only)

Adjust wallet balances without Lightning:

1. Go to Wallets
2. Find the wallet
3. Click "Credit/Debit"
4. Enter amount (+ or -)
5. Add reason (logged)
6. Confirm

:::warning
Use sparingly. Creates internal transactions without Lightning backing.
:::

### Delete User

1. Go to Users
2. Find the user
3. Click "Delete"
4. Confirm (wallets are soft-deleted)

## Best Practices

### Security

1. **Limit Super Users** - Only one trusted operator
2. **Use Admin sparingly** - Only trusted staff
3. **Enable audit logs** - Track all admin actions
4. **Regular backups** - Before major changes

### Operations

1. **Test in staging** - Before production changes
2. **Schedule maintenance** - Low-usage windows
3. **Monitor after changes** - Watch for issues
4. **Document changes** - Keep changelog

### Access

```bash
# Restrict admin access by IP (via reverse proxy)
# Nginx example:
location /admin {
    allow 192.168.1.0/24;
    deny all;
    proxy_pass http://lnbits:5000;
}
```

## Disabling Admin UI

To disable and revert to environment-only config:

```bash
LNBITS_ADMIN_UI=false
```

:::note
Existing database settings remain but are ignored. Environment variables take over.
:::

## See Also

- [Security Configuration](/docs/configuration/security)
- [Environment Variables](/docs/configuration/environment)
- [Extensions](/docs/extensions/overview)
