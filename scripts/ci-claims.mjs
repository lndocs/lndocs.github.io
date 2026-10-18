#!/usr/bin/env node
// Checks documented LNbits API behaviour against a real instance. CI starts the
// pinned lnbits/lnbits image with FakeWallet; never point this at a real node.
// Each claim names the page that states it. Usage: LNBITS_URL=http://127.0.0.1:5000 node scripts/ci-claims.mjs
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const base = process.env.LNBITS_URL || 'http://127.0.0.1:5000';
const results = [];

async function call(method, path, { key, bearer, body, query = '' } = {}) {
  const res = await fetch(base + path + query, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { 'X-Api-Key': key } : {}),
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual',
  });
  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

async function claim(page, text, fn) {
  try {
    const detail = await fn();
    results.push({ page, text, ok: true, detail: detail || '' });
  } catch (e) {
    results.push({ page, text, ok: false, detail: e.message });
  }
}
function expect(cond, msg) { if (!cond) throw new Error(msg); }

let a, b, invoice;
const superPassword = 'ci-' + Math.random().toString(36).slice(2) + 'X9';

await claim('getting-started/quick-start', 'A fresh install redirects every request (even /api/v1/health) to /first_install (307)', async () => {
  const r = await call('GET', '/api/v1/health');
  expect(r.status === 307, `status ${r.status}`);
});

await claim('configuration/admin-ui', 'PUT /api/v1/auth/first_install sets the Super User username and password', async () => {
  const r = await call('PUT', '/api/v1/auth/first_install', { body: { username: 'superci', password: superPassword, password_repeat: superPassword } });
  expect(r.status === 200, JSON.stringify(r));
});

await claim('api/overview', 'GET /api/v1/health returns server_time and up_time', async () => {
  const r = await call('GET', '/api/v1/health');
  expect(r.status === 200 && 'server_time' in r.data && 'up_time' in r.data, JSON.stringify(r));
});

await claim('api/users', 'POST /api/v1/account creates an account and wallet without auth (LNBITS_ALLOW_NEW_ACCOUNTS default)', async () => {
  const r1 = await call('POST', '/api/v1/account', { body: { name: 'a' } });
  const r2 = await call('POST', '/api/v1/account', { body: { name: 'b' } });
  expect(r1.status === 200 && r1.data.adminkey && r1.data.inkey, JSON.stringify(r1));
  a = r1.data; b = r2.data;
});

await claim('api/wallets', 'GET /api/v1/wallet with the invoice key returns the balance in msat (an integer)', async () => {
  const r = await call('GET', '/api/v1/wallet', { key: a.inkey });
  expect(r.status === 200 && Number.isInteger(r.data.balance), JSON.stringify(r));
  return `balance=${r.data.balance}`;
});

await claim('api/authentication', 'An unknown key is rejected', async () => {
  const r = await call('GET', '/api/v1/wallet', { key: '0'.repeat(32) });
  expect(r.status >= 400 && r.status < 500, `status ${r.status}`);
  return `status ${r.status}`;
});

await claim('api/payments', 'POST /api/v1/payments with out:false and the invoice key creates an invoice (201)', async () => {
  const r = await call('POST', '/api/v1/payments', { key: a.inkey, body: { out: false, amount: 100, memo: 'ci' } });
  expect(r.status === 201 && r.data.payment_hash && r.data.bolt11, JSON.stringify(r));
  invoice = r.data;
});

await claim('api/payments', '`out` defaults to true: with an admin key and no `out`, LNbits tries to pay (asks for a bolt11)', async () => {
  const r = await call('POST', '/api/v1/payments', { key: a.adminkey, body: { amount: 100, memo: 'ci' } });
  expect(r.status === 400 && /BOLT11/i.test(JSON.stringify(r.data)), JSON.stringify(r));
});

await claim('api/payments', '`out` omitted with the invoice key is refused (403)', async () => {
  const r = await call('POST', '/api/v1/payments', { key: a.inkey, body: { amount: 100, memo: 'ci' } });
  expect(r.status === 403, JSON.stringify(r));
});

await claim('api/overview', 'Request validation errors return 400, not 422', async () => {
  const r = await call('POST', '/api/v1/payments', { key: a.inkey, body: { out: false, amount: 'abc' } });
  expect(r.status === 400, `status ${r.status}`);
});

await claim('api/payments', 'GET /api/v1/payments/{hash} works without a key and reports unpaid', async () => {
  const r = await call('GET', `/api/v1/payments/${invoice.payment_hash}`);
  expect(r.status === 200 && r.data.paid === false, JSON.stringify(r));
});

await claim('api/wallets', 'Paying with insufficient balance fails with status 520', async () => {
  const r = await call('POST', '/api/v1/payments', { key: b.adminkey, body: { out: true, bolt11: invoice.bolt11 } });
  expect(r.status === 520, JSON.stringify(r));
});

await claim('api/wallets', 'PUT /api/v1/wallet/{new_name} renames the wallet to the path segment', async () => {
  const r = await call('PUT', '/api/v1/wallet/renamed-by-ci', { key: a.adminkey });
  expect(r.status === 200 && r.data.name === 'renamed-by-ci', JSON.stringify(r));
});

await claim('configuration/authentication', 'user-id-only login is off by default: ?usr= is refused on user routes', async () => {
  const r = await call('GET', '/api/v1/wallets', { query: `?usr=${a.user}` });
  expect(r.status === 401 || r.status === 403, `status ${r.status}`);
  return `status ${r.status}`;
});

await claim('api/overview', 'The OpenAPI schema is served at /openapi.json', async () => {
  const r = await call('GET', '/openapi.json');
  expect(r.status === 200 && r.data.openapi, `status ${r.status}`);
});

// ---- findings from the critic pass, read from code, proven here ------------
let su;
async function register(username) {
  const password = 'pw-' + Math.random().toString(36).slice(2) + 'X9';
  const r = await call('POST', '/api/v1/auth/register', { body: { username, password, password_repeat: password } });
  expect(r.status === 200 && r.data.access_token, `register ${username}: ${JSON.stringify(r)}`);
  const me = await call('GET', '/api/v1/auth', { bearer: r.data.access_token });
  expect(me.status === 200 && me.data.id, `GET /auth: ${JSON.stringify(me)}`);
  return { token: r.data.access_token, id: me.data.id, password };
}

await claim('api/authentication', 'POST /api/v1/auth with username and password returns a bearer token', async () => {
  const r = await call('POST', '/api/v1/auth', { body: { username: 'superci', password: superPassword } });
  expect(r.status === 200 && r.data.access_token, JSON.stringify(r));
  su = r.data.access_token;
});

await claim('architecture/ledger', 'An internal payment stores a negative (or zero) fee and a negative amount on the payer side', async () => {
  const c = await call('PUT', '/users/api/v1/balance', { bearer: su, body: { id: a.id, amount: 1000 } });
  expect(c.status === 200, `credit: ${JSON.stringify(c)}`);
  const inv = await call('POST', '/api/v1/payments', { key: b.inkey, body: { out: false, amount: 50, memo: 'internal' } });
  const pay = await call('POST', '/api/v1/payments', { key: a.adminkey, body: { out: true, bolt11: inv.data.bolt11 } });
  expect(pay.status === 201, `pay: ${JSON.stringify(pay)}`);
  const list = await call('GET', '/api/v1/payments', { key: a.inkey, query: '?limit=50' });
  const row = list.data.find((p) => p.payment_hash === inv.data.payment_hash);
  expect(row && row.amount < 0 && row.fee <= 0, JSON.stringify(row));
  return `amount=${row.amount} fee=${row.fee}`;
});

await claim('faq', 'A Super User reset key is not single-use: it works twice within 120 s', async () => {
  const u = await register('resetci');
  const k = await call('PUT', `/users/api/v1/user/${u.id}/reset_password`, { bearer: su });
  expect(k.status === 200 && String(k.data).startsWith('reset_key_'), `key: ${JSON.stringify(k)}`);
  for (const pw of ['first-Pass-123', 'second-Pass-456']) {
    const r = await call('PUT', '/api/v1/auth/reset', { body: { reset_key: k.data, password: pw, password_repeat: pw } });
    expect(r.status === 200, `reset with ${pw}: ${JSON.stringify(r)}`);
  }
  const login = await call('POST', '/api/v1/auth', { body: { username: 'resetci', password: 'second-Pass-456' } });
  expect(login.status === 200, `login: ${JSON.stringify(login)}`);
});

await claim('architecture/users', 'Deactivating a user refuses their wallet keys at once, even one used just before (despite the key cache)', async () => {
  const c = (await call('POST', '/api/v1/account', { body: { name: 'deact' } })).data;
  const warm = await call('GET', '/api/v1/wallet', { key: c.adminkey });
  expect(warm.status === 200, `warm: ${JSON.stringify(warm)}`);
  const d = await call('PUT', `/users/api/v1/user/${c.user}/activate`, { bearer: su });
  expect(d.status === 200 && /deactivated/.test(JSON.stringify(d.data)), `deactivate: ${JSON.stringify(d)}`);
  const cached = await call('GET', '/api/v1/wallet', { key: c.adminkey });
  const cold = await call('GET', '/api/v1/wallet', { key: c.inkey });
  const detail = `cached key → ${cached.status}, unused key → ${cold.status}`;
  expect(cached.status >= 400 && cold.status >= 400, detail);
  return detail;
});

await claim('configuration/admin-ui', 'A non-super admin can read and change funding-source credentials through /admin/api/v1/settings', async () => {
  const u = await register('adminci');
  const t = await call('PUT', `/users/api/v1/user/${u.id}/admin`, { bearer: su });
  expect(t.status === 200, `make admin: ${JSON.stringify(t)}`);
  const p = await call('PATCH', '/admin/api/v1/settings', { bearer: u.token, body: { fake_wallet_secret: 'changed-by-admin' } });
  expect(p.status === 200, `patch as admin: ${JSON.stringify(p)}`);
  const g = await call('GET', '/admin/api/v1/settings', { bearer: su });
  expect(g.data.fake_wallet_secret === 'changed-by-admin', `secret now ${g.data.fake_wallet_secret}`);
  const ga = await call('GET', '/admin/api/v1/settings', { bearer: u.token });
  expect(ga.status === 200 && ga.data.fake_wallet_secret === 'changed-by-admin', `admin read: ${ga.status} ${ga.data && ga.data.fake_wallet_secret}`);
});

await claim('architecture/ledger', '`lnbits-cli db delete-wallet-payment` fails in v1.6.2 (its SQL uses the renamed column `wallet`)', async () => {
  const name = process.env.LNBITS_CONTAINER;
  if (!name) return 'skipped: LNBITS_CONTAINER not set';
  const r = spawnSync('docker', ['exec', name, 'uv', '--offline', 'run', '--no-sync', 'lnbits-cli', 'db', 'delete-wallet-payment',
    '-w', a.id, '-c', invoice.checking_id], { encoding: 'utf8' });
  const outText = `${r.stdout}\n${r.stderr}`;
  expect(/no such column: wallet|column "wallet" does not exist/i.test(outText), `exit ${r.status}: ${outText.slice(-300)}`);
  return (outText.match(/no such column[^\n]*/i) || [`exit ${r.status}`])[0];
});

// ---- report ---------------------------------------------------------------
const lines = ['| | Page | Claim | Detail |', '|---|---|---|---|'];
for (const r of results) lines.push(`| ${r.ok ? '✅' : '❌'} | ${r.page} | ${r.text} | ${String(r.detail).replace(/\|/g, '\\|').slice(0, 200)} |`);
const failed = results.filter((r) => !r.ok).length;
const out = `## Documented behaviour vs LNbits ${process.env.LNBITS_VERSION || ''}\n\n${lines.join('\n')}\n\n${results.length - failed}/${results.length} claims hold.\n`;
console.log(out);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, out);
process.exit(failed ? 1 : 0);
