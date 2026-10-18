---
sidebar_position: 2
title: Installing Extensions
description: Install, enable, update and remove LNbits extensions from the Admin UI or lnbits-cli
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Installing Extensions

Installing an extension is an admin task and applies to the whole server. Enabling one is something each user does for their own account. See [Extensions Overview](/docs/extensions/overview) for how the levels fit together.

:::warning Installing a Python extension gives it full control
A Python extension runs inside LNbits with access to the database, the settings and every wallet's funds. Install only from the official registry or from code you have reviewed. Add extension sources only if you trust whoever controls them. WASM extensions are sandboxed, but read the permissions they ask for, especially any that can move funds. See [WASM Extensions](/docs/extensions/wasm).
:::

## Enable an extension for your account {#from-the-web-ui}

1. Log in and open **Extensions** in the sidebar (`/extensions`).
2. Find an installed extension and click **Enable**.

This affects only your account. The extension can then work with any of your wallets. Some extensions are admin-only (`LNBITS_ADMIN_EXTENSIONS`), and an admin can require a payment before users can enable one.

## Install from a registry (Admin UI) {#installing-from-manifest}

As an admin (the super user or a user in `LNBITS_ADMIN_USERS`, with a password set):

1. Open **Extensions**. Admins see every extension from the configured registries, not just the installed ones.
2. Open the extension's **Install/uninstall extension** dialog and pick a release. Releases that don't fit your LNbits version can't be installed.
3. For a WASM extension, LNbits shows the permissions it asks for. Review them and approve the ones you grant.
4. After install the extension is active, and users can enable it.

Under the hood this is `POST /api/v1/extension` (admin only). LNbits downloads the archive, checks the registry's sha256 `hash` if there is one, extracts it, runs the database migrations and activates the extension.

### Extension sources {#adding-a-manifest-source}

The registries are set on the Admin UI's **Extensions** tab (`/admin`), in **Extension Sources** (Python) and the WASM source list. The v1.6.2 defaults are:

```text
https://raw.githubusercontent.com/lnbits/lnbits-extensions/main/extensions.json
https://raw.githubusercontent.com/lnbits/lnbits-extensions-wasm/refs/heads/main/extensions.json
```

You can also set them in `.env`. Each variable **replaces** its default list, so keep the official URL in it:

```bash
LNBITS_EXTENSIONS_MANIFESTS="https://raw.githubusercontent.com/lnbits/lnbits-extensions/main/extensions.json,https://example.com/my-manifest.json"
```

:::note Admin UI settings override .env
With the Admin UI on (the default, `LNBITS_ADMIN_UI=true`), the extension settings are stored in the database after first start and override `.env`. Change them on the Admin UI's **Extensions** tab, or turn the Admin UI off before editing `.env` and restarting.
:::

To install one extension from its own GitHub repo, add the raw URL of the repo's `manifest.json` as a source, for example `https://raw.githubusercontent.com/<user>/<repo>/main/manifest.json`. See [Extension Manifest](/docs/extensions/manifest).

## Defaults for new servers and new users {#setting-defaults}

These two settings are easy to confuse:

| Setting | Scope | What it does |
|---|---|---|
| `LNBITS_EXTENSIONS_DEFAULT_INSTALL` | Server | At startup, installs each listed extension that isn't installed yet (the newest compatible release). If you uninstall one, it comes back on the next restart until you remove it from the list. Environment only, not editable in the Admin UI |
| `LNBITS_USER_DEFAULT_EXTENSIONS` | New users | Enables the listed extensions for each **new** account at creation. Existing users are not changed. Editable in the Admin UI |

```bash
# install TPoS and Pay Links on the server
LNBITS_EXTENSIONS_DEFAULT_INSTALL="tpos,lnurlp"
# switch Pay Links on for every new account
LNBITS_USER_DEFAULT_EXTENSIONS="lnurlp"
```

## Command line (`lnbits-cli extensions`) {#extension-cli}

`lnbits-cli` comes with LNbits. Run it from your LNbits install with the same `.env` and data folder as the server.

```bash
lnbits-cli extensions list                    # installed extensions and versions
lnbits-cli extensions install tpos            # install the newest compatible release
lnbits-cli extensions update tpos             # update one (installs it if missing)
lnbits-cli extensions update --all-extensions # update every installed extension (-a)
lnbits-cli extensions uninstall tpos
```

Options for `install` and `update`:

| Option | Meaning |
|---|---|
| `-i`, `--repo-index` | Pick a registry by index when the extension is in more than one |
| `-s`, `--source-repo` | Pick a registry by its manifest URL (must be one already configured) |
| `-u`, `--url` | Act on a running server, e.g. `http://localhost:5000` (also on `uninstall`) |
| `-d`, `--admin-user` | Admin user ID to use with `--url` (also on `uninstall`). Defaults to the super user |

**Stop LNbits first.** Without `--url`, the CLI refuses to run while it can reach a server at `http://{HOST}:{PORT}`.

:::caution `--url` does not work in v1.6.2
With `--url`, the CLI calls the server's API with `?usr=<admin user id>`, and the install, update and uninstall routes need an admin. LNbits v1.6.2 never accepts that for an admin. With the default login methods it answers 401 ("Missing user ID or access token."), and if user-id-only login is turned on it answers 403 ("User id only access for admins is forbidden."). The `dev` branch replaces this with bearer-token authentication (#4235). Until that ships in a release, stop the server and run the CLI without `--url`, or use the Admin UI.
:::

The CLI sends no permission grants. A WASM extension installed **or updated** this way ends up with no permissions, even ones granted before, so grant them again on the Extensions page.

## Updating {#updating-extensions}

The Extensions page shows when a newer compatible release exists, and admins can update one or several extensions from there. On the command line, use `lnbits-cli extensions update <id>` or `update --all-extensions`. Updating replaces the extension's files and runs any new migrations. The data stays.

## Deactivate, uninstall, remove data {#uninstalling-extensions}

| Action | Who | Effect | API |
|---|---|---|---|
| Disable | Any user | Removes the extension from that user's account only | `PUT /api/v1/extension/{ext_id}/disable` |
| Deactivate | Admin | Keeps it installed but its paths return 404 for everyone | `PUT /api/v1/extension/{ext_id}/deactivate` |
| Uninstall | Admin | Deletes the extension's files and its installed-extension record, for all users. **Data is kept** | `DELETE /api/v1/extension/{ext_id}` |
| Remove Data | Admin | Permanently deletes the extension's database (`data/ext_<id>.sqlite3` on SQLite, schema `<id>` on PostgreSQL) and its migration version | `DELETE /api/v1/extension/{ext_id}/db` |

In the UI, the uninstall dialog has a **Cleanup database tables** checkbox, and installed extensions have a separate **Remove Data** button that asks you to type the extension id first.

:::warning Remove Data can't be undone
Back up the data folder first (see [Backup & Restore](/docs/guides/backup-restore)). Uninstall alone keeps the data, so reinstalling the extension brings it back.
:::

LNbits won't uninstall an extension that another installed extension lists in its `dependencies`. An extension listed in `LNBITS_EXTENSIONS_DEFAULT_INSTALL` is reinstalled at the next start.

## Where files go {#extension-storage}

| What | Location (defaults) |
|---|---|
| Python extension code | `{LNBITS_EXTENSIONS_PATH}/extensions/<id>/`, default `lnbits/extensions/<id>/` |
| WASM extension code | `LNBITS_WASM_EXTENSIONS_PATH/<id>/`, default `data/wasm_extensions/<id>/` |
| Downloaded archives | `data/zips/<id>.zip` |
| Temporary unpack folders | `data/upgrades/` and `data/unzip-temp/` (`upgrades` is cleared at startup) |
| Extension data | `data/ext_<id>.sqlite3` (SQLite) or schema `<id>` (PostgreSQL) |

At startup LNbits checks every installed Python extension. If its folder is missing (after a Docker container was recreated, for example), it extracts it again from `data/zips/`, or downloads it again if the zip is missing too. Keep the data folder on a persistent volume.

## Offline installation {#offline-installation}

LNbits registers any folder in `{LNBITS_EXTENSIONS_PATH}/extensions/` that has a `config.json` when it starts:

1. Download the release zip on a connected machine and copy it to the server.
2. Unzip it. A GitHub archive unpacks into a folder like `tpos-1.5.0/`. **Rename the folder to the extension id** (`tpos`), because the folder name is the id.
3. Move it to `{LNBITS_EXTENSIONS_PATH}/extensions/` (default `lnbits/extensions/`) and restart LNbits.

```bash
unzip tpos-1.5.0.zip
mv tpos-1.5.0 lnbits/extensions/tpos
```

For WASM extensions, put the folder in `data/wasm_extensions/<id>/` instead. Its `config.json` `id` must equal the folder name.

## Troubleshooting {#troubleshooting}

### Extension not listed {#extension-not-appearing}

- Check that the manifest URL is reachable and valid JSON: `curl -s <manifest-url> | jq .`
- LNbits doesn't follow redirects for manifest URLs, and refuses URLs with credentials in them.
- GitHub `repos` entries need the GitHub API. Set `LNBITS_EXT_GITHUB_TOKEN` if you hit its rate limit.
- The list is cached for up to an hour. Opening the Extensions page as an admin starts a refresh.
- Look for `Manifest <url> failed with` in the LNbits log.

### Install failed {#installation-failed}

The API returns the reason. Common ones in v1.6.2:

- `Incompatible extension version.` Your LNbits version is outside `min_lnbits_version` / `max_lnbits_version`. The max is exclusive.
- `File hash missmatch. Will not install.` The zip doesn't match the registry's `hash`.
- `Max amount of extensions have been installed` comes from `LNBITS_MAX_EXTENSIONS`.
- `requests unknown permissions` and `was granted broader policies` are WASM permission checks.
- `Python extension manifest cannot install WASM extension` means the registry and the archive are different kinds.

### Database migration failed {#database-migration-failed}

The LNbits log shows the failing migration. Each extension's migration version is in the `dbversions` table of the core database. On SQLite:

```bash
sqlite3 data/database.sqlite3 "SELECT * FROM dbversions WHERE db = 'tpos'"
```

Don't delete that row to force a re-run: LNbits would run **every** migration again on existing tables, and most migrations are not written to run twice. If you can lose the extension's data, **Remove Data** resets both the data and the version. Otherwise report the error to the extension's maintainers, with a backup of the data folder in hand.

## See Also

- [Extensions Overview](/docs/extensions/overview)
- [WASM Extensions](/docs/extensions/wasm)
- [Extension Development](/docs/extensions/development)
- [Troubleshooting](/docs/guides/troubleshooting)
