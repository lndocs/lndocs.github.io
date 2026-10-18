---
sidebar_position: 5
title: Cloud Deployment
description: Run the LNbits container on a cloud container host such as Fly.io
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Cloud Deployment

LNbits runs on any platform that can run the `lnbits/lnbits` container and give it persistent storage. This page lists what every platform needs, then shows Fly.io, the one platform upstream documents. Platform UIs, prices and free tiers change often; check the platform's own docs for those.

## What any container host needs {#requirements}

1. **The image, pinned:** `lnbits/lnbits:v1.6.2`.
2. **The right port.** The image listens on port **5000** inside the container. It ignores `PORT` and `HOST`: its start command passes `--port $LNBITS_PORT --host $LNBITS_HOST`, with LNBITS_PORT=5000 and LNBITS_HOST=0.0.0.0. So either tell the platform the container port is 5000, or, if the platform insists on its own port, set LNBITS_PORT to it. A platform-provided `PORT` variable alone does nothing.
3. **Persistent storage for `/app/data`.** It holds the SQLite database (if you don't use PostgreSQL), `.lnbits_auth_key`, `.super_user`, uploads, logs and extensions. On a platform with an ephemeral filesystem, every redeploy or restart without a volume loses all wallets. If the platform has no volumes, use a managed PostgreSQL (`LNBITS_DATABASE_URL=postgres://...`), and accept that extensions and the generated auth key will be lost on redeploy unless you set `AUTH_SECRET_KEY` as a secret (`openssl rand -hex 32`).
4. **Extensions on the volume:** `LNBITS_EXTENSIONS_PATH=/app/data/extensions`.
5. **Exactly one instance.** LNbits' double-spend protection uses in-process locks, so never scale to several replicas or machines on one database, and turn off autoscaling.
6. **HTTPS at the platform's edge**, with the platform's proxy the only thing that can reach port 5000. The image trusts forwarded headers from any client (`--forwarded-allow-ips='*'`), which is fine only when the container port isn't reachable directly.
7. **Secrets as platform secrets,** not in config files you commit: funding-source credentials, `LNBITS_DATABASE_URL`, `FIRST_INSTALL_TOKEN`.

After the first deploy, open `/first_install` to set the Super User, ideally protected by a `FIRST_INSTALL_TOKEN` secret, because the instance is on the internet from its first second. Then configure the funding source in the Admin UI (**Settings → Funding**); environment variables for funding only apply on the first start.

:::danger FakeWallet on a public host
Examples elsewhere use `FakeWallet` for testing. On a public instance, a FakeWallet balance is free money that looks real. Don't leave a public demo on FakeWallet without making that obvious to every visitor, and never connect it to anything that pays out real value.
:::

## Fly.io {#flyio}

Install `flyctl` and log in:

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

Create a `fly.toml` in an empty directory:

```toml title="fly.toml"
app = "my-lnbits"
primary_region = "ams"
kill_timeout = 30

[build]
  image = "lnbits/lnbits:v1.6.2"

[env]
  LNBITS_EXTENSIONS_PATH = "/app/data/extensions"

[mounts]
  source = "lnbits_data"
  destination = "/app/data"

[http_service]
  internal_port = 5000
  force_https = true
  auto_stop_machines = "off"
  min_machines_running = 1
```

Then create the app, the volume (in the same region) and any secrets, and deploy:

```bash
fly apps create my-lnbits
fly volumes create lnbits_data --size 1 --region ams
fly secrets set FIRST_INSTALL_TOKEN=$(openssl rand -hex 16)
fly deploy
fly scale count 1
```

- `internal_port = 5000` is what matters: it must match the port LNbits listens on in the image.
- Keep one machine: a Fly volume belongs to one machine, and LNbits must not run twice on one database anyway.
- `fly logs` shows the logs; `fly ssh console` opens a shell in the machine.
- Set secrets before the first deploy, or re-deploy after setting them. Leave `AUTH_SECRET_KEY` unset: LNbits generates it on the volume.

Upstream's own Fly instructions build from a git checkout and use `/data` as the mount with `LNBITS_DATA_FOLDER="/data"`; that works too, as long as the volume path and `LNBITS_DATA_FOLDER` match.

## Other platforms {#other-platforms}

Railway, Render, DigitalOcean App Platform, Google Cloud Run, AWS ECS and similar services all work if they meet the [requirements](#requirements) above. Watch out for:

- **Port detection:** platforms that inject a `PORT` variable need either their container port set to 5000, or LNBITS_PORT set to their port.
- **Ephemeral storage:** if the platform has no persistent volumes on your plan (Cloud Run, App Platform, and some free tiers), use a managed PostgreSQL and understand what is lost on redeploy.
- **Autoscaling and multiple instances:** turn them off. Request-based platforms that scale to zero or to many instances (Cloud Run, for example) need a fixed single instance (`min = max = 1`).
- **Building from the repo:** platforms that build from a git repository use the repo's `Dockerfile`, which behaves like the published image.

We don't keep per-platform config files here because we can't test them. If you have a tested one, contribute it to the upstream docs at [docs.lnbits.com](https://docs.lnbits.com).

## See also

- [Docker deployment](/docs/deployment/docker)
- [Database configuration](/docs/configuration/database)
- [Security](/docs/configuration/security)
