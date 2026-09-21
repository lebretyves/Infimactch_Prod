import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const b=await chromium.launch({channel:'msedge',headless:true});
try {
 const p=await b.newPage({timezoneId:'America/Los_Angeles'});let empty=false;const offsets=[];
 const first=Array.from({length:50},(_,i)=>({id:'old'+i,mission_id:'old'+i,title:'Ancienne mission '+i,status:'COMPLETED',start_at:'2025-02-01T06:00:00Z',end_at:'2025-02-01T14:00:00Z',temporal_position:'past'}));
 const last={id:'paris',mission_id:'paris',title:'Mission du mois de Paris',status:'ACTIVE',start_at:'2026-03-31T22:00:00Z',end_at:'2026-04-01T06:00:00Z',temporal_position:'upcoming'};
 await p.addInitScript(()=>localStorage.setItem('infimatch:cookie-preferences',JSON.stringify({version:1,savedAt:new Date().toISOString(),google:false})));
 await p.route('**/api/**',r=>{const u=new URL(r.request().url()),path=u.pathname.replace('/api/v1','');let json={};if(path==='/auth/me')json={id:'fixture',family:'NURSE',email:'fixture@example.invalid',organizations:[]};else if(path==='/auth/activity')json={idleExpiresAt:Date.now()+900000};else if(path==='/me/history'){const offset=Number(u.searchParams.get('offset'));offsets.push(offset);json=empty?[]:offset===0?first:[last];}else if(path==='/profile')json={display_name:'Fixture',details:{},qualifications:['IDE']};return r.fulfill({json});});
 await p.goto('http://127.0.0.1:4187/historique');await p.getByLabel('Mois',{exact:true}).waitFor();assert.deepEqual([...new Set(offsets)],[0,50]);
 assert.equal(await p.getByLabel('Mois',{exact:true}).locator('option').count(),13);
 await p.getByLabel('Mois',{exact:true}).selectOption('4');await p.getByLabel('Ann\u00e9e',{exact:true}).selectOption('2026');assert.equal(await p.locator('tbody tr').count(),1);await p.getByText(last.title,{exact:true}).waitFor();
 await p.getByRole('button',{name:'Voir',exact:true}).click();await p.getByRole('region',{name:'D\u00e9tails de la mission'}).waitFor();await p.getByLabel('Mois',{exact:true}).selectOption('3');assert.equal(await p.locator('tbody tr').count(),0);assert.equal(await p.getByRole('region',{name:'D\u00e9tails de la mission'}).count(),0);
 await p.getByLabel('Mois',{exact:true}).selectOption('');await p.getByLabel('Ann\u00e9e',{exact:true}).selectOption('');assert.equal(await p.locator('tbody tr').count(),51);
 await p.getByLabel('Statut dans le planning').selectOption('past');assert.equal(await p.locator('tbody tr').count(),50);
 for(const width of [320,375,768,1440]){await p.setViewportSize({width,height:1000});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if([375,1440].includes(width))await p.screenshot({path:'E:/Interimatch/audits/history-period-'+width+'.png',fullPage:true});}
 empty=true;await p.reload();await p.getByLabel('Mois',{exact:true}).waitFor();assert.equal(await p.getByLabel('Mois',{exact:true}).locator('option').count(),13);assert((await p.getByLabel('Ann\u00e9e',{exact:true}).locator('option').count())>=2);await p.getByLabel('Mois',{exact:true}).selectOption('12');await p.getByRole('heading',{name:'Aucune mission pour cette s\u00e9lection'}).waitFor();
 console.log('PASS all API pages, Paris month from non-Paris browser, month/year/status filters, selected detail cleared, empty choices, responsive4widths. Mock only.');
} finally {await b.close();}
