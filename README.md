# lndocs

Independent documentation for [LNbits](https://github.com/lnbits/lnbits), published at https://lndocs.github.io. The official docs live at https://docs.lnbits.com.

Every page is checked against a pinned LNbits release, set in `scripts/lnbits-version.txt` (currently v1.6.2).

## Develop

```bash
npm ci
npm start        # dev server
npm run build    # fails on broken links or anchors
```

## Snippet gate

`scripts/check-snippets.mjs` checks the docs against the pinned release's source code, which it parses as text and never runs. It checks:

- env vars against `lnbits/settings.py`;
- `/api/v1/...` paths and methods against the core routes;
- funding source classes and login method names;
- copy-paste install targets against `scripts/install-allowlist.json`, where each entry records a verified owner.

```bash
git clone --depth 1 -b v1.6.2 https://github.com/lnbits/lnbits.git /tmp/lnbits
LNBITS_SRC=/tmp/lnbits node scripts/check-snippets.mjs
```

CI runs the gate on every PR (`.github/workflows/snippets.yml`). It becomes blocking once the repository variable `SNIPPETS_STRICT=1` is set. To exempt an intentional "wrong" example, put `{/* snippet:skip: reason */}` on the line before its fence.

## Page front matter

Re-verified pages carry:

```yaml
last_update:
  date: 2026-10-18
verified_with: v1.6.2
```

## Generated reference pages

`docs/configuration/env-reference.md` and `docs/api/endpoint-reference.md` are generated; don't edit them by hand. The API claims workflow dumps every setting (`scripts/reference/dump_settings.py`, run inside the image) and `/openapi.json` from the pinned image. It then runs `node scripts/gen-reference.mjs` and fails if the committed pages differ. To regenerate, download the `lnbits-reference` artifact from that run into `scripts/reference/` and run the script.

## Bumping LNbits

1. Change `scripts/lnbits-version.txt`.
2. Run the gate.
3. Regenerate the reference pages from the new image (see above).
4. Fix the pages the gate and the claims flag, re-verify them, update `verified_with`, and merge.
