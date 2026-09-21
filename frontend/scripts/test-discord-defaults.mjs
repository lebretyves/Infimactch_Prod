import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:4199';
const browser=await chromium.launch(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{});
const catalog={MATCH:'Nouvelle mission compatible',CONFIRMATION:'Affectation confirmée',WELCOME:'Bienvenue',MISSION_PUBLISHED:'Mission publiée',APPLICATION_SUBMITTED:'Candidature envoyée'};
const organizationKinds=['CONFIRMATION','MISSION_PUBLISHED','APPLICATION_SUBMITTED'];
const personalKinds=Object.keys(catalog).filter(k=>k!=='MISSION_PUBLISHED');
try {
 for(const role of ['NURSE','ENTERPRISE']){
  const context=await browser.newContext();const writes=[],errors=[];
  const organization={id:'10000000-0000-4000-8000-000000000002',kind:'AGENCY',name:'Agence de test'};
  const state={destinations:[{id:'personal',user_id:'fixture',organization_id:null,enabled:false,events:[],target_id:'123456789012345678'}]};
  await context.addInitScript(()=>localStorage.setItem('infimatch:cookie-preferences',JSON.stringify({version:1,savedAt:new Date().toISOString(),google:false})));
  await context.route('**/api/**',route=>{
   const req=route.request(),p=new URL(req.url()).pathname.replace(/^\/api\/v1/,'');
   const send=json=>route.fulfill({json});
   if(p==='/auth/me')return send({id:'fixture',email:'fixture@example.invalid',family:role,organizations:role==='ENTERPRISE'?[organization]:[]});
   if(p==='/profile')return send({display_name:'Fixture',qualifications:['IDE'],details:{},available:[]});
   if(p==='/auth/csrf')return send({csrfToken:'fixture'});
   if(p==='/auth/activity')return send({idleExpiresAt:Date.now()+900000});
   if(p==='/me/organizations')return send({organizations:role==='ENTERPRISE'?[organization]:[],links:[]});
   if(p==='/me/notifications-settings')return send({configured:true,link:{discord_user_id:'123456789012345678'},destinations:state.destinations,catalog,organizationKinds,preferences:[]});
   if(req.method()==='PUT'){
    const body=req.postDataJSON();writes.push({path:p,body});
    if(p==='/me/notifications-settings/discord')state.destinations[0]={...state.destinations[0],...body};
    else if(p==='/me/notifications-settings/organizations/'+organization.id+'/discord')state.destinations.push({id:'org',user_id:null,organization_id:organization.id,...body,target_id:body.channelId});
    else throw new Error('Unexpected preference write');
    return send({ok:true});
   }
   if(p==='/me/email-deliveries')return send({items:[],limit:50,observedAt:new Date().toISOString()});
   if(p==='/me/notifications'||p==='/me/notifications-settings/deliveries')return send([]);
   throw new Error('Unexpected request '+p);
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/notifications?bienvenue=1');
  const forms=page.locator('form').filter({has:page.getByRole('checkbox',{name:'Recevoir les notifications Discord',exact:true})});
  const personal=forms.first();
  const activate=personal.getByRole('checkbox',{name:'Recevoir les notifications Discord',exact:true});
  await activate.waitFor();assert.equal(await activate.isChecked(),false);assert.equal(writes.length,0);
  await activate.check();
  for(const kind of personalKinds)assert.equal(await personal.getByRole('checkbox',{name:catalog[kind],exact:true}).isChecked(),true);
  assert.equal(await personal.getByRole('checkbox',{name:catalog.MISSION_PUBLISHED,exact:true}).count(),0);
  assert.equal(writes.length,0,'checking the box alone must not write preferences');
  await personal.getByRole('button',{name:'Enregistrer les préférences',exact:true}).click();
  await page.getByText('Préférences enregistrées.',{exact:true}).waitFor();
  assert.equal(writes[0].body.enabled,true);assert.deepEqual(writes[0].body.events.slice().sort(),personalKinds.slice().sort());
  await page.reload();await activate.waitFor();assert.equal(await activate.isChecked(),true);
  await personal.getByRole('checkbox',{name:catalog.MATCH,exact:true}).uncheck();
  await personal.getByRole('button',{name:'Enregistrer les préférences',exact:true}).click();
  await page.getByText('Préférences enregistrées.',{exact:true}).waitFor();
  await page.reload();await activate.waitFor();
  assert.equal(await personal.getByRole('checkbox',{name:catalog.MATCH,exact:true}).isChecked(),false);
  await activate.uncheck();await activate.check();
  assert.equal(await personal.getByRole('checkbox',{name:catalog.MATCH,exact:true}).isChecked(),false,'a custom selection must survive disabling/re-enabling');
  console.log('PASS',role,'all personal events selected on activation, explicit save and custom choices retained');
  if(role==='ENTERPRISE'){
   const org=forms.nth(1);
   await org.getByRole('checkbox',{name:'Recevoir les notifications Discord',exact:true}).check();
   for(const kind of organizationKinds)assert.equal(await org.getByRole('checkbox',{name:catalog[kind],exact:true}).isChecked(),true);
   assert.equal(await org.getByRole('checkbox',{name:catalog.WELCOME,exact:true}).count(),0);
   assert.equal(await org.getByRole('checkbox',{name:catalog.MATCH,exact:true}).count(),0);
   await org.getByLabel('Identifiant du salon privé').fill('223456789012345678');
   await org.getByRole('button',{name:'Enregistrer les préférences',exact:true}).click();
   await page.getByText('Salon et préférences enregistrés.',{exact:true}).waitFor();
   assert.deepEqual(writes.at(-1).body.events.slice().sort(),organizationKinds.slice().sort());
   assert.equal(writes.at(-1).body.enabled,true);
   console.log('PASS organization defaults contain all organization events and no personal-only event');
  }
  assert.deepEqual(errors,[]);await context.close();
 }
}finally{await browser.close();}
