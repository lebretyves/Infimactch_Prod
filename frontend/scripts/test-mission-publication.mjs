import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.BASE_URL || 'http://127.0.0.1:4199';
const browser = await chromium.launch(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {});
const id = n => '10000000-0000-4000-8000-' + String(n).padStart(12,'0');
const agency = { id:id(1), kind:'AGENCY', name:'Agence de test', address:'Paris', referent:'Test' };
const facility = { id:id(2), kind:'ESTABLISHMENT', name:'Clinique de test', address:'10 rue de Paris', latitude:48.85, longitude:2.35, referent:'Test' };
const date = new Date(Date.now() + 7*86400000).toISOString().slice(0,10);
const mission = {id:id(3),title:'Renfort IDE',status:'OPEN',qualification:'IDE',service:'URGENCES',start_at:date+'T06:00:00Z',end_at:date+'T14:00:00Z',timezone:'Europe/Paris',assignments:[],events:[],application_count:0,can_manage:true,required_skills:[],desired_skills:[],establishment_id:facility.id,establishment_name:facility.name};
const legacy = {id:id(4),title:'Ancienne annonce',description:'Renfort infirmier de démonstration',establishment_id:facility.id,establishment_name:facility.name,details:null,missions:[]};
async function setup(kind, scenario="known") {
 const currentFacility = scenario === "missing" ? {...facility, latitude:null, longitude:null} : facility;
 const context = await browser.newContext();
 await context.addInitScript(()=>localStorage.setItem('infimatch:cookie-preferences',JSON.stringify({version:1,savedAt:new Date().toISOString(),google:false})));
 const state={old:[],failLegacy:false,malformed:false,writes:[],errors:[],unknown:[]};
 const org=kind==='AGENCY'?agency:currentFacility;
 await context.route('**/api/**',async route=>{
  const req=route.request(),url=new URL(req.url()),p=url.pathname.replace(/^\/api\/v1/,'');
  const send=json=>route.fulfill({json});
  if(p==='/auth/activity')return send({idleExpiresAt:Date.now()+900000});
  if(req.method()!=='GET'){
   state.writes.push({path:p,body:req.postDataJSON(),key:req.headers()['idempotency-key']});
   if(p==='/missions/open')return send({id:mission.id});
   state.unknown.push(req.method()+' '+p);return route.fulfill({status:400,json:{message:'Unexpected write'}});
  }
  if(p==='/auth/me')return send({id:id(10),email:'fixture@example.invalid',family:'ENTERPRISE',organizations:[org]});
  if(p==='/auth/csrf')return send({csrfToken:'fixture-token'});
  if(p==='/me/organizations')return send({organizations:[org],links:kind==='AGENCY'?[{...currentFacility,agency_id:agency.id}]:[]});
  if(p==='/matching/rules')return send({weights:{C:.45,Z:.25,D:.2,E:.1}});
  if(p==='/listings/locations')return scenario==='unavailable' ? route.fulfill({status:503,json:{message:'Unavailable'}}) : send({items:scenario==='suggestion'?[{label:'20 rue de Rennes 35000 Rennes',latitude:48.11,longitude:-1.68}]:[]});
  if(p==='/reference-data')return send({ideServices:['URGENCES'],blockSpecialties:[]});
  if(p==='/enterprise/missions')return send({items:[mission],total:1,limit:20,offset:0});
  if(p==='/staffing-requests'){
   if(state.malformed)return send([{...legacy,missions:null}]);
   if(state.failLegacy)return route.fulfill({status:503,json:{message:'Unavailable'}});
   const offset=Number(url.searchParams.get('offset'));return send(state.old.slice(offset,offset+20));
  }
  if(p==='/staffing-requests/'+legacy.id){
   if(state.malformed)return send({...legacy,missions:null});
   if(state.failLegacy)return route.fulfill({status:404,json:{message:'Missing'}});
   return send(state.old.find(row=>row.id===legacy.id)||legacy);
  }
  if(p==='/missions/'+mission.id)return send(mission);
  if(p==='/missions/'+mission.id+'/applications')return send([]);
  if(p==='/missions/'+mission.id+'/candidates')return send({items:[],total:0});
  if(p==='/me/notifications')return send([]);
  if(p==='/dashboards')return send({family:'ENTERPRISE',counts:{OPEN:1},activity:{needs:3,applications:0},recentNeeds:[legacy],recentMissions:[mission]});
  if(p==='/dashboards/conversions')return send({organization:org,period:{from:date,to:date},observedAt:new Date().toISOString(),fillRate:{numerator:0,denominator:0,percent:null},selectionRate:{numerator:0,denominator:0,percent:null},missionCancellationRate:{numerator:0,denominator:0,percent:null},assignmentCancellationRate:{numerator:0,denominator:0,percent:null},fillDelay:{averageHours:null,samples:0},exclusions:{demoMissions:0,undatedPublications:0,undatedApplications:0},definitions:{}});
  state.unknown.push(p);return route.fulfill({status:404,json:{message:'Unhandled fixture'}});
 });
 const page=await context.newPage();page.on('pageerror',e=>state.errors.push(e.message));
 return {context,page,state};
}
try {
 for(const kind of ['AGENCY','ESTABLISHMENT']) for(const scenario of ['known','missing','unavailable','suggestion']){
  const {context,page,state}=await setup(kind,scenario);
  await page.goto(base+'/accueil');
  await page.getByRole('heading',{name:'Mes dernières offres'}).waitFor();
  assert.equal(await page.getByRole('link',{name:'Besoins',exact:true}).count(),0);
  assert.equal(await page.getByRole('heading',{name:'Mes derniers besoins'}).count(),0);
  if(scenario==='known'){
   await page.setViewportSize({width:375,height:812});await page.evaluate(()=>scrollTo(0,0));
   const access=await page.getByRole('button',{name:'Accessibilité',exact:true}).boundingBox();
   const header=page.locator('header').first();
   const identity=await header.locator('a[href="/organisation"]').boundingBox();
   const brand=await header.getByRole('link',{name:'InfiMatch — accueil',exact:true}).boundingBox();
   assert.ok(access&&identity&&brand&&access.y>=0&&access.y+access.height<=100&&access.x>=brand.x+brand.width-1&&access.x+access.width<=identity.x+1,'Connected accessibility remains visible between the brand and account identity');
   await page.getByRole('button',{name:'Ouvrir le menu',exact:true}).click();
   const navigation=page.getByRole('navigation',{name:'Navigation principale',exact:true});await navigation.waitFor();
   const navBox=await navigation.boundingBox(),headerBox=await page.locator('header').first().boundingBox();
   assert.ok(navBox&&headerBox&&navBox.y>=headerBox.y+headerBox.height-1,'Mobile menu does not cover the header after the preferences bar');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.getByRole('button',{name:'Fermer le menu',exact:true}).click();await page.setViewportSize({width:1280,height:720});
  }

  await page.getByRole('link',{name:'Missions et suivi',exact:true}).click();
  await page.getByRole('heading',{name:'Mes missions et leur suivi'}).waitFor();
  await page.getByRole('link',{name:'Créer une mission',exact:true}).click();
  await page.getByLabel('Intitulé de la mission').fill('Renfort IDE');
  await page.getByLabel('Description').fill('Renfort infirmier pour une vacation de démonstration.');
  if(kind==='AGENCY')await page.getByLabel('Établissement').selectOption(facility.id);
  await page.getByRole('combobox',{name:'Service',exact:true}).selectOption('URGENCES');
  await page.getByLabel('Créneau de la mission').selectOption('MORNING');
  await page.getByLabel('Date de début').fill(date);
  await page.getByLabel('Date de fin incluse').fill(date);
  await page.getByLabel('Rémunération brute par heure (€)').fill('25');
  assert.equal(await page.getByLabel('Latitude du lieu').count(),0);
  assert.equal(await page.getByLabel('Longitude du lieu').count(),0);
  if(scenario==='unavailable'||scenario==='suggestion'){
   await page.getByLabel('Adresse du lieu de mission').fill('20 rue de Rennes');
   if(scenario==='unavailable') await page.getByRole('status').filter({hasText:'Recherche de lieux indisponible.'}).waitFor();
   else await page.getByRole('option',{name:'20 rue de Rennes 35000 Rennes',exact:true}).click();
  }
  await page.getByRole('button',{name:'Créer et publier la mission',exact:true}).click();
  await page.waitForURL('**/gestion/missions/'+mission.id+'?**');
  await page.getByText('Offre publiée : les intérimaires peuvent la consulter et candidater selon leurs critères.',{exact:true}).waitFor();
  assert.equal(state.writes.length,1,JSON.stringify(state.writes.map(w=>w.path)));
  assert.equal(state.writes[0].path,'/missions/open');
  assert.equal(state.writes[0].body.shift,'MORNING');
  assert.ok(state.writes[0].key);
  assert.equal(state.writes[0].body.establishmentId,facility.id);
  assert.equal(state.writes[0].body.hourlySalary,25);
  assert.equal(state.writes[0].body.latitude,scenario==='known'?facility.latitude:scenario==='suggestion'?48.11:null);
  assert.equal(state.writes[0].body.longitude,scenario==='known'?facility.longitude:scenario==='suggestion'?-1.68:null);
  assert.ok(state.writes[0].body.address.length>=5);
  assert.equal(state.writes[0].body.staffingRequestId,undefined);
  assert.deepEqual(state.errors,[]);assert.deepEqual(state.unknown,[]);
  console.log('PASS',kind,scenario,'single form, direct publication and no staffing-request write');
  await context.close();
 }
 const {context,page,state}=await setup('AGENCY');
 await page.goto(base+'/besoins');await page.waitForURL('**/missions');
 await page.getByRole('heading',{name:mission.title,exact:true}).waitFor();
 assert.equal(await page.getByRole('heading',{name:'Annonces à compléter',exact:true}).count(),0);
 state.old=[legacy];
 await page.goto(base+'/missions');
 await page.getByRole('heading',{name:'Annonces à compléter',exact:true}).waitFor();
 await page.getByRole('link',{name:'Compléter et publier',exact:true}).click();
 await page.getByRole('heading',{name:'Compléter et publier une mission',exact:true}).waitFor();
 assert.equal(await page.getByLabel('Intitulé de la mission').inputValue(),legacy.title);
 assert.equal(await page.getByLabel('Rémunération brute par heure (€)').inputValue(),'');
 assert.equal(state.writes.length,0);
 await page.goto(base+'/besoins#besoin-'+legacy.id);
 await page.waitForURL('**/gestion/missions/nouvelle?besoin='+legacy.id);
 console.log('PASS old list redirects, unpublished data recoverable and no invented salary or automatic publication');
 state.old=[{...legacy,missions:[mission]}];
 await page.goto(base+'/besoins#besoin-'+legacy.id);
 await page.waitForURL('**/gestion/missions/'+mission.id);
 await page.getByRole('heading',{name:mission.title,exact:true}).waitFor();
 assert.equal(state.writes.length,0);
 console.log('PASS published old bookmark opens existing mission without duplicate creation');
 // A full first page of already converted records must not hide later incomplete ones.
 state.old=[...Array.from({length:20},(_,n)=>({...legacy,id:id(100+n),missions:[mission]})),legacy];
 await page.goto(base+'/missions');
 await page.getByRole('navigation',{name:'Pages des anciennes annonces'}).getByRole('button',{name:'Suivant',exact:true}).click();
 await page.getByRole('heading',{name:legacy.title,exact:true}).waitFor();
 console.log('PASS pagination retains access to incomplete records after converted records');
 state.failLegacy=true;
 await page.goto(base+'/missions');
 const alert=page.getByRole('alert').filter({hasText:'Les anciennes annonces à compléter sont indisponibles.'});await alert.waitFor();
 await page.getByRole('heading',{name:mission.title,exact:true}).waitFor();
 state.failLegacy=false;state.old=[legacy];
 await alert.getByRole('button',{name:'Réessayer',exact:true}).click();
 await page.getByRole('heading',{name:legacy.title,exact:true}).waitFor();
 state.failLegacy=true;
 await page.goto(base+'/besoins#besoin-'+legacy.id);
 await page.getByRole('alert').filter({hasText:'Cette ancienne annonce n’est pas accessible.'}).waitFor();
 assert.equal(state.writes.length,0);
 assert.deepEqual(state.errors,[]);assert.deepEqual(state.unknown,[]);
 console.log('PASS legacy read failure preserves mission access, retry and no blind creation');
 state.failLegacy=false;state.malformed=true;
 await page.goto(base+'/missions');
 await page.getByRole('alert').filter({hasText:'Les anciennes annonces à compléter sont indisponibles.'}).waitFor();
 await page.getByRole('heading',{name:mission.title,exact:true}).waitFor();
 await page.goto(base+'/besoins#besoin-'+legacy.id);
 await page.getByRole('alert').filter({hasText:'Cette ancienne annonce n’est pas accessible.'}).waitFor();
 assert.equal(new URL(page.url()).pathname,'/besoins');
 assert.equal(state.writes.length,0);
 assert.deepEqual(state.errors,[]);
 console.log('PASS malformed legacy response never hides mission list or redirects to a new publication');

 await context.close();
} finally {await browser.close();}
