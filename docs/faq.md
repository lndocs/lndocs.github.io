---
sidebar_position: 100
title: FAQ
description: Frequently asked questions about LNbits
---

# Frequently Asked Questions

## General

### What is LNbits?

LNbits is a free, open-source Lightning Network accounts system. It sits on top of a Lightning node or service and provides isolated wallet accounts, a REST API, and modular extensions.

### Is LNbits custodial?

That depends on how it's used:
- **Self-hosted with your node**: Non-custodial (you control the keys)
- **Using someone else's instance**: Custodial (they control the keys)

### How much does LNbits cost?

LNbits is free and open-source (MIT license). You only pay for hosting and Lightning fees.

### Which Lightning nodes are supported?

LND, Core Lightning, Phoenixd, Eclair, and 20+ other backends including custodial services like Alby and OpenNode.

## Wallets

### How do I create a wallet?

Click "Add a new wallet" on the LNbits homepage. Save the URL - it contains your unique user ID.

### Can I have multiple wallets?

Yes, unlimited wallets per user. Each has independent balances and API keys.

### How do I recover my wallet?

You need the wallet URL containing your user ID. If lost, contact your instance operator.

## Payments

### Why is my payment failing?

Common causes:
- Insufficient balance
- Funding source issues
- Network routing problems

Check your funding source status and logs.

### Are there fees?

- **Routing fees**: Set by the Lightning network
- **Service fees**: Optional, set by instance operator
- **LNbits**: No fees from LNbits itself

### How fast are payments?

Lightning payments are near-instant. Internal payments (same instance) are even faster.

## Extensions

### What extensions are available?

100+ extensions including TPoS, LNURL, Paywall, Jukebox, and more. Browse at extensions.lnbits.com.

### Can I create my own extension?

Yes! See the [Extension Development](/docs/extensions/development) guide.

## Security

### Is LNbits secure?

LNbits follows security best practices. However, security depends on:
- Your deployment configuration
- Funding source security
- Network security

Always use HTTPS and strong authentication.

### Should I use LNbits for large amounts?

For large amounts, consider:
- Running your own instance
- Using your own Lightning node
- Regular backups
- Monitoring for unusual activity

## Hosting

### Can I run LNbits locally?

Yes! Use Docker or install directly. See the [Installation](/docs/getting-started/installation) guide.

### What are the system requirements?

- 1 GB RAM minimum
- 1 CPU core
- 1 GB storage
- Python 3.10+ (if not using Docker)

### How do I update LNbits?

```bash
# Docker
docker pull lnbits/lnbits && docker compose up -d

# Manual
git pull && uv sync
```

## Getting Help

### Where can I get support?

- **Telegram**: [t.me/lnbits](https://t.me/lnbits)
- **GitHub**: [github.com/lnbits/lnbits](https://github.com/lnbits/lnbits)
- **Demo**: [demo.lnbits.com](https://demo.lnbits.com)

### How can I contribute?

See our [Contributing](/docs/development/contributing) guide. We welcome code, documentation, translations, and community support.
