---
sidebar_position: 4
title: Systemd Service
description: Run LNbits as a systemd service
---

# Systemd Service

Run LNbits as a system service for automatic startup and management.

## Create Service File

```ini title="/etc/systemd/system/lnbits.service"
[Unit]
Description=LNbits Lightning Wallet
After=network.target

[Service]
Type=simple
User=lnbits
Group=lnbits
WorkingDirectory=/home/lnbits/lnbits
Environment="PATH=/home/lnbits/.local/bin:/usr/local/bin:/usr/bin"
ExecStart=/home/lnbits/.local/bin/uv run lnbits
Restart=always
RestartSec=10

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/home/lnbits/lnbits/data

[Install]
WantedBy=multi-user.target
```

## Create User

```bash
sudo useradd -m -s /bin/bash lnbits
sudo su - lnbits

# Install LNbits
curl -LsSf https://astral.sh/uv/install.sh | sh
git clone https://github.com/lnbits/lnbits.git
cd lnbits
uv sync --all-extras
cp .env.example .env
nano .env  # Configure

exit  # Back to sudo user
```

## Enable Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable lnbits
sudo systemctl start lnbits
```

## Management Commands

```bash
# Start
sudo systemctl start lnbits

# Stop
sudo systemctl stop lnbits

# Restart
sudo systemctl restart lnbits

# Status
sudo systemctl status lnbits

# Logs
sudo journalctl -u lnbits -f
```

## With Poetry

```ini
ExecStart=/home/lnbits/.local/bin/poetry run lnbits
```

## With Virtual Environment

```ini
ExecStart=/home/lnbits/lnbits/venv/bin/python -m lnbits
```

## Environment File

Alternative to inline environment:

```ini title="/etc/systemd/system/lnbits.service"
[Service]
EnvironmentFile=/home/lnbits/lnbits/.env
ExecStart=/home/lnbits/.local/bin/uv run lnbits
```

## See Also

- [Manual Deployment](/docs/deployment/manual)
- [Docker Deployment](/docs/deployment/docker)
