---
sidebar_position: 2
title: LND
description: Configure LNbits with LND Lightning node
---

# LND Configuration

Connect LNbits to your LND (Lightning Network Daemon) node.

## Prerequisites

- LND running and synced
- REST or gRPC API enabled
- TLS certificate accessible
- Macaroon with appropriate permissions

## REST API (Recommended)

### Configuration

```bash title=".env"
LNBITS_BACKEND_WALLET_CLASS=LndRestWallet

# LND REST endpoint
LND_REST_ENDPOINT=https://127.0.0.1:8080

# TLS certificate path
LND_REST_CERT=/path/to/tls.cert

# Admin macaroon (full access)
LND_REST_MACAROON=/path/to/admin.macaroon
```

### Encrypted Macaroon

For better security, encrypt the macaroon:

```bash
# Encrypt macaroon (in LNbits container)
python -c "
from lnbits.wallets.macaroon import encrypt_macaroon
with open('/path/to/admin.macaroon', 'rb') as f:
    print(encrypt_macaroon(f.read()))
"
```

Then use:

```bash
LND_REST_MACAROON_ENCRYPTED=your_encrypted_string
```

### Remote LND

For LND on a different machine:

```bash
# Use IP or hostname
LND_REST_ENDPOINT=https://192.168.1.100:8080

# Copy TLS cert from LND machine
scp user@lnd-host:~/.lnd/tls.cert ./

# Copy macaroon
scp user@lnd-host:~/.lnd/data/chain/bitcoin/mainnet/admin.macaroon ./
```

## gRPC API

For gRPC connections:

```bash
LNBITS_BACKEND_WALLET_CLASS=LndWallet

LND_GRPC_ENDPOINT=127.0.0.1
LND_GRPC_PORT=10009
LND_GRPC_CERT=/path/to/tls.cert
LND_GRPC_MACAROON=/path/to/admin.macaroon
```

## Macaroon Permissions

### Full Admin Macaroon

Location: `~/.lnd/data/chain/bitcoin/mainnet/admin.macaroon`

Permissions:
- Create/pay invoices
- View wallet info
- All operations

### Invoice-Only Macaroon

For receiving only:

```bash
# Create custom macaroon
lncli bakemacaroon invoices:read invoices:write

# Save and use
LND_REST_MACAROON=/path/to/invoice.macaroon
```

### Read-Only Macaroon

For monitoring:

```bash
lncli bakemacaroon info:read offchain:read onchain:read
```

## TLS Certificate

### Default Location

```bash
# Linux
~/.lnd/tls.cert

# Docker
/root/.lnd/tls.cert

# Umbrel
~/umbrel/app-data/lightning/data/lnd/tls.cert
```

### Skip Verification (Not Recommended)

For testing only:

```bash
LND_REST_CERT=""  # Empty string skips verification
```

:::danger
Never skip certificate verification in production!
:::

## Testing Connection

### Check LND Status

```bash
# Via lncli
lncli getinfo

# Via REST
curl --cacert tls.cert \
  --header "Grpc-Metadata-macaroon: $(xxd -ps -u -c 1000 admin.macaroon)" \
  https://127.0.0.1:8080/v1/getinfo
```

### Check LNbits Connection

```bash
# Start LNbits and check logs
docker logs lnbits | grep -i lnd

# Or via health endpoint
curl http://localhost:5000/api/v1/health
```

## Common LND Setups

### Umbrel

```bash
LND_REST_ENDPOINT=https://umbrel.local:8080
LND_REST_CERT=~/umbrel/app-data/lightning/data/lnd/tls.cert
LND_REST_MACAROON=~/umbrel/app-data/lightning/data/lnd/data/chain/bitcoin/mainnet/admin.macaroon
```

### RaspiBlitz

```bash
LND_REST_ENDPOINT=https://raspiblitz.local:8080
LND_REST_CERT=/mnt/hdd/lnd/tls.cert
LND_REST_MACAROON=/mnt/hdd/lnd/data/chain/bitcoin/mainnet/admin.macaroon
```

### Start9

```bash
LND_REST_ENDPOINT=https://lnd.embassy:8080
LND_REST_CERT=/path/to/embassy/lnd/tls.cert
LND_REST_MACAROON=/path/to/embassy/lnd/admin.macaroon
```

### BTCPay Server

```bash
LND_REST_ENDPOINT=https://btcpay.local:8080
# Use BTCPay's LND directory
```

### Voltage

```bash
LND_REST_ENDPOINT=https://your-node.m.voltageapp.io:8080
LND_REST_MACAROON_ENCRYPTED=voltage_provided_macaroon
# Voltage provides pre-configured macaroon
```

## Troubleshooting

### Connection Refused

```bash
# Check LND is running
lncli getinfo

# Check REST is enabled in lnd.conf
[Application Options]
restlisten=0.0.0.0:8080
```

### Certificate Error

```bash
# Regenerate TLS cert
lncli stop
rm ~/.lnd/tls.*
lncli start

# Update LNbits with new cert path
```

### Macaroon Invalid

```bash
# Check macaroon is readable
xxd -ps -u -c 1000 admin.macaroon | head -c 100

# Ensure correct network (mainnet vs testnet)
ls ~/.lnd/data/chain/bitcoin/
```

### Payment Stuck

1. Check LND has channels with liquidity
2. Verify channels are active: `lncli listchannels`
3. Check pending payments: `lncli listpayments`
4. Review LND logs for routing failures

## Performance Tips

### Connection Pooling

LNbits maintains connection pools. For high traffic:

```bash
# Increase LND connection limits in lnd.conf
[Application Options]
maxpendingchannels=10
max-cltv-expiry=5000
```

### Timeout Settings

```bash
# In LNbits settings (if experiencing timeouts)
# Adjust via code or contact support for options
```

## Security Best Practices

1. **Use invoice macaroon** when possible
2. **Encrypt macaroons** in storage
3. **Rotate macaroons** periodically
4. **Restrict network access** to LND
5. **Monitor for anomalies** in payment patterns

## See Also

- [Funding Sources Overview](/docs/funding-sources/overview)
- [Core Lightning](/docs/funding-sources/cln)
- [Security](/docs/configuration/security)
