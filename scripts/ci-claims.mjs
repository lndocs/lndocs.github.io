#!/usr/bin/env node
// Checks documented LNbits API behaviour against a real instance. CI starts the
// pinned lnbits/lnbits image with FakeWallet; never point this at a real node.
// Each claim names the page that states it. Usage: LNBITS_URL=http://127.0.0.1:5000 node scripts/ci-claims.mjs
import fs from 'node:fs';

const base = process.env.LNBITS_URL || 'http://127.0.0.1:5000';
const results = [];

async function call(method, path, { key, body, query = '' } = {}) {
  const res = await fetch(base + path + query, {
    method,
    headers: { 'Content-Type': 'application/json', ...(key ? { 'X-Api-Key': key } : {}) },
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

// ---- report ---------------------------------------------------------------
const lines = ['| | Page | Claim | Detail |', '|---|---|---|---|'];
for (const r of results) lines.push(`| ${r.ok ? '✅' : '❌'} | ${r.page} | ${r.text} | ${String(r.detail).replace(/\|/g, '\\|').slice(0, 200)} |`);
const failed = results.filter((r) => !r.ok).length;
const out = `## Documented behaviour vs LNbits ${process.env.LNBITS_VERSION || ''}\n\n${lines.join('\n')}\n\n${results.length - failed}/${results.length} claims hold.\n`;
console.log(out);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, out);
process.exit(failed ? 1 : 0);
