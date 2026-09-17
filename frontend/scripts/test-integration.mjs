import { chromium } from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.E2E_BASE_URL||'http://127.0.0.1:5173';
if(!process.env.E2E_CREDENTIALS_FILE)throw new Error('Set E2E_CREDENTIALS_FILE to your private fictional seed credentials.');
const fixtures=JSON.parse(await readFile(process.env.E2E_CREDENTIALS_FILE,'utf8'));
const nurse=fixtures.find(v=>v.role==='NURSE');const agency=fixtures.find(v=>v.role==='AGENCY');
assert(nurse&&agency);
const browser=await chromium.launch({headless:process.env.E2E_HEADLESS==='1',executablePath:process.env.E2E_BROWSER_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const context=await browser.newContext();
const page=await context.newPage();const checks=[];
async function login(user){
 await page.goto(base+'/connexion');await page.getByRole('textbox',{name:'Adresse e-mail',exact:true}).fill(user.email);
 await page.locator('input[name=password]').fill(user.password);
 await page.locator('form').evaluate(el=>el.requestSubmit());
 await page.waitForURL(u=>['/accueil','/missions'].includes(u.pathname));await page.goto(base+'/accueil');await page.getByRole('heading',{name:'Mon activité'}).waitFor();
}
try{
 await page.goto(base+'/missions');await page.waitForURL('**/connexion');checks.push('protected_route_requires_session');
 await login(nurse);checks.push('nurse_login_real_backend');
 await page.reload();await page.getByRole('heading',{name:'Mon activité'}).waitFor();checks.push('session_survives_reload');
 const cookies=await context.cookies();assert(cookies.some(c=>c.name==='infimatch.sid'&&c.httpOnly&&c.sameSite==='Lax'));
 assert.equal(await page.evaluate(()=>localStorage.getItem('infimatch:auth_token')),null);checks.push('http_only_cookie_no_local_jwt');
 await page.goto(base+'/missions');await page.locator('article').first().waitFor();
 const internal=page.locator('article').filter({has:page.locator('a[href^="/missions/m_"]')}).first();await internal.waitFor();
 const href=await internal.locator('a[href^="/missions/m_"]').first().getAttribute('href');
 const favorite=internal.getByRole('button');const before=await favorite.getAttribute('aria-pressed');
 await favorite.click();await page.waitForFunction(()=>{const c=[...document.querySelectorAll('article')].find(a=>a.querySelector('a[href^="/missions/m_"]'));return c?.querySelector('button')?.disabled===false;});
 assert.notEqual(await favorite.getAttribute('aria-pressed'),before);
 await page.reload();await page.locator('article').first().waitFor();assert.notEqual(await favorite.getAttribute('aria-pressed'),before);
 await favorite.click();await page.waitForFunction(()=>{const c=[...document.querySelectorAll('article')].find(a=>a.querySelector('a[href^="/missions/m_"]'));return c?.querySelector('button')?.disabled===false;});assert.equal(await favorite.getAttribute('aria-pressed'),before);
 checks.push('favorite_persisted_then_restored');
 await page.goto(base+href);await page.getByRole('heading',{name:'La mission',exact:true}).waitFor();checks.push('internal_detail_real_backend');
 await page.goto(base+href+'/candidater');await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'Confirmer ma candidature'}).click();
 await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/RPPS|professionnel|vérifi/i);checks.push('ineligible_application_not_reported_as_sent');
 await page.goto(base+'/candidatures');await page.getByRole('heading',{name:'Mes candidatures',exact:true}).waitFor();
 await page.waitForFunction(()=>!document.querySelector('[role=status]'));assert.equal(await page.getByRole('alert').count(),0);checks.push('applications_loaded');
 const protectedWrite=await page.evaluate(async()=>{const r=await fetch('/api/v1/me/favorites',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})});return r.status;});assert.equal(protectedWrite,403);checks.push('server_rejects_missing_csrf');
 await page.getByRole('button',{name:'Déconnexion',exact:true}).click();await page.waitForURL('**/connexion');
 await page.goto(base+'/missions');await page.waitForURL('**/connexion');checks.push('logout_revokes_session');
 await login(agency);await page.goto(base+'/missions');await page.getByRole('heading',{name:'Missions de mon organisation'}).waitFor();
 await page.waitForFunction(()=>!document.querySelector('[role=status]'));assert.equal(await page.getByRole('alert').count(),0);checks.push('enterprise_session_and_missions');
 await page.getByRole('button',{name:'Déconnexion',exact:true}).click();await page.waitForURL('**/connexion');
 await mkdir('docs/proofs',{recursive:true});
 const proof={date:new Date().toISOString(),checks,scope:'Real local API with existing fictional seed. Positive application not exercised: nurse fixture RPPS_NOT_CHECKED.'};
 await writeFile('docs/proofs/integration-api.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof,null,2));
}finally{await browser.close();}
