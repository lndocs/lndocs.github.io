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

### Can I deposit on-chain BTC to LNbits?

Yes, through:
- **Boltz/Deezy extensions**: Submarine swaps (on-chain → Lightning)
- **External services**: FixedFloat, DiamondHands, ZigZag
- **Onchain Wallet extension**: Watch-only addresses

### Where can I see payment details?

Click the transaction arrows (green = received, red = sent) to view details including attached messages.

### How do I enable comments on LNURL-p payments?

In the LNURL-pay extension, set the comment field character length (1-250) to enable the comment box during payment.

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

## Connectivity

### What if my funding source is only available via Tor?

Only apps, PoS terminals, and wallets with Tor activated can communicate with your wallets. Consider setting up hybrid mode (Tor + clearnet) for broader compatibility.

### How do I fund my LNbits wallet from my own node?

Edit your `lnd.conf` to include:
```
allow-circular-route=1
allow-self-payment=1
```

Then restart LND and pay an invoice from your LNbits wallet.

### Can I prevent others from creating wallets on my instance?

Yes, two methods:
1. **Environment**: Set allowed users in `.env`
2. **Admin UI**: Use the UserManager extension

## Mobile Wallets

### How do I use LNbits with BlueWallet or Zeus?

1. Enable the **LNDhub** extension
2. Select your wallet
3. Scan the appropriate QR code:
   - **Admin QR**: Full access (send + receive)
   - **Invoice QR**: Receive only

Both Zeus and BlueWallet support LNDhub accounts.

### Are my funds safe if I lose my wallet URL?

On demo/public servers, LNbits cannot recover lost wallets. Always save:
- Wallet URL
- Export2phone QR
- LNDhub connection string

On your own instance, wallet data is in the database (`/data/` folder).

## Hardware

### What hardware projects can I build with LNbits?

- **Point of Sale**: TPoS terminals, beertaps
- **ATMs**: Fossa ATM, LightningATM
- **NFC**: BoltCards, PlebTags, NFC rings
- **Vending**: Candy dispensers, coffee machines
- **Displays**: Gerty, BTClock, Nerdminer
- **Switches**: LED controllers, pet feeders

See [Resources](/docs/resources) for tutorials and the [MakerBits Telegram](https://t.me/makerbits) for community support.

### How do I create NFC BoltCards?

1. Install the **BoltCard** extension
2. Get NXP NTAG 424 DNA cards
3. Use an NFC writer to program credentials
4. Cards work at any LNbits TPoS terminal

See [plebtag.com](https://plebtag.com/write) for detailed guides.

## Getting Help

### Where can I get support?

- **Telegram**: [t.me/lnbits](https://t.me/lnbits)
- **GitHub**: [github.com/lnbits/lnbits](https://github.com/lnbits/lnbits)
- **Demo**: [demo.lnbits.com](https://demo.lnbits.com)

### How can I contribute?

See our [Contributing](/docs/development/contributing) guide. We welcome code, documentation, translations, and community support.

## See Also

- [Resources](/docs/resources) - Tutorials, podcasts, and community guides
- [Use Cases](/docs/guides/use-cases) - Real-world applications
- [Troubleshooting](/docs/guides/troubleshooting) - Common issues and solutions
