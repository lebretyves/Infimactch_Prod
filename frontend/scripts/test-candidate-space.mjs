import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const base=process.env.BASE_URL || 'http://127.0.0.1:4193';
const browser=await chromium.launch({channel:'msedge',headless:true});
const mission={id:'m_fixture',kind:'INTERNAL_MISSION',title:'Infirmier en médecine — mission de jour',qualification:'IDE',service:'MEDICINE',shift:'DAY',status:'OPEN',version:1,description:'Accompagner les patients du service de médecine. Assurer les soins et les transmissions avec une équipe pluridisciplinaire.',address:'12 rue des Soins, Paris',establishment_id:'facility',establishment_name:'Établissement de démonstration',start_at:'2030-09-20T06:00:00Z',end_at:'2030-09-20T18:00:00Z',timezone:'Europe/Paris',hourly_salary:27,required_skills:['MEDICINE'],min_experience_months:12};
const application={id:'application',mission_id:'fixture',title:mission.title,status:'SUBMITTED',created_at:'2030-09-18T08:00:00Z',updated_at:'2030-09-18T08:00:00Z',requires_reconsent:false,assignments:[],events:[{event:'APPLICATION_SUBMITTED',created_at:'2030-09-18T08:00:00Z'}]};
let empty=false, submitted=0;
const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.addInitScript(()=>localStorage.setItem('infimatch:cookie-preferences',JSON.stringify({version:1,savedAt:new Date().toISOString(),google:false})));
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/api/**',async route=>{
 const url=new URL(route.request().url()), p=url.pathname; let json=[];
 if(p.endsWith('/auth/me')) json={id:'candidate-fixture',email:'fixture@example.invalid',family:'NURSE',organizations:[]};
 else if(p.endsWith('/profile')) json={display_name:'Camille Exemple',qualifications:['IDE'],rpps_status:'VERIFIED',skills:[],available:[],details:{city:'Paris',mobilityCity:'Paris (75001)'},latitude:48.8566,longitude:2.3522};
 else if(p.endsWith('/auth/csrf')) json={csrfToken:'fixture'};
 else if(p.endsWith('/reference-data')) json={ideServices:['MEDICINE'],blockSpecialties:[]};
 else if(p.endsWith('/listings/search')) json={items:empty?[]:[mission],total:empty?0:1,limit:20,offset:0};
 else if(p.endsWith('/listings/m_fixture')) json=mission;
 else if(p.endsWith('/application-check')) json={warnings:['EXPERIENCE_INSUFFICIENT','NOT_FULLY_AVAILABLE'],blockingReasons:[],missingSkills:[],experienceMonths:6,requiredExperienceMonths:12,distanceKm:5};
 else if(p.endsWith('/missions/fixture/applications')) {submitted++;json={warnings:['EXPERIENCE_INSUFFICIENT']};}
 else if(p.endsWith('/me/applications')) json=empty?[]:[application];
 else if(p.endsWith('/applications/application')) json=application;
 else if(p.endsWith('/me/favorites')) json=empty?[]:[{kind:'MISSION',target_id:'fixture',title:mission.title,status:'OPEN'},{kind:'ESTABLISHMENT',target_id:'facility',title:'Établissement de démonstration'}];
 else if(p.endsWith('/facilities/facility')) json={name:'Établissement de démonstration',address:mission.address,finess:'000000000',missions:empty?[]:[mission]};
 else if(p.endsWith('/me/history')) json=empty?[]:[{id:'assignment',mission_id:'fixture',title:mission.title,status:'ACTIVE',start_at:mission.start_at,end_at:mission.end_at,timezone:'Europe/Paris',temporal_position:'upcoming'}];
 else if(p.endsWith('/me/notifications-settings')) json={configured:false,link:null,destinations:[],catalog:{APPLICATION_SUBMITTED:'Candidature envoyée'},organizationKinds:[],preferences:[]};
 else if(p.endsWith('/me/notifications')) json=empty?[]:[{id:'notice',kind:'APPLICATION_SUBMITTED',message:'Votre candidature a été transmise à l’établissement de démonstration.',href:'/candidatures/application',read_at:null,created_at:'2030-09-18T08:00:00Z'}];
 else if(p.endsWith('/me/closure-request')) json={request:null};
 await route.fulfill({json});
});
const screens=[['missions','/missions'],['mission','/missions/m_fixture'],['candidater','/missions/m_fixture/candidater'],['candidatures','/candidatures'],['suivi','/candidatures/application'],['favoris','/favoris'],['historique','/historique'],['etablissement','/etablissements/facility'],['notifications','/notifications'],['compte','/compte']];
try {
 await mkdir('artifacts/candidate-space',{recursive:true});
 for(const state of ['filled','empty']) {
  empty=state==='empty';
  for(const [name,path] of screens) {
   if(empty&&!['missions','candidatures','favoris','historique','etablissement','notifications'].includes(name))continue;
   await page.goto(base+path);await page.locator('h1').waitFor();await page.waitForTimeout(180);
   const expected=empty?{missions:/Aucun|aucun|0 offre/,candidatures:/Aucune candidature en cours/,favoris:/Enregistrez une mission/,historique:/Aucune mission pour cette sélection/,etablissement:/Aucune mission/,notifications:/Aucune notification/}[name]:{missions:/Infirmier en médecine/,mission:/Accompagner les patients/,candidater:/Attention, certains critères diffèrent/,candidatures:/Envoyée le/,suivi:/Candidature envoyée ou reconfirmée/,favoris:/Établissement de démonstration/,historique:/Infirmier en médecine/,etablissement:/Infirmier en médecine/,notifications:/Votre candidature a été transmise/,compte:/Clôturer mon compte/}[name];
   await page.waitForFunction(pattern=>new RegExp(pattern).test(document.querySelector('main')?.innerText||''),expected.source);
   assert.equal(await page.locator('main [role=alert]').count(),0,`${name}: no API/validation error`);
   assert.equal(await page.locator('h1').count(),1,`${name}: one h1`);
   assert.equal(await page.locator('link[rel=canonical]').count(),0,`${name}: no private canonical`);
   assert.match(await page.locator('meta[name=robots]').getAttribute('content'),/noindex/);
   assert.ok((await page.title()).includes('InfiMatch'));
   for(const width of [1440,768,375]) {
    await page.setViewportSize({width,height:1000});await page.waitForTimeout(80);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${name} ${state} ${width} overflow`);
    if(name==='compte') {
      const eye=page.getByRole('button',{name:'Afficher le mot de passe',exact:true});
      const box=await eye.boundingBox();assert.ok(box&&box.width>=44&&box.height>=44,'password toggle44px');
      await eye.click();assert.equal(await page.getByRole('button',{name:'Masquer le mot de passe',exact:true}).getAttribute('aria-pressed'),'true');
      await page.getByRole('button',{name:'Masquer le mot de passe',exact:true}).click();
    }
    if(name==='missions'||name==='etablissement') {
      const dimensions=await page.locator('main button').evaluateAll(nodes=>nodes.filter(n=>n.getAttribute('aria-label')?.includes('favoris')||n.getAttribute('aria-label')?.startsWith('Page ')||n.closest('[aria-label="Origine des offres"]')).map(n=>({text:n.textContent,label:n.getAttribute('aria-label'),height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width})));
      for(const target of dimensions){assert.ok(target.height>=44,`${name}: touch height ${JSON.stringify(target)}`);assert.ok(target.width>=44,`${name}: touch width ${JSON.stringify(target)}`);}
    }
    await page.screenshot({path:`artifacts/candidate-space/${name}-${state}-${width}.png`,fullPage:true});
   }
  }
 }
 empty=false;await page.goto(base+'/missions/m_fixture/candidater');
 const send=page.getByRole('button',{name:'Envoyer quand même ma candidature'});await send.waitFor();assert.ok(await send.isDisabled());
 await page.getByRole('checkbox').check();assert.ok(await send.isEnabled());await send.click();await page.getByRole('heading',{name:'Candidature enregistrée',exact:true}).waitFor();assert.equal(submitted,1);
 await page.goto(base+'/favoris');await page.getByRole('heading',{name:'Mes favoris',exact:true}).waitFor();
 const menu=page.getByRole('button',{name:'Ouvrir le menu'});await menu.focus();await page.keyboard.press('Enter');
 const nav=page.getByRole('navigation',{name:'Navigation principale'});assert.ok(await nav.isVisible());
 for(const group of ['Découvrir','Suivi','Mon dossier'])assert.equal(await nav.getByRole('group',{name:group,exact:true}).count(),1);
 await page.keyboard.press('Escape');assert.equal(await menu.getAttribute('aria-expanded'),'false');assert.ok(await menu.evaluate(e=>e===document.activeElement));
 assert.deepEqual(errors,[]);console.log('PASS: 10 candidate routes, filled/empty, 375/768/1440, private SEO, keyboard navigation and nonblocking application warnings.');
} finally {await browser.close();}
