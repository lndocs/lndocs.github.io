---
sidebar_position: 3
title: Authentication
description: Configure user authentication methods in LNbits
---

# Authentication Configuration

LNbits supports multiple authentication methods to fit different deployment scenarios.

## Authentication Methods

| Method | Security | Use Case |
|--------|----------|----------|
| User ID Only | Low | Development, demos |
| Username/Password | Medium | Standard deployments |
| Nostr NIP-98 | High | Privacy-focused |
| OAuth 2.0 | High | Enterprise integration |

## Configuring Auth Methods

```bash
# Single method
AUTH_ALLOWED_METHODS=username-password

# Multiple methods (comma-separated)
AUTH_ALLOWED_METHODS=username-password,nostr-nip98,google-auth
```

## JWT Configuration

All auth methods use JWT tokens for sessions:

```bash
# REQUIRED: Secret key for signing tokens
# Generate with: openssl rand -hex 32
AUTH_SECRET_KEY=your-very-long-random-secret-key

# Token expiration (minutes)
AUTH_TOKEN_EXPIRE_MINUTES=525600  # 1 year

# Token refresh threshold (minutes before expiry)
AUTH_TOKEN_REFRESH_MINUTES=10080  # 1 week
```

:::danger Important
Never use the default or example secret key in production. Generate a unique key:
```bash
openssl rand -hex 32
```
:::

## User ID Only

The simplest auth method - just a unique identifier in the URL.

```bash
AUTH_ALLOWED_METHODS=user-id-only
```

Access via URL:
```
https://lnbits.example.com/wallet?usr=abc123def456
```

:::warning
Anyone with the URL can access the wallet. Use only for:
- Development environments
- Demos and testing
- Single-user deployments with other access controls
:::

## Username/Password

Traditional authentication with email-style login.

```bash
AUTH_ALLOWED_METHODS=username-password
```

### Features
- Bcrypt password hashing
- Account creation at login
- Optional password reset via email

### Registration

New users can create accounts at the login page if:
```bash
LNBITS_ALLOW_NEW_ACCOUNTS=true
```

## Nostr (NIP-98)

Authenticate using Nostr keys with NIP-98 HTTP Auth.

```bash
AUTH_ALLOWED_METHODS=nostr-nip98
```

### How It Works

1. User signs an authentication event with their nsec
2. Event contains:
   - `kind: 27235` (NIP-98)
   - `created_at`: Current timestamp
   - `url`: LNbits URL
   - `method`: HTTP method
3. LNbits verifies the signature
4. Account linked to npub

### Client Support

Users need a Nostr client that supports NIP-98:
- Alby extension
- nos2x extension
- Native app integrations

## Google OAuth

```bash
AUTH_ALLOWED_METHODS=google-auth

AUTH_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
AUTH_GOOGLE_CLIENT_SECRET=your-client-secret
```

### Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Navigate to APIs & Services > Credentials
4. Create OAuth 2.0 Client ID
5. Set authorized redirect URI:
   ```
   https://your-lnbits.com/api/v1/auth/google/callback
   ```

## GitHub OAuth

```bash
AUTH_ALLOWED_METHODS=github-auth

AUTH_GITHUB_CLIENT_ID=your-client-id
AUTH_GITHUB_CLIENT_SECRET=your-client-secret
```

### Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set authorization callback URL:
   ```
   https://your-lnbits.com/api/v1/auth/github/callback
   ```

## Keycloak OAuth

For enterprise SSO integration:

```bash
AUTH_ALLOWED_METHODS=keycloak-auth

AUTH_KEYCLOAK_CLIENT_ID=lnbits
AUTH_KEYCLOAK_CLIENT_SECRET=your-client-secret
AUTH_KEYCLOAK_DISCOVERY_URL=https://keycloak.example.com/realms/your-realm/.well-known/openid-connect
```

### Keycloak Setup

1. Create a new client in your realm
2. Set Client Protocol: openid-connect
3. Set Access Type: confidential
4. Add valid redirect URI:
   ```
   https://your-lnbits.com/api/v1/auth/keycloak/callback
   ```

## API Key Authentication

Wallets can be accessed via API keys (independent of user auth):

```bash
# Admin key - full access
curl -H "X-Api-Key: admin_key_here" https://lnbits.com/api/v1/wallet

# Invoice key - create invoices only
curl -H "X-Api-Key: invoice_key_here" https://lnbits.com/api/v1/payments
```

### Key Types

| Key | Create Invoice | Pay Invoice | View Balance |
|-----|----------------|-------------|--------------|
| Admin | Yes | Yes | Yes |
| Invoice | Yes | No | No |

## Session Management

### Cookie Settings

```bash
# Session cookie name (default: lnbits_session)
AUTH_SESSION_COOKIE_NAME=lnbits_session

# Secure cookies (HTTPS only)
AUTH_SESSION_COOKIE_SECURE=true  # Enable in production
```

### Logout

Users can logout via:
- UI logout button
- API: `POST /api/v1/auth/logout`
- Clearing cookies

## Access Restrictions

### Allow Specific Users

```bash
# Only these users can access
LNBITS_ALLOWED_USERS=user_id_1,user_id_2,user_id_3
```

### Block Registration

```bash
# Prevent new account creation
LNBITS_ALLOW_NEW_ACCOUNTS=false
```

### IP Blocking

```bash
# Block specific IPs
LNBITS_BLOCKED_IPS=1.2.3.4,5.6.7.8
```

## Multiple Auth Methods

You can enable multiple methods simultaneously:

```bash
AUTH_ALLOWED_METHODS=username-password,google-auth,github-auth,nostr-nip98
```

The login page will show all available options.

### Account Linking

When a user authenticates with multiple methods:
- First auth creates the account
- Subsequent auths can link to existing account (by email)
- Users can unlink methods in settings

## Security Recommendations

### Production Checklist

1. **Use HTTPS** - Never serve auth over HTTP
2. **Set strong secret key** - `AUTH_SECRET_KEY`
3. **Enable secure cookies** - `AUTH_SESSION_COOKIE_SECURE=true`
4. **Use password auth at minimum** - Don't use user-id-only
5. **Restrict registration** - Consider `LNBITS_ALLOW_NEW_ACCOUNTS=false`
6. **Rate limit** - `LNBITS_RATE_LIMIT_NO`

### Audit Logging

Enable auth event logging:

```bash
LNBITS_AUDIT_ENABLED=true
```

Tracks:
- Login attempts (success/failure)
- Account creation
- Password changes
- OAuth connections

## Troubleshooting

### OAuth Redirect Errors

Check that redirect URIs match exactly:
```
Configured: https://lnbits.com/api/v1/auth/google/callback
Requested:  https://lnbits.com/api/v1/auth/google/callback  ✓
Requested:  http://lnbits.com/api/v1/auth/google/callback   ✗ (http vs https)
```

### JWT Token Expired

```bash
# Extend token lifetime
AUTH_TOKEN_EXPIRE_MINUTES=1051200  # 2 years
```

### Password Reset Not Working

Ensure SMTP is configured:
```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASSWORD=your-password
SMTP_SENDER=noreply@example.com
```

## See Also

- [Security Configuration](/docs/configuration/security)
- [Admin UI](/docs/configuration/admin-ui)
- [API Authentication](/docs/api/authentication)
