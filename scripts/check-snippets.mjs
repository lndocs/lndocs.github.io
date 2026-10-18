#!/usr/bin/env node
// Checks docs snippets against the pinned LNbits release (scripts/lnbits-version.txt):
//   env      KEY=value assignments and `LNBITS_*`-style names must be settings fields
//   api      /api/v1/... paths (and methods, when given) must be real core routes
//   wallet   LNBITS_BACKEND_WALLET_CLASS values and `XWallet` names must be real funding source classes
//   auth     AUTH_ALLOWED_METHODS values and `*-auth` strings must be AuthMethods values
//   install  pip/npm/npx/docker run/image:/git clone/curl|sh/wordpress.org targets must be in install-allowlist.json
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

// Funding source classes (LNBITS_BACKEND_WALLET_CLASS values) and login method strings.
const walletClasses = new Set(
  [...fs.readFileSync(path.join(src, 'lnbits/wallets/__init__.py'), 'utf8').matchAll(/\b([A-Z][A-Za-z0-9]*Wallet)\b/g)].map((m) => m[1]),
);
const authBlock = settingsPy.match(/class AuthMethods\(Enum\):([\s\S]*?)\n\n/)[1];
const authMethods = new Set([...authBlock.matchAll(/=\s*"([a-z0-9-]+)"/g)].map((m) => m[1]));

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
const unverified = []; // pages without `verified_with` front matter
const dockerArgFlags = new Set(['-p', '-v', '-e', '-w', '-u', '-l', '--name', '--env-file', '--network', '--restart', '--user', '--entrypoint', '--mount', '--label', '--platform', '--publish', '--volume', '--env', '--workdir', '--hostname', '-h', '--add-host', '--cpus', '--memory', '-m']);
const add = (file, line, kind, what, why) => findings.push({ file: path.relative(root, file), line, kind, what, why });

for (const file of walk(path.join(root, 'docs'))) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let inFence = false, skip = false, lang = '';
  if (!/^---[\s\S]*?\nverified_with:/.test(lines.join('\n'))) unverified.push(path.relative(root, file));
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

    // funding source classes and login methods
    for (const m of text.matchAll(/LNBITS_BACKEND_WALLET_CLASS\s*[=:]\s*["']?([A-Za-z0-9]+)/g))
      if (!walletClasses.has(m[1])) add(file, n, 'wallet', m[1], 'not a funding source class in LNbits ' + version);
    for (const m of text.matchAll(/`([A-Z][A-Za-z0-9]*Wallet)`/g))
      if (!walletClasses.has(m[1])) add(file, n, 'wallet', m[1], 'not a funding source class in LNbits ' + version);
    const authList = text.match(/AUTH_ALLOWED_METHODS\s*[=:]\s*(.*)$/);
    const authHits = authList ? [...authList[1].matchAll(/[a-z][a-z0-9]*(?:-[a-z0-9]+)+/g)].map((m) => m[0]) : [];
    for (const m of text.matchAll(/`([a-z0-9]+(?:-[a-z0-9]+)*-(?:auth(?:-[a-z0-9]+)?|only|password))`/g)) authHits.push(m[1]);
    for (const a of authHits) if (!authMethods.has(a)) add(file, n, 'auth', a, 'not an AuthMethods value in LNbits ' + version);

    // install targets in prose: wordpress.org plugin links
    for (const m of text.matchAll(/wordpress\.org\/plugins\/([a-z0-9-]+)/g)) {
      const t = 'wp:' + m[1];
      if (!(t in allow.allowed)) add(file, n, 'install', t, 'not in scripts/install-allowlist.json');
    }

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
    for (const m of text.matchAll(/\b(?:curl|wget)\b[^|]*?(https?:\/\/\S+)\s*\|\s*(?:sudo\s+)?(?:ba|z)?sh|\b(?:curl|wget)\b[^|]*?(https?:\/\/\S+)\s*\|\s*(?:sudo\s+)?python3?/g)) targets.push('curl:' + (m[1] || m[2]));
    for (const m of text.matchAll(/^\s*image:\s*["']?([^\s"':]+)/g)) targets.push('docker:' + m[1]);
    if (/\bdocker run\b/.test(text)) {
      let cmd = text, j = i;
      while (/\\\s*$/.test(lines[j]) && j + 1 < lines.length) cmd = cmd.replace(/\\\s*$/, ' ') + lines[++j];
      const toks = cmd.split(/\bdocker run\b/)[1].trim().split(/\s+/);
      for (let k = 0; k < toks.length; k++) {
        const t = toks[k];
        if (t.startsWith('-')) { if (dockerArgFlags.has(t)) k++; continue; }
        if (/^[a-z0-9][a-z0-9.\-/]*(:[\w.\-]+)?$/.test(t)) targets.push('docker:' + t.replace(/:.*$/, ''));
        break;
      }
    }
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
  console.log(JSON.stringify({ version, routes: routes.length, envKeys: envKeys.size, counts: byKind, unverified, findings }, null, 2));
} else {
  let last = '';
  for (const f of findings) {
    if (f.file !== last) console.log('\n' + f.file), (last = f.file);
    console.log(`  L${f.line}  [${f.kind}] ${f.what} — ${f.why}`);
  }
  console.log(`\n${unverified.length} pages without verified_with front matter`);
  console.log(`\n${findings.length} findings ${JSON.stringify(byKind)} (checked against ${routes.length} routes, ${envKeys.size} settings)`);
}
process.exit(strict && findings.length ? 1 : 0);
