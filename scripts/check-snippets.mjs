#!/usr/bin/env node
// Checks docs snippets against the pinned LNbits release (scripts/lnbits-version.txt):
//   env      KEY=value assignments and `LNBITS_*`-style names must be settings fields
//   api      /api/v1/... paths (and methods, when given) must be real core routes
//   install  pip/npm/npx/docker/git clone/curl|sh targets must be in install-allowlist.json
// Upstream source is parsed as text, never executed. Point LNBITS_SRC at a checkout of the
// pinned tag (CI downloads the tag tarball). Opt out per fence with `{/* snippet:skip: reason */}`
// or `<!-- snippet:skip: reason -->` on the line before it.
// Usage: node scripts/check-snippets.mjs [--json] [--strict]
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = process.env.LNBITS_SRC;
if (!src || !fs.existsSync(path.join(src, 'lnbits/settings.py'))) {
  console.error('Set LNBITS_SRC to a checkout of LNbits ' + fs.readFileSync(path.join(root, 'scripts/lnbits-version.txt'), 'utf8').trim());
  process.exit(2);
}
const version = fs.readFileSync(path.join(root, 'scripts/lnbits-version.txt'), 'utf8').trim();
const args = new Set(process.argv.slice(2));
const strict = args.has('--strict') || process.env.SNIPPETS_STRICT === '1';

// ---- ground truth -------------------------------------------------------
const settingsPy = fs.readFileSync(path.join(src, 'lnbits/settings.py'), 'utf8');
const envKeys = new Set();
for (const m of settingsPy.matchAll(/^ {4}([a-z_][a-z0-9_]*)\s*:/gm)) envKeys.add(m[1].toUpperCase());
for (const m of settingsPy.matchAll(/env="([A-Z0-9_]+)"/g)) envKeys.add(m[1]);
// Variables read by other things (docker images, shells, examples), not LNbits settings.
const envAllow = new Set(JSON.parse(fs.readFileSync(path.join(root, 'scripts/env-allowlist.json'), 'utf8')).allowed);

const routes = []; // {method, re, path}
const viewsDir = path.join(src, 'lnbits/core/views');
for (const f of fs.readdirSync(viewsDir).filter((f) => f.endsWith('.py'))) {
  const py = fs.readFileSync(path.join(viewsDir, f), 'utf8');
  const prefixes = {};
  for (const m of py.matchAll(/^(\w+)\s*=\s*APIRouter\(([\s\S]*?)\)\s*$/gm)) {
    const p = m[2].match(/prefix\s*=\s*"([^"]*)"/);
    prefixes[m[1]] = p ? p[1] : '';
  }
  for (const m of py.matchAll(/@(\w+)\.(get|post|put|patch|delete|websocket|api_route)\(\s*"([^"]*)"/g)) {
    if (!(m[1] in prefixes)) continue;
    const full = (prefixes[m[1]] + m[3]).replace(/\/$/, '') || '/';
    const re = new RegExp('^' + full.replace(/\{[^}]+\}/g, '[^/]+') + '$');
    routes.push({ method: m[2] === 'websocket' ? 'WS' : m[2].toUpperCase(), re, path: full });
  }
}

const allow = JSON.parse(fs.readFileSync(path.join(root, 'scripts/install-allowlist.json'), 'utf8'));

// ---- scan ---------------------------------------------------------------
function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.mdx?$/.test(e.name)) yield p;
  }
}

function normPath(p) {
  return p
    .replace(/[?#].*$/, '')
    .replace(/[.,:;]+$/, '')
    .replace(/\/$/, '')
    .split('/')
    .map((s) => (/^(\{.*\}|<.*>|:\w+|\$\{?\w+\}?|[A-Z][A-Z0-9_]+|\.\.\.)$/.test(s) ? 'X' : s))
    .join('/');
}
function routeOk(method, p) {
  const cands = routes.filter((r) => r.re.test(p));
  if (!cands.length) return 'no such route';
  if (method && !cands.some((r) => r.method === method || r.method === 'API_ROUTE')) return `exists, but not as ${method} (${[...new Set(cands.map((r) => r.method))].join('/')})`;
  return null;
}

const findings = [];
const add = (file, line, kind, what, why) => findings.push({ file: path.relative(root, file), line, kind, what, why });

for (const file of walk(path.join(root, 'docs'))) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let inFence = false, skip = false, lang = '';
  lines.forEach((text, i) => {
    const n = i + 1;
    const fence = text.match(/^\s*(```|~~~)(\S*)/);
    if (fence) {
      if (!inFence) { inFence = true; lang = fence[2]; skip = /snippet:skip/.test(lines[i - 1] || ''); }
      else inFence = false;
      return;
    }
    if (skip && inFence) return;
    if (inFence && lang === 'mermaid') return;

    // env: assignments in code, plus backticked names anywhere
    const envHits = new Set();
    if (inFence) for (const m of text.matchAll(/(?:^|[\s"'-])(?:export\s+|-e\s+)?([A-Z][A-Z0-9_]{2,})=/g)) envHits.add(m[1]);
    for (const m of text.matchAll(/`([A-Z][A-Z0-9]*_[A-Z0-9_]+)(?:=[^`]*)?`/g)) envHits.add(m[1]);
    for (const k of envHits) if (!envKeys.has(k) && !envAllow.has(k)) add(file, n, 'env', k, 'not a settings field in LNbits ' + version);

    // api
    const method = (text.match(/\b(GET|POST|PUT|PATCH|DELETE)\b/) || [])[1]
      || ((text.match(/-X\s*(GET|POST|PUT|PATCH|DELETE)/) || [])[1]);
    // Python fences in the docs define extension routes, which are relative to the extension's prefix.
    if (!(inFence && /^py/.test(lang))) for (const m of text.matchAll(/(?:https?:\/\/[^/\s"'`]+|wss?:\/\/[^/\s"'`]+|^|[\s"'`(=])(\/api\/v\d+\/[^\s"'`)\]]*)/g)) {
      const p = normPath(m[1]);
      if (/^\/api\/v\d+$/.test(p) || p.includes('X/X')) continue; // base URL, or an elided generic path
      const why = routeOk(method, p);
      if (why) add(file, n, 'api', `${method ? method + ' ' : ''}${m[1]}`, why);
    }

    // install targets (code only)
    if (!inFence) return;
    const targets = [];
    for (const m of text.matchAll(/\b(?:pip3?|uv pip) install\s+((?:-\S+\s+)*)([A-Za-z0-9][\w.\-\[\]]*)/g)) targets.push('pip:' + m[2].replace(/\[.*$/, ''));
    for (const m of text.matchAll(/\b(?:npm (?:i|install|add)|yarn add|pnpm add)\s+((?:-\S+\s+)*)(@?[\w.\-/]+)/g)) targets.push('npm:' + m[2].replace(/(.)@.*$/, '$1'));
    for (const m of text.matchAll(/\bnpx\s+(?:-\S+\s+)*(@?[\w.\-/]+)/g)) targets.push('npm:' + m[1].replace(/(.)@.*$/, '$1'));
    for (const m of text.matchAll(/\bgit clone\s+(?:-\S+\s+)*(\S+)/g)) if (!/YOUR_|<|\$/.test(m[1])) targets.push('git:' + m[1]);
    for (const m of text.matchAll(/\bcurl\b[^|]*?(https?:\/\/\S+)\s*\|\s*(?:ba|z)?sh/g)) targets.push('curl:' + m[1]);
    for (const m of text.matchAll(/\bdocker pull\s+(\S+)/g)) targets.push('docker:' + m[1].replace(/:.*$/, ''));
    for (const t of targets) {
      if (t in allow.denied) add(file, n, 'install', t, 'DENIED: ' + allow.denied[t]);
      else if (!(t in allow.allowed)) add(file, n, 'install', t, 'not in scripts/install-allowlist.json');
    }
  });
}

// ---- report ---------------------------------------------------------------
const byKind = findings.reduce((a, f) => ((a[f.kind] = (a[f.kind] || 0) + 1), a), {});
if (args.has('--json')) {
  console.log(JSON.stringify({ version, routes: routes.length, envKeys: envKeys.size, counts: byKind, findings }, null, 2));
} else {
  let last = '';
  for (const f of findings) {
    if (f.file !== last) console.log('\n' + f.file), (last = f.file);
    console.log(`  L${f.line}  [${f.kind}] ${f.what} — ${f.why}`);
  }
  console.log(`\n${findings.length} findings ${JSON.stringify(byKind)} (checked against ${routes.length} routes, ${envKeys.size} settings)`);
}
process.exit(strict && findings.length ? 1 : 0);
