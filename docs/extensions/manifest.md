---
sidebar_position: 4
title: Extension Manifest
description: The per-extension config.json and the registry manifest.json in LNbits v1.6.2
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Extension Manifest

LNbits reads two different JSON files for extensions. Don't mix them up:

| File | Where it lives | What it describes | Parsed as (`lnbits/core/models/extensions.py`) |
|---|---|---|---|
| `config.json` | In the extension's root folder and inside its release zip | **One extension**: its name, description, tile, version range, and for WASM its full runtime contract | `ExtensionConfig` (WASM: `WasmExtensionConfig`) |
| `manifest.json` / `extensions.json` | At a URL listed in `LNBITS_EXTENSIONS_MANIFESTS` or `LNBITS_WASM_EXTENSIONS_MANIFESTS` | **A registry**: which extensions and releases can be installed | `Manifest` |

An extension's own repository usually holds both: a `config.json` with its metadata, and a small `manifest.json` that lists the repository itself, so the repo's raw `manifest.json` URL works as a one-extension registry.

## `config.json` (per extension) {#config-json}

The extension's folder name is its **id**. A Python extension's `config.json` has no `id` field. These are the keys LNbits v1.6.2 reads:

| Key | Required | Used for |
|---|---|---|
| `name` | yes | Display name. Validation of a GitHub release's config fails without it. A local folder without it falls back to the id |
| `short_description` | yes | One-line description in the extension list. Required by validation |
| `tile` | no | Icon path, e.g. `/tpos/static/image/tpos.png`. For GitHub releases LNbits turns it into `https://github.com/<org>/<repo>/raw/main/<path after the ext id>` |
| `version` | no | Version shown for an extension found on disk. Defaults to `"0.0"`. Releases take their version from the registry or the git tag instead |
| `min_lnbits_version` | no | Lowest LNbits version, **inclusive** |
| `max_lnbits_version` | no | First LNbits version it does **not** support (**exclusive**). `"1.6.2"` means "below 1.6.2" |
| `warning` | no | Text shown before install |
| `extension_type` | no | `"wasm"` for WASM extensions. Leave it out for Python |
| `permissions` | WASM only | `[{id, description, policies}]`. See [WASM permissions](/docs/extensions/wasm) |

LNbits doesn't validate these keys, but the extension details dialog shows them:

| Key | Shown as |
|---|---|
| `description_md` | URL of a Markdown file, fetched and rendered as the long description |
| `images` | `[{uri, link}]` screenshots |
| `contributors` | `[{name, uri, role}]` |
| `license` | License name |

Official extensions also carry keys such as `repo`, `donate`, `terms_and_conditions_md` and `tags`. LNbits v1.6.2 core doesn't read them.

There is **no `admin_only` key**. To limit an extension to admins, put its id in the server setting `LNBITS_ADMIN_EXTENSIONS`.

This is the `config.json` of the official [example extension](https://github.com/lnbits/example), shortened. The real file also has `donate`, `terms_and_conditions_md` and two more `images`:

```json title="config.json (lnbits/example, abridged)"
{
  "name": "Build your own!",
  "short_description": "Extension building guide",
  "tile": "/example/static/bitcoin-extension.png",
  "min_lnbits_version": "1.0.0",
  "contributors": [
    { "name": "Ben Arc", "uri": "mailto:ben@lnbits.com", "role": "Developer" },
    { "name": "DNI", "uri": "https://github.com/dni", "role": "Developer" }
  ],
  "images": [
    { "uri": "https://raw.githubusercontent.com/lnbits/example/main/static/1.png" }
  ],
  "description_md": "https://raw.githubusercontent.com/lnbits/example/main/description.md",
  "license": "MIT"
}
```

A WASM extension's `config.json` must also have `id`, `version`, `extension_type: "wasm"` and a `wasm` section, and it declares its routes, events and permissions. See [WASM Extensions](/docs/extensions/wasm).

## Registry manifest {#registry-manifest}

A registry file has four top-level keys, all optional:

```json
{
  "featured": ["tpos", "lnurlp"],
  "categories": { "merchant": ["tpos"] },
  "extensions": [],
  "repos": []
}
```

- `featured`: extension ids to mark as featured in the Extensions page.
- `categories`: category name to a list of extension ids.
- `extensions`: explicit releases (below).
- `repos`: GitHub repositories whose releases LNbits looks up itself (below).

### Explicit releases (`extensions[]`) {#explicit-releases}

Each entry is one installable release of one extension. The official registry lists every release this way.

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Extension id, which is also the install folder name |
| `name` | yes | Display name |
| `version` | yes | Release version |
| `archive` | yes | URL of the zip |
| `hash` | yes | sha256 of the zip. LNbits checks it after download and aborts with "File hash missmatch. Will not install." if it differs |
| `short_description`, `icon`, `repo`, `html_url` | no | Display fields. `icon` is an image URL |
| `min_lnbits_version`, `max_lnbits_version` | no | Same meaning as in `config.json` (max is exclusive) |
| `details_link` | no | URL of this release's `config.json`, used for the details dialog. LNbits reads WASM permissions from it before install |
| `dependencies` | no | Extension ids this one needs. LNbits won't uninstall an extension that an installed extension depends on |
| `warning`, `info_notification`, `critical_notification` | no | Notices |
| `pay_link`, `paid_features` | no | Paid releases (pay to install) |
| `extension_type` | no | `"wasm"` for WASM releases |

A real entry from the official registry:

```json
{
  "id": "tpos",
  "repo": "https://github.com/lnbits/tpos",
  "name": "TPoS",
  "version": "1.5.0",
  "min_lnbits_version": "1.5.0",
  "short_description": "A shareable PoS terminal!",
  "paid_features": "Free to use all the PoS features, apart from 0.5% charge for the ATM which draws to help maintain development.",
  "details_link": "https://raw.githubusercontent.com/lnbits/tpos/main/config.json",
  "icon": "https://raw.githubusercontent.com/lnbits/tpos/main/static/image/tpos.png",
  "archive": "https://github.com/lnbits/tpos/archive/refs/tags/v1.5.0.zip",
  "hash": "ccd7df6edc37eeb0bfc0e19f0cca16bfbbae7ba535d455a4e1ab5d634daccd9c"
}
```

Compute the hash of your own archive with `sha256sum myext.zip`.

### GitHub repos (`repos[]`) {#repos}

```json title="manifest.json (lnbits/example)"
{
  "repos": [
    { "id": "example", "organisation": "lnbits", "repository": "example" }
  ]
}
```

For each repo LNbits calls the GitHub API for the repository, its releases and `config.json`, from the default branch and from each release tag. The release **tag** becomes the version and the tag's zipball is the archive. There is no `hash` for these releases, so nothing is verified after download. GitHub limits unauthenticated API calls, so set `LNBITS_EXT_GITHUB_TOKEN` if you list many repos. LNbits only sends that token to `api.github.com` and `raw.githubusercontent.com`.

## Archive layout {#archive-structure}

The zip must contain **one top-level folder**, with `config.json` directly inside it:

```text
tpos-1.5.0/            # any name: LNbits takes the first entry in the zip
├── config.json
├── __init__.py
├── views.py
└── ...
```

The folder name doesn't need to match the id. LNbits copies its contents to the folder named by the release's `id`. A GitHub tag archive (`/archive/refs/tags/<tag>.zip`) or zipball already has this layout.

## Publishing {#hosting-options}

- **Your own registry:** host a `manifest.json` anywhere over HTTPS and add its URL as an extension source on the Admin UI's **Extensions** tab. LNbits refuses manifest URLs that contain credentials and doesn't follow redirects when it fetches them.
- **The official registry:** open a pull request to [lnbits/lnbits-extensions](https://github.com/lnbits/lnbits-extensions) (Python) or [lnbits/lnbits-extensions-wasm](https://github.com/lnbits/lnbits-extensions-wasm) (WASM). See [docs.lnbits.com: Official Registry](https://docs.lnbits.com/dev/extensions/registry).

LNbits caches the combined list of installable extensions for up to an hour, and refreshes it in the background after ten minutes or when an admin opens the Extensions page.

## Validation {#validation}

Before publishing, check that the files parse and have the required keys:

```bash
# config.json: the keys ExtensionConfig requires
jq -e '.name and .short_description' config.json

# registry: every explicit release has the required fields
jq -e '[.extensions[]? | .id and .name and .version and .archive and .hash] | all' manifest.json

# the archive hash matches the registry entry
sha256sum myext.zip
```

## See Also

- [Installing Extensions](/docs/extensions/installing)
- [Extension Development](/docs/extensions/development)
- [WASM Extensions](/docs/extensions/wasm)
