---
sidebar_position: 7
title: Webhooks
description: Receive real-time payment notifications
---

# Webhooks

Receive real-time notifications when payments are completed.

## Setting Up Webhooks

### Per-Invoice Webhook

Specify a webhook URL when creating an invoice:

```bash
curl -X POST \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "out": false,
    "amount": 1000,
    "memo": "Order #123",
    "webhook": "https://your-server.com/webhook"
  }' \
  https://lnbits.com/api/v1/payments
```

## Webhook Payload

When the invoice is paid, LNbits sends a POST request:

```json
{
  "payment_hash": "abc123...",
  "checking_id": "abc123...",
  "amount": 1000,
  "fee": 0,
  "memo": "Order #123",
  "status": "success",
  "bolt11": "lnbc10n1...",
  "preimage": "def456...",
  "extra": {
    "tag": "extension_name",
    "custom_field": "value"
  }
}
```

## Webhook Headers

LNbits sends these headers:

```
Content-Type: application/json
User-Agent: LNbits/1.0
X-LNbits-Webhook: true
```

## Handling Webhooks

### Basic Handler (Python/Flask)

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def webhook():
    data = request.json

    # Verify the payment
    payment_hash = data.get('payment_hash')
    status = data.get('status')

    if status == 'success':
        # Process the payment
        amount = data.get('amount')
        memo = data.get('memo')

        # Update your database, fulfill order, etc.
        process_payment(payment_hash, amount)

    return jsonify({'status': 'ok'}), 200
```

### Express.js Handler

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/webhook', (req, res) => {
  const { payment_hash, status, amount, memo } = req.body;

  if (status === 'success') {
    // Process the payment
    console.log(`Received ${amount} sats for: ${memo}`);
    processPayment(payment_hash, amount);
  }

  res.json({ status: 'ok' });
});
```

## Security Considerations

### Verify Source

Check the request comes from your LNbits instance:

```python
@app.route('/webhook', methods=['POST'])
def webhook():
    # Check source IP or header
    if not request.headers.get('X-LNbits-Webhook'):
        return 'Unauthorized', 401

    # Or verify by checking the payment
    payment_hash = request.json.get('payment_hash')
    if not verify_payment_with_lnbits(payment_hash):
        return 'Invalid payment', 400

    # Process...
```

### Verify Payment

Always verify the payment with your LNbits:

```python
async def verify_payment_with_lnbits(payment_hash: str) -> bool:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://lnbits.com/api/v1/payments/{payment_hash}",
            headers={"X-Api-Key": INVOICE_KEY}
        )
        data = response.json()
        return data.get('paid', False)
```

### Idempotency

Handle duplicate webhooks:

```python
processed_payments = set()

@app.route('/webhook', methods=['POST'])
def webhook():
    payment_hash = request.json.get('payment_hash')

    # Check if already processed
    if payment_hash in processed_payments:
        return jsonify({'status': 'already processed'}), 200

    # Process and mark as handled
    process_payment(payment_hash)
    processed_payments.add(payment_hash)

    return jsonify({'status': 'ok'}), 200
```

## Retry Logic

LNbits retries failed webhooks:
- Immediate retry on timeout
- Up to 3 attempts
- Exponential backoff

Ensure your endpoint returns 2xx quickly.

## Webhook Status

Check webhook delivery status:

```bash
curl -H "X-Api-Key: $ADMIN_KEY" \
  https://lnbits.com/api/v1/payments/{checking_id}
```

Response includes:
```json
{
  "webhook": "https://your-server.com/webhook",
  "webhook_status": 200
}
```

## Extension Webhooks

Many extensions support their own webhooks:

### SatsPay
```json
{
  "webhook": "https://...",
  "type": "satspay",
  "charge_id": "..."
}
```

### TPoS
```json
{
  "webhook": "https://...",
  "type": "tpos",
  "tpos_id": "..."
}
```

## Testing Webhooks

### Local Development

Use ngrok for local testing:

```bash
ngrok http 5000
# Use https://xxx.ngrok.io/webhook as your webhook URL
```

### Webhook Tester

Use webhook testing services:
- webhook.site
- requestbin.com

## Troubleshooting

### Webhook Not Received

1. Check URL is accessible from internet
2. Verify HTTPS certificate is valid
3. Check firewall rules
4. Review LNbits logs

### Duplicate Webhooks

1. Implement idempotency
2. Check for multiple invoice creations
3. Verify webhook URL isn't registered multiple times

## See Also

- [Payments API](/docs/api/payments)
- [Extensions](/docs/extensions/overview)
