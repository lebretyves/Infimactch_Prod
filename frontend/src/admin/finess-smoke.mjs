import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('dist-admin');
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+(req.url==='/'?'/index.html':new URL(req.url,'http://localhost').pathname));if(!path.startsWith(root))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},timezoneId:'America/Los_Angeles'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let status='CURRENT';let calls=0;
 await page.route('**/api/v1/admin/**',async route=>{const path=new URL(route.request().url()).pathname;let json={};if(path.endsWith('/me'))json={id:'fixture',email:'admin@example.invalid',role:'OWNER',permissions:['overview','sources'],confirmedAt:'2026-09-17T00:00:00Z'};else {calls++;json={counts:{},alerts:[],items:[],finessReference:{status,generatedAt:status==='MISSING'?null:'2026-09-17T23:30:00Z',importedAt:'2026-09-20T10:00:00Z',expiresAt:'2026-10-17T23:30:00Z',daysRemaining:status==='CURRENT'?20:status==='DUE'?7:status==='EXPIRED'?-3:null,ageDays:10,establishmentCount:104735,message:'Observation simulée du référentiel.',sourceUrl:status==='INVALID'?'javascript:alert(1)':'https://www.data.gouv.fr/',policyMonths:1,warningDays:7}};}await route.fulfill({json});});
 await page.goto(process.env.BASE_URL || `http://127.0.0.1:${server.address().port}/`);
 const card=page.getByRole('region',{name:'Validité du référentiel FINESS'});await card.waitFor();
 assert.match(await card.innerText(),/J-20/);assert.match(await card.innerText(),/18 sept. 2026/);
 for(const next of ['DUE','EXPIRED','MISSING','INVALID']){status=next;await page.getByRole('button',{name:'Actualiser',exact:true}).click();await page.locator(`.admin-finess[data-state="${next}"]`).waitFor();const text=await card.innerText();if(next==='DUE')assert.match(text,/J-7/);if(next==='EXPIRED')assert.match(text,/Dépassée de 3 jours/);if(next==='MISSING')assert.match(text,/Référentiel absent/);if(next==='INVALID')assert.equal(await card.getByRole('link').count(),0);}
 status='DUE';await page.getByRole('link',{name:'Sources de données',exact:true}).click();await page.locator('.admin-finess[data-state="DUE"]').waitFor();
 await mkdir('artifacts/admin-finess',{recursive:true});
 for(const width of [1440,375]){await page.setViewportSize({width,height:1000});await card.screenshot({path:`artifacts/admin-finess/finess-${width}.png`});assert.equal(await card.evaluate(e=>e.scrollWidth<=e.clientWidth),true);}
 assert.ok(calls>=6);assert.deepEqual(errors,[]);console.log('PASS CURRENT/DUE/EXPIRED/MISSING/INVALID, Paris dates, source URL safety, refresh, both pages, 375/1440');
}finally{await browser.close();await new Promise(r=>server.close(r));}
