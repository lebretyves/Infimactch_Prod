import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser=await chromium.launch({channel:'msedge'});
try {
  const context=await browser.newContext();let writes=0;
  await context.route('**/api/**',route=>{if(route.request().method()!=='GET')writes++;return route.fulfill({status:401,json:{}});});
  const page=await context.newPage();const base=process.env.BASE_URL||'http://127.0.0.1:4187';
  await page.goto(base+'/inscription/disponibilites');await page.getByRole('button',{name:'Tout refuser',exact:true}).click();
  await page.locator('[aria-current=step]').waitFor();
  assert.equal(await page.locator('nav[aria-label] > a, nav[aria-label] > span').count(),7);
  assert.match(await page.locator('[aria-current=step]').innerText(),/6/);
  await page.getByRole('button',{name:/Continuer/}).click();await page.waitForURL('**/inscription/consentements');await page.getByRole('heading',{name:'Consentements',exact:true}).waitFor();
  assert.match(await page.locator('[aria-current=step]').innerText(),/7/);
  await page.getByRole('link',{name:'Retour',exact:true}).click();await page.waitForURL('**/inscription/disponibilites');
  await page.goto(base+'/inscription/rib');await page.waitForURL('**/inscription/consentements');await page.getByRole('heading',{name:'Consentements',exact:true}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'Coordonnées bancaires'}).count(),0);
  assert.equal(writes,0);
  console.log('PASS seven-step signup, availability directly to consent, back navigation and legacy RIB redirect; no API writes.');
}finally{await browser.close();}
