---
sidebar_position: 5
title: Funding Sources
description: How LNbits connects to Lightning Network backends
---

# Funding Sources Architecture

Funding sources are the Lightning Network backends that power LNbits wallets.

## Abstraction Layer

LNbits uses an abstract `Wallet` class to interface with any backend:

```python
class Wallet(ABC):
    @abstractmethod
    async def status(self) -> StatusResponse:
        """Get node status and balance"""

    @abstractmethod
    async def create_invoice(
        self,
        amount: int,
        memo: str,
        expiry: int
    ) -> InvoiceResponse:
        """Generate a Lightning invoice"""

    @abstractmethod
    async def pay_invoice(
        self,
        bolt11: str,
        fee_limit_msat: int
    ) -> PaymentResponse:
        """Pay a Lightning invoice"""

    @abstractmethod
    async def get_invoice_status(
        self,
        checking_id: str
    ) -> PaymentStatus:
        """Check if invoice has been paid"""

    @abstractmethod
    async def get_payment_status(
        self,
        checking_id: str
    ) -> PaymentStatus:
        """Check outgoing payment status"""
```

## Response Types

```python
@dataclass
class StatusResponse:
    error_message: str | None
    balance_msat: int

@dataclass
class InvoiceResponse:
    ok: bool
    checking_id: str
    payment_request: str  # BOLT11
    error_message: str | None

@dataclass
class PaymentResponse:
    ok: bool
    checking_id: str
    fee_msat: int
    preimage: str
    error_message: str | None

@dataclass
class PaymentStatus:
    pending: bool
    paid: bool | None
    fee_msat: int | None
    preimage: str | None
```

## Backend Categories

### Self-Hosted Nodes

Full control, your own Lightning node:

| Backend | Description |
|---------|-------------|
| LND REST | Lightning Labs REST API |
| LND gRPC | Lightning Labs gRPC API |
| CLN REST | Core Lightning REST (runes) |
| CoreLightning | Direct RPC connection |
| Spark | Spark wallet interface |
| Eclair | ACINQ Eclair node |
| Phoenixd | ACINQ Phoenix daemon |

### Custodial Services

Third-party Lightning access:

| Backend | Description |
|---------|-------------|
| Alby | Browser extension wallet |
| OpenNode | Payment processor |
| Blink | El Salvador service |
| ZBD | Zebedee API |
| LNPay | Custodial service |
| Strike | OAuth2 integration |

### Special Purpose

| Backend | Description |
|---------|-------------|
| LNbits | Nested LNbits instance |
| FakeWallet | Testing/development |
| VoidWallet | Fallback (no actual Lightning) |
| Nostr Wallet Connect | NWC protocol |
| Breez SDK | Greenlight-powered |

## Configuration

### Environment Variables

```bash
# Set the backend class
LNBITS_BACKEND_WALLET_CLASS=LndRestWallet

# Backend-specific settings
LND_REST_ENDPOINT=https://127.0.0.1:8080
LND_REST_CERT=/path/to/tls.cert
LND_REST_MACAROON=/path/to/admin.macaroon
```

### Runtime Loading

```python
def get_wallet_class():
    class_name = settings.lnbits_backend_wallet_class
    return {
        "LndRestWallet": LndRestWallet,
        "CLNRestWallet": CLNRestWallet,
        "FakeWallet": FakeWallet,
        # ... other backends
    }[class_name]
```

## LND Implementation

```python
class LndRestWallet(Wallet):
    def __init__(self):
        self.endpoint = settings.lnd_rest_endpoint
        self.macaroon = load_macaroon()
        self.cert = load_cert()

    async def create_invoice(self, amount, memo, expiry):
        async with httpx.AsyncClient(verify=self.cert) as client:
            response = await client.post(
                f"{self.endpoint}/v1/invoices",
                headers={"Grpc-Metadata-macaroon": self.macaroon},
                json={
                    "value_msat": amount,
                    "memo": memo,
                    "expiry": expiry
                }
            )
            data = response.json()
            return InvoiceResponse(
                ok=True,
                checking_id=data["r_hash"],
                payment_request=data["payment_request"]
            )
```

## Core Lightning Implementation

```python
class CLNRestWallet(Wallet):
    def __init__(self):
        self.url = settings.clnrest_url
        self.rune = settings.clnrest_rune

    async def create_invoice(self, amount, memo, expiry):
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.url}/v1/invoice",
                headers={"Rune": self.rune},
                json={
                    "amount_msat": amount,
                    "label": unique_label(),
                    "description": memo
                }
            )
            # Process response...
```

## Fake Wallet

For testing without real Lightning:

```python
class FakeWallet(Wallet):
    """In-memory accounting, no real payments"""

    async def create_invoice(self, amount, memo, expiry):
        payment_hash = random_hash()
        # Store in memory
        self.invoices[payment_hash] = {
            "amount": amount,
            "paid": False
        }
        return InvoiceResponse(
            ok=True,
            checking_id=payment_hash,
            payment_request=fake_bolt11(amount, payment_hash)
        )

    async def pay_invoice(self, bolt11, fee_limit):
        # Parse bolt11
        invoice = decode_bolt11(bolt11)
        # Mark as paid if internal
        if invoice.hash in self.invoices:
            self.invoices[invoice.hash]["paid"] = True
        return PaymentResponse(
            ok=True,
            checking_id=invoice.hash,
            fee_msat=0,
            preimage=random_preimage()
        )
```

## Switching Backends

### Via Admin UI

1. Go to Admin Settings
2. Select Funding Source
3. Enter credentials
4. Test connection
5. Save changes
6. Restart (automatic)

### Via Environment

1. Update `.env` file
2. Restart LNbits

```bash
# Stop
docker stop lnbits

# Update .env
LNBITS_BACKEND_WALLET_CLASS=CLNRestWallet
CLNREST_URL=https://...
CLNREST_RUNE=...

# Start
docker start lnbits
```

## Health Monitoring

LNbits checks funding source health:

```python
@background_task(interval=60)
async def check_funding_source():
    try:
        status = await wallet.status()
        if status.error_message:
            logger.warning(f"Funding source issue: {status.error_message}")
    except Exception as e:
        logger.error(f"Funding source unreachable: {e}")
```

## Best Practices

### Security

1. **Use TLS** for all connections
2. **Encrypt macaroons/runes** in storage
3. **Least privilege** - use invoice-only macaroon if possible
4. **Rotate credentials** regularly

### Performance

1. **Connection pooling** for high traffic
2. **Timeout configuration** for slow nodes
3. **Retry logic** for transient failures

### Reliability

1. **Monitor balance** vs. wallet totals
2. **Health checks** with alerting
3. **Fallback** wallet for degraded mode

## See Also

- [LND Configuration](/docs/funding-sources/lnd)
- [Core Lightning Configuration](/docs/funding-sources/cln)
- [Custodial Services](/docs/funding-sources/custodial)
