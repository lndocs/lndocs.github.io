---
sidebar_position: 4
title: Users & Accounts
description: Understanding user accounts and authentication in LNbits
---

# Users & Accounts

LNbits has a flexible user system supporting multiple authentication methods.

## Account Model

```python
class Account:
    id: str               # UUID hex string
    username: str         # Optional username
    email: str            # Optional email
    pubkey: str           # Nostr public key
    password_hash: str    # Bcrypt hash
    external_id: str      # OAuth provider ID
    is_super_user: bool   # Computed property
    is_admin: bool        # Computed property
    extra: UserExtra      # Notifications, labels
    created_at: datetime
    updated_at: datetime
```

## User Roles

### Super User

The instance operator with full control:

```
Powers:
- Change funding source
- Restart server
- Credit/debit accounts
- All admin powers

Identification:
- ID stored in .super_user file
- Created on first run if Admin UI enabled
```

### Admin

Instance administrators:

```
Powers:
- Manage all users
- Manage all wallets
- Configure settings
- Install extensions
- View audit logs

Configuration:
LNBITS_ADMIN_USERS="user_id_1,user_id_2"
```

### Regular User

Standard wallet users:

```
Powers:
- Own wallets only
- Enabled extensions
- Personal settings
```

## Authentication Methods

### User ID Only

Simplest auth - just a unique ID:

```
AUTH_ALLOWED_METHODS="user-id-only"
```

The wallet URL contains the user ID:
```
https://lnbits.example.com/wallet?usr=abc123
```

:::warning
Anyone with the URL can access the wallet. Use for development only.
:::

### Username/Password

Traditional authentication:

```
AUTH_ALLOWED_METHODS="username-password"
```

- Passwords hashed with bcrypt
- Session tokens via JWT
- Password reset via email (if configured)

### Nostr (NIP-98)

Authenticate with Nostr keys:

```
AUTH_ALLOWED_METHODS="nostr-nip98"
```

- Sign authentication event with nsec
- Verify npub against stored pubkey
- No password storage needed

### OAuth 2.0

External identity providers:

```bash
AUTH_ALLOWED_METHODS="google-auth,github-auth,keycloak-auth"

# Google
AUTH_GOOGLE_CLIENT_ID="..."
AUTH_GOOGLE_CLIENT_SECRET="..."

# GitHub
AUTH_GITHUB_CLIENT_ID="..."
AUTH_GITHUB_CLIENT_SECRET="..."

# Keycloak
AUTH_KEYCLOAK_CLIENT_ID="..."
AUTH_KEYCLOAK_CLIENT_SECRET="..."
AUTH_KEYCLOAK_DISCOVERY_URL="..."
```

## Session Management

### JWT Tokens

Sessions use JWT with configurable expiry:

```python
AUTH_SECRET_KEY=""                 # empty: LNbits generates one in data/.lnbits_auth_key
AUTH_TOKEN_EXPIRE_MINUTES=525600   # 1 year default
```

Token contains:
- User ID
- Expiration time
- Token type

### Token Refresh

Automatic refresh on activity:

```
1. Request with valid token
2. Check remaining lifetime
3. If < threshold, issue new token
4. Return in response header
```

## Account Creation

### Open Registration

```
LNBITS_ALLOW_NEW_ACCOUNTS=true
```

Anyone can create an account.

### Invite Only

```
LNBITS_ALLOW_NEW_ACCOUNTS=false
```

Only existing users can invite new accounts.

### Allowlist

```
LNBITS_ALLOWED_USERS="id1,id2,id3"
```

Only specific user IDs can access.

## User Settings

### Profile Data

```python
class UserExtra:
    notifications: List[Notification]
    labels: List[Label]
    wallet_invites: List[WalletInvite]
    nostr_identifier: str
```

### Notifications

Per-user notification preferences:

```python
# Email notifications
SMTP_HOST="smtp.example.com"
SMTP_USER="..."
SMTP_PASSWORD="..."

# Telegram notifications
TELEGRAM_BOT_TOKEN="..."
```

### Labels

Custom payment categorization:

```python
labels = [
    {"name": "Groceries", "color": "#4CAF50"},
    {"name": "Entertainment", "color": "#2196F3"}
]
```

## Access Control

### Per-User Extensions

Users can enable/disable extensions:

```sql
CREATE TABLE extensions (
    user_id TEXT,
    extension TEXT,
    active BOOLEAN
)
```

### Extension Gating

Admin-only extensions:

```python
# In extension manifest
{
    "admin_only": true
}
```

## Account Operations

### Create Account

```python
async def create_account(
    username: str = None,
    password: str = None,
    email: str = None
) -> Account:
    account = Account(
        id=uuid4().hex,
        username=username,
        password_hash=bcrypt.hash(password) if password else None,
        email=email
    )
    await db.insert(account)
    return account
```

### Delete Account

```python
async def delete_account(account_id: str):
    # Delete all wallets first
    await delete_user_wallets(account_id)
    # Then delete account
    await db.execute(
        "DELETE FROM accounts WHERE id = :id",
        {"id": account_id}
    )
```

## Super User Setup

### First Run

When Admin UI is enabled:

```python
if not super_user_exists():
    # Generate new super user ID
    super_user_id = uuid4().hex
    # Store in .super_user file
    write_file(".super_user", super_user_id)
    # Log to console
    print(f"Super User ID: {super_user_id}")
```

### Manual Configuration

```bash
# Set super user ID
echo "your-user-id" > .super_user

# Or via environment
SUPER_USER="your-user-id"
```

## Security Considerations

### Password Security

- Bcrypt with automatic salting
- Never stored or logged in plaintext
- Not returned in API responses

### Rate Limiting

```python
LNBITS_RATE_LIMIT_NO=200       # Requests per window
LNBITS_RATE_LIMIT_UNIT="minute"
```

### IP Blocking

```python
LNBITS_BLOCKED_IPS="1.2.3.4,5.6.7.8"
```

## See Also

- [Authentication Configuration](/docs/configuration/authentication)
- [Security Best Practices](/docs/configuration/security)
- [Admin UI](/docs/configuration/admin-ui)
