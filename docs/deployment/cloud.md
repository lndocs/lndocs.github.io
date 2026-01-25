---
sidebar_position: 5
title: Cloud Deployment
description: Deploy LNbits on cloud platforms
---

# Cloud Deployment

Deploy LNbits on various cloud platforms.

## Fly.io

Fly.io offers a free tier suitable for small deployments.

### Setup

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Initialize (in lnbits directory)
fly launch
```

### fly.toml

```toml
app = "my-lnbits"
primary_region = "ams"

[build]
  image = "lnbits/lnbits:latest"

[env]
  HOST = "0.0.0.0"
  PORT = "8080"
  LNBITS_BACKEND_WALLET_CLASS = "FakeWallet"

[[services]]
  http_checks = []
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

[mounts]
  source = "lnbits_data"
  destination = "/app/data"
```

### Deploy

```bash
# Create volume
fly volumes create lnbits_data --size 1

# Deploy
fly deploy

# Set secrets
fly secrets set AUTH_SECRET_KEY=your-secret-key
```

## Railway

### Setup

1. Fork lnbits/lnbits on GitHub
2. Connect Railway to your fork
3. Add environment variables
4. Deploy

### Environment Variables

```
HOST=0.0.0.0
PORT=$PORT
LNBITS_BACKEND_WALLET_CLASS=FakeWallet
AUTH_SECRET_KEY=your-secret
```

## Render

### render.yaml

```yaml
services:
  - type: web
    name: lnbits
    env: docker
    dockerfilePath: ./Dockerfile
    envVars:
      - key: HOST
        value: 0.0.0.0
      - key: PORT
        value: 10000
      - key: LNBITS_DATA_FOLDER
        value: /app/data
    disk:
      name: lnbits-data
      mountPath: /app/data
      sizeGB: 1
```

## DigitalOcean App Platform

### app.yaml

```yaml
name: lnbits
services:
  - name: lnbits
    image:
      registry_type: DOCKER_HUB
      registry: lnbits
      repository: lnbits
      tag: latest
    http_port: 5000
    envs:
      - key: HOST
        value: "0.0.0.0"
      - key: LNBITS_DATA_FOLDER
        value: "/app/data"
```

## Heroku

:::warning
Heroku's ephemeral filesystem requires external PostgreSQL.
:::

```bash
heroku create my-lnbits
heroku addons:create heroku-postgresql:mini
heroku config:set LNBITS_DATABASE_URL=$(heroku config:get DATABASE_URL)
git push heroku main
```

## AWS (ECS/Fargate)

Use the Docker image with ECS:

1. Create ECR repository or use Docker Hub
2. Create ECS cluster
3. Create task definition with lnbits/lnbits image
4. Create service with load balancer
5. Add EFS for persistent storage

## Google Cloud Run

```bash
gcloud run deploy lnbits \
  --image lnbits/lnbits:latest \
  --port 5000 \
  --set-env-vars HOST=0.0.0.0,LNBITS_BACKEND_WALLET_CLASS=FakeWallet
```

Note: Cloud Run is stateless. Use Cloud SQL for database.

## Cost Considerations

| Platform | Free Tier | Notes |
|----------|-----------|-------|
| Fly.io | Yes | Good for small instances |
| Railway | Limited | Easy setup |
| Render | Yes | With limitations |
| Heroku | No longer | Requires paid plan |
| DigitalOcean | $5/mo | App Platform |

## See Also

- [Docker Deployment](/docs/deployment/docker)
- [Database Configuration](/docs/configuration/database)
