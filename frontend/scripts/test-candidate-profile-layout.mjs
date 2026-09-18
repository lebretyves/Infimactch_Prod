import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.BASE_URL||'http://127.0.0.1:4187',phase=process.env.DESIGN_PHASE||'after';
const out='artifacts/candidate-A/'+phase;await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 for(const populated of [false,true]){
 const context=await browser.newContext();let profile={display_name:'Camille',qualifications:populated?['IDE','IADE']:[],skills:populated?['POPULATION_ADULT','ANESTHESIE','SSPI']:[],experience:populated?[{establishment:'Centre de démonstration',service:'CHIRURGIE',start:'2020-01-01T00:00:00Z',end:'2023-01-01T00:00:00Z'}]:[],available:populated?[{start:'2026-09-21T04:00:00Z',end:'2026-09-21T12:00:00Z'}]:[],unavailable:populated?[{start:'2026-09-22T04:00:00Z',end:'2026-09-22T12:00:00Z'}]:[],latitude:48.8566,longitude:2.3522,radius_km:30,accepted_shifts:['DAY'],preferred_shifts:['DAY'],visible:true,rpps_status:populated?'FOUND':'NOT_CHECKED',rpps_number:populated?'10000000001':null,details:{firstName:'Camille',lastName:'Exemple',city:'Paris',phone:'0600000000',birthDate:'1990-01-01',address:'1 rue de démonstration',postalCode:'75001',mobilityCity:'Paris',...(populated?{ideDiplomaYear:2015,iadeDiplomaYear:2019,referenceName:'Alex Exemple',referenceRole:'Cadre de sant\u00e9',referenceEstablishment:'Centre de d\u00e9monstration',referenceEmail:'reference@example.invalid'}:{})}};
 const writes=[];await context.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;let json=[];
 if(path.endsWith('/auth/me'))json={id:'candidate-design-fixture',email:'fixture@example.invalid',family:'NURSE',organizations:[]};
 else if(path.endsWith('/auth/csrf'))json={csrfToken:'fixture'};
 else if(path.endsWith('/profile')){if(route.request().method()==='PUT'){const b=route.request().postDataJSON();writes.push(b);profile={...profile,...b,display_name:b.displayName??profile.display_name,accepted_shifts:b.acceptedShifts??profile.accepted_shifts,preferred_shifts:b.preferredShifts??profile.preferred_shifts};}json=profile;}
 else if(path.endsWith('/reference-data'))json={ideServices:['CHIRURGIE','URGENCES','SMR'],blockSpecialties:['ORTHOPEDIE_TRAUMATOLOGIE','DIGESTIF']};
 else if(path.endsWith('/me/bank-details'))json=populated?{details:{holder:'Camille Exemple',iban:'FR7630006000011234567890189',bic:'AGRIFRPP',bankName:'Banque de d\u00e9monstration'},iban:'FR7630006000011234567890189',document:{id:'rib-fixture',mime:'application/pdf',size_bytes:18200,created_at:'2026-09-15T10:00:00Z'},required:false}:{details:null,iban:null,document:null,required:false};
 else if(path.endsWith('/me/documents'))json=populated?[{id:'diploma-fixture',kind:'DEMO',mime:'application/pdf',size_bytes:24500,created_at:'2026-09-15T10:00:00Z'},{id:'insurance-fixture',kind:'CONFIRMATION',mime:'application/pdf',size_bytes:36200,created_at:'2026-09-16T10:00:00Z'}]:[];
 else if(path.endsWith('/me/history'))json=populated?[{id:'assignment-fixture',mission_id:'mission-fixture',title:'Mission fictive confirm\u00e9e',status:'ACTIVE',start_at:'2026-09-23T04:00:00Z',end_at:'2026-09-23T12:00:00Z',timezone:'Europe/Paris'}]:[];
 else if(path.endsWith('/me/personal-corrections'))json={request:null};
 else if(path.endsWith('/auth/psc/config'))json={enabled:false};
 else if(path.endsWith('/me/calendar'))json={assignments:[],available:[],unavailable:[]};
 else if(path.includes('/notifications'))json={items:[],unread:0,total:0};
 await route.fulfill({json});});
 const page=await context.newPage();await page.clock.setFixedTime(new Date('2026-09-18T10:00:00Z'));const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const route of ['profil','dossier','calendrier']){
 await page.goto(base+'/'+route);const consent=page.getByRole('button',{name:'Tout refuser',exact:true});if(await consent.count())await consent.click();
 await page.locator('h1').waitFor();await page.waitForTimeout(200);
 if(route==='profil'){await page.getByLabel(/^Prénom/).waitFor();}
 if(route==='dossier')await page.getByLabel(/^Numéro RPPS/).waitFor();
 if(route==='dossier'){assert.equal(await page.getByLabel(/^Numéro RPPS/).isEditable(),!populated);assert.equal(await page.getByRole('button',{name:'Vérifier mon numéro',exact:true}).count(),populated?0:1);}
 if(route==='calendrier')await page.getByRole('combobox',{name:'Ville de référence'}).waitFor();
 if(populated&&route==='dossier'){
 assert.equal(await page.locator('#justificatifs li').count(),2);
 assert.equal(await page.locator('#justificatifs').getByRole('button',{name:/charger$/}).count(),2);
 await page.getByText('Coordonn\u00e9es enregistr\u00e9es',{exact:true}).waitFor();
 await page.getByText('Banque de d\u00e9monstration',{exact:true}).waitFor();
 assert.equal(await page.locator('#reference, a[href="#reference"]').count(),0);
 }
 if(route==='calendrier')await page.getByLabel('Vue du calendrier').selectOption('month');
 if(populated&&route==='calendrier'){
 for(const [date,state] of [['21','available'],['22','unavailable'],['23','confirmed']]){
 const mark=page.locator(`[data-day="2026-09-${date}"] [data-indicator-slot="morning"]`);await mark.waitFor();assert.equal(await mark.getAttribute('data-state'),state);
 }
 }
 for(const width of [375,768,1440]){
 await page.setViewportSize({width,height:1000});if(populated&&route==='dossier'){const sizes=await page.locator('#justificatifs').getByRole('button',{name:/charger$/}).evaluateAll(nodes=>nodes.map(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})));assert.equal(sizes.length,2);assert.ok(sizes.every(s=>s.height>=44&&s.width>=44));console.log('Dossier download targets',width,JSON.stringify(sizes));}await page.screenshot({path:out+'/'+route+'-'+(populated?'filled':'empty')+'-'+width+'.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,route+' '+width);assert.equal(await page.locator('h1').count(),1);
 }
 if(phase==='after'&&route==='profil'){
 assert.equal(await page.getByLabel(/^Prénom/).isEditable(),false);
 const toc=page.getByRole('navigation',{name:'Rubriques de mon profil'});await toc.waitFor();await toc.getByRole('link',{name:'Informations personnelles',exact:true}).click();assert.equal(new URL(page.url()).hash,'#informations-personnelles');
 const cv=page.locator('details').filter({has:page.locator('summary').getByText('Importer un CV',{exact:false})});assert.equal(await cv.getAttribute('open'),null);await cv.locator('summary').click();await page.getByLabel('Importer mon CV (PDF, JPEG ou PNG)').waitFor();
 if(populated){
 await page.getByLabel('Importer mon CV (PDF, JPEG ou PNG)').setInputFiles({name:'cv-test.txt',mimeType:'text/plain',buffer:Buffer.from('Document fictif')});
 await cv.getByRole('alert').waitFor();await cv.locator('summary').click();await page.waitForTimeout(100);assert.notEqual(await cv.getAttribute('open'),null);
 for(const width of [375,1440]){await page.setViewportSize({width,height:1000});await cv.scrollIntoViewIfNeeded();await page.screenshot({path:out+'/profil-cv-error-'+width+'.png',fullPage:true});}
 await page.getByRole('button',{name:'Modifier l’expérience 1',exact:true}).click();await page.getByLabel('Établissement 1',{exact:true}).fill('Centre modifié');await page.getByRole('button',{name:'Enregistrer l’expérience',exact:true}).click();assert.equal(writes.length,0);}
 await page.getByRole('button',{name:'Enregistrer les modifications',exact:true}).first().click();await page.getByText('Modifications enregistrées.',{exact:true}).waitFor();assert.equal(writes.length,1);assert.equal(writes[0].details.lastName,'Exemple');if(populated)assert.equal(writes[0].experience[0].establishment,'Centre modifié');
 }
 }
 assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS candidate A '+phase+': 20 responsive captures, populated documents/RIB, calendar available/unavailable/confirmed, CV error disclosure, no overflow, one h1, empty/filled; after includes identity lock, section anchors, CV disclosure, experience/save.');
}finally{await browser.close();}
