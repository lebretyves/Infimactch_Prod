import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
const base = process.env.BASE_URL || 'http://127.0.0.1:4187';
const browser = await chromium.launch({ channel: 'msedge' });
const results = [];
try {
  const context = await browser.newContext();
  await context.route('**/api/**', route => route.fulfill({ status: 401, contentType: 'application/json', body: '{"code":"UNAUTHORIZED"}' }));
  const page = await context.newPage();
  await page.goto(base); await page.getByRole("button", { name: "Tout refuser", exact: true }).click();
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/installer', '/accessibilite', '/ecoconception', '/mentions-legales', '/connexion']) {
      await page.goto(base + path); await page.locator('h1').waitFor();
      const check = await page.evaluate(() => ({ h1: document.querySelectorAll('h1').length, overflow: document.documentElement.scrollWidth > innerWidth + 1, alt: [...document.images].every(i => i.hasAttribute('alt')), skip: !!document.querySelector('a[href="#contenu"]'), unnamed: [...document.querySelectorAll('button,a[href]')].filter(e => !e.textContent.trim() && !e.getAttribute('aria-label') && !e.querySelector('img[alt]')).length }));
      assert.equal(check.h1, 1, `${path} H1`); assert.equal(check.overflow, false, `${path} overflow ${width}`); assert.equal(check.alt, true); assert.equal(check.skip, true); assert.equal(check.unnamed, 0);
      results.push({ path, width, ...check });
    }
  }
  await page.goto(base + '/installer'); await page.locator('h1').waitFor();
  await page.evaluate(() => {
    window.prompts = 0;
    const event = new Event('beforeinstallprompt', { cancelable: true });
    event.prompt = async () => { window.prompts++; return { outcome: 'dismissed' }; };
    event.userChoice = Promise.resolve({ outcome: 'dismissed' }); window.dispatchEvent(event);
  });
  assert.equal(await page.evaluate(() => window.prompts), 0);
  await page.getByRole('button', { name: 'Installer InfiMatch', exact: true }).click();
  assert.equal(await page.evaluate(() => window.prompts), 1);
  await page.getByText('Installation annulée.', { exact: false }).waitFor();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload(); await page.locator('h1').waitFor();
  await page.evaluate(async () => { for (const path of ['/api/v1/auth/me', '/api/v1/admin/status', '/api/v1/me/documents/fictional']) await fetch(path, { cache: 'no-store' }).catch(() => {}); });
  const cached = await page.evaluate(async () => { const urls = []; for (const name of await caches.keys()) for (const req of await (await caches.open(name)).keys()) urls.push(new URL(req.url).pathname); return urls; });
  assert.deepEqual(cached.sort(), ['/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/offline.html'].sort());
  await context.setOffline(true); await page.goto(base + '/missions'); await page.getByRole('heading', { name: 'Vous êtes hors connexion' }).waitFor();
  await context.setOffline(false); await page.goto(base + '/installer'); await page.locator('h1').waitFor();
  fs.mkdirSync('../InfiMatch/docs/quality', { recursive: true });
  for (const width of [390, 1440]) { await page.setViewportSize({ width, height: 900 }); await page.screenshot({ path: `../InfiMatch/docs/quality/installation-${width}.png`, fullPage: true }); }
  fs.writeFileSync('../InfiMatch/docs/quality/frontend-checks.json', JSON.stringify({ date: new Date().toISOString(), browser: await browser.version(), fixtures: 'unauthenticated API only', results, pwa: { userTriggeredPrompt: true, dismissal: true, cacheAllowlist: cached, offlineFallback: true }, limitations: ['No real-device installation', 'No screen reader audit', 'No exhaustive RGAA audit'] }, null, 2));
  console.log(`${results.length} responsive/semantic checks passed; install event requires click, dismiss works, sensitive API never cached, offline fallback passes.`);
  await context.close();
} finally { await browser.close(); }
