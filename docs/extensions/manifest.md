---
sidebar_position: 4
title: Extension Manifest
description: Extension manifest.json specification
---

# Extension Manifest

The manifest.json file defines extension metadata and distribution.

## Manifest Schema

```json
{
  "name": "Extension Name",
  "id": "extension_id",
  "version": "1.0.0",
  "description": "Short description of what the extension does",
  "icon": "shopping_cart",
  "author": "Author Name",
  "repo": "https://github.com/author/extension",
  "min_lnbits_version": "1.0.0",
  "max_lnbits_version": "2.0.0",
  "admin_only": false,
  "archive": "https://github.com/author/extension/releases/download/v1.0.0/extension.zip"
}
```

## Required Fields

### name
Display name shown in the UI.

```json
"name": "Point of Sale"
```

### id
Unique identifier. Must be lowercase, alphanumeric, with underscores allowed.

```json
"id": "tpos"
```

### version
Semantic version (MAJOR.MINOR.PATCH).

```json
"version": "1.2.3"
```

### description
Brief description of the extension.

```json
"description": "Accept Bitcoin payments at your store"
```

## Optional Fields

### icon
Quasar/Material icon name.

```json
"icon": "point_of_sale"
```

Browse icons at: https://fonts.google.com/icons

### author
Extension creator.

```json
"author": "LNbits Team"
```

### repo
GitHub repository URL.

```json
"repo": "https://github.com/lnbits/tpos"
```

### min_lnbits_version
Minimum compatible LNbits version.

```json
"min_lnbits_version": "1.0.0"
```

### max_lnbits_version
Maximum compatible LNbits version.

```json
"max_lnbits_version": "2.0.0"
```

### admin_only
Restrict to admin users.

```json
"admin_only": true
```

### archive
ZIP archive URL for installation.

```json
"archive": "https://github.com/.../releases/download/v1.0.0/extension.zip"
```

## Extension Registry Manifest

For publishing multiple extensions:

```json title="extensions.json"
{
  "extensions": [
    {
      "id": "ext1",
      "name": "Extension One",
      "version": "1.0.0",
      "description": "First extension",
      "archive": "https://..."
    },
    {
      "id": "ext2",
      "name": "Extension Two",
      "version": "2.1.0",
      "description": "Second extension",
      "archive": "https://..."
    }
  ]
}
```

## Version Updates

When releasing updates:

1. Update `version` in manifest.json
2. Create new GitHub release
3. Update `archive` URL with new version
4. LNbits will detect the update

### Versioning Guidelines

```
1.0.0 → 1.0.1  # Bug fixes
1.0.1 → 1.1.0  # New features (backward compatible)
1.1.0 → 2.0.0  # Breaking changes
```

## Archive Structure

The ZIP file should contain:

```
extension.zip
└── extension_id/
    ├── manifest.json
    ├── __init__.py
    ├── views.py
    ├── views_api.py
    ├── ...
    └── templates/
```

Important: The folder name inside ZIP must match `id`.

## Hosting Options

### GitHub Releases

```json
"archive": "https://github.com/user/repo/releases/download/v1.0.0/myext.zip"
```

### Raw GitHub

```json
"archive": "https://raw.githubusercontent.com/user/repo/main/release/myext.zip"
```

### Self-Hosted

```json
"archive": "https://your-server.com/extensions/myext-1.0.0.zip"
```

## Validation

Validate your manifest:

```bash
# Check JSON syntax
cat manifest.json | jq .

# Verify required fields
cat manifest.json | jq 'has("name") and has("id") and has("version")'
```

## Example Manifests

### Minimal

```json
{
  "name": "Simple Extension",
  "id": "simple",
  "version": "0.1.0",
  "description": "A simple example extension"
}
```

### Complete

```json
{
  "name": "Advanced Extension",
  "id": "advanced",
  "version": "2.0.0",
  "description": "Feature-rich extension with all options",
  "icon": "auto_awesome",
  "author": "Developer Name",
  "repo": "https://github.com/developer/advanced-ext",
  "min_lnbits_version": "1.0.0",
  "max_lnbits_version": "3.0.0",
  "admin_only": false,
  "archive": "https://github.com/developer/advanced-ext/releases/download/v2.0.0/advanced.zip"
}
```

## See Also

- [Extension Development](/docs/extensions/development)
- [Installing Extensions](/docs/extensions/installing)
