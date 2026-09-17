import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'msedge' });
try {
  const context = await browser.newContext(); let enabled = false, starts = 0;
  await context.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/psc/config')) return route.fulfill({ status: 200, json: { enabled, environment: 'sandbox' } });
    if (path.endsWith('/auth/csrf')) return route.fulfill({ status: 200, json: { csrfToken: 'fixture' } });
    if (path.endsWith('/auth/psc/start')) { starts++; assert.deepEqual(route.request().postDataJSON(), { purpose: 'login' }); return route.fulfill({ status: 503, json: { code: 'PSC_UNAVAILABLE' } }); }
    return route.fulfill({ status: 401, json: { code: 'UNAUTHORIZED' } });
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4187/connexion');
  await page.getByRole('button', { name: 'Tout refuser', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Se connecter avec Pro Santé Connect' }).count(), 0);
  enabled = true; await page.reload();
  await page.getByRole('button', { name: 'Se connecter avec Pro Santé Connect' }).waitFor(); assert.equal(starts, 0);
  await page.getByRole('button', { name: 'Se connecter avec Pro Santé Connect' }).click();
  await page.getByRole('alert').filter({ hasText: 'connexion habituelle' }).waitFor(); assert.equal(starts, 1);
  assert.equal(await page.getByRole('button', { name: 'Se connecter', exact: true }).isEnabled(), true);
  enabled = false; await page.goto('http://127.0.0.1:4187/connexion?psc=association-requise');
  await page.getByRole('status').filter({ hasText: 'associez Pro Santé Connect' }).waitFor();
  console.log('PSC disabled hidden, enabled user-triggered only, failure preserves password login, association callback explained: PASS (fixtures only).');
} finally { await browser.close(); }
