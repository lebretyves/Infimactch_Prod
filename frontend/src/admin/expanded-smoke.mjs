// Fictional browser contract checks only; no network request reaches production.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
const root = resolve('dist-admin');
const server = createServer(async (req, res) => { try { const path = resolve(root, '.' + (req.url === '/' ? '/index.html' : new URL(req.url, 'http://localhost').pathname)); if (!path.startsWith(root + '/') && !path.startsWith(root + '\\')) throw Error('path'); const data = await readFile(path); res.setHeader('Content-Type', ({'.html':'text/html','.js':'application/javascript','.css':'text/css'})[extname(path)] || 'application/octet-stream'); res.end(data); } catch { res.writeHead(404); res.end(); } });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({headless:true,channel:'msedge'});
const screenshots = resolve(process.env.ADMIN_SCREENSHOTS || tmpdir(), 'infimatch-admin-complete-fictional');
await mkdir(screenshots,{recursive:true});
try {
  const page = await browser.newPage(); const errors=[]; const mutations=[]; let unavailable=false; let sourceEnabled=true; let notificationState='NOT_ASSOCIATED'; let personalState='NOT_ASSOCIATED'; let notificationFailure=false;
  page.on('pageerror',e=>errors.push(e.message));
  const user={id:'fixture-admin',email:'admin@example.invalid',role:'OWNER',permissions:['overview','accounts','accounts:write','organizations','organizations:write','missions','matching','verification:write','sources','sources:write','infrastructure','incidents:write']};
  const at='2026-09-17T10:00:00Z';
  await page.route('**/api/v1/admin/**',async route=>{
    const path=new URL(route.request().url()).pathname.replace('/api/v1/admin',''); let body={}; let status=200;
    if(route.request().method()==='POST'){ const payload=route.request().postDataJSON(); assert.ok(payload.reason?.length>=8); assert.equal(route.request().headers()['x-csrf-token'],'fixture-csrf');mutations.push({path,payload});body={ok:true};if(path.endsWith('/state') && 'enabled' in payload)sourceEnabled=payload.enabled;if(path.endsWith('/refresh'))body={status:'BUSY'}; }
    else if(path==='/csrf')body={csrfToken:'fixture-csrf'};
    else if(path==='/me')body=user;
    else if(path==='/overview')body={observedAt:at,counts:{accounts:1,organizations:1,missions:{OPEN:1}},alerts:[]};
    else if(path==='/organizations')body={items:[{id:'org-1',name:'Établissement fictif',kind:'ESTABLISHMENT',address:'Adresse fictive',members:1}],total:1};
    else if(path==='/organizations/org-1')body={organization:{id:'org-1',name:'Établissement fictif',kind:'ESTABLISHMENT',address:'Adresse fictive'},members:[{user_id:'client-1',email:'client@example.invalid',active:true,account_active:true}],links:[{agency_id:'agency-1',establishment_id:'org-1',agency_name:'Agence fictive',establishment_name:'Établissement fictif'}]};
    else if(path.endsWith('/notifications')) { if(notificationFailure){status=503;body={message:'Notifications temporairement indisponibles'};}else body={observedAt:at,connection:{state:notificationState,discordUserId:notificationState==='ASSOCIATED'?'fictional-discord-id':null,connectedAt:notificationState==='ASSOCIATED'?at:null,challengeExpiresAt:at},personal:{state:personalState,selectedEvents:['MISSION_PROPOSED'],mutedEvents:[],effectiveEvents:notificationState==='ASSOCIATED'&&personalState==='ENABLED'?['MISSION_PROPOSED']:[],updatedAt:at},internal:{total:3,unread:2},deliveries:{counts:{SENT:1,FAILED:1},latest:{id:'delivery-failure',kind:'MISSION_PROPOSED',status:'FAILED',attempts:2,createdAt:at,sentAt:null,errorCode:'DELIVERY_UNCERTAIN'},recent:[{id:'delivery-sent',kind:'MISSION_PROPOSED',status:'SENT',attempts:1,createdAt:at,sentAt:at,errorCode:null},{id:'delivery-failure',kind:'MISSION_PROPOSED',status:'FAILED',attempts:2,createdAt:at,sentAt:null,errorCode:'DISCORD_HTTP_403'}]},organizations:[{id:'org-1',name:'Organisation Discord fictive',kind:'ESTABLISHMENT',configured:true,enabled:false,channelName:'canal-fictif',events:['MISSION_PROPOSED'],updatedAt:at}],catalog:{MISSION_PROPOSED:'Mission proposée'}}; }
    else if(path==='/accounts/company-1')body={account:{id:'company-1',email:'enterprise@example.invalid',active:true,family:'ENTERPRISE'},organizations:[],profile:null,documents:[],audit:[]};
    else if(path==='/accounts/client-1')body={account:{id:'client-1',email:'client@example.invalid',active:true,family:'NURSE'},organizations:[],profile:{qualifications:['IDE']},documents:[],audit:[]};
    else if(path==='/accounts/client-1/verification')body={directory:{status:'FOUND',checkedAt:at,reason:null,identityReview:true},professionalIdentity:null,reviews:[{id:'review-1',state:'TO_REVIEW',reason:'Contrôle fictif du dossier',created_at:at,actor_id:'fixture-admin'}]};
    else if(path==='/missions/mission-1/matching')body={items:[{id:'match-1',ownerId:'profil-fictif',missionVersion:1,profileVersion:'v1',rulesVersion:'v1',createdAt:at,expiresAt:'2020-01-01T00:00:00Z',stale:true,result:{eligible:false,reasons:['QUALIFICATION_MISSING','OUTSIDE_RADIUS'],score:null,distanceKm:53}}],total:1};
    else if(path==='/operations'){if(unavailable){status=503;body={message:'Service temporairement indisponible'};}else body={observedAt:at,sources:[{provider:'FRANCE_TRAVAIL',enabled:sourceEnabled,updated_at:at,nextScheduleLabel:null,lastRun:null,counts:{total:14,active:12}}],incidents:[]};}
    else if(path==='/incidents')body={items:[{id:'incident-1',service:'IMPORTS',state:'OPEN',impact:'Import fictif en retard',owner_label:'Équipe de test',started_at:at,updated_at:at}],total:1};
    else if(path==='/privacy-requests')body={items:[{id:'privacy-1',account_id:'client-1',status:'REQUESTED',requested_at:at}],total:1};
    else throw Error('Unexpected fixture endpoint '+path);
    await route.fulfill({status,json:body});
  });
  const origin=`http://127.0.0.1:${server.address().port}`;
  async function visit(path){await page.goto(`${origin}/#${path}`);await page.reload();}
  async function confirm(){await page.getByLabel('Justification (journalisée)').fill('Action fictive pour test du contrat');await page.getByRole('button',{name:'Confirmer l’opération'}).click();await page.getByText('Opération enregistrée. Les données ont été actualisées.').waitFor();}
  await visit('/organizations');await page.getByRole('link',{name:'Consulter →',exact:true}).click();
  await page.getByRole('button',{name:'Rattacher un membre',exact:true}).click();await page.getByLabel('Adresse e-mail du compte entreprise existant').fill('new@example.invalid');await confirm();
  assert.deepEqual(mutations.at(-1).payload,{active:true,email:'new@example.invalid',reason:'Action fictive pour test du contrat'});
  await page.getByRole('button',{name:'Créer un lien',exact:true}).click();await page.getByLabel('Identifiant de l’organisation de type opposé').fill('agency-2');await confirm();assert.equal(mutations.at(-1).payload.otherOrganizationId,'agency-2');
  for (const [connection,personal,label] of [['NOT_ASSOCIATED','NOT_ASSOCIATED','Aucun compte Discord associé'],['PENDING','NOT_ASSOCIATED','Association en attente'],['ASSOCIATED','DISABLED','Compte Discord associé'],['EXPIRED','NO_EVENTS','Association expirée'],['ASSOCIATED','ENABLED','Compte Discord associé']]) {
    notificationState=connection;personalState=personal;await visit('/accounts/company-1');await page.getByText(label,{exact:true}).waitFor();
    const panel=page.locator('section.admin-panel').filter({has:page.getByRole('heading',{name:'Notifications et Discord',exact:true})});
    await panel.getByText('canal-fictif',{exact:true}).waitFor();await panel.getByText('Accepté par Discord',{exact:true}).first().waitFor();await panel.getByText('Réponse Discord : HTTP 403',{exact:true}).waitFor();
    assert.equal(await panel.getByRole('button').count(),0,'Read-only notification panel');
    if(personal==='NO_EVENTS')await panel.getByText('Le compte ne reçoit aucune notification personnelle Discord : aucun événement n’est actif.').waitFor();
    if(personal==='DISABLED'){await panel.getByText('Notifications personnelles désactivées',{exact:true}).waitFor();await panel.getByText('Aucun événement effectivement actif.',{exact:true}).waitFor();await panel.getByText('Sélection et événements mis en sourdine',{exact:true}).click();assert.ok(await panel.getByText('Mission proposée',{exact:true}).count()>0);}
  }
  for(const width of [1440,768,375]) {await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:resolve(screenshots,`discord-${width}.png`),fullPage:true});}
  notificationFailure=true;await visit('/accounts/company-1');await page.getByText('Notifications temporairement indisponibles',{exact:true}).waitFor();await page.getByRole('heading',{name:'enterprise@example.invalid',exact:true}).waitFor();notificationFailure=false;await page.getByRole('button',{name:'Réessayer',exact:true}).click();await page.getByText('Compte Discord associé',{exact:true}).waitFor();
  await visit('/accounts/company-1');await page.getByRole('heading',{name:'enterprise@example.invalid',exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'Annuaire, identité et examen manuel',exact:true}).count(),0);assert.equal(await page.getByRole('alert').count(),0);
  await visit('/accounts/client-1');await page.getByText('Aucune preuve enregistrée',{exact:true}).waitFor();await page.getByRole('button',{name:'Examen consigné',exact:true}).click();await confirm();assert.equal(mutations.at(-1).payload.state,'REVIEWED');
  await visit('/missions/mission-1/matching');await page.getByText('Qualification requise absente',{exact:true}).waitFor();await page.getByText('Version dépassée : le profil, la mission ou les règles ont changé.').waitFor();await page.getByText('Explication expirée : sa validité temporelle est dépassée.').waitFor();
  for(const width of [1440,768,375]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:resolve(screenshots,`matching-${width}.png`),fullPage:true});}
  await visit('/operations');await page.getByRole('button',{name:'Mettre en pause',exact:true}).click();await confirm();assert.equal(mutations.at(-1).payload.enabled,false);
  await page.getByRole('button',{name:'Actualiser cette source',exact:true}).click();await page.getByLabel('Justification (journalisée)').fill('Relance manuelle fictive pendant pause');await page.getByRole('button',{name:'Confirmer l’opération'}).click();await page.getByText('Un import est déjà en cours. Attendez sa fin.').waitFor();assert.equal(await page.getByRole('dialog').count(),1);await page.getByRole('button',{name:'Annuler',exact:true}).click();
  unavailable=true;await page.getByRole('button',{name:'Actualiser',exact:true}).click();await page.getByRole('alert').waitFor();unavailable=false;await page.getByRole('button',{name:'Réessayer',exact:true}).click();await page.getByRole('heading',{name:'France Travail',exact:true}).waitFor();
  await visit('/incidents');await page.getByRole('button',{name:'Signaler un incident',exact:true}).click();await page.getByLabel('Service concerné').selectOption('IMPORTS');await page.getByLabel('Impact observé').fill('Impact fictif');await page.getByLabel('Responsable du suivi').fill('Équipe fictive');await confirm();assert.equal(mutations.at(-1).payload.service,'IMPORTS');
  await visit('/privacy-requests');await page.getByRole('link',{name:'Examiner la demande →'}).waitFor();assert.equal(await page.getByRole('button',{name:/supprimer|approuver/i}).count(),0);
  user.permissions=['overview','missions'];user.role='AUDITOR';await page.reload();await page.getByRole('alert').waitFor();await visit('/missions/mission-1/matching');await page.getByText('Votre rôle ne permet pas la consultation du matching.').waitFor();assert.equal(await page.getByRole('link',{name:'Pilotage des imports',exact:true}).count(),0);
  assert.deepEqual(errors,[]);console.log(`PASS expanded admin fictional browser contract: membership, links, review isolation, historical matching, source pause, failure/retry, incidents, privacy read-only, permissions. Screenshots: ${screenshots}`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
