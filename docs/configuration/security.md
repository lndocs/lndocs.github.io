---
sidebar_position: 5
title: Security
description: Security best practices for LNbits deployments
---

# Security Configuration

Secure your LNbits deployment with these best practices.

## Essential Security Checklist

- [ ] Use HTTPS exclusively
- [ ] Set strong `AUTH_SECRET_KEY`
- [ ] Use username/password auth (not user-id-only)
- [ ] Enable rate limiting
- [ ] Configure firewall
- [ ] Regular backups
- [ ] Monitor logs
- [ ] Keep software updated

## Authentication Security

### Secret Key

```bash
# Generate a strong secret key
AUTH_SECRET_KEY=$(openssl rand -hex 32)
```

:::danger Never use default keys
A compromised secret key allows attackers to forge authentication tokens.
:::

### Password Requirements

LNbits uses bcrypt for password hashing:
- Automatic salting
- Adaptive cost factor
- Secure against rainbow tables

### Session Security

```bash
# Secure cookies (requires HTTPS)
AUTH_SESSION_COOKIE_SECURE=true

# Limit token lifetime
AUTH_TOKEN_EXPIRE_MINUTES=43200  # 30 days
```

## Network Security

### HTTPS Configuration

Always use HTTPS in production. Configure via reverse proxy:

```nginx title="nginx.conf"
server {
    listen 443 ssl http2;
    server_name lnbits.example.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    # Modern TLS configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Rate Limiting

Protect against brute force and DoS:

```bash
# LNbits built-in rate limiting
LNBITS_RATE_LIMIT_NO=200
LNBITS_RATE_LIMIT_UNIT=minute

# Per endpoint limits (stricter for auth)
# Configure in nginx:
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
```

### IP Restrictions

```bash
# Block known bad actors
LNBITS_BLOCKED_IPS=1.2.3.4,5.6.7.8

# Allow specific users only
LNBITS_ALLOWED_USERS=trusted_user_1,trusted_user_2
```

### Firewall Rules

```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (redirect to HTTPS)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

## Funding Source Security

### LND Security

```bash
# Use read-only macaroon where possible
LND_REST_MACAROON=/path/to/readonly.macaroon

# For payments, use invoice macaroon
LND_REST_MACAROON=/path/to/invoice.macaroon

# Encrypt macaroons in storage
LND_REST_MACAROON_ENCRYPTED=encrypted_string
```

### Core Lightning Security

```bash
# Use runes with restricted permissions
CLNREST_RUNE=your-restricted-rune

# Create restricted rune:
lightning-cli createrune restrictions='[["method^pay"],["rate=60"]]'
```

### Certificate Validation

```bash
# Always validate TLS certificates
LND_REST_CERT=/path/to/tls.cert
CLNREST_CERT=/path/to/ca.pem
```

## Database Security

### PostgreSQL

```sql
-- Use dedicated user with limited permissions
CREATE USER lnbits WITH PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE lnbits TO lnbits;

-- Revoke public access
REVOKE ALL ON DATABASE lnbits FROM PUBLIC;
```

### Connection Security

```bash
# Use SSL for database connections
LNBITS_DATABASE_URL="postgres://user:pass@host:5432/db?sslmode=verify-full"
```

### Backup Encryption

```bash
# Encrypt backups
pg_dump lnbits | gpg -c > backup.sql.gpg

# Restore
gpg -d backup.sql.gpg | psql lnbits
```

## API Security

### Key Management

| Key Type | Permissions | Share? |
|----------|-------------|--------|
| Admin Key | Full access | Never |
| Invoice Key | Create invoices | Carefully |

### API Key Best Practices

1. **Rotate keys regularly** - Generate new keys periodically
2. **Use invoice keys** - When only receiving payments
3. **Monitor usage** - Track API calls per key
4. **Revoke compromised keys** - Immediately

### Webhook Security

```bash
# Validate webhook signatures (extension-specific)
# Use HTTPS for webhook URLs
# Implement request verification in your handler
```

## Admin Security

### Super User Protection

1. Store Super User ID securely
2. Don't share Super User access
3. Use separate admin accounts for daily tasks

### Audit Logging

```bash
# Enable comprehensive logging
LNBITS_AUDIT_ENABLED=true
LNBITS_LOG_LEVEL=INFO
```

Monitor for:
- Failed login attempts
- Unusual payment patterns
- Configuration changes
- Extension installations

## Docker Security

```yaml title="docker-compose.yml"
version: "3.8"

services:
  lnbits:
    image: lnbits/lnbits:latest
    # Run as non-root
    user: "1000:1000"
    # Read-only filesystem
    read_only: true
    # Limit capabilities
    cap_drop:
      - ALL
    # Secure mounts
    volumes:
      - ./data:/app/data:rw
      - ./.env:/app/.env:ro
    # Resource limits
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

## Monitoring & Alerts

### Log Monitoring

```bash
# Watch for security events
docker logs -f lnbits | grep -E "(ERROR|WARNING|auth|login)"
```

### Health Checks

```bash
# API health endpoint
curl https://lnbits.example.com/api/v1/health
```

### Alert on Anomalies

Set up alerts for:
- Multiple failed logins
- Large payments
- Funding source disconnection
- High error rates

## Incident Response

### Suspected Compromise

1. **Isolate** - Take instance offline
2. **Preserve** - Backup logs and database
3. **Investigate** - Review audit logs
4. **Remediate** - Fix vulnerability
5. **Recover** - Restore from clean backup
6. **Report** - Notify affected users

### Key Rotation

```bash
# Generate new secret key
AUTH_SECRET_KEY=$(openssl rand -hex 32)

# All sessions will be invalidated
# Users must re-authenticate
```

## Security Updates

### Stay Updated

```bash
# Check for updates
docker pull lnbits/lnbits:latest

# Or with git
git fetch origin
git log HEAD..origin/main --oneline
```

### Subscribe to Announcements

- GitHub releases: Watch the repository
- Telegram: @lnbits
- Security advisories: Check GitHub Security tab

## See Also

- [Authentication](/docs/configuration/authentication)
- [Deployment](/docs/deployment/docker)
- [Troubleshooting](/docs/guides/troubleshooting)
