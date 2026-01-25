---
sidebar_position: 4
title: Code Style
description: LNbits coding standards and style guide
---

# Code Style

LNbits follows consistent coding standards.

## Formatting

Black is used for code formatting:

```bash
make format
```

Configuration in `pyproject.toml`:
```toml
[tool.black]
line-length = 88
```

## Linting

Ruff for linting:

```bash
make lint
```

## Type Hints

Type hints are required for all public functions:

```python
async def create_invoice(
    wallet_id: str,
    amount: int,
    memo: str
) -> InvoiceResponse:
    ...
```

## Docstrings

Use docstrings for public functions:

```python
async def create_invoice(
    wallet_id: str,
    amount: int,
    memo: str
) -> InvoiceResponse:
    """Create a Lightning invoice.

    Args:
        wallet_id: The wallet to create invoice for
        amount: Amount in satoshis
        memo: Invoice description

    Returns:
        InvoiceResponse with payment_request and payment_hash
    """
```

## Async/Await

Use async/await for all database and network operations:

```python
# Good
async def get_data():
    return await db.fetchone(query)

# Bad
def get_data():
    return db.fetchone(query)  # Blocking!
```

## Import Order

1. Standard library
2. Third-party packages
3. Local imports

```python
import asyncio
from typing import Optional

import httpx
from fastapi import APIRouter

from lnbits.core.models import Wallet
from .crud import get_items
```

## See Also

- [Contributing](/docs/development/contributing)
- [Development Setup](/docs/development/setup)
