---
sidebar_position: 3
title: Reverse Proxy
description: Configure Nginx or Caddy for LNbits
---

# Reverse Proxy Setup

Use a reverse proxy for HTTPS and production deployment.

## Caddy (Recommended)

Caddy provides automatic HTTPS with Let's Encrypt.

### Installation

```bash
sudo apt install caddy
```

### Configuration

```bash title="/etc/caddy/Caddyfile"
lnbits.example.com {
    reverse_proxy localhost:5000
}
```

### Reload

```bash
sudo systemctl reload caddy
```

## Nginx

### Installation

```bash
sudo apt install nginx certbot python3-certbot-nginx
```

### Configuration

```nginx title="/etc/nginx/sites-available/lnbits"
server {
    listen 80;
    server_name lnbits.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name lnbits.example.com;

    ssl_certificate /etc/letsencrypt/live/lnbits.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lnbits.example.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/lnbits /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Get Certificate

```bash
sudo certbot --nginx -d lnbits.example.com
```

## Apache

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

    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:5000/
    ProxyPassReverse / http://127.0.0.1:5000/

    # WebSocket
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*) ws://127.0.0.1:5000/$1 [P,L]
</VirtualHost>
```

Enable:
```bash
sudo a2enmod ssl proxy proxy_http proxy_wstunnel rewrite
sudo a2ensite lnbits
sudo systemctl reload apache2
```

## Security Headers

Add to your reverse proxy:

```nginx
# Nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

## Rate Limiting

```nginx
# Nginx - Global rate limit
limit_req_zone $binary_remote_addr zone=lnbits:10m rate=10r/s;

server {
    location / {
        limit_req zone=lnbits burst=20 nodelay;
        proxy_pass http://127.0.0.1:5000;
    }
}
```

## See Also

- [Docker Deployment](/docs/deployment/docker)
- [Security](/docs/configuration/security)
