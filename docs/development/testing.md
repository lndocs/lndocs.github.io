---
sidebar_position: 3
title: Testing
description: Run and write tests for LNbits core with pytest, anyio and FakeWallet
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Testing

LNbits uses pytest, with [anyio](https://anyio.readthedocs.io/) for async tests. Coverage is always on: `pyproject.toml` sets `addopts = "--durations=1 -s --cov=lnbits --cov-report=xml"`.

Install the dev dependencies first:

```bash
uv sync --all-extras --dev
npm install
```

## Running tests {#running-tests}

Use the Makefile targets. They set the environment the tests expect: `LNBITS_DATA_FOLDER=./tests/data`, `LNBITS_BACKEND_WALLET_CLASS=FakeWallet` and `DEBUG=true`.

```bash
make test-unit      # tests/unit
make test-api       # tests/api (HTTP routes through an in-process client)
make test-wallets   # tests/wallets (funding-source clients against mocked servers)
```

`make test` runs all of the above **plus** `make test-regtest`, which needs real Lightning nodes from the regtest Docker stack in `docker/regtest` (`./start-regtest`). `make test-regtest` also deletes `./tests/data` first. Most contributors run the targeted targets locally and leave regtest to CI.

CI (`.github/workflows/ci.yml`) runs `tests/unit`, `tests/api` and `tests/wallets` on Python 3.10 and 3.12, each against SQLite and against PostgreSQL 18, with `FakeWallet`. To try the PostgreSQL side locally, set `LNBITS_DATABASE_URL` as shown in [Development Setup](/docs/development/setup). The regtest job runs against LND, Core Lightning, Eclair, Boltz and LNbits backends.

To run one file or one test, set the same variables yourself:

```bash
LNBITS_DATA_FOLDER=./tests/data LNBITS_BACKEND_WALLET_CLASS=FakeWallet \
  uv run pytest tests/unit/test_pay_invoice.py::test_pay_twice
```

Running bare `pytest` without them uses your `.env`, which may point at a real funding source and your real data folder.

## Test layout {#test-layout}

| Path | Contents |
|---|---|
| `tests/conftest.py` | Shared fixtures: the app, `client` (httpx `AsyncClient`), users and wallets, key headers, `external_funding_source` (a `FakeWallet()`) |
| `tests/unit/` | Services, CRUD, models, settings, WASM extension runtime |
| `tests/api/` | One file per router, such as `test_payment_api.py` and `test_wallet_api.py` |
| `tests/wallets/` | Funding-source clients, driven by fixtures in `tests/wallets/fixtures/` |
| `tests/regtest/` | Real invoices and payments against regtest nodes |
| `tests/e2e/` | Playwright browser tests (`make test-e2e`) |

The test data lives in `./tests/data` (`database.sqlite3` and friends), separate from your normal `./data`.

## Writing tests {#writing-tests}

Mark async tests with `@pytest.mark.anyio`. The session-scoped `anyio_backend` fixture in `conftest.py` selects asyncio. The payment services are in `lnbits.core.services` and take **keyword arguments only**. `create_invoice` returns a `Payment`, whose BOLT11 string is `payment.bolt11`.

```python
import pytest

from lnbits.core.crud import create_wallet, get_wallet
from lnbits.core.models import Wallet
from lnbits.core.services import create_invoice, create_user_account, pay_invoice
from lnbits.core.services.payments import update_wallet_balance


@pytest.mark.anyio
async def test_internal_payment(to_wallet: Wallet):
    user = await create_user_account()
    payer = await create_wallet(user_id=user.id, wallet_name="payer")
    await update_wallet_balance(payer, 1000)  # sats

    invoice = await create_invoice(wallet_id=to_wallet.id, amount=100, memo="test")
    payment = await pay_invoice(wallet_id=payer.id, payment_request=invoice.bolt11)

    assert payment.success
    payer_after = await get_wallet(payer.id)
    assert payer_after and payer_after.balance == 900
```

Both wallets are on the same instance, so this is an internal payment and FakeWallet never has to route anything. FakeWallet's `pay_invoice` only succeeds for invoices it issued itself, which makes it safe for tests and useless for real payments.

Good models to copy are `tests/unit/test_pay_invoice.py` (services) and `tests/api/test_payment_api.py` (routes with the `adminkey_headers_from` and `inkey_headers_to` fixtures).

## See also {#see-also}

- [Development Setup](/docs/development/setup)
- [Contributing](/docs/development/contributing)
