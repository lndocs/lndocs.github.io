---
sidebar_position: 4
title: Systemd Service
description: Run LNbits as a systemd service
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Systemd Service

Run LNbits as a system service so it starts at boot and restarts on failure. This assumes the [manual install](/docs/deployment/manual) in `/home/lnbits/lnbits`, owned by a dedicated `lnbits` user.

## Create the user and install {#create-user}

```bash
sudo useradd -m -s /bin/bash lnbits
sudo -iu lnbits

curl -LsSf https://astral.sh/uv/install.sh | sh
git clone https://github.com/lnbits/lnbits.git
cd lnbits
git checkout v1.6.2
~/.local/bin/uv sync --all-extras
cp .env.example .env

exit
```

## Create the service file {#create-service-file}

```ini title="/etc/systemd/system/lnbits.service"
[Unit]
Description=LNbits
Wants=network-online.target
After=network-online.target
# If LNbits runs next to your node, start after it, e.g.:
#Wants=lnd.service
#After=lnd.service

[Service]
Type=simple
User=lnbits
Group=lnbits
WorkingDirectory=/home/lnbits/lnbits
ExecStart=/home/lnbits/lnbits/.venv/bin/lnbits --host 127.0.0.1 --port 5000
Environment=PYTHONUNBUFFERED=1
Restart=always
RestartSec=30
# The first start compiles and migrates, and can be slow
TimeoutSec=120

# Hardening that doesn't get in LNbits' way
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
```

- `.venv/bin/lnbits` is the entry point `uv sync` creates. `ExecStart=/home/lnbits/.local/bin/uv run lnbits --host 127.0.0.1 --port 5000` works too (it's what upstream's example uses), but it may re-sync the environment at start.
- `--host`, `--port` and `--forwarded-allow-ips` are the server flags; they override `HOST`, `PORT` and `FORWARDED_ALLOW_IPS` from `.env`. `python -m lnbits` doesn't start a server.
- LNbits reads `.env` from its working directory itself. Don't add `EnvironmentFile=`: systemd parses quotes and JSON lists differently from LNbits.
- **Don't use `ProtectSystem=strict`** unless you also list every path LNbits writes to. LNbits writes to `data/` (database, logs, uploads, `upgrades/`), to `lnbits/extensions/` in the checkout when you install extensions (or wherever `LNBITS_EXTENSIONS_PATH` points), and uv writes to `.venv` and `~/.cache/uv`. `ProtectSystem=full` only makes `/usr`, `/boot` and `/etc` read-only, which LNbits doesn't need. If you want `strict`, add for example `ReadWritePaths=/home/lnbits/lnbits/data /home/lnbits/lnbits/lnbits/extensions /home/lnbits/.cache/uv` and test an extension install.
- `Environment=PYTHONUNBUFFERED=1` makes log lines show up in the journal at once.

## Enable and start {#enable-service}

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now lnbits
sudo journalctl -u lnbits -f
```

## Management {#management-commands}

```bash
sudo systemctl status lnbits
sudo systemctl restart lnbits
sudo systemctl stop lnbits
sudo journalctl -u lnbits --since "1 hour ago"
```

LNbits also writes its own logs to `data/logs/`.

## Things that don't work under systemd {#caveats}

- **Encrypted LND macaroons** (`LND_REST_MACAROON_ENCRYPTED`, `LND_GRPC_MACAROON_ENCRYPTED`) prompt for the key on a terminal at every start, and there is none under systemd. Use a plain macaroon with tight file permissions; see [LND](/docs/funding-sources/lnd).
- **Funding changes in `.env`** are ignored once the Admin UI has saved settings. Use **Settings → Funding**, then restart the service (or use the Admin UI's restart button).

## Poetry (legacy) {#with-poetry}

For an old Poetry install: `ExecStart=/home/lnbits/.local/bin/poetry run lnbits --host 127.0.0.1 --port 5000`. New installs should use uv.

## See also

- [Manual deployment](/docs/deployment/manual)
- [Reverse proxy](/docs/deployment/reverse-proxy)
- [Docker deployment](/docs/deployment/docker)
