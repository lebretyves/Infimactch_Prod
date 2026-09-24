import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.ADMIN_BASE_URL||'http://127.0.0.1:4189';
const browser=await chromium.launch({channel:'msedge'});
try {
 const context=await browser.newContext();let status='IN_PROGRESS',reads=0,posts=0,legacy=false,httpFailure=false;
 await context.route('**/api/v1/admin/**',route=>{
  const path=new URL(route.request().url()).pathname;let body={};
  if(path.endsWith('/me'))body={id:'fixture-admin',email:'fixture@example.invalid',role:'OPS',permissions:['sources','sources:write'],confirmedAt:new Date().toISOString()};
  else if(path.endsWith('/csrf'))body={csrfToken:'fixture'};
  else if(path.endsWith('/refresh')){posts++;if(httpFailure)return route.fulfill({status:503,json:{message:'Source temporairement indisponible.'}});body={status};}
  else if(path.endsWith('/operations')){reads++;body={observedAt:'2030-01-01T12:00:00Z',sources:[{provider:'JOBSPIPE',enabled:true,nextScheduleLabel:'Cycle quotidien, reprise toutes les 30 minutes',lastRun:{status:'SUCCESS',created_at:'2030-01-01',accepted:100},counts:{total:254,active:250,localized:210},collection:legacy?null:{status,observed:500,pages:5,remainingQueries:3,creditsUsed:1000,creditLimit:1000,startedAt:'2030-01-01',completedAt:null,retryAt:'2030-02-01'}}],incidents:[]};}
  return route.fulfill({status:200,json:body});
 });
 const page=await context.newPage();await page.goto(base+'/#/operations');
 await page.getByRole('heading',{name:'Collecte en cours',exact:true}).waitFor();await page.getByText('Offres avec coordonnées connues',{exact:true}).waitFor();
 assert.equal(await page.getByText('1 000 crédits par mois au maximum',{exact:false}).isVisible(),true);
 async function refresh(next){status=next;await page.getByRole('button',{name:'Poursuivre ou actualiser la collecte',exact:true}).click();await page.getByLabel('Justification (journalisée)').fill('Vérification fictive du suivi de collecte.');const before=reads;await page.getByRole('button',{name:'Confirmer l’opération',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('button[disabled][type=submit]'));await page.waitForTimeout(100);assert.ok(reads>before);}
 await refresh('IN_PROGRESS');await page.getByRole('status').filter({hasText:'des pages restent'}).waitFor();assert.equal(await page.getByRole('dialog').count(),0);
 for(const next of ['QUOTA_EXHAUSTED','AUTH_REQUIRED','INCOMPLETE','RETRY_REQUIRED']){await refresh(next);await page.getByRole('alert').waitFor();assert.equal(await page.getByRole('status').filter({hasText:'Opération enregistrée'}).count(),0);await page.getByRole('button',{name:'Annuler',exact:true}).click();}
 httpFailure=true;await refresh('RETRY_REQUIRED');await page.getByRole('alert').filter({hasText:'Source temporairement indisponible'}).waitFor();await page.getByRole('button',{name:'Annuler',exact:true}).click();httpFailure=false;
 status='QUOTA_EXHAUSTED';await page.getByRole('button',{name:'Actualiser',exact:true}).click();await page.getByRole('heading',{name:'Quota épuisé',exact:true}).waitFor();
 for(const width of [375,1440]){await page.setViewportSize({width,height:950});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:`../InfiMatch/annexe/quality/admin-import-status-${width}.png`,fullPage:true});}
 legacy=true;await page.getByRole('button',{name:'Actualiser',exact:true}).click();await page.getByText('Avancement global non disponible',{exact:false}).waitFor();assert.equal(posts,6);
 console.log('PASS admin import progress/quota/auth/incomplete/retry and HTTP failure: never false success, reload each outcome, legacy API, localized counts, 375/1440. All API requests mocked.');
}finally{await browser.close();}
