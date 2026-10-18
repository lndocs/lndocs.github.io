---
sidebar_position: 8
title: "Unreleased: on the dev branch"
description: Work merged to LNbits' dev branch after v1.6.2. Not released; may change before release.
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# On the dev branch, not released

:::danger Not released
Everything on this page is merged into LNbits' **`dev`** branch only. **None of it is in v1.6.2**, the latest release as of 2026-10-18, and none of it is on `main`. **Any of it may change, or be dropped, before release.** No version number or date has been announced. Don't run `dev` in production, and don't plan around these details until they ship in a tagged release.
:::

The repository's default branch on GitHub is `dev`, so links to "the code" or upstream docs often show unreleased behaviour. The rest of this site describes **v1.6.2**. Status was checked against [compare v1.6.2...dev](https://github.com/lnbits/lnbits/compare/v1.6.2...dev) on 2026-10-18.

## TOTP two-factor authentication {#totp-2fa}

PR [#4203](https://github.com/lnbits/lnbits/pull/4203), with follow-up [#4212](https://github.com/lnbits/lnbits/pull/4212). *May change before release.*

- Admins turn it on under the Admin UI's access settings. It can be optional or mandatory, and TOTP is the only method.
- Users get 10 recovery codes.
- It applies to password, Nostr, SSO, user-ID and password-reset logins.
- TOTP secrets are encrypted with a new key (see below), separate from `AUTH_SECRET_KEY`. If unset, it is generated into `<data folder>/.lnbits_totp_key`. That file would then belong in your backups.
- The key setting:

{/* snippet:skip: dev-branch setting, not in v1.6.2 */}
```bash
TOTP_ENCRYPTION_KEY=   # leave empty to auto-generate
```

- New CLI commands: `lnbits-cli two-factor generate-key` and `lnbits-cli two-factor reset <user_id>`.

## Paying BOLT12 offers {#bolt12-offers}

PR [#4169](https://github.com/lnbits/lnbits/pull/4169). *May change before release.*

- Send-only: pay an `lno1…` offer through the existing `POST /api/v1/payments` (`"out": true`, with the offer in the `bolt11` field). LNbits cannot create offers.
- An amount is required and is capped by the maximum outgoing payment setting.
- A new wait setting, default 20 seconds:

{/* snippet:skip: dev-branch setting, not in v1.6.2 */}
```bash
LNBITS_FUNDING_SOURCE_PAY_OFFER_WAIT_SECONDS=20
```

## On-chain wallet type {#onchain-wallets}

PR [#4194](https://github.com/lnbits/lnbits/pull/4194). *May change before release.*

- A core on-chain wallet type, alongside Lightning wallets, with Trezor and serial hardware signers in the UI.
- A new master key setting, which also accepts the legacy watch-only name. Upstream's `.env.example` says to keep the same key permanently:

{/* snippet:skip: dev-branch setting, not in v1.6.2 */}
```bash
LNBITS_ONCHAIN_MASTER_KEY=   # or the legacy WATCHONLY_MASTER_KEY
```
- On-chain payments are off by default.
- The `balances` view is rebuilt to include on-chain funds.

## Job scheduler {#job-scheduler}

PR [#4226](https://github.com/lnbits/lnbits/pull/4226). *May change before release.*

- A persistent, timezone-aware cron-style scheduler for core, Python extensions and WASM extensions.
- Admin pages for jobs and run history.
- Enabled by default. Run history is kept for 7 days (30 for failures), up to 1000 runs per user or extension.

## Desktop builds {#desktop-builds}

PRs [#4163](https://github.com/lnbits/lnbits/pull/4163) (Windows `.exe`, editable host and port in the AppImage UI), [#4175](https://github.com/lnbits/lnbits/pull/4175) (signed and notarised macOS DMGs for arm64 and x86_64) and [#4167](https://github.com/lnbits/lnbits/pull/4167) (bundled phoenixd and Spark L2 sidecars). *May change before release.*

v1.6.2 has only the Linux AppImage.

## Cliche funding source removed {#cliche-removed}

PR [#4118](https://github.com/lnbits/lnbits/pull/4118). *May change before release.*

`ClicheWallet` and `CLICHE_ENDPOINT` are deleted. They still exist in v1.6.2, but Cliche has had no release since 2022. Don't start new installs on it, and plan to move off it before the next release.

## Boltz funding source excluded {#boltz-excluded}

PR [#4164](https://github.com/lnbits/lnbits/pull/4164). *May change before release.*

`BoltzWallet` is "temporarily excluded" from the default allowed funding sources, and its CI tests are skipped while their regtest backend is failing. The code is still there. If you use the Boltz funding source, check the release notes of the next version before upgrading. This is about the Boltz **funding source**, not the Boltz swap extension.

## Fixes for v1.6.2 bugs {#fixes}

These fix problems you may hit on v1.6.2 today. See [Upgrading](/docs/guides/upgrading) for workarounds.

- [#4235](https://github.com/lnbits/lnbits/pull/4235): `lnbits-cli extensions install|update|uninstall --url` works again.
- [#4113](https://github.com/lnbits/lnbits/pull/4113): the `webhook` field is honoured on outgoing payments.
- [#4148](https://github.com/lnbits/lnbits/pull/4148): internal payments notify the receiver only once.
- [#4193](https://github.com/lnbits/lnbits/pull/4193): the service fee is credited only after the payment succeeds.
- [#4248](https://github.com/lnbits/lnbits/pull/4248): login tokens are invalidated when a password changes or is reset.

## See Also

- [Upgrading](/docs/guides/upgrading)
- [LNbits releases](https://github.com/lnbits/lnbits/releases)
