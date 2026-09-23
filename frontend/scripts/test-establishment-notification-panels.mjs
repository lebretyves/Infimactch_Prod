import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:4199';
const browser=await chromium.launch(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{});
const titles=['Votre activité','Notifications Discord','Suivi de mes emails','Suivi des envois Discord'];
const catalog={CONFIRMATION:'Affectation confirmée',APPLICATION_SUBMITTED:'Candidature envoyée'};
async function fixture(role,{onboarding=false,linked=true}={}) {
 const context=await browser.newContext();
 const org={id:'org-fixture',kind:role==='etablissement'?'ESTABLISHMENT':'AGENCY',name:'Établissement de test'};
 const state={writes:[],failSave:false,failEmails:false,emailReads:0};
 const destinations=[];
 await context.addInitScript(()=>localStorage.setItem('infimatch:cookie-preferences',JSON.stringify({version:1,savedAt:new Date().toISOString(),google:false})));
 await context.route('**/api/**',route=>{
  const req=route.request(),path=new URL(req.url()).pathname.replace(/^\/api\/v1/,'');
  const send=json=>route.fulfill({json});
  if(path==='/auth/me')return send({id:'fixture',email:'fixture@example.invalid',family:role==='interimaire'?'NURSE':'ENTERPRISE',organizations:role==='interimaire'?[]:[org]});
  if(path==='/auth/csrf')return send({csrfToken:'fixture'});
  if(path==='/auth/activity')return send({idleExpiresAt:Date.now()+900000});
  if(path==='/profile')return send({display_name:'Fixture',qualifications:['IDE'],details:{},available:[]});
  if(path==='/me/organizations')return send({organizations:role==='interimaire'?[]:[org],links:[]});
  if(path==='/me/notifications-settings')return send({configured:true,link:linked?{discord_user_id:'123456789012345678'}:null,destinations,catalog,organizationKinds:Object.keys(catalog),preferences:[]});
  if(req.method()==='PUT'){
   assert.equal(path,'/me/notifications-settings/organizations/'+org.id+'/discord');
   state.writes.push(req.postDataJSON());
   if(state.failSave)return route.fulfill({status:503,json:{message:'Sauvegarde indisponible temporairement'}});
   destinations.splice(0,destinations.length,{id:'org-dest',organization_id:org.id,user_id:null,target_id:req.postDataJSON().channelId,...req.postDataJSON()});
   return send({ok:true});
  }
  if(path==='/me/email-deliveries'){
   state.emailReads++;
   if(state.failEmails)return route.fulfill({status:503,json:{message:'Journal indisponible'}});
   return send({items:[],limit:50,observedAt:new Date().toISOString()});
  }
  if(path==='/me/notifications')return send([{id:'notice-fixture',kind:'CONFIRMATION',message:'Mission confirmée',href:'/historique',created_at:'2026-09-21T10:00:00Z',read_at:null}]);
  if(path==='/me/notifications-settings/deliveries')return send([]);
  throw new Error('Unexpected request '+path);
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/notifications'+(onboarding?'?bienvenue=1':''));
 await page.getByRole('heading',{name:'Notifications',exact:true}).waitFor();
 await page.waitForFunction(()=>!document.body.textContent.includes('Chargement…'));
 return {context,page,state,errors};
}
try {
 const f=await fixture('etablissement');const {page,state}=f;
 const panels=page.locator('details').filter({has:page.locator('summary h2')});
 assert.equal(await panels.count(),4);
 assert.deepEqual(await panels.locator('summary h2').allTextContents(),titles);
 assert.deepEqual(await panels.evaluateAll(es=>es.map(e=>e.open)),[true,false,false,false]);
 const discord=panels.nth(1),summary=discord.locator('summary');
 await summary.focus();await page.keyboard.press('Enter');assert.equal(await discord.evaluate(e=>e.open),true);
 await panels.first().locator('summary').click();assert.equal(await discord.evaluate(e=>e.open),true,'independent panels');
 const orgForm=discord.locator('form').filter({has:page.getByLabel('Identifiant du salon privé')});
 const input=orgForm.getByLabel('Identifiant du salon privé');await input.waitFor();
 await orgForm.getByRole('checkbox',{name:'Recevoir les notifications Discord',exact:true}).check();
 await input.fill('223456789012345678');
 await orgForm.getByRole('checkbox',{name:catalog.CONFIRMATION,exact:true}).uncheck();
 await input.evaluate(e=>e.dataset.retained='yes');
 await summary.click();await summary.focus();await page.keyboard.press('Space');
 assert.equal(await input.inputValue(),'223456789012345678');assert.equal(await input.getAttribute('data-retained'),'yes','same mounted input');
 assert.equal(await orgForm.getByRole('checkbox',{name:catalog.CONFIRMATION,exact:true}).isChecked(),false);
 state.failSave=true;await orgForm.getByRole('button',{name:'Enregistrer les préférences',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Sauvegarde indisponible temporairement'}).waitFor();
 assert.equal(await input.inputValue(),'223456789012345678');
 state.failSave=false;await orgForm.getByRole('button',{name:'Enregistrer les préférences',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Salon et préférences enregistrés.'}).waitFor();
 assert.equal(state.writes.length,2);assert.deepEqual(state.writes[1],{enabled:true,events:['APPLICATION_SUBMITTED'],channelId:'223456789012345678'});
 const emails=panels.nth(2);await emails.locator('summary').click();state.failEmails=true;
 await emails.getByRole('button',{name:'Actualiser les emails'}).click();await emails.getByRole('alert').waitFor();
 state.failEmails=false;await emails.getByRole('button',{name:'Actualiser les emails'}).click();await emails.getByText('Aucun email de mission enregistré pour ce compte.').waitFor();
 for(const width of [1440,375]){
  await page.setViewportSize({width,height:1000});
  for(const panel of await panels.all())if(await panel.evaluate(e=>e.open))await panel.locator('summary').click();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(process.env.CAPTURE_DIR)await page.screenshot({path:process.env.CAPTURE_DIR+'/notification-panels-closed-'+width+'.png',fullPage:true});
  await summary.click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(process.env.CAPTURE_DIR)await page.screenshot({path:process.env.CAPTURE_DIR+'/notification-panels-discord-'+width+'.png',fullPage:true});
 }
 assert.deepEqual(f.errors,[]);await f.context.close();
 const agency=await fixture('entreprise');
 assert.equal(await agency.page.locator('details > summary > h2').count(),4);
 assert.equal(await agency.page.locator('details[open]').count(),1);
 await agency.page.locator('summary').filter({hasText:titles[1]}).click();
 assert(await agency.page.getByRole('heading',{name:titles[1],exact:true}).isVisible());
 await agency.context.close();
 for(const [role,onboarding] of [['interimaire',false],['entreprise',true],['etablissement',true]]){
  const f=await fixture(role,{onboarding});
  assert.equal(await f.page.locator('summary h2').count(),0,role+' unchanged');
  assert(await f.page.getByRole('heading',{name:'Notifications Discord',exact:true}).isVisible());
  if(onboarding)assert(await f.page.getByRole('link',{name:'Passer cette étape'}).isVisible());
  assert.deepEqual(f.errors,[]);await f.context.close();
 }
 console.log('PASS establishment and agency four independent panels (activity open by default), keyboard, mounted form drafts, save retry, email retry, responsive; other roles/onboarding unchanged');
}finally{await browser.close();}
