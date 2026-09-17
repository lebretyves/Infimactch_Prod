import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.BASE_URL || 'http://127.0.0.1:4187';
const browser = await chromium.launch({ channel: 'msedge' });
try {
  const nojs = await browser.newContext({ javaScriptEnabled: false });
  const plain = await nojs.newPage();
  for (const path of ['/', '/installer.html', '/accessibilite.html', '/ecoconception.html', '/mentions-legales.html']) {
    await plain.goto(base + path); assert.equal(await plain.locator('h1').count(), 1, path); assert.ok((await plain.locator('main').innerText()).length > 300, path); assert.equal(await plain.getByRole('navigation', { name: 'Informations publiques' }).count(), 1);
  }
  await nojs.close();
  const context = await browser.newContext();
  await context.route('**/api/**', route => route.fulfill({ status: 200, json: route.request().url().endsWith('/auth/google/config') ? { enabled: true, clientId: 'fixture-only' } : { enabled: false } }));
  const page = await context.newPage(); await page.goto(base + '/installer'); await page.getByRole('button', { name: 'Tout refuser', exact: true }).click();
  for (const width of [375, 768]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/installer', '/accessibilite']) {
      await page.goto(base + path); await page.locator('h1').waitFor();
      assert.equal(await page.getByRole('button', { name: 'Cookies', exact: true }).evaluate(e => getComputedStyle(e).position), 'static');
      await page.getByRole('button', { name: 'Cookies', exact: true }).click(); await page.getByRole('dialog').waitFor(); await page.getByRole('button', { name: 'Tout refuser', exact: true }).click();
    }
  }
  await page.goto(base + '/connexion');
  const google = page.getByRole('region', { name: 'Connexion avec Google', exact: true }); await google.waitFor();
  const gap = await google.evaluate(e => e.getBoundingClientRect().top - document.querySelector('form').getBoundingClientRect().bottom);
  assert.ok(gap >= 20, `Google spacing ${gap}`);
  console.log('PASS: 5 no-JS public summaries, cookies in flow and reopenable at 375/768px, Google separation >=20px.');
} finally { await browser.close(); }
