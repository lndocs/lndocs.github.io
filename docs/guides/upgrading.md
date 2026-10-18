---
sidebar_position: 7
title: Upgrading
description: Per-release upgrade notes from LNbits v1.4 to v1.6.2, and what operators must act on
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Upgrading

These notes cover the releases from **v1.4.x to v1.6.2** (the latest release as of 2026-10-18). They list the behaviour changes that an operator has to act on. For the full changelogs, see the [GitHub releases](https://github.com/lnbits/lnbits/releases). Upstream's security policy supports only the current release, so stay current.

## Before any upgrade {#before-you-upgrade}

1. **Back up** the whole data folder and, on PostgreSQL, the database. See [Backup & Restore](/docs/guides/backup-restore).
2. **Pin the version** you upgrade to: `lnbits/lnbits:v1.6.2` for Docker, `git checkout v1.6.2` for a source install. Don't track `latest`, `main` or `dev`.
3. Read the notes below for **every** release you skip.
4. Start LNbits and watch the log. Database migrations run automatically at startup and only go forward. To roll back, restore your backup.

## Must-act summary {#summary}

| Since | Change | What to do |
|-------|--------|------------|
| v1.6.0 | **User-ID-only login is no longer enabled by default** | Check `AUTH_ALLOWED_METHODS` (see below) |
| v1.6.0 | Webhooks and callbacks to private IPs are blocked by default | Set `LNBITS_CALLBACK_ALLOW_PRIVATE_IPS=true` only if you need LAN webhooks |
| v1.6.0 | Expired unpaid invoices are marked **failed** | Update integrations that expect them to stay pending |
| v1.6.0 | WASM extensions, with a new and separate registry enabled by default | Decide whether to keep the WASM manifest |
| v1.6.0, v1.6.1 | PostgreSQL backups from the built-in endpoint fail | Upgrade to v1.6.2 |
| v1.5.0 | `FIRST_INSTALL_TOKEN` can protect `/first_install` | Set it if your instance is reachable before you finish setup |
| v1.5.4 | `AUTH_HTTPS_ONLY=true` added to `.env.example` | Serve LNbits over HTTPS, or login cookies won't stick |

## v1.6.2 (2026-09-18) {#v1-6-2}

A single hotfix for the PostgreSQL backup (`GET /admin/api/v1/backup`), which the v1.6.0 hardening had broken ([#4187](https://github.com/lnbits/lnbits/pull/4187)). If pg_dump fails, the endpoint now returns "PostgreSQL database backup failed." instead of an incomplete zip.

- **Docker and PostgreSQL 15+:** the image's `pg_dump` is version 14 and still cannot dump a newer server. Dump the database yourself until [#4206](https://github.com/lnbits/lnbits/pull/4206) ships. See [Backup & Restore](/docs/guides/backup-restore).

## v1.6.1 (2026-09-10) {#v1-6-1}

Settings UI refactor, a Phoenixd node page, and less polling for Blink. The balance watchdog now rejects funding-source errors ([#4142](https://github.com/lnbits/lnbits/pull/4142)). No operator action is needed beyond the v1.6.0 notes.

## v1.6.0 "Tal" (2026-09-02) {#v1-6-0}

### User-ID-only login is off by default {#user-id-only}

[#4132](https://github.com/lnbits/lnbits/pull/4132), titled "fix: forward ip", changed the default `AUTH_ALLOWED_METHODS` from `user-id-only, username-password` to **`username-password` only**. The release notes don't mention it.

- **New installs:** `?usr=<user id>` wallet links don't work. Users must register with a username and password.
- **Existing installs with the Admin UI on (the default):** the first start stored all settings in the database, so the old method list is still there after the upgrade. Reading the v1.6.2 code, an upgraded instance that was created with the old default keeps user-ID login enabled. Check the allowed login methods in the Admin UI (`/admin`) and remove `user-id-only` unless you really need it. A user ID in a URL is a password that leaks through browser history, logs and screenshots.
- **Existing installs with `LNBITS_ADMIN_UI=false`:** `.env` decides. Without an explicit `AUTH_ALLOWED_METHODS`, user-ID login stops working after the upgrade. Give users a username and password before you upgrade, or set the methods explicitly.

To re-enable it (not recommended):

```bash
AUTH_ALLOWED_METHODS="user-id-only, username-password"
```

### SSRF hardening {#ssrf-hardening}

The same PR added:

- `LNBITS_CALLBACK_ALLOW_PRIVATE_IPS` (default `false`). Webhooks and callbacks to LAN, loopback or other non-public addresses are refused. ESP32 and home-lab setups that post to a LAN address need this set to `true`. Turning it on lets LNbits users make your server call internal services.
- `LNBITS_LNURL_REDIRECT_URL_RULES` (default empty): LNURL redirects are disabled unless you allow them.
- `LNBITS_LNURL_ALLOW_PRIVATE_IPS` (default `false`): meant for development only.

The callback URL rules (`LNBITS_CALLBACK_URL_RULES`) only accept host names with a top-level domain, so bare-IP webhook URLs are refused.

### Expired invoices become failed {#expired-invoices}

Unpaid incoming invoices are now marked **failed**, with the label `expired`, when the periodic pending check (every 30 minutes by default) or a status request finds them expired ([#3867](https://github.com/lnbits/lnbits/pull/3867)). If your code waits for `pending` or filters on it, handle `failed` as well.

### WASM extensions {#wasm-extensions}

v1.6.0 adds sandboxed WASM extensions ([#4021](https://github.com/lnbits/lnbits/pull/4021)). Their registry, `lnbits/lnbits-extensions-wasm`, is in `LNBITS_WASM_EXTENSIONS_MANIFESTS` by default. It is a separate registry from the Python extensions one. WASM extensions run with only the permissions you grant at install time; Python extensions still run unsandboxed in the LNbits process. Remove the manifest in the Admin UI if you don't want your admins to install from it. New migrations add `wasm_invocations` and permission columns.

### Lightning Addresses in core {#lightning-addresses}

Every wallet can now have a core Lightning Address ([#4035](https://github.com/lnbits/lnbits/pull/4035)). With the default `LNBITS_LN_ADDRESS_MODE=extension_first`, existing LNURLp-extension addresses keep working and win over core addresses with the same name. Wallets get a random address automatically. See [Lightning Addresses](/docs/guides/lightning-addresses).

### Other v1.6.0 changes {#v1-6-0-other}

- Bark funding source (`BarkWallet`, [#4007](https://github.com/lnbits/lnbits/pull/4007)).
- Block explorer via Electrum ([#4020](https://github.com/lnbits/lnbits/pull/4020)).
- Extensions no longer need the `/upgrades/` URL rewrite ([#4022](https://github.com/lnbits/lnbits/pull/4022)). Docker containers no longer rebuild after a restart ([#4057](https://github.com/lnbits/lnbits/pull/4057)).
- A `SECURITY.md` policy ([#4126](https://github.com/lnbits/lnbits/pull/4126)).

### Known issues in v1.6.x {#known-issues}

These are fixed on the `dev` branch but not in any release yet. See [Unreleased](/docs/guides/unreleased).

- `lnbits-cli extensions install|update|uninstall --url` does not work, because it logs in with `?usr=`, which admins are refused ([#4235](https://github.com/lnbits/lnbits/pull/4235)). Install extensions from the Admin UI.
- The `webhook` field on outgoing payments is silently ignored ([#4113](https://github.com/lnbits/lnbits/pull/4113)).
- Internal payments can notify the receiver's webhook and websocket twice ([#4148](https://github.com/lnbits/lnbits/pull/4148)). Make webhook handlers idempotent.
- The service fee is credited before the payment succeeds ([#4193](https://github.com/lnbits/lnbits/pull/4193)).
- Paying an invoice that was created on LNbits' own LND node leaves the payment pending forever ([#4241](https://github.com/lnbits/lnbits/pull/4241)).
- The background pending check handles only the 10 newest pending payments per run, so expired invoices and old pending payments clear slowly ([#4197](https://github.com/lnbits/lnbits/pull/4197)). See [Troubleshooting](/docs/guides/troubleshooting).

## v1.5.5 and v1.5.6 (2026-07) {#v1-5-5}

- Revolut and Square fiat providers, extension profiles, an `llms.txt` endpoint, and OIDC SSO fixes (v1.5.5).
- Payments gain `external_id` (v1.5.5) and `extension` (v1.5.6) fields.
- v1.5.6: "keep funding source on default reset, force seed backup" ([#4040](https://github.com/lnbits/lnbits/pull/4040)).

No breaking changes for operators were found.

## v1.5.1 to v1.5.4 "Hanzy" (2026-03 to 2026-04) {#v1-5-1}

- **v1.5.1:** a separate Docker image, `lnbits/lnbits-sparkl2`, bundles the Spark L2 sidecar.
- **v1.5.2:** a `latest-rc` Docker tag points at release candidates. Don't use it for production. `.env.example` gains `LNBITS_FUNDING_SOURCE_PAY_INVOICE_WAIT_SECONDS=5`: payments still in flight after that many seconds are returned as pending.
- **v1.5.3:** changing `FIRST_INSTALL_TOKEN` resets the admin settings and re-opens first install at the next start ([#3894](https://github.com/lnbits/lnbits/pull/3894)). Don't change the token on a running instance unless you mean to reset it.
- **v1.5.4:** `LNBITS_MAX_USERS` and `LNBITS_MAX_EXTENSIONS` (0 = unlimited) cap hosted instances. `AUTH_HTTPS_ONLY=true` is written into `.env.example`; `true` is also the code default. Login cookies are then sent only over HTTPS. An OIDC block (`OIDC_DISCOVERY_URL` and friends) is added.

## v1.5.0 (2026-03-04) {#v1-5-0}

The release has no written notes. From the commit list:

- `FIRST_INSTALL_TOKEN` protects `/first_install` ([#3751](https://github.com/lnbits/lnbits/pull/3751)). Set it when the instance is reachable by others before you complete setup, for example on a hosting platform.
- User activation and invitation codes (`LNBITS_REQUIRE_USER_ACTIVATION` and related settings), and admin impersonation of users.
- Spark L2 funding source (`SparkL2Wallet`).
- The Docker images were restructured ([#3794](https://github.com/lnbits/lnbits/pull/3794)). Check your compose file against the current [Docker guide](/docs/deployment/docker) after upgrading.

## From v1.4.x {#v1-4}

Upgrading from v1.4.x to v1.6.2 runs migrations m043 to m050 at the first start. Apply everything above. In particular, check the login methods (v1.6.0) before your users find out the hard way. v1.4.0 had already fixed a bug where blocked webhook URLs were never marked as sent or failed ([#3503](https://github.com/lnbits/lnbits/pull/3503)).

## See Also

- [Migration](/docs/guides/migration)
- [Backup & Restore](/docs/guides/backup-restore)
- [Unreleased](/docs/guides/unreleased)
