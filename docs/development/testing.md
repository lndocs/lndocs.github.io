---
sidebar_position: 3
title: Testing
description: Run and write tests for LNbits
---

# Testing

LNbits uses pytest for testing.

## Running Tests

```bash
# All tests
make test

# With coverage
make test-cov

# Specific test file
pytest tests/test_payments.py

# Specific test
pytest tests/test_payments.py::test_create_invoice
```

## Test Configuration

Tests use Fake Wallet automatically:

```python
# conftest.py sets up test environment
LNBITS_BACKEND_WALLET_CLASS=FakeWallet
```

## Writing Tests

```python
import pytest
from lnbits.core.crud import create_wallet, get_wallet

@pytest.mark.asyncio
async def test_create_wallet():
    wallet = await create_wallet(user_id="test_user", wallet_name="Test")
    assert wallet.name == "Test"
    assert wallet.balance_msat == 0

@pytest.mark.asyncio
async def test_payment_flow():
    # Create invoice
    invoice = await create_invoice(wallet_id, 1000, "Test")
    assert invoice.payment_request.startswith("lnbc")

    # Pay invoice
    payment = await pay_invoice(other_wallet_id, invoice.payment_request)
    assert payment.status == "success"
```

## Test Database

Tests use a separate database:

```python
# Automatically cleaned between tests
# Located at ./tests/data/test.sqlite3
```

## See Also

- [Development Setup](/docs/development/setup)
- [Contributing](/docs/development/contributing)
