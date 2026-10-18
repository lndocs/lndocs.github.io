---
sidebar_position: 3
title: Reverse Proxy
description: Put Caddy, Nginx or Apache with HTTPS in front of LNbits
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Reverse Proxy Setup

Run LNbits behind a reverse proxy that terminates HTTPS. LNbits needs HTTPS in production: login cookies are HTTPS-only by default (`AUTH_HTTPS_ONLY=true`), and LNURL links must be `https://`.

## First: lock LNbits down to the proxy {#bind-and-forwarded-ips}

LNbits learns the client IP and the original scheme (`https`) from the `X-Forwarded-For` and `X-Forwarded-Proto` headers. It trusts them from the addresses in `FORWARDED_ALLOW_IPS`, which **defaults to `*`, meaning anyone**. If clients can reach LNbits directly, they can fake their IP (rate limits, audit log) and the scheme LNbits uses to build links. So:

1. **Bind LNbits to localhost**, so only the proxy can reach it:
   - Manual or systemd install: `HOST=127.0.0.1` in `.env` (the default), or `--host 127.0.0.1`.
   - Docker: publish `127.0.0.1:5000:5000`, not `5000:5000`.
2. **Set `FORWARDED_ALLOW_IPS` to the proxy's IP**, for a manual or systemd install with the proxy on the same host:

```bash title=".env"
HOST=127.0.0.1
FORWARDED_ALLOW_IPS=127.0.0.1
```

`FORWARDED_ALLOW_IPS` is read from `.env` at every start (the Admin UI doesn't manage it), and the `--forwarded-allow-ips` flag overrides it. The Docker image hard-codes `--forwarded-allow-ips='*'`, so in Docker step 1 is what protects you. See [Docker](/docs/deployment/docker).

3. Point your domain's DNS record at the server, and open ports 80 and 443 (not 5000) in the firewall.

## Caddy (recommended) {#caddy-recommended}

Caddy gets and renews the Let's Encrypt certificate itself, sets `X-Forwarded-For` and `X-Forwarded-Proto`, and proxies websockets without extra configuration.

```bash
sudo apt install caddy
```

```text title="/etc/caddy/Caddyfile"
lnbits.example.com {
    reverse_proxy 127.0.0.1:5000
}
```

```bash
sudo systemctl reload caddy
```

## Nginx {#nginx}

Nginx needs the certificate before it can load an HTTPS server block that points at it, so issue the certificate first.

### 1. Install and get the certificate {#get-certificate}

```bash
sudo apt install nginx certbot python3-certbot-nginx
sudo certbot certonly --nginx -d lnbits.example.com
```

`certonly` only obtains the certificate (into `/etc/letsencrypt/live/lnbits.example.com/`) and leaves your configuration alone. Port 80 must reach this server. The certbot package sets up automatic renewal.

### 2. Configure the site {#configuration}

```nginx title="/etc/nginx/sites-available/lnbits"
server {
    listen 80;
    listen [::]:80;
    server_name lnbits.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name lnbits.example.com;

    ssl_certificate /etc/letsencrypt/live/lnbits.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lnbits.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket upgrade (live payment updates)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

`http2 on;` needs nginx 1.25.1 or later; on older nginx, drop that line and write `listen 443 ssl http2;` instead.

### 3. Enable and reload {#enable-site}

```bash
sudo ln -s /etc/nginx/sites-available/lnbits /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Apache {#apache}

Get the certificate first, as for nginx (`sudo apt install apache2 certbot python3-certbot-apache`, then `sudo certbot certonly --apache -d lnbits.example.com`). Then enable the modules and add the site:

```bash
sudo a2enmod ssl headers proxy proxy_http proxy_wstunnel
```

```apache title="/etc/apache2/sites-available/lnbits.conf"
<VirtualHost *:80>
    ServerName lnbits.example.com
    Redirect permanent / https://lnbits.example.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName lnbits.example.com

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/lnbits.example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/lnbits.example.com/privkey.pem

    # Tell LNbits the original scheme, or it builds http:// links
    RequestHeader set X-Forwarded-Proto "https"

    ProxyPreserveHost On
    # upgrade=websocket proxies websockets (Apache 2.4.47+, mod_proxy_wstunnel)
    ProxyPass / http://127.0.0.1:5000/ upgrade=websocket
    ProxyPassReverse / http://127.0.0.1:5000/
</VirtualHost>
```

```bash
sudo a2ensite lnbits
sudo apachectl configtest
sudo systemctl reload apache2
```

Apache adds `X-Forwarded-For` itself when proxying.

## Check it {#check}

- `https://lnbits.example.com/api/v1/health` answers with the server time.
- Open a wallet and pay an invoice into it: the balance should update without a page reload. If it doesn't, the websocket upgrade isn't getting through.
- An LNURL or Lightning address created in LNbits should start with `https://`. If it's `http://`, `X-Forwarded-Proto` isn't arriving or isn't trusted (check `FORWARDED_ALLOW_IPS`).

## Optional: security headers {#security-headers}

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

`X-Frame-Options "SAMEORIGIN"` stops other sites from embedding your LNbits pages. Leave it out if you embed LNbits pages (for example a payment page) on another domain on purpose.

## Optional: rate limiting at the proxy {#rate-limiting}

LNbits has its own rate limit (`LNBITS_RATE_LIMIT_NO` per `LNBITS_RATE_LIMIT_UNIT`, default 200 per minute, per client IP), which relies on the forwarded IP being trustworthy. You can add a limit at the proxy too:

```nginx
# In the http {} block
limit_req_zone $binary_remote_addr zone=lnbits:10m rate=10r/s;

# In the location / {} block above
limit_req zone=lnbits burst=20 nodelay;
```

## See also

- [Docker deployment](/docs/deployment/docker)
- [systemd service](/docs/deployment/systemd)
- [Security](/docs/configuration/security)
