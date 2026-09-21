import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:4199';
const browser=await chromium.launch(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{});
const id='10000000-0000-4000-8000-000000000003';
const mission={id:'m_'+id,title:'Mission de démonstration',description:'Mission fictive pour tester une candidature.',status:'OPEN',version:1,qualification:'IDE',service:'URGENCES',start_at:'2037-01-10T08:00:00Z',end_at:'2037-01-10T16:00:00Z',hourly_salary:25,address:'Paris',required_skills:[],min_experience_months:0};
try{
 for(const optional of [true,false]){
  const context=await browser.newContext(),writes=[],errors=[];
  await context.addInitScript(()=>localStorage.setItem('infimatch:cookie-preferences',JSON.stringify({version:1,savedAt:new Date().toISOString(),google:false})));
  await context.route('**/api/**',route=>{
   const req=route.request(),p=new URL(req.url()).pathname.replace(/^\/api\/v1/,'');
   const send=json=>route.fulfill({json});
   if(p==='/auth/me')return send({id:'fixture',email:'fixture@example.invalid',family:'NURSE',organizations:[]});
   if(p==='/profile')return send({display_name:'Test',qualifications:['IDE'],rpps_status:'NOT_CHECKED',rpps_number:null,details:{},available:[]});
   if(p==='/auth/csrf')return send({csrfToken:'fixture'});
   if(p==='/auth/activity')return send({idleExpiresAt:Date.now()+900000});
   if(p==='/listings/m_'+id)return send(mission);
   if(p==='/missions/'+id+'/application-check')return send({warnings:optional?['RPPS_OPTIONAL_DEMO']:[],blockingReasons:optional?[]:['RPPS_NOT_CHECKED'],missingSkills:[],experienceMonths:0,requiredExperienceMonths:0,distanceKm:0});
   if(p==='/missions/'+id+'/applications'&&req.method()==='POST'){
    assert.equal(optional,true);writes.push(req.postDataJSON());return send({warnings:['RPPS_OPTIONAL_DEMO']});
   }
   throw new Error('Unexpected request '+p);
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/missions/m_'+id+'/candidater');
  const confirm=page.getByRole('checkbox');
  await confirm.check();
  if(optional){
   await page.getByText('Projet de démonstration : le RPPS est facultatif.',{exact:false}).waitFor();
   assert.equal(await page.getByRole('link',{name:'Vérifier mon numéro RPPS',exact:true}).count(),0);
   await page.getByRole('button',{name:'Envoyer quand même ma candidature',exact:true}).click();
   await page.getByRole('heading',{name:'Candidature enregistrée',exact:true}).waitFor();
   assert.equal(writes.length,1);assert.equal(writes[0].version,1);
  }else{
   await page.getByRole('heading',{name:'Points à régulariser avant l’envoi',exact:true}).waitFor();
   assert.equal(await page.getByRole('button',{name:'Confirmer ma candidature',exact:true}).isDisabled(),true);
   assert.equal(writes.length,0);
  }
  assert.deepEqual(errors,[]);await context.close();
  console.log('PASS RPPS',optional?'optional demo: application submitted, no fake verification':'required: submission blocked');
 }
}finally{await browser.close();}
