#!/usr/bin/env node
// Walks the Quick Start tutorial in a real browser, against the pinned
// lnbits/lnbits image that CI starts exactly as Step 1 shows. Each step uses
// the labels the page tells readers to click, so a renamed button fails here.
// CI only; never point this at a real node.
// Usage: LNBITS_URL=http://localhost:5000 node scripts/ui-tutorial.mjs
import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.LNBITS_URL || 'http://localhost:5000';
const outDir = process.env.UI_OUT || '/tmp/ui';
fs.mkdirSync(outDir, { recursive: true });
const results = [];
const password = 'ui-' + Math.random().toString(36).slice(2) + 'X9';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.setDefaultTimeout(15000);
let n = 0;

async function step(anchor, text, fn) {
  n++;
  try {
    const detail = await fn();
    results.push({ anchor, text, ok: true, detail: detail || '' });
    await page.screenshot({ path: `${outDir}/${String(n).padStart(2, '0')}-ok.png` });
  } catch (e) {
    results.push({ anchor, text, ok: false, detail: e.message.split('\n')[0] });
    await page.screenshot({ path: `${outDir}/${String(n).padStart(2, '0')}-FAILED.png`, fullPage: true }).catch(() => {});
    fs.writeFileSync(`${outDir}/${String(n).padStart(2, '0')}-FAILED.html`, await page.content().catch(() => ''));
    throw e;
  }
}

async function waitHealthy() {
  for (let i = 0; i < 90; i++) {
    try {
      const r = await fetch(base + '/api/v1/health', { redirect: 'manual' });
      if (r.status === 200) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('LNbits did not come back after the restart');
}

const dialog = () => page.locator('.q-dialog').last();

// LNbits shows an "Important!" reminder to save your login credentials.
async function dismissReminder() {
  const btn = page.getByRole('button', { name: /I understand/i });
  if (await btn.isVisible().catch(() => false)) { await btn.click(); return true; }
  return false;
}
let reminderSeen = false;

try {
  await step('step-2-open-the-web-interface', 'A fresh install redirects to /first_install', async () => {
    await page.goto(base);
    await page.waitForURL(/first_install/);
  });

  await step('step-2-open-the-web-interface', 'Username, Password, Password repeat, then Login creates the Super User and opens Settings (/admin)', async () => {
    await page.getByLabel('Username').fill('tutorial');
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Password repeat').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL(/\/admin/);
    return page.url().replace(base, '');
  });

  await step('step-4-explore-your-wallet', 'Settings in the sidebar opens /admin on the Funding tab, showing "Funding source: VoidWallet"', async () => {
    await page.getByText('Settings', { exact: true }).first().click();
    await page.waitForURL(/\/admin/);
    await page.getByText('Funding Sources', { exact: true }).first().waitFor();
    await page.getByText('Funding source: VoidWallet').first().waitFor();
  });

  await step('step-4-explore-your-wallet', 'Under Funding Sources, change the drop-down from "Void Wallet" to "Fake Wallet"; Save says "Restart required!"', async () => {
    await page.locator('.q-select').filter({ hasText: 'Void Wallet' }).first().click();
    await page.getByRole('option', { name: 'Fake Wallet', exact: true }).click();
    await page.getByRole('button', { name: 'Save' }).first().click();
    await page.getByText(/Restart required!/).first().waitFor();
  });

  await step('step-4-explore-your-wallet', 'Restart server, reload: the Funding tab shows "Funding source: FakeWallet"', async () => {
    await page.getByRole('button', { name: 'Restart server' }).first().click();
    await new Promise((r) => setTimeout(r, 3000));
    await waitHealthy();
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /I understand/i }).waitFor({ timeout: 5000 }).catch(() => {});
    reminderSeen = (await dismissReminder()) || reminderSeen;
    await page.getByText('Funding source: FakeWallet').first().waitFor({ timeout: 30000 });
    return reminderSeen ? 'an "Important!" save-your-credentials dialog appeared first (I understand)' : '';
  });

  let firstWalletUrl;
  await step('create-an-invoice', 'Add a new wallet in the sidebar creates a wallet named "Shop"', async () => {
    await page.goto(base + '/wallet');
    await page.waitForURL(/\/wallet/);
    await page.waitForLoadState('networkidle');
    await dismissReminder();
    firstWalletUrl = page.url();
    await page.getByText('Add a new wallet').first().click();
    await dialog().locator('input').first().fill('Shop');
    await dialog().getByRole('button', { name: /Add wallet/i }).click();
    await page.getByText('Shop').first().waitFor();
  });

  await step('create-an-invoice', 'The Super User sees Credit / Debit on the first wallet; 10000 + Enter credits it', async () => {
    await page.goto(firstWalletUrl);
    await page.waitForLoadState('networkidle');
    await dismissReminder();
    await page.getByRole('button', { name: 'Credit / Debit' }).first().click();
    const input = page.locator('input[type=number]:visible').last();
    await input.fill('10000');
    const credited = page.waitForResponse((r) => r.url().includes('/balance') && r.request().method() === 'PUT');
    await input.press('Enter');
    const r = await credited;
    if (r.status() !== 200) throw new Error(`credit returned ${r.status()}`);
  });

  let bolt11;
  await step('create-an-invoice', 'In "Shop": Receive, 1000 sats and a memo, Create Invoice', async () => {
    await page.getByText('Shop').first().click();
    await page.waitForLoadState('networkidle');
    await dismissReminder();
    await page.getByRole('button', { name: /receive/i }).first().click();
    await dialog().getByLabel(/Amount/).fill('1000');
    await dialog().getByLabel(/Memo/).fill('Quick Start');
    const created = page.waitForResponse((r) => r.url().endsWith('/api/v1/payments') && r.request().method() === 'POST');
    await dialog().getByRole('button', { name: 'Create Invoice' }).click();
    const r = await created;
    const body = await r.json();
    if (r.status() !== 201 || !body.bolt11) throw new Error(`create invoice: ${r.status()} ${JSON.stringify(body).slice(0, 200)}`);
    bolt11 = body.bolt11;
    await page.keyboard.press('Escape');
  });

  await step('create-an-invoice', 'In the first wallet: Send, paste the invoice, Read, then Send pays it', async () => {
    await page.goto(firstWalletUrl);
    await page.waitForLoadState('networkidle');
    await dismissReminder();
    await page.getByRole('button', { name: /^send$/i }).first().click();
    await dialog().locator('textarea').first().fill(bolt11);
    await dialog().getByRole('button', { name: 'Read' }).click();
    const paid = page.waitForResponse((r) => r.url().endsWith('/api/v1/payments') && r.request().method() === 'POST');
    await dialog().getByRole('button', { name: /^send$/i }).click();
    const r = await paid;
    const body = await r.json();
    if (r.status() !== 201 || body.status !== 'success') throw new Error(`pay: ${r.status()} ${JSON.stringify(body).slice(0, 200)}`);
    return `status=${body.status}`;
  });

  await step('quick-reference', 'Each wallet has a "Node URL, API keys and API docs" panel', async () => {
    await page.getByText('Node URL, API keys and API docs').first().waitFor();
  });
} catch {
  // the failing step is already recorded
} finally {
  await browser.close();
}

const lines = ['| | Quick Start step | Claim | Detail |', '|---|---|---|---|'];
for (const r of results) lines.push(`| ${r.ok ? '✅' : '❌'} | [#${r.anchor}](https://lndocs.github.io/docs/getting-started/quick-start#${r.anchor}) | ${r.text} | ${String(r.detail).replace(/\|/g, '\\|').slice(0, 200)} |`);
const failed = results.some((r) => !r.ok);
const out = `## Quick Start in a browser vs LNbits ${process.env.LNBITS_VERSION || ''}\n\n${lines.join('\n')}\n\n${failed ? 'Stopped at the first failing step; see the screenshots artifact.' : `All ${results.length} steps work as written.`}\n`;
console.log(out);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, out);
process.exit(failed ? 1 : 0);
