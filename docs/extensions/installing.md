---
sidebar_position: 2
title: Installing Extensions
description: How to install and manage LNbits extensions
---

# Installing Extensions

Learn how to install, update, and manage extensions in LNbits.

## Enabling Built-in Extensions

LNbits comes with several extensions available by default.

### From the Web UI

1. Log in to LNbits
2. Click **Extensions** in the sidebar
3. Browse the list of available extensions
4. Click **Enable** on desired extensions

### Setting Defaults

As an admin, set which extensions are enabled by default:

```bash
LNBITS_EXTENSIONS_DEFAULT_INSTALL=tpos,lnurlp,boltz
```

## Installing from Manifest

Extensions can be installed from external sources.

### Adding a Manifest Source

**Via Admin UI:**
1. Go to Admin > Extensions
2. Click "Add Extension Source"
3. Enter the manifest URL
4. Click Save

**Via Environment:**
```bash
LNBITS_EXTENSIONS_MANIFESTS="https://example.com/manifest.json,https://other.com/extensions.json"
```

### Official Extension Registry

The official registry URL:
```
https://raw.githubusercontent.com/lnbits/lnbits-extensions/main/extensions.json
```

## Installing Specific Extensions

### From GitHub Releases

Many extensions are distributed via GitHub:

1. Find the extension repository
2. Get the manifest URL or release URL
3. Add to your manifest sources
4. Install via Admin UI

### Example: Custom Extension

```bash
# Add the manifest to your config
LNBITS_EXTENSIONS_MANIFESTS="https://raw.githubusercontent.com/user/myext/main/manifest.json"

# Restart LNbits
docker restart lnbits
```

## Extension CLI

LNbits provides CLI commands for extension management:

```bash
# List installed extensions
lnbits-cli extensions list

# Install extension
lnbits-cli extensions install tpos

# Uninstall extension
lnbits-cli extensions uninstall tpos

# Update all extensions
lnbits-cli extensions update-all
```

## Updating Extensions

### Auto-Update Check

LNbits checks for updates periodically. Updates appear in Admin UI.

### Manual Update

1. Go to Admin > Extensions
2. Click "Check for Updates"
3. Update individual extensions or all at once

### Via CLI

```bash
lnbits-cli extensions update myextension
```

## Uninstalling Extensions

### Disable vs Uninstall

- **Disable**: Extension hidden, data retained
- **Uninstall**: Extension removed, data deleted

### From Admin UI

1. Go to Admin > Extensions
2. Find the extension
3. Click "Uninstall"
4. Confirm deletion

:::warning Data Loss
Uninstalling an extension permanently deletes its data. Disable first if you might re-enable later.
:::

## Extension Storage

Extensions are stored in:

```bash
# Default location
$LNBITS_EXTENSIONS_PATH/extensions/

# Example structure
extensions/
├── tpos/
├── lnurlp/
└── boltz/
```

### Upgrades Location

Updates are downloaded to:
```bash
$LNBITS_EXTENSIONS_PATH/upgrades/
```

## Troubleshooting

### Extension Not Appearing

1. Check manifest is accessible:
   ```bash
   curl https://your-manifest-url
   ```

2. Verify JSON is valid:
   ```bash
   curl https://your-manifest-url | jq .
   ```

3. Check LNbits logs:
   ```bash
   docker logs lnbits | grep -i extension
   ```

### Installation Failed

Common causes:
- Network issues downloading archive
- Invalid archive format
- Missing manifest fields
- Version incompatibility

Check logs for specific error:
```bash
docker logs lnbits | grep -i error
```

### Database Migration Failed

If extension tables fail to create:

```bash
# Check migration status
psql lnbits -c "SELECT * FROM dbversions WHERE db = 'extension_name'"

# Force re-run migrations (delete version entry)
psql lnbits -c "DELETE FROM dbversions WHERE db = 'extension_name'"

# Restart LNbits
docker restart lnbits
```

### Extension Won't Enable

Check for:
- Missing dependencies in pyproject.toml
- Incompatible LNbits version
- Admin-only restriction

## Version Compatibility

Extensions specify compatible LNbits versions:

```json title="manifest.json"
{
  "min_lnbits_version": "0.12.0",
  "max_lnbits_version": "2.0.0"
}
```

If your LNbits version is outside the range, the extension won't install.

## Offline Installation

For air-gapped environments:

1. Download extension ZIP on connected machine
2. Transfer to LNbits server
3. Extract to extensions directory:
   ```bash
   unzip myext.zip -d $LNBITS_EXTENSIONS_PATH/extensions/
   ```
4. Restart LNbits

## See Also

- [Extensions Overview](/docs/extensions/overview)
- [Extension Development](/docs/extensions/development)
- [Troubleshooting](/docs/guides/troubleshooting)
