import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {bankPdf} from './bank-pdf-fixture.mjs';
const require=createRequire(new URL('../../backend/package.json',import.meta.url));
const {parseCvExperience}=require('./dist/profiles/cv-parser.js');
const {createConfirmationPdf}=require('./dist/automation/confirmation-pdf.js');
const base=process.env.BASE_URL||'http://127.0.0.1:4189';
const output=process.env.PROOF_DIR||fileURLToPath(new URL('../../audits/help-videos-current/',import.meta.url));
const publicDir=fileURLToPath(new URL('../public/guides/tutorials/',import.meta.url));
await mkdir(output,{recursive:true});await mkdir(publicDir,{recursive:true});
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const nurseId=uid(1), agencyId=uid(2), facilityId=uid(3), missionId=uid(4), applicationId=uid(5), assignmentId=uid(6), documentId=uid(7);
const agency={id:agencyId,kind:'AGENCY',name:'Agence Horizon — démonstration',address:'12 avenue des Exemples, 75001 Paris',referent:'Camille Exemple · Référente agence · 0600000000',siret:'00000000000000',finess:null};
const facility={id:facilityId,kind:'ESTABLISHMENT',name:'Clinique des Jardins — démonstration',address:'8 rue des Exemples, 75012 Paris',referent:'Alex Exemple · Responsable soins · 0600000000',finess:'000000000',siret:null};
const profile={display_name:'Camille',qualifications:['IDE'],skills:['TRIAGE','PERFUSION','POSE_VOIE_VEINEUSE','POPULATION_ADULT'],experience:[{establishment:'Centre de soins — démonstration',service:'URGENCES',start:'2021-01-01T00:00:00Z',end:'2025-12-31T23:00:00Z'}],available:[{start:'2026-09-19T22:00:00Z',end:'2026-10-15T22:00:00Z'}],unavailable:[{start:'2026-10-01T22:00:00Z',end:'2026-10-03T22:00:00Z'}],latitude:48.8566,longitude:2.3522,radius_km:30,accepted_shifts:['DAY','NIGHT','MIXED'],preferred_shifts:['DAY'],visible:true,rpps_status:'FOUND',rpps_number:'10000000001',details:{mobilityCity:'Paris',mobilityLatitude:48.8566,mobilityLongitude:2.3522,firstName:'Camille',lastName:'Exemple',birthDate:'1992-04-15',phone:'0600000000',address:'1 rue des Exemples',postalCode:'75001',city:'Paris',diploma:'Diplôme d’État infirmier — démonstration',diplomaYear:2015,ideDiplomaYear:2015,referenceName:'Alex Exemple',referenceRole:'Cadre de santé',referenceEstablishment:'Centre de soins — démonstration',referenceEmail:'reference@example.invalid',transport:'Véhicule personnel'}};
const mission={id:missionId,title:'Renfort infirmier en service d’urgences',description:'Mission de démonstration. Rejoignez une équipe de soins adultes pour assurer l’accueil, la surveillance et la continuité des prises en charge. Transmission avec l’équipe en début et en fin de poste.',qualification:'IDE',start_at:'2026-09-25T05:00:00Z',end_at:'2026-09-25T17:00:00Z',hourly_salary:28,service:'URGENCES',shift:'DAY',version:2,status:'OPEN',establishment_id:facilityId,agency_id:agencyId,agency_name:agency.name,establishment_name:facility.name,address:facility.address,location_label:'Paris 12e',latitude:48.84,longitude:2.39,population:'ADULT',block:'NONE',specialty:null,required_skills:['PERFUSION','POPULATION_ADULT'],desired_skills:['TRIAGE'],min_experience_months:12,application_count:1,assignments:[]};
const staffingNeed={id:uid(17),title:'Renfort de deux IDE aux urgences',description:'Besoin fictif : renfort de deux professionnels pour la continuité des soins adultes aux urgences.',created_at:'2026-09-15T12:00:00Z',updated_at:'2026-09-16T08:00:00Z',establishment_id:facilityId,establishment_name:facility.name,establishment_address:facility.address,details:{qualification:'IDE',service:'URGENCES',start:'2026-09-25T04:00:00Z',end:'2026-09-25T12:00:00Z',shift:'DAY',headcount:2,population:'ADULT',block:'NONE',requiredSkills:['PERFUSION','TRIAGE'],minExperienceMonths:12,address:facility.address}};
const external={id:'e_demo-annonce',kind:'EXTERNAL_OFFER',title:'Infirmier en soins de suite — annonce externe',description:'Annonce fictive présentée pour montrer la lecture d’une offre issue d’un site partenaire. Les conditions et la candidature se consultent sur le site source.',qualification:'IDE',location_label:'Paris',source:'Site partenaire — démonstration',url:'https://example.invalid/annonce',salary:{amount:27,currency:'EUR',unit:'HOUR',gross:true}};
const reference={ideServices:['URGENCES','MEDECINE','CHIRURGIE','REANIMATION','GERIATRIE','PEDIATRIE'],blockSpecialties:['ORTHOPEDIE','CARDIOLOGIE','NEUROCHIRURGIE']};
const draft={email:'camille@example.invalid',nom:'Exemple',prenom:'Camille',naissance:'1992-04-15',telephone:'0600000000',adresse:'1 rue des Exemples',codePostal:'75001',ville:'Paris',qualification:'IDE',qualifications:['IDE'],disponibleFin:'2026-10-15',horaire:'BOTH',latitude:48.8566,longitude:2.3522,diplome:'Diplôme d’État infirmier — démonstration',anneeDiplome:'2015',rpps:'10000000001',competences:['PERFUSION','TRIAGE'],experiences:[{etablissement:'Centre de soins — démonstration',service:'URGENCES',annees:'4',start:'2021-01-01',end:'2025-12-31'}],rayonKm:30,transport:'Véhicule personnel',creneaux:[],disponibleDes:'2026-09-20',cgu:false,confidentialite:true,traitement:true,actualites:false};

const initialProfile=structuredClone(profile);
const pdfDetails={assignmentId,missionVersion:2,missionId,title:mission.title,qualification:'IDE',service:'URGENCES',address:facility.address,start:mission.start_at,end:mission.end_at,timezone:'Europe/Paris',hourlySalary:28,professionalName:'Camille Exemple',establishmentName:facility.name,agencyName:agency.name,issuedAt:'2026-09-20T10:00:00Z',demonstration:true};
const confirmation=await createConfirmationPdf(pdfDetails);
const cancellation=await createConfirmationPdf({...pdfDetails,cancellation:{initiator:'ENTERPRISE',cancelledAt:'2026-09-20T11:00:00Z',reason:'Annulation fictive pour ce tutoriel.'}});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const ids=['inscription-diplomes','profil-cv','recherche-matching','candidature-agenda','confirmation-pdf','annulation-emails'];
const narration=JSON.parse(await readFile(output+'/voice-durations.json','utf8'));
const reports=[];
try{for(const id of ids.filter(x=>!process.env.ONLY||process.env.ONLY.split(',').includes(x))){
 Object.assign(profile,structuredClone(initialProfile));
 if(id==='candidature-agenda'){profile.available=[];profile.unavailable=[];}
 let auth=id==='inscription-diplomes'?'public':id==='confirmation-pdf'||id==='annulation-emails'?'agence':'candidat';
 const cvDocuments=[];let cvBytes;const entry={};const calls=[],unknown=[],errors=[];let discordLinked=false,discordDestination=null,applicationSubmitted=id!=='candidature-agenda';
 const currentMission={...mission,...(id==='recherche-matching'?{location_label:'Rennes',address:'8 rue des Exemples, 35000 Rennes',latitude:48.1113,longitude:-1.6800}:{}),can_manage:auth==='agence',timezone:'Europe/Paris',schedule_precision:'EXACT',status:id==='confirmation-pdf'?'DRAFT':id==='annulation-emails'?'FILLED':'OPEN',matching_score:92,assignments:id==='annulation-emails'?[{id:assignmentId,status:'ACTIVE',display_name:'Camille Exemple'}]:[]};
 const application={id:applicationId,mission_id:missionId,title:mission.title,status:id==='annulation-emails'?'ASSIGNED':'SUBMITTED',created_at:'2026-09-20T08:00:00Z',updated_at:'2026-09-20T08:00:00Z',requires_reconsent:false,current_version:2};
 const context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:output+'/raw',size:{width:1280,height:800}},locale:'fr-FR',timezoneId:'Europe/Paris',serviceWorkers:'block',acceptDownloads:true});
 await context.addInitScript(d=>{localStorage.setItem('infimatch:cookie-preferences',JSON.stringify({version:1,savedAt:new Date().toISOString(),google:false}));if(!sessionStorage.getItem('infimatch:inscription-draft-v1'))sessionStorage.setItem('infimatch:inscription-draft-v1',JSON.stringify({version:2,createdAt:Date.now(),expiresAt:Date.now()+1800000,data:d}));},draft);
 await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!==new URL(base).origin)return route.abort();if(!url.pathname.startsWith('/api/'))return route.continue();
 const p=url.pathname.replace(/^\/api\/v1/,'');const method=route.request().method();calls.push(method+' '+p);
 const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
 if(p==='/me/notifications-settings/discord/challenge'&&method==='POST'){assert.equal(route.request().postDataJSON().discordUserId,'123456789012345678');return send({ok:true});}
 if(p==='/me/notifications-settings/discord/verify'&&method==='POST'){assert.equal(route.request().postDataJSON().code,'123456');discordLinked=true;return send({ok:true});}
 if(p==='/me/notifications-settings/discord'&&method==='PUT'){const b=route.request().postDataJSON();assert.equal(b.enabled,true);assert.deepEqual(b.events,['MATCH']);discordDestination={id:uid(40),user_id:nurseId,organization_id:null,enabled:b.enabled,events:b.events,target_id:'123456789012345678',channel_name:null};return send({ok:true});}
 if(p==='/auth/register'&&method==='POST'){const b=route.request().postDataJSON();assert.equal(b.family,'NURSE');assert.ok(b.profile);Object.assign(profile,b.profile);auth='candidat';return send({id:nurseId,csrfToken:'catalogue-fictional-csrf'},201);}
 if(p==='/profile/search-area'&&method==='PATCH'){const b=route.request().postDataJSON();profile.latitude=b.latitude;profile.longitude=b.longitude;profile.radius_km=b.radiusKm;profile.details={...profile.details,mobilityCity:b.city,mobilityLatitude:b.latitude,mobilityLongitude:b.longitude};return send(profile);}
 if(p==='/listings/locations')return send({items:[{label:'Rennes',latitude:48.1113,longitude:-1.6800}]});
 if(p==='/profile/availability'&&method==='PATCH'){const {changes}=route.request().postDataJSON();assert.equal(changes.length,1);assert.equal(changes[0].state,'available');const {start,end}=changes[0];profile.available.push({start,end});return send({available:profile.available,unavailable:profile.unavailable});}
 if(p==='/profile'&&method==='PUT'){const b=route.request().postDataJSON();Object.assign(profile,b);return send({ok:true});}
 if(p==='/me/cv-document'&&method==='POST'){const body=route.request().postDataJSON();cvBytes=Buffer.from(body.contentBase64,'base64');cvDocuments.push({id:uid(80),kind:'CV',mime:body.mime,size_bytes:cvBytes.length,status:'READY',created_at:new Date().toISOString()});return send({id:uid(80),status:'READY'},201);}
 if(p==='/me/documents/'+uid(80))return route.fulfill({status:200,contentType:'application/pdf',body:cvBytes});
 if(p==='/profile/cv/parse')return send(parseCvExperience(route.request().postDataJSON().text));
 if(p==='/missions/'+missionId+'/publish'){currentMission.status='OPEN';return send({ok:true});}
 if(p==='/missions/'+missionId+'/assignments'){currentMission.status='FILLED';currentMission.assignments=[{id:assignmentId,status:'ACTIVE',display_name:'Camille Exemple'}];application.status='ASSIGNED';return send({id:assignmentId},201);}
 if(p==='/missions/'+missionId+'/cancel'){currentMission.status='CANCELLED';currentMission.assignments.forEach(a=>a.status='CANCELLED');return send({ok:true});}
 if(p==='/assignments/'+assignmentId+'/confirmation'||p==='/assignments/'+assignmentId+'/cancellation')return send({status:'READY',document_id:documentId});
 if(p==='/me/documents/'+documentId)return route.fulfill({status:200,headers:{'content-type':'application/pdf','content-disposition':'attachment; filename="infimatch-demonstration.pdf"'},body:currentMission.status==='CANCELLED'?cancellation:confirmation});
 if(p==='/me/email-deliveries')return send({items:currentMission.status==='CANCELLED'?[{id:uid(30),kind:'CANCELLATION',sendStatus:'SENT',deliveryStatus:'DELIVERED',createdAt:'2026-09-20T11:00:00Z',acceptedAt:'2026-09-20T11:00:01Z',deliveryEventAt:'2026-09-20T11:00:02Z',events:[]}]:[]});
 if(p==='/applications/'+applicationId)return send({...application,assignments:currentMission.assignments,events:[{event:'APPLICATION_SUBMITTED',created_at:application.created_at}]});
 if(p==='/me/history')return send(currentMission.assignments.map(a=>({...a,mission_id:missionId,title:mission.title,start_at:mission.start_at,end_at:mission.end_at,address:mission.address,temporal_position:'upcoming'})));
 if(p==='/me/missions/'+missionId+'/assignments')return send(currentMission.assignments);
    if(p==='/auth/me')return auth==='public'?send({message:'Session absente'},401):send({id:nurseId,email:auth==='candidat'?'camille@example.invalid':auth+'@example.invalid',family:auth==='candidat'?'NURSE':'ENTERPRISE',organizations:auth==='candidat'?[]:[auth==='agence'?agency:facility]});
    if(p==='/matching/rules')return send({weights:{C:.45,Z:.25,D:.2,E:.1}});
    if(p==='/listings/locations/communes')return send({items:[{label:'Paris',latitude:48.8566,longitude:2.3522}]});
    if(p==='/me/recommendations')return send({mode:'MIXED',generatedAt:new Date().toISOString(),internal:{status:'READY',personalization:'COMPATIBLE',rppsStatus:'FOUND',items:[{...currentMission,id:'m_'+missionId,kind:'INTERNAL_MISSION'}]},external:{status:'READY',personalization:'PARTIAL',items:[external],sources:[]}});
    if(p==='/me/missions/'+missionId+'/assignments')return send([]);
    if(p==='/me/matches/mission/'+missionId)return send({score:92,eligible:true,reasons:[]});
    if(p==='/missions/'+missionId+'/application-check')return send({warnings:[],blockingReasons:[],missingSkills:[],experienceMonths:48,requiredExperienceMonths:12,distanceKm:4});
    if(p==='/me/personal-corrections'||p==='/me/closure-request')return send({request:null});
    if(p==='/auth/psc/config')return send({enabled:false});
    if(p==='/enterprise/missions')return send({items:[currentMission,{...currentMission,id:uid(24),status:'DRAFT'}],total:2,limit:20,offset:0});
    if(p==='/enterprise/applications')return send({items:[{...application,display_name:'Camille Exemple',qualifications:['IDE'],city:'Paris',mission:currentMission,matching:null}],total:1});
    if(p==='/me/establishments')return send({items:[{...facility,counts:{DRAFT:1,OPEN:2,FILLED:0,COMPLETED:0,CANCELLED:0},total:3}],total:1,limit:20,offset:0});
    if(p==='/me/notifications-settings')return send({configured:true,link:discordLinked?{discord_user_id:'123456789012345678'}:null,destinations:discordDestination?[discordDestination]:[],catalog:{MATCH:'Mission compatible',CONFIRMATION:'Confirmation de mission'},organizationKinds:['CONFIRMATION'],preferences:[]});
    if(p==='/me/notifications-settings/deliveries')return send([]);
    if(p==='/me/email-deliveries')return send({items:[]});
    if(p==='/me/notification-preferences')return send({enabled:true});
    if(p==='/me/client-requests')return send({recovery:[],closure:[]});
    if(p==='/auth/activity')return send({ok:true});
    if(p==='/me/assignments')return send([]);
    if(p==='/dashboards/conversions'){const rate={numerator:0,denominator:0,percent:null};return send({organization:auth==='agence'?agency:facility,period:{from:'2026-08-20',to:'2026-09-19',timeZone:'UTC'},observedAt:new Date().toISOString(),fillRate:rate,selectionRate:rate,missionCancellationRate:rate,assignmentCancellationRate:rate,fillDelay:{averageHours:null,samples:0},exclusions:{demoMissions:0,undatedPublications:0,undatedApplications:0},definitions:{fill:'Missions publiées dans la période.',selection:'Candidatures de la période.',cancellation:'États actuels.',delay:'Heures.',history:'Fixture fictive.'}});}
    if(p==='/auth/csrf')return send({csrfToken:'catalogue-fictional-csrf'});
    if(p==='/auth/google/config')return send({enabled:false,clientId:null});
    if(p==='/auth/google/registration')return send({email:'camille@example.invalid',firstName:'Camille',lastName:'Exemple'});
    if(p==='/profile')return send({...profile,...(entry.setup==='calendar-slots'?{available:[{start:'2026-09-21T04:00:00Z',end:'2026-09-22T04:00:00Z'},{start:'2026-09-24T04:00:00Z',end:'2026-09-26T04:00:00Z'}],unavailable:[{start:'2026-09-22T12:00:00Z',end:'2026-09-23T04:00:00Z'}]}:{}),qualifications:entry.variant==='incomplete'?[]:profile.qualifications});
    if(p==='/reference-data/finess/010000024')return send({status:'FOUND_IN_SNAPSHOT',grantsOrganizationAccess:false,generated_at:'2026-09-01T02:07:30.088Z',establishment:{finess:'010000024',name:'CENTRE HOSPITALIER DE BOURG-EN-BRESSE FLEYRIAT',address:'900 ROUTE DE PARIS',postal_code:'01440',city:'VIRIAT',latitude:46.222286,longitude:5.209181}});
    if(p==='/reference-data')return send(reference);
    if(p==='/facilities')return send([facility]);
    if(p==='/dashboards')return send({family:auth==='candidat'?'NURSE':'ENTERPRISE',counts:auth==='candidat'?{favorites:3,applications:2,assignments:1}:{DRAFT:1,OPEN:3,FILLED:1,COMPLETED:2},profile:auth==='candidat'?{display_name:'Camille',rpps_status:'FOUND'}:undefined});
    if(p==='/me/notifications')return send([{id:uid(15),kind:'MATCH',message:'Mission de démonstration proposée.',href:'/missions/m_'+missionId,created_at:'2026-09-21T08:00:00Z',read_at:null},{id:uid(16),kind:'CONFIRMATION',message:'Confirmation fictive disponible.',href:'/historique',created_at:'2026-09-21T08:10:00Z',read_at:'2026-09-21T08:15:00Z'}]);
    if(p==='/me/organizations')return send({organizations:[auth==='agence'?agency:facility],links:[{...facility,agency_id:agencyId}]});
    if(p==='/listings/search'||p==='/listings/external')return send({items:p.endsWith('external')?[external]:[{...currentMission,id:'m_'+missionId,kind:'INTERNAL_MISSION'},...(id==='recherche-matching'?[]:[external])],total:p.endsWith('external')||id==='recherche-matching'?1:2,limit:20,offset:0});
    if(p.startsWith('/listings/'))return send(p.endsWith('e_demo-annonce')?external:{...currentMission,id:'m_'+missionId,kind:'INTERNAL_MISSION'});
    if(p==='/me/matches')return send({items:[{missionId,score:92,eligible:true,reasons:[],explanationId:null,historyStatus:'UNAVAILABLE'}],total:1,limit:20,offset:0});
    if(p.startsWith('/me/listings/'))return send({mode:'PARTIAL',score:null,eligibilityVerified:false,profileCorrespondence:{criteria:{}},profileToComplete:[]});
    if(p==='/me/favorites')return send([{kind:'MISSION',target_id:missionId,title:mission.title},{kind:'EXTERNAL',target_id:'demo-annonce',title:external.title,active:true},{kind:'ESTABLISHMENT',target_id:facilityId,title:facility.name}]);
    if(p==='/me/applications'&&!applicationSubmitted)return send([]);
    if(p==='/me/applications')return send([application,{...application,id:uid(25),title:'Mission de nuit en médecine — démonstration',status:'SELECTED'}]);
    if(p==='/applications/'+applicationId)return send({...application,status:'ASSIGNED',assignments:[{id:assignmentId,status:'ACTIVE'}],events:[{event:'APPLICATION_SUBMITTED',created_at:'2026-09-15T08:00:00Z'},{event:'APPLICATION_SELECTED',created_at:'2026-09-15T12:00:00Z'},{event:'ASSIGNMENT_CREATED',created_at:'2026-09-16T08:00:00Z'}]});
    if(p==='/me/history')return send([{id:assignmentId,mission_id:missionId,title:mission.title,status:'ACTIVE',start_at:mission.start_at,end_at:mission.end_at,temporal_position:'upcoming'},{id:uid(26),mission_id:uid(27),title:'Renfort en médecine — démonstration',status:'COMPLETED',start_at:'2026-09-01T05:00:00Z',end_at:'2026-09-01T17:00:00Z',temporal_position:'past'}]);
    if(p==='/me/documents')return send(cvDocuments);
    if(p==='/me/bank-details')return send({iban:'FR•• •••• •••• DEMO •••• 0000'});
    if(p==='/facilities/'+facilityId)return send({...facility,missions:[currentMission]});
    if(p==='/staffing-requests')return send([staffingNeed]);
    if(p==='/staffing-requests/'+staffingNeed.id)return send(staffingNeed);
    if(p==='/missions')return send([currentMission,{...currentMission,id:uid(24),title:'Remplacement en médecine — démonstration',status:'DRAFT'}]);
    if(p==='/missions/'+missionId)return send(currentMission);
    if(p==='/missions/'+missionId+'/applications')return method==='POST'?(applicationSubmitted=true,send(application,201)):send(entry.variant==='draft'?[]:[{...application,nurse_id:nurseId,display_name:'Camille Exemple',qualifications:['IDE'],skills:profile.skills,rpps_status:'FOUND',experience:profile.experience,available:profile.available,city:'Paris',radius_km:30}]);
    if(p==='/missions/'+missionId+'/candidates')return send({items:[{candidateId:nurseId,display_name:'Camille Exemple',score:92,qualifications:['IDE'],skills:profile.skills,reasons:[]}],total:1,limit:20,offset:0});

 unknown.push(method+' '+p);return send({message:'Fixture manquante'},501);});
 const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{errors.push('Unexpected native dialog: '+d.type());await d.dismiss();});
 const began=Date.now(),cues=[];let last=0;
 async function caption(text){const t=(Date.now()-began)/1000;if(cues.length)cues.at(-1).end=t;cues.push({start:t,end:t+3,text});await page.evaluate(text=>{let e=document.getElementById('tutorial-caption');if(!e){e=document.createElement('div');e.id='tutorial-caption';Object.assign(e.style,{position:'fixed',bottom:'12px',left:'50%',transform:'translateX(-50%)',zIndex:999999,background:'#082b4b',color:'white',border:'2px solid #35cbdf',borderRadius:'12px',padding:'12px 20px',font:'600 17px/1.45 Arial',maxWidth:'1000px',width:'max-content',boxShadow:'0 4px 18px #0004',pointerEvents:'none',textAlign:'center'});document.body.appendChild(e);}e.textContent=text;},text);}
 async function hold(text,ms=2700){await caption(text);await page.waitForTimeout(Math.max(ms,((narration[text]?.duration||0)+0.7)*1000));}
 async function go(route){await page.goto(base+route,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.addStyleTag({content:'body {padding-bottom:110px !important}'});}
 async function focus(locator){await locator.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.waitForTimeout(450);}
 async function click(locator){await focus(locator);await locator.click();await page.waitForTimeout(500);}
 try{

 if(id==='inscription-diplomes'){
  await go('/inscription/identite');await hold('1 · Inscription : renseignez votre identité. Exemple fictif.');
  await page.getByLabel(/^Prénom/).fill('Camille');await page.getByLabel(/^Nom/).fill('Exemple');await hold('Le nom complet permet de vous identifier dans les documents.');
  await click(page.getByRole('button',{name:'Continuer',exact:true}));await hold('Votre domicile est facultatif. Il reste distinct de votre future zone d’alertes.');
  await click(page.getByRole('button',{name:'Continuer',exact:true}));await page.getByRole('heading',{name:'Qualification',exact:true}).waitFor();
  await click(page.getByRole('checkbox',{name:/^IADE/}));await hold('IADE sélectionne aussi IDE : ce sont deux diplômes distincts.');
  assert.equal(await page.getByRole('checkbox',{name:/^IDE /}).isDisabled(),true);
  await page.getByLabel('Année d’obtention du diplôme IDE').fill('2015');await page.getByLabel('Année d’obtention du diplôme IADE').fill('2020');
  await focus(page.getByLabel('Année d’obtention du diplôme IADE'));await hold('Chaque diplôme conserve sa propre année : IDE 2015, IADE 2020.',3500);
  await page.screenshot({path:publicDir+'/'+id+'.jpg',type:'jpeg',quality:78});
  await click(page.getByRole('button',{name:'Continuer',exact:true}));await hold('Choisissez votre rayon de mobilité. Vous pourrez modifier votre zone après inscription.',3800);
  await click(page.getByRole('button',{name:'Continuer',exact:true}));await page.getByRole('heading',{name:'Disponibilités',exact:true}).waitFor();
  await hold('Indiquez vos horaires et vos disponibilités, si vous les connaissez.',3600);
  await click(page.getByRole('button',{name:'Continuer',exact:true}));await page.getByRole('heading',{name:'Conditions et données personnelles',exact:true}).waitFor();
  await page.getByLabel(/^Mot de passe de votre compte/).fill('Tutoriel-Fictif-2026!');
  await page.getByRole('checkbox',{name:/J’accepte les/}).check();
  await hold('Lisez les conditions. Le RIB et la géolocalisation restent facultatifs.',3800);
  await click(page.getByRole('button',{name:'Créer mon compte',exact:true}));await page.getByRole('heading',{name:'Votre compte est créé',exact:true}).waitFor();
  await focus(page.getByRole('heading',{name:'Recevoir mes notifications sur Discord',exact:true}));
  await hold('Discord est proposé après création du compte. Cette étape est facultative.',4400);
  await focus(page.getByRole('link',{name:'Passer cette étape',exact:true}));
  await hold('Configurer Discord, ou passer cette étape : le compte est déjà utilisable.',4400);
  await click(page.getByRole('link',{name:'Configurer Discord',exact:true}));
  await page.getByRole('heading',{name:'Notifications',exact:true}).waitFor();
  await hold('Dans Notifications, associez Discord puis choisissez les événements souhaités.',4400);
  assert.equal(calls.filter(x=>x==='POST /auth/register').length,1);
  assert.equal(calls.filter(x=>/notification.*(preference|settings)/.test(x)&&!x.startsWith('GET')).length,0);
  await focus(page.getByRole('link',{name:'Rejoindre le serveur InfiMatch',exact:true}));
  await hold('Rejoignez le serveur InfiMatch et autorisez ses messages privés, puis revenez ici.',4300);
  await focus(page.getByLabel(/^Votre identifiant utilisateur Discord/));
  await hold('Copiez votre identifiant utilisateur depuis Discord. Ici, nous utilisons un exemple fictif.',4300);
  await page.getByLabel(/^Votre identifiant utilisateur Discord/).fill('123456789012345678');
  await click(page.getByRole('button',{name:'Recevoir mon code privé',exact:true}));
  await focus(page.getByLabel(/^Code reçu sur Discord/));
  await hold('Le code arrive en message privé et expire après 10 minutes. Aucun message réel n’est envoyé ici.',4600);
  await page.getByLabel(/^Code reçu sur Discord/).fill('123456');
  await click(page.getByRole('button',{name:'Associer mon compte',exact:true}));
  await page.getByText('Compte Discord associé. Choisissez maintenant les événements à recevoir.',{exact:true}).waitFor();
  const enabled=page.getByRole('checkbox',{name:'Recevoir les notifications Discord',exact:true});
  await focus(enabled);assert.equal(await enabled.isChecked(),false);
  await hold('L’association seule n’active aucun événement. Choisissez vos préférences.',4300);
  await enabled.check();await page.getByRole('checkbox',{name:'Confirmation de mission',exact:true}).uncheck();await page.getByRole('checkbox',{name:'Mission compatible',exact:true}).check();
  await click(page.getByRole('button',{name:'Enregistrer les préférences',exact:true}));
  await page.getByText('Préférences enregistrées.',{exact:true}).waitFor();
  await hold('Préférences enregistrées : les missions compatibles seulement. Vous pourrez modifier ce choix.',4500);
 }
 if(id==='profil-cv'){
  await go('/profil');await hold('2 · Profil : importer un CV et choisir ses services. Données fictives.');
  await click(page.locator('summary').filter({hasText:'Importer un CV'}));await hold('Le CV propose des expériences. Vous gardez le contrôle avant tout ajout.');
  await page.getByLabel(/Importer mon CV/).setInputFiles({name:'cv-demonstration.pdf',mimeType:'application/pdf',buffer:bankPdf(['CAMILLE EXEMPLE','EXPERIENCES PROFESSIONNELLES','01/02/2020 - 31/03/2021 | CHU Exemple | Cardiologie','Infirmiere IDE','FORMATIONS','2012 - 2015 Diplome infirmier'])});
  await page.getByLabel('Établissement proposé 1',{exact:true}).waitFor({state:'attached'});if(!await page.getByLabel('Établissement proposé 1',{exact:true}).isVisible())await click(page.locator('summary').filter({hasText:'Importer un CV'}));await focus(page.getByLabel('Établissement proposé 1',{exact:true}));await hold('Relisez le service et les dates. Corrigez les propositions si nécessaire.',3500);
  await click(page.getByRole('button',{name:'Enregistrer le CV dans mes documents',exact:true}));await hold('Le fichier CV est conservé dans Mes documents. L’application des propositions reste une étape distincte.',4000);
  await click(page.getByLabel('J’ai vérifié les expériences retenues et leurs dates avec mon CV.'));
  await click(page.getByRole('button',{name:'Ajouter les expériences vérifiées au profil'}));await hold('Ajoutez les expériences vérifiées, puis enregistrez le profil.');
  const group=page.getByRole('group',{name:'Choix d’exercice IDE',exact:true});await focus(group.getByLabel('Cardiologie',{exact:true}));await hold('Choisissez plusieurs services si vous êtes polyvalent.');
  await group.getByLabel('Urgences',{exact:true}).check();await group.getByLabel('Cardiologie',{exact:true}).check();await hold('Les services restent facultatifs. Un encadré est prévu par métier.',3500);
  await page.screenshot({path:publicDir+'/'+id+'.jpg',type:'jpeg',quality:78});
  await click(page.getByRole('button',{name:'Enregistrer les modifications',exact:true}).first());await page.getByText('Modifications enregistrées.',{exact:true}).waitFor();await hold('Le profil est enregistré. Vos expériences et services souhaités sont conservés.');
  await go('/dossier#justificatifs');await focus(page.getByText('CV', {exact:true}).first());await hold('Retrouvez le CV enregistré dans la liste Mes documents et téléchargez-le quand vous en avez besoin.',4500);
 }
 if(id==='recherche-matching'){
  await go('/profil');await focus(page.getByRole('heading',{name:'Ma zone de recherche et d’alertes',exact:true}));
  await hold('3 · La zone d’alertes est enregistrée sur votre compte. Ici : Paris, 30 km.',4300);
  await go('/missions');await hold('La recherche reprend vos derniers critères sur cet appareil, ou votre zone enregistrée.',4500);
  await page.getByRole('combobox',{name:'Où ?',exact:true}).fill('Rennes');
  await click(page.getByRole('option',{name:'Rennes',exact:true}));await page.getByLabel('Rayon',{exact:true}).selectOption('30');
  await hold('Choisissez une ville dans les propositions et son rayon. Exemple : Rennes, 30 km.',4200);
  await click(page.getByRole('button',{name:'Rechercher',exact:true}));
  assert.equal(calls.filter(x=>x==='PATCH /profile/search-area').length,0);
  await hold('Cette recherche ponctuelle ne change pas les alertes : elles restent sur Paris.',4500);
  await focus(page.getByRole('button',{name:'Utiliser cette zone pour mes alertes',exact:true}));
  await hold('Pour conserver Rennes comme zone d’alertes, confirmez avec ce bouton.',4000);
  await click(page.getByRole('button',{name:'Utiliser cette zone pour mes alertes',exact:true}));
  await page.getByText('Zone de recherche et d’alertes enregistrée sur votre compte.',{exact:true}).waitFor();
  assert.equal(calls.filter(x=>x==='PATCH /profile/search-area').length,1);
  assert.equal(profile.details.city,'Paris');assert.equal(profile.details.mobilityCity,'Rennes');
  await hold('Rennes, 30 km, est enregistré. Le domicile et les préférences de notification sont conservés.',4500);
  await click(page.locator('summary').filter({hasText:/règles.*matching/i}));
  await hold('Le matching utilise la zone du compte, les compétences, les disponibilités et l’expérience.',4500);
  await page.screenshot({path:publicDir+'/'+id+'.jpg',type:'jpeg',quality:78});
  await click(page.getByRole('link',{name:'Voir la mission',exact:true}).first());
  await hold('Le score aide à comparer. Relisez les conditions et les informations manquantes.',4200);
 }
 if(id==='candidature-agenda'){
  await go('/missions/m_'+missionId);await hold('4 · Candidature : relisez les horaires et les conditions. Mission fictive.');
  await click(page.getByRole('link',{name:'Envoyer ma candidature',exact:true}));await hold('La candidature demande votre accord sur les conditions affichées.');
  await page.getByRole('checkbox').check();await click(page.getByRole('button',{name:'Confirmer ma candidature'}));await page.getByRole('heading',{name:'Candidature enregistrée'}).waitFor();await hold('Votre candidature est enregistrée ; elle ne réserve pas encore le créneau.');
  await go('/candidatures/'+applicationId);await hold('Le suivi indique les étapes et la décision du recruteur.');
  currentMission.assignments=[{id:assignmentId,status:'ACTIVE',display_name:'Camille Exemple'}];application.status='ASSIGNED';
  await go('/calendrier');await page.getByLabel('Aller à la date').fill('2026-09-21');await focus(page.getByRole('button',{name:/vendredi 25 septembre 2026.*Mission confirmée, créneau réservé/}).first());await hold('Exemple après confirmation par le recruteur : la mission apparaît dans l’agenda.',4500);
  await page.screenshot({path:publicDir+'/'+id+'.jpg',type:'jpeg',quality:78});
  await page.getByLabel('Vue du calendrier').selectOption('month');await hold('En vue Mois, choisissez un jour pour modifier ses créneaux.',4000);
  await click(page.locator('[data-day="2026-09-28"]'));
  const dialog=page.getByRole('dialog',{name:'Modifier mes créneaux'});await dialog.waitFor();
  await hold('Ouvrez le jour souhaité, puis cliquez sur le matin, l’après-midi ou la nuit.',4500);
  await click(dialog.locator('[data-slot]').first());
  await dialog.getByRole('status').filter({hasText:'Enregistré.'}).waitFor();
  assert.equal(calls.filter(x=>x==='PATCH /profile/availability').length,1);
  await hold('Le créneau devient disponible et se sauvegarde automatiquement. La mission confirmée reste protégée.',5000);
  await page.screenshot({path:publicDir+'/'+id+'.jpg',type:'jpeg',quality:78});
  await click(dialog.getByRole('button',{name:'Fermer',exact:true}));
 }
 if(id==='confirmation-pdf'){
  await go('/gestion/missions/'+missionId);await hold('5 · Recruteur : relisez puis publiez la mission. Démonstration simulée.');
  await click(page.getByRole('button',{name:'Publier la mission',exact:true}));await page.getByText(/Offre publiée :/).waitFor();await focus(page.getByRole('heading',{name:/Candidatures reçues/}));await hold('La mission est publiée. Consultez les candidatures reçues.');
  await focus(page.getByRole('button',{name:'Accepter la candidature',exact:true}));await hold('Examinez le candidat et les points à vérifier avant de confirmer.',3500);
  await click(page.getByRole('button',{name:'Accepter la candidature',exact:true}));await hold('Confirmez votre décision après avoir vérifié les informations avec le candidat.');await click(page.getByRole('button',{name:'Confirmer l’acceptation',exact:true}));await page.getByRole('heading',{name:'Confirmation de mission',exact:true}).waitFor();await focus(page.getByRole('heading',{name:'Confirmation de mission',exact:true}));await hold('L’affectation est confirmée. Le PDF est accessible dès qu’il est prêt.');
  await page.screenshot({path:publicDir+'/'+id+'.jpg',type:'jpeg',quality:78});
  const downloaded=page.waitForEvent('download');await click(page.getByRole('button',{name:'Télécharger le PDF de confirmation'}));await (await downloaded).saveAs(output+'/confirmation-demonstration.pdf');await hold('Le PDF est téléchargé. Cette confirmation n’est pas un contrat signé.',3500);
 }
 if(id==='annulation-emails'){
  await go('/gestion/missions/'+missionId);await hold('6 · Annulation et emails : exemple simulé depuis l’espace agence.');
  await focus(page.getByRole('button',{name:'Annuler la mission',exact:true}));await hold('L’annulation concerne aussi les affectations de cette mission.');
  await click(page.getByRole('button',{name:'Annuler la mission',exact:true}));await hold('Relisez la confirmation avant de valider l’annulation.');await click(page.getByRole('button',{name:'Confirmer l’annulation',exact:true}));await page.getByRole('button',{name:'Télécharger le PDF d’annulation'}).waitFor();await focus(page.getByRole('button',{name:'Télécharger le PDF d’annulation'}));await hold('Le suivi indique l’annulation et permet de récupérer son document.');
  const downloaded=page.waitForEvent('download');await click(page.getByRole('button',{name:'Télécharger le PDF d’annulation'}));await (await downloaded).saveAs(output+'/annulation-demonstration.pdf');
  await go('/notifications');await click(page.locator('summary').filter({hasText:/email/i}).first());await focus(page.getByRole('heading',{name:/email/i}).first());await hold('Dans Notifications, consultez le journal des emails de mission.',3500);
  await page.screenshot({path:publicDir+'/'+id+'.jpg',type:'jpeg',quality:78});await hold('« Livré » confirme une remise au serveur destinataire, pas la lecture du message.',4500);
 }
 assert.deepEqual(errors,[]);assert.deepEqual(unknown,[]);cues.at(-1).end=(Date.now()-began)/1000;
 const fmt=n=>new Date(Math.max(0,n)*1000).toISOString().slice(11,23);
 await writeFile(publicDir+'/'+id+'.vtt','WEBVTT\n\n'+cues.map((c,i)=>`${i+1}\n${fmt(c.start)} --> ${fmt(c.end)}\n${c.text}\n`).join('\n'));
 const video=page.video();await context.close();await video.saveAs(publicDir+'/'+id+'.webm');reports.push({id,duration:cues.at(-1).end,captions:cues,calls,errors,unknown});console.log('RECORDED '+id+' '+Math.round(cues.at(-1).end)+'s');
 }catch(error){await page.screenshot({path:output+'/'+id+'-error.png',fullPage:true}).catch(()=>{});await writeFile(output+'/'+id+'-error.txt',String(error)+'\n'+JSON.stringify({calls,unknown,errors})+'\n'+await page.locator('body').innerText());await context.close();console.error('FAILED '+id+' '+error);reports.push({id,error:String(error)});}
 let previous=[];try{previous=JSON.parse(await readFile(output+'/recording-results.json','utf8'));}catch{}await writeFile(output+'/recording-results.json',JSON.stringify([...previous.filter(p=>!reports.some(r=>r.id===p.id)),...reports],null,2));
}}finally{await browser.close();}
if(reports.some(r=>r.error))process.exitCode=1;
