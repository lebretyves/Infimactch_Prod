import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:4187';
const browser=await chromium.launch({channel:'msedge',headless:true});
const out='annexe/proofs/compact-month';await mkdir(out,{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:375,height:950}}),writes=[],errors=[];
 let failSave=false;
 let profile={display_name:'Fixture',qualifications:['IDE'],skills:[],experience:[],available:[],unavailable:[],accepted_shifts:[],preferred_shifts:[],visible:true,rpps_status:'FOUND',latitude:null,longitude:null,radius_km:null,details:{city:'Paris'}};
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;let json={};
 if(path.endsWith('/auth/me'))json={id:'fixture',email:'fixture@example.invalid',family:'NURSE',organizations:[]};
 else if(path.endsWith('/profile'))json=profile;
 else if(path.endsWith('/me/history'))json=[{id:'assignment-fixture',mission_id:'mission-fixture',title:'Mission fictive confirmée',status:'ACTIVE',start_at:'2026-10-20T04:00:00Z',end_at:'2026-10-20T12:00:00Z'}];
 else if(path.endsWith('/auth/csrf'))json={csrfToken:'fixture'};
 else if(path.endsWith('/profile/availability')){if(failSave)return route.fulfill({status:503,json:{message:'Enregistrement temporairement indisponible'}});const body=route.request().postDataJSON();writes.push(body);for(const c of body.changes){profile.available=profile.available.filter(p=>p.start!==c.start);profile.unavailable=profile.unavailable.filter(p=>p.start!==c.start);if(c.state==='available')profile.available.push({start:c.start,end:c.end});if(c.state==='unavailable')profile.unavailable.push({start:c.start,end:c.end});}json={available:profile.available,unavailable:profile.unavailable};}
 await route.fulfill({json});});
 await page.goto(base+'/calendrier');const consent=page.getByRole('button',{name:'Tout refuser',exact:true});if(await consent.count())await consent.click();
 await page.getByLabel('Aller à la date').fill('2026-10-15');await page.getByLabel('Vue du calendrier').selectOption('month');
 assert.equal(await page.locator('[data-day]').count(),35);
 const day=page.locator('[data-day="2026-10-15"]');await day.focus();await page.keyboard.press('Enter');
 await page.getByRole('dialog',{name:'Modifier mes créneaux'}).waitFor();
 const slot=page.locator('button[data-date="2026-10-15"][data-slot="morning"]');
 failSave=true;await slot.click();await page.getByRole('dialog').getByRole('alert').waitFor();assert.equal(await slot.getAttribute('data-state'),'unset');assert.equal(writes.length,0);failSave=false;
 for(const state of ['available','unavailable','unset']){await slot.click();await page.waitForFunction(s=>document.querySelector('button[data-date="2026-10-15"][data-slot="morning"]')?.getAttribute('data-state')===s,state);assert.equal(writes.at(-1).changes[0].state,state);assert.equal(await day.locator('[data-indicator-slot="morning"]').getAttribute('data-state'),state);}
 await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'});assert.equal(await day.evaluate(el=>el===document.activeElement),true);
 await page.locator('[data-day="2026-10-20"] [data-indicator-slot="morning"]').click();const reserved=page.locator('button[data-date="2026-10-20"][data-slot="morning"]');assert.equal(await reserved.isDisabled(),true);assert.match(await reserved.getAttribute('aria-label'),/Mission confirmée/);assert.equal(await page.locator('[data-day="2026-10-20"] [data-indicator-slot="morning"]').getAttribute('data-state'),'confirmed');
 await page.getByRole('button',{name:'Fermer',exact:true}).click();
 await page.locator('[data-day="2026-10-24"]').click();await page.locator('button[data-date="2026-10-24"][data-slot="night"]').click();await page.waitForFunction(()=>document.querySelector('button[data-date="2026-10-24"][data-slot="night"]')?.getAttribute('data-state')==='available');assert.deepEqual(writes.at(-1).changes[0],{start:'2026-10-24T20:00:00.000Z',end:'2026-10-25T05:00:00.000Z',state:'available'});
 await page.getByRole('button',{name:'Fermer',exact:true}).click();assert.equal(await page.locator('[data-day="2026-10-24"]').evaluate(el=>el===document.activeElement),true);
 for(const width of [375,768,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);const bounds=await page.locator('[data-day]').evaluateAll(nodes=>({rows:new Set(nodes.map(n=>Math.round(n.getBoundingClientRect().top))).size,height:Math.max(...nodes.map(n=>n.getBoundingClientRect().bottom))-Math.min(...nodes.map(n=>n.getBoundingClientRect().top)),first:nodes[0].getBoundingClientRect().top,seventh:nodes[6].getBoundingClientRect().top}));assert.equal(bounds.rows,5);assert.equal(bounds.first,bounds.seventh);assert.ok(bounds.height<370);await page.getByRole('region',{name:'Calendrier de vos disponibilités'}).screenshot({path:out+'/month-'+width+'.png'});}
 await page.getByRole('button',{name:'Mois suivant',exact:true}).click();assert.equal(await page.locator('[data-day="2026-11-15"]').count(),1);
 await page.getByLabel('Vue du calendrier').selectOption('week');assert.equal(await page.locator('button[data-slot]').count(),21);assert.equal(await page.locator('[data-day]').count(),0);
 assert.equal(await page.getByRole('combobox',{name:'Ville de référence'}).count(),1);assert.deepEqual(errors,[]);console.log('PASS compact month: 7 columns, 35 day targets, keyboard/dialog editing, Escape focus restoration, indicator clicks, three-state persistence, visible save error and retry, confirmed lock, DST night, month/week navigation, mobility retained, no overflow375/768/1440.');
}finally{await browser.close();}
