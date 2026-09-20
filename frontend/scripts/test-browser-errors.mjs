import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:4187';
const browser=await chromium.launch(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{});
const journal={items:[],limit:50,observedAt:'2026-09-20T00:00:00Z'};
const weights={weights:{C:.45,Z:.25,D:.2,E:.1}};
try{
for(const target of ['emails','rules'])for(const mode of ['missing','server','malformed','slow']){
 const context=await browser.newContext();let state=mode,release;const gate=new Promise(r=>release=r);
 await context.addInitScript(()=>localStorage.setItem('infimatch:cookie-preferences',JSON.stringify({version:1,savedAt:new Date().toISOString(),google:false})));
 await context.route('**/api/**',async route=>{
  const p=new URL(route.request().url()).pathname;
  if(p.endsWith(target==='emails'?'/me/email-deliveries':'/matching/rules')){
   if(state==='slow')await gate;
   if(state==='missing')return route.abort('failed');
   if(state==='server')return route.fulfill({status:503,json:{message:'PRIVATE_TECHNICAL_ERROR'}});
   if(state==='malformed')return route.fulfill({json:target==='emails'?{items:[{events:null}]}:{weights:{C:'wrong'}}});
   return route.fulfill({json:target==='emails'?journal:weights});
  }
  let json=[];
  if(p.endsWith('/auth/me'))json={id:'fixture',email:'fixture@example.invalid',family:'NURSE',organizations:[]};
  else if(p.endsWith('/profile'))json={display_name:'Fixture',qualifications:['IDE'],details:{},available:[]};
  else if(p.endsWith('/me/notifications-settings'))json={configured:false,link:null,destinations:[],catalog:{},organizationKinds:[],preferences:[]};
  else if(p.endsWith('/me/email-deliveries'))json=journal;
  else if(p.endsWith('/matching/rules'))json=weights;
  else if(p.endsWith('/listings/search'))json={items:[],total:0,offset:0,limit:20};
  else if(p.endsWith('/reference-data'))json={ideServices:[],blockSpecialties:[]};
  await route.fulfill({json});
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+(target==='emails'?'/notifications':'/missions'));
 if(target==='rules')await page.getByText('Comprendre les règles du matching',{exact:true}).click();
 if(mode==='slow'){
  await page.getByRole('status').filter({hasText:target==='emails'?'Chargement du suivi':'Chargement des pondérations'}).waitFor();
  state='good';release();
 }else{
  const alert=page.getByRole('alert').filter({hasText:target==='emails'?'Suivi des emails indisponible':'Pondérations indisponibles'});await alert.waitFor();
  assert.ok(!(await page.locator('body').innerText()).includes('PRIVATE_TECHNICAL_ERROR'));
  state='good';await (target==='emails'?page.getByRole('button',{name:'Actualiser les emails'}):alert.getByRole('button',{name:'Réessayer'})).click();
 }
 await page.getByText(target==='emails'?'Aucun email de mission enregistré pour ce compte.':'Compétences souhaitées : 45 %',{exact:false}).waitFor();
 assert.deepEqual(errors,[]);await context.close();console.log('PASS',target,mode,'and recovery');
}
const context=await browser.newContext();let malformed=true;
await context.addInitScript(()=>localStorage.setItem('infimatch:cookie-preferences',JSON.stringify({version:1,savedAt:new Date().toISOString(),google:false})));
await context.route('**/api/**',route=>{
 const p=new URL(route.request().url()).pathname;let json=[];
 if(p.endsWith('/auth/me'))json={id:'fixture',family:'NURSE',email:'fixture@example.invalid',organizations:[]};
 else if(p.endsWith('/profile'))json={display_name:'Fixture',qualifications:['IDE'],details:{}};
 else if(p.endsWith('/me/notifications-settings'))json={configured:false,link:null,destinations:[],catalog:{},organizationKinds:[],preferences:[]};
 else if(p.endsWith('/me/email-deliveries'))json=journal;
 else if(p.endsWith('/me/notifications'))json=malformed?[{id:'bad',kind:'MATCH',message:{invalid:true},href:'/accueil',read_at:null,created_at:'2026-09-20T00:00:00Z'}]:[];
 return route.fulfill({json});
});
const page=await context.newPage();await page.goto(base+'/notifications');
await page.getByRole('heading',{name:'Cette page n’a pas pu s’afficher'}).waitFor();
assert.ok(!(await page.locator('body').innerText()).includes('Unexpected Application Error'));
assert.equal(await page.getByRole('link',{name:'Revenir à l’accueil'}).getAttribute('href'),'/');
malformed=false;await page.getByRole('button',{name:'Réessayer',exact:true}).click();
await page.getByRole('heading',{name:'Notifications',exact:true}).waitFor();
console.log('PASS render fallback, safe message and reload recovery');await context.close();
}finally{await browser.close();}
