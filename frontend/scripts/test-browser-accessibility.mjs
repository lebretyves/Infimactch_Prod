import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.BASE_URL || 'http://127.0.0.1:4199';
const browser = await chromium.launch(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {});
const context = await browser.newContext();
await context.route('**/api/**', route => route.fulfill({ status: 401, json: { code: 'UNAUTHORIZED' } }));
const page = await context.newPage();
let releasePage;
let pageGate = new Promise(resolve => { releasePage = resolve; });
const legalChunk = /\/assets\/Mentions-[^/]+\.js$/;
await context.route(legalChunk, async route => { await pageGate; await route.continue(); });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const cookies = page.getByRole('dialog', { name: 'Cookies et connexion Google', exact: true });
const access = page.getByRole('dialog', { name: 'Options d’accessibilité', exact: true });
const cookieTrigger = page.getByRole('button', { name: 'Cookies', exact: true });
const accessTrigger = page.getByRole('button', { name: 'Accessibilité', exact: true });
async function focused(locator) {
  await locator.waitFor();
  await page.waitForFunction(element => document.activeElement === element, await locator.elementHandle());
}
async function fits(locator) {
  const result = await locator.evaluate(element => {
    const r = element.getBoundingClientRect();
    return { top: r.top, left: r.left, bottom: r.bottom, right: r.right, width: innerWidth, height: innerHeight, overflow: element.scrollWidth > element.clientWidth + 1 };
  });
  assert.ok(result.top >= -1 && result.left >= -1 && result.bottom <= result.height + 1 && result.right <= result.width + 1, JSON.stringify(result));
  assert.equal(result.overflow, false, JSON.stringify(result));
}
async function choice() {
  return page.evaluate(() => JSON.parse(localStorage.getItem('infimatch:cookie-preferences')).google);
}
try {
  for (const width of [375,1440]) for (const path of ['/', '/inscription', '/inscription/identite']) {
    const firstContext = await browser.newContext({viewport:{width,height:812}});
    await firstContext.route('**/api/**', route => route.fulfill({status:401,json:{code:'UNAUTHORIZED'}}));
    const first = await firstContext.newPage();const googleRequests=[];
    first.on('request',r=>{if(/accounts\.google\.com\/gsi/.test(r.url()))googleRequests.push(r.url());});
    first.on('pageerror',e=>errors.push(e.message));
    try {
      await first.goto(base+path);
      const consent=first.getByRole('dialog',{name:'Cookies et connexion Google',exact:true});
      await consent.waitFor();
      assert.equal(await first.evaluate(()=>localStorage.getItem('infimatch:cookie-preferences')),null);
      await consent.getByRole('button',{name:'Accessibilité',exact:true}).click();
      const aids=first.getByRole('dialog',{name:'Options d’accessibilité',exact:true});await aids.waitFor();
      assert.equal(await consent.isVisible(),false);
      assert.equal(await first.evaluate(()=>localStorage.getItem('infimatch:cookie-preferences')),null,'Opening accessibility must not save a cookie choice');
      await aids.getByRole('button',{name:'Fermer les options d’accessibilité',exact:true}).click();
      await consent.waitFor();
      await first.waitForFunction(()=>document.activeElement?.id==='cookie-title');
      assert.equal(await first.evaluate(()=>localStorage.getItem('infimatch:cookie-preferences')),null,'Returning from accessibility must keep the first choice pending');
      await consent.getByRole('button',{name:'Tout refuser',exact:true}).click();
      await consent.waitFor({state:'hidden'});
      const topButton=first.getByRole('button',{name:'Accessibilité',exact:true});
      await first.evaluate(()=>scrollTo(0,0));
      const box=await topButton.boundingBox();
      assert.ok(box&&box.y>=0&&box.y<100&&box.x+box.width>width-60&&box.x+box.width<=width,JSON.stringify({width,path,box}));
      assert.equal(await first.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await first.reload();
      await first.getByRole('button',{name:'Accessibilité',exact:true}).waitFor();
      assert.equal(await first.locator('#cookie-preferences').evaluate(el=>el.open),false,'An explicit saved choice remains effective');
      assert.equal(await first.evaluate(()=>JSON.parse(localStorage.getItem('infimatch:cookie-preferences')).google),false);
      assert.deepEqual(googleRequests,[],'Google does not load before consent or after refusal');
      console.log('PASS first visit',path,width,'automatic cookies, accessibility without consent, top-right control and saved choice');
    } finally {await firstContext.close();}
  }
  await page.goto(base + '/mentions-legales', { waitUntil: 'domcontentloaded' });
  await focused(cookies.getByRole('heading'));
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab');
    assert.equal(await cookies.evaluate(element => element.contains(document.activeElement)), true);
  }
  await page.keyboard.press('Escape');
  await cookies.waitFor({ state: 'hidden' });
  assert.equal(await choice(), false);
  assert.equal(await page.locator('main[aria-busy="true"]').isVisible(), true);
  releasePage();
  await focused(page.getByRole('heading', { level: 1 }));
  await context.unroute(legalChunk);
  console.log('PASS initial focus, keyboard navigation and Escape during delayed page loading without Google consent');

  const mainTrigger = page.getByRole('button', { name: 'Modifier mes préférences cookies', exact: true });
  await mainTrigger.click();
  await focused(cookies.getByRole('heading'));
  await page.keyboard.press('Escape');
  await focused(mainTrigger);
  await cookieTrigger.click();
  await cookies.getByRole('button', { name: 'Tout accepter', exact: true }).click();
  assert.equal(await choice(), true);
  await cookieTrigger.click();
  const expand = cookies.getByRole('button', { name: 'Personnaliser mes choix', exact: true });
  await expand.click();
  const google = cookies.getByRole('checkbox', { name: 'Connexion Google', exact: true });
  assert.equal(await google.isChecked(), true);
  const description = await google.getAttribute('aria-describedby');
  assert.ok(description && (await page.locator('#' + description).innerText()).includes('Google Identity Services'));
  await google.focus();
  await page.keyboard.press('Space');
  assert.equal(await google.isChecked(), false);
  await page.keyboard.press('Escape');
  assert.equal(await choice(), true, 'unsaved edits must not change consent');
  await focused(cookieTrigger);
  await cookieTrigger.click();
  await cookies.getByRole('button', { name: 'Tout refuser', exact: true }).click();
  assert.equal(await choice(), false);
  console.log('PASS invoker restored, labelled Google explanation, accept/refuse and unsaved cancellation');

  for (const path of ['/ecoconception', '/mentions-legales#cookies']) {
    await page.goto(base + path);
    await cookieTrigger.click();
    await cookies.getByRole('link', { name: 'Politique des cookies', exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.waitForURL('**/mentions-legales#cookies');
    await cookies.waitFor({ state: 'hidden' });
    await focused(page.locator('#cookies'));
    assert.equal(await page.locator('#cookies').evaluate(element => element.getBoundingClientRect().top >= 0), true);
  }
  console.log('PASS policy destination focused from another page and repeated anchor');

  // Finishing a delayed page must not steal focus after another keyboard action.
  pageGate = new Promise(resolve => { releasePage = resolve; });
  await context.route(legalChunk, async route => { await pageGate; await route.continue(); });
  await page.evaluate(() => localStorage.removeItem('infimatch:cookie-preferences'));
  await page.goto(base + '/mentions-legales', { waitUntil: 'domcontentloaded' });
  await focused(cookies.getByRole('heading'));
  await page.locator('main[aria-busy="true"]').waitFor();
  await page.keyboard.press('Escape');
  await focused(page.locator('main[aria-busy="true"]'));
  await page.keyboard.press('Tab');
  const continuedFocus = await page.evaluateHandle(() => document.activeElement);
  releasePage();
  await page.locator('main h1').waitFor();
  assert.equal(await page.evaluate(element => document.activeElement === element, continuedFocus), true);
  await context.unroute(legalChunk);
  console.log('PASS deferred focus cancelled when keyboard navigation continues');

  for (const width of [320, 375, 1440]) {
    await page.setViewportSize({ width, height: 640 });
    await accessTrigger.click();
    await access.getByRole('radio', { name: 'Très grand (130 %)', exact: true }).check();
    for (const name of ['Contraste renforcé', 'Police de lecture Lexend', 'Espacement du texte augmenté', 'Souligner les liens', 'Réduire les animations']) {
      await access.getByRole('checkbox', { name, exact: true }).check();
    }
    await fits(access);
    await page.keyboard.press('Escape');
    await focused(accessTrigger);
    await cookieTrigger.click();
    await fits(cookies);
    await cookies.getByRole('button', { name: 'Personnaliser mes choix', exact: true }).click();
    await fits(cookies);
    const refuse = await cookies.getByRole('button', { name: 'Tout refuser', exact: true }).boundingBox();
    const accept = await cookies.getByRole('button', { name: 'Tout accepter', exact: true }).boundingBox();
    assert.ok(Math.abs(refuse.width - accept.width) < 1 && Math.abs(refuse.height - accept.height) < 1);
    for (const name of ['Fermer les préférences cookies', 'Masquer le détail', 'Tout refuser', 'Tout accepter']) {
      const r = await cookies.getByRole('button', { name, exact: true }).boundingBox();
      assert.ok(r.width >= 44 && r.height >= 44, name);
    }
    await page.keyboard.press('Escape');
  }
  console.log('PASS both panels fit at 130%, all display aids enabled, equal consent buttons and larger controls');

  await accessTrigger.click();
  await access.getByRole('button', { name: 'Réinitialiser', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 640, height: 480 });
  await page.addStyleTag({ content: 'html { zoom: 2 !important; } #cookie-preferences :is(p,button,a,label), #a11y-preferences :is(p,button,a,label,legend) { line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important; } #cookie-preferences p, #a11y-preferences p { margin-bottom:2em!important; }' });
  await cookieTrigger.click();
  await cookies.getByRole('button', { name: 'Personnaliser mes choix', exact: true }).click();
  await fits(cookies);
  await page.keyboard.press('Escape');
  await accessTrigger.click();
  await fits(access);
  await page.keyboard.press('Escape');
  await page.reload();
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await cookieTrigger.click();
  await cookies.getByRole('button', { name: 'Personnaliser mes choix', exact: true }).click();
  const nativeGoogle = cookies.getByRole('checkbox', { name: 'Connexion Google', exact: true });
  await nativeGoogle.focus();
  await page.keyboard.press('Space');
  assert.equal(await nativeGoogle.isChecked(), true);
  assert.notEqual(await nativeGoogle.evaluate(element => getComputedStyle(element).appearance), 'none');
  await page.keyboard.press('Escape');
  assert.equal(await choice(), false);
  console.log('PASS enlarged viewport with text spacing, native checkbox in forced colors, no accidental consent');
  assert.deepEqual(errors, []);
} finally {
  releasePage();
  await context.close();
  await browser.close();
}
