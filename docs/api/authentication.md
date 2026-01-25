---
sidebar_position: 2
title: API Authentication
description: Authenticate with the LNbits API
---

# API Authentication

LNbits uses API keys for authenticating requests.

## API Key Types

### Admin Key

Full wallet access:
- Create invoices
- Pay invoices
- View balance
- Access all wallet data

```bash
X-Api-Key: your_admin_key
```

### Invoice Key

Limited access:
- Create invoices only
- View own invoices
- Cannot pay or view balance

```bash
X-Api-Key: your_invoice_key
```

## Finding Your Keys

### Web UI

1. Log in to LNbits
2. Click on wallet name
3. Click "API Info" icon
4. Copy Admin Key or Invoice Key

### API

Not available via API for security reasons.

## Sending Keys

### Header (Recommended)

```bash
curl -H "X-Api-Key: your_key" https://lnbits.com/api/v1/wallet
```

### Query Parameter

```bash
curl "https://lnbits.com/api/v1/wallet?api-key=your_key"
```

:::warning
Query parameters may be logged. Use headers for production.
:::

## Permission Matrix

| Endpoint | Admin Key | Invoice Key |
|----------|:---------:|:-----------:|
| GET /wallet | Yes | No |
| GET /payments | Yes | Own only |
| POST /payments (invoice) | Yes | Yes |
| POST /payments (pay) | Yes | No |
| DELETE /payments | Yes | No |

## Error Responses

### Missing Key

```json
{
  "detail": "Missing API key"
}
```
HTTP 401

### Invalid Key

```json
{
  "detail": "Invalid API key"
}
```
HTTP 401

### Insufficient Permissions

```json
{
  "detail": "Admin key required"
}
```
HTTP 403

## Best Practices

### Security

1. **Never expose admin keys** in client-side code
2. **Use invoice keys** when only receiving
3. **Rotate keys** if compromised
4. **Use HTTPS** always

### Key Storage

```python
# Good: Environment variables
import os
API_KEY = os.environ.get('LNBITS_API_KEY')

# Bad: Hardcoded
API_KEY = "abc123..."  # Don't do this!
```

### Rate Limiting

Be mindful of rate limits:

```python
import time

def make_request_with_retry(url, headers, max_retries=3):
    for i in range(max_retries):
        response = requests.get(url, headers=headers)
        if response.status_code == 429:
            time.sleep(2 ** i)  # Exponential backoff
            continue
        return response
    raise Exception("Rate limit exceeded")
```

## Session Authentication

For web UI, session tokens are used:

```javascript
// Browser session (automatic)
fetch('/api/v1/wallet', {
  credentials: 'include'
})
```

## OAuth2 (Optional)

If OAuth is configured:

```bash
# Get token
curl -X POST https://lnbits.com/api/v1/auth/token \
  -d "username=user&password=pass"

# Use token
curl -H "Authorization: Bearer token" \
  https://lnbits.com/api/v1/wallet
```

## See Also

- [API Overview](/docs/api/overview)
- [Security](/docs/configuration/security)
