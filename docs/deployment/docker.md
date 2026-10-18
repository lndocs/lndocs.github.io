---
sidebar_position: 1
title: Docker Deployment
description: Deploy LNbits with Docker and Docker Compose
---

# Docker Deployment

Docker is the recommended way to deploy LNbits in production.

## Quick Start

```bash
docker run -d \
  --name lnbits \
  -p 5000:5000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/.env:/app/.env \
  lnbits/lnbits
```

## Docker Compose

Create a `docker-compose.yml`:

```yaml
version: "3.8"

services:
  lnbits:
    image: lnbits/lnbits:latest
    restart: unless-stopped
    ports:
      - "5000:5000"
    volumes:
      - ./data:/app/data
      - ./.env:/app/.env:ro
    environment:
      - HOST=0.0.0.0
      - PORT=5000
```

Run:
```bash
docker compose up -d
```

## Environment File

Create `.env`:

```bash
# Server
HOST=0.0.0.0
PORT=5000

# Database
LNBITS_DATA_FOLDER=/app/data

# Funding source
LNBITS_BACKEND_WALLET_CLASS=FakeWallet

# Admin
LNBITS_ADMIN_UI=true
# Leave empty to have LNbits generate a random key in data/.lnbits_auth_key,
# or set your own with: openssl rand -hex 32. Never use a placeholder: this key signs login tokens.
AUTH_SECRET_KEY=
```

## With PostgreSQL

```yaml
version: "3.8"

services:
  lnbits:
    image: lnbits/lnbits:latest
    restart: unless-stopped
    depends_on:
      - postgres
    ports:
      - "5000:5000"
    volumes:
      - ./.env:/app/.env:ro
    environment:
      - LNBITS_DATABASE_URL=postgres://lnbits:lnbits@postgres:5432/lnbits

  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_USER=lnbits
      - POSTGRES_PASSWORD=lnbits
      - POSTGRES_DB=lnbits
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

## With LND

```yaml
version: "3.8"

services:
  lnbits:
    image: lnbits/lnbits:latest
    restart: unless-stopped
    ports:
      - "5000:5000"
    volumes:
      - ./data:/app/data
      - /path/to/lnd:/lnd:ro
    environment:
      - LNBITS_BACKEND_WALLET_CLASS=LndRestWallet
      - LND_REST_ENDPOINT=https://lnd:8080
      - LND_REST_CERT=/lnd/tls.cert
      - LND_REST_MACAROON=/lnd/data/chain/bitcoin/mainnet/admin.macaroon
    extra_hosts:
      - "lnd:host-gateway"
```

## Production Configuration

### Secure Settings

```yaml
services:
  lnbits:
    image: lnbits/lnbits:latest
    restart: unless-stopped
    user: "1000:1000"  # Run as non-root
    read_only: true     # Read-only filesystem
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    volumes:
      - ./data:/app/data:rw
      - ./.env:/app/.env:ro
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

### Health Check

```yaml
services:
  lnbits:
    # ... other config
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

## Updating

```bash
# Pull latest image
docker compose pull

# Restart with new image
docker compose up -d

# View logs
docker compose logs -f
```

## Backup

```bash
# Stop container
docker compose stop

# Backup data
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# Start container
docker compose start
```

## Troubleshooting

### View Logs

```bash
docker compose logs -f lnbits
```

### Shell Access

```bash
docker compose exec lnbits /bin/bash
```

### Permission Issues

```bash
# Fix data folder ownership
sudo chown -R 1000:1000 ./data
```

## See Also

- [Manual Deployment](/docs/deployment/manual)
- [Reverse Proxy](/docs/deployment/reverse-proxy)
- [Environment Variables](/docs/configuration/environment)
