import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:4187';
const id='11111111-1111-4111-8111-111111111111';
const browser=await chromium.launch(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{});
try{
 const context=await browser.newContext();let read=false,attempts=0,fail=false;
 await context.route('**/api/**',async route=>{
  const p=new URL(route.request().url()).pathname;let json=[];
  if(p.endsWith('/auth/me'))json={id:'fixture',email:'fixture@example.invalid',family:'NURSE',organizations:[]};
  else if(p.endsWith('/profile'))json={display_name:'Fixture',qualifications:['IDE'],details:{}};
  else if(p.endsWith('/me/email-deliveries'))json={items:[],limit:50,observedAt:new Date().toISOString()};
  else if(p.endsWith('/auth/csrf'))json={csrfToken:'fixture'};
  else if(p.endsWith('/me/notifications-settings'))json={configured:false,link:null,destinations:[],catalog:{MATCH:'Mission'},organizationKinds:[],preferences:[]};
  else if(p.endsWith('/me/notifications'))json=[{id,kind:'MATCH',message:'Mission de test',href:'/compte?section=preferences#contact',read_at:read?'2026-09-18T00:00:00Z':null,created_at:'2026-09-18T00:00:00Z'}];
  else if(p.endsWith('/'+id+'/read')){attempts++;if(fail)return route.fulfill({status:503,json:{message:'Test indisponible'}});read=true;json={ok:true};}
  return route.fulfill({json});
 });
 const page=await context.newPage();await page.goto(base+'/notifications');const consent=page.getByRole('button',{name:'Tout refuser',exact:true});if(await consent.count())await consent.click();
 await page.getByRole('link',{name:'Consulter',exact:true}).waitFor();assert.equal(attempts,0);assert.equal(await page.getByRole('button',{name:'Marquer comme lue'}).count(),0);
 await page.getByRole('link',{name:'Consulter',exact:true}).click();await page.waitForURL('**/compte?section=preferences#contact');assert.equal(read,true);
 await page.goto(base+'/notifications');await page.getByRole('link',{name:'Consulter',exact:true}).waitFor();assert.equal(await page.getByText('Mission — Non lue',{exact:true}).count(),0);
 read=false;await page.goto(base+'/compte?notification='+id);await page.waitForURL('**/compte');assert.equal(read,true,'Discord-style direct link marks automatically');
 const before=attempts;await page.goto(base+'/compte?notification=invalid');await page.getByRole('heading',{name:'Mon compte',exact:true}).waitFor();assert.equal(attempts,before,'Invalid marker ignored');
 fail=true;read=false;await page.goto(base+'/compte?notification='+id);await page.getByRole('status').filter({hasText:'statut de lecture'}).waitFor();assert.equal(read,false);await page.getByRole('heading',{name:'Mon compte',exact:true}).waitFor();
 console.log('PASS: no manual validation, consultation and direct link auto-read, existing query/hash preserved, invalid marker ignored, failure nonblocking and never falsely read. Mock APIs only; no Discord message.');
}finally{await browser.close();}
