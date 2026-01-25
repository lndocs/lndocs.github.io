---
sidebar_position: 5
title: Troubleshooting
description: Common issues and solutions
---

# Troubleshooting

Solutions to common LNbits issues.

## Connection Issues

### Funding Source Not Connecting

1. Check credentials are correct
2. Verify endpoint URL
3. Test network connectivity
4. Check TLS certificates

```bash
# Test LND connection
curl --cacert tls.cert https://127.0.0.1:8080/v1/getinfo
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U lnbits -h localhost lnbits
```

## Payment Issues

### Payments Failing

1. Check funding source balance
2. Verify channel liquidity
3. Review routing settings
4. Check LNbits logs

```bash
docker logs lnbits | grep -i error
```

### Invoice Not Received

1. Check payment status in funding source
2. Verify webhook URL is accessible
3. Check for pending payments

## Performance Issues

### Slow Response Times

1. Use PostgreSQL instead of SQLite
2. Add database indexes
3. Check server resources
4. Review rate limiting

## Common Errors

### "Invalid API Key"

- Verify key is correct
- Check admin vs invoice key
- Ensure wallet exists

### "Insufficient Balance"

- Check wallet balance
- Account for fee reserve
- Verify internal accounting

### "Extension Not Found"

- Reinstall extension
- Check manifest URL
- Restart LNbits

## Getting Help

- **Logs**: `docker logs lnbits`
- **Telegram**: [t.me/lnbits](https://t.me/lnbits)
- **GitHub Issues**: Report bugs
