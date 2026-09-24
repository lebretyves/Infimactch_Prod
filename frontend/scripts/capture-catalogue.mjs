import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const base = process.env.CATALOGUE_BASE_URL || 'http://127.0.0.1:5173';
// Historical screenshot evidence stays outside public assets. The gallery route was retired.
const output = path.resolve(process.env.CATALOGUE_OUTPUT || 'annexe/proofs/catalogue-archives');
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const nurseId=uid(1), agencyId=uid(2), facilityId=uid(3), missionId=uid(4), applicationId=uid(5), assignmentId=uid(6), documentId=uid(7);
const agency={id:agencyId,kind:'AGENCY',name:'Agence Horizon — démonstration',address:'12 avenue des Exemples, 75001 Paris',referent:'Camille Exemple · Référente agence · 0600000000',siret:'00000000000000',finess:null};
const facility={id:facilityId,kind:'ESTABLISHMENT',name:'Clinique des Jardins — démonstration',address:'8 rue des Exemples, 75012 Paris',referent:'Alex Exemple · Responsable soins · 0600000000',finess:'000000000',siret:null};
const profile={display_name:'Camille',qualifications:['IDE'],skills:['TRIAGE','PERFUSION','POSE_VOIE_VEINEUSE','POPULATION_ADULT'],experience:[{establishment:'Centre de soins — démonstration',service:'URGENCES',start:'2021-01-01T00:00:00Z',end:'2025-12-31T23:00:00Z'}],available:[{start:'2026-09-19T22:00:00Z',end:'2026-10-15T22:00:00Z'}],unavailable:[{start:'2026-10-01T22:00:00Z',end:'2026-10-03T22:00:00Z'}],latitude:48.8566,longitude:2.3522,radius_km:30,accepted_shifts:['DAY','NIGHT','MIXED'],preferred_shifts:['DAY'],visible:true,rpps_status:'FOUND',rpps_number:'10000000001',details:{firstName:'Camille',lastName:'Exemple',birthDate:'1992-04-15',phone:'0600000000',address:'1 rue des Exemples',postalCode:'75001',city:'Paris',diploma:'Diplôme d’État infirmier — démonstration',diplomaYear:2015,ideDiplomaYear:2015,referenceName:'Alex Exemple',referenceRole:'Cadre de santé',referenceEstablishment:'Centre de soins — démonstration',referenceEmail:'reference@example.invalid',transport:'Véhicule personnel'}};
const mission={id:missionId,title:'Renfort infirmier en service d’urgences',description:'Mission de démonstration. Rejoignez une équipe de soins adultes pour assurer l’accueil, la surveillance et la continuité des prises en charge. Transmission avec l’équipe en début et en fin de poste.',qualification:'IDE',start_at:'2026-09-25T05:00:00Z',end_at:'2026-09-25T17:00:00Z',hourly_salary:28,service:'URGENCES',shift:'DAY',version:2,status:'OPEN',establishment_id:facilityId,agency_id:agencyId,agency_name:agency.name,establishment_name:facility.name,address:facility.address,location_label:'Paris 12e',latitude:48.84,longitude:2.39,population:'ADULT',block:'NONE',specialty:null,required_skills:['PERFUSION','POPULATION_ADULT'],desired_skills:['TRIAGE'],min_experience_months:12,application_count:2,assignments:[]};
const staffingNeed={id:uid(17),missions:[],title:'Renfort de deux IDE aux urgences',description:'Besoin fictif : renfort de deux professionnels pour la continuité des soins adultes aux urgences.',created_at:'2026-09-15T12:00:00Z',updated_at:'2026-09-16T08:00:00Z',establishment_id:facilityId,establishment_name:facility.name,establishment_address:facility.address,details:{qualification:'IDE',service:'URGENCES',start:'2026-09-25T04:00:00Z',end:'2026-09-25T12:00:00Z',shift:'DAY',headcount:2,population:'ADULT',block:'NONE',requiredSkills:['PERFUSION','TRIAGE'],minExperienceMonths:12,address:facility.address}};
const external={id:'e_demo-annonce',kind:'EXTERNAL_OFFER',title:'Infirmier en soins de suite — annonce externe',description:'Annonce fictive présentée pour montrer la lecture d’une offre issue d’un site partenaire. Les conditions et la candidature se consultent sur le site source.',qualification:'IDE',location_label:'Paris',source:'Site partenaire — démonstration',url:'https://example.invalid/annonce',salary:{amount:27,currency:'EUR',unit:'HOUR',gross:true}};
const reference={ideServices:['URGENCES','MEDECINE','CHIRURGIE','REANIMATION','GERIATRIE','PEDIATRIE'],blockSpecialties:['ORTHOPEDIE','CARDIOLOGIE','NEUROCHIRURGIE']};
const draft={email:'camille@example.invalid',nom:'Exemple',prenom:'Camille',naissance:'1992-04-15',telephone:'0600000000',adresse:'1 rue des Exemples',codePostal:'75001',ville:'Paris',qualification:'IDE',qualifications:['IDE'],disponibleFin:'2026-10-15',horaire:'BOTH',latitude:48.8566,longitude:2.3522,diplome:'Diplôme d’État infirmier — démonstration',anneeDiplome:'2015',rpps:'10000000001',competences:['PERFUSION','TRIAGE'],experiences:[{etablissement:'Centre de soins — démonstration',service:'URGENCES',annees:'4',start:'2021-01-01',end:'2025-12-31'}],rayonKm:30,transport:'Véhicule personnel',creneaux:[],disponibleDes:'2026-09-20',cgu:true,confidentialite:true,traitement:true,actualites:false};
const entries=[];
function add(id,title,group,route,description,features,extra={}) {entries.push({id,title,group,route,description,features,desktop:`/catalogue/captures/${id}-desktop.png`,mobile:`/catalogue/captures/${id}-mobile.png`,...(!route.includes(':') && route!=='*'?{livePath:route}:{}),...extra});}
add('accueil-public','Accueil public','public','/','Accueil photographique : présentation courte d’InfiMatch, trois parcours et liens utiles.',['Notre mission','Parcours soignant, établissement et agence','Comment ça marche','Qui sommes-nous','Questions fréquentes','Navigation et liens utiles']);
add('connexion-candidat','Connexion à mon espace','public','/connexion','Connexion commune aux candidats, établissements et agences.',['Email et mot de passe','Espace déterminé par le compte'],{note:'Capture isolée de la connexion classique. Le composant Google dépend de son fournisseur et n’est pas exercé dans ce catalogue.'});
add('cookies','Choix des cookies','public','/connexion','Choix initial des cookies et de la connexion Google.',['Refuser ou accepter','Personnaliser','Politique des cookies'],{cookies:true});
add('cookies-personnalisation','Préférences cookies','public','/connexion','Détail des services nécessaires et de la connexion Google facultative.',['Choix Google','Nécessaires toujours actifs','Enregistrement'],{cookies:true,setup:'cookie-custom'});
add('inscription-finess','Établissement trouvé par FINESS','public','/inscription?espace=etablissement','Coordonnées préremplies depuis le répertoire FINESS du backend.',['Nom et adresse','Code postal et ville','Coordonnées modifiables'],{setup:'finess-found'});
add('inscription-google','Inscription avec Google','public','/inscription?google=1','Identité Google vérifiée, puis choix du parcours sans mot de passe local.',['Adresse vérifiée verrouillée','Choix soignant ou organisation','Profil et consentements à compléter'],{google:true,draft:true});
add('inscription-compte','Inscription candidat · compte','public','/inscription','Première étape de la création du compte professionnel.',['Email','Mot de passe et confirmation','Passage au dossier candidat']);
add('inscription-etablissement','Inscription établissement','public','/inscription','Création du compte et renseignements de l’établissement.',['Organisation et FINESS','Coordonnées du référent','Consentements'],{setup:'enterprise-signup'});
add('inscription-agence','Inscription agence','public','/inscription','Variante agence du formulaire de création de compte.',['Type d’organisation','SIRET facultatif','Coordonnées du référent'],{setup:'agency-signup'});
add('mentions','Mentions légales et conditions','public','/mentions-legales','Informations et consentements présentés par le frontend.',['Conditions d’utilisation','Confidentialité','Retour à l’inscription']);
for(const [slug,title,description,features] of [
 ['identite','Identité','Coordonnées personnelles du futur candidat.',['Prénom et nom','Date de naissance','Téléphone']],
 ['localisation','Localisation','Adresse et position utilisées pour la mobilité.',['Adresse','Code postal et ville','Géolocalisation facultative']],
 ['qualification','Qualifications et expérience','Qualifications, compétences et expériences professionnelles.',['IDE, IADE, IBODE','Diplôme et RPPS','Expériences datées']],
 ['mobilite','Mobilité','Périmètre des déplacements professionnels.',['Rayon de déplacement','Moyen de transport']],
 ['disponibilites','Disponibilités','Période de disponibilité et types d’horaires acceptés.',['Dates sans heures','Jour, nuit ou les deux']],
 ['rib','RIB · information','Explication de l’ajout du RIB après création du compte.',['Accès différé au dossier','RIB fictif de démonstration']],
 ['consentements','Consentements','Dernière étape avant la création du compte candidat.',['Conditions générales','Confidentialité','Confirmation de l’inscription']]
])add('inscription-'+slug,'Inscription · '+title,'candidat','/inscription/'+slug,description,features,{auth:'public',draft:true});
add('inscription-google-consentements','Google · consentements','candidat','/inscription/consentements','Confirmation de création du compte Google après le dossier candidat.',['Identité Google','Consentements explicites','Aucun mot de passe local'],{auth:'public',draft:true,google:true});
add('confirmation-candidat','Compte candidat créé','candidat','/inscription/confirmation','Confirmation et prochaines actions après l’inscription.',['Compte créé','Compléter le profil','Accéder à mon espace'],{auth:'candidat'});
add('dashboard-candidat','Mon espace candidat','candidat','/accueil','Vue d’ensemble de l’activité et des notifications.',['Compteurs et prochaine mission','Disponibilités et notifications','Parcours adaptés aux maquettes']);
add('missions-candidat','Recherche de missions','candidat','/missions','Missions et offres correspondant aux qualifications enregistrées.',['Filtres métier, dates et mobilité','Recherche sur toutes les offres','Total et pages numérotées','Favoris et recommandations']);
add('missions-profil-incomplet','Missions · profil à compléter','candidat','/missions','Annonces publiques disponibles avant d’ajouter une qualification.',['Explication du profil incomplet','Annonces externes','Accès au profil'],{variant:'incomplete'});
add('mission-detail','Détail d’une mission','candidat','/missions/:id','Conditions complètes d’une mission interne ouverte.',['Dates et rémunération','Compétences et expérience','Établissement et candidature'],{path:'/missions/m_'+missionId});
add('offre-externe','Détail d’une annonce externe','candidat','/missions/:id','Lecture d’une offre partenaire et accès à sa source.',['Source de l’annonce','Informations disponibles','Lien de candidature externe'],{path:'/missions/e_demo-annonce'});
add('candidater','Confirmer une candidature','candidat','/missions/:id/candidater','Relecture des conditions et consentement du professionnel.',['Conditions de mission','Profil utilisé','Consentement avant envoi'],{path:'/missions/m_'+missionId+'/candidater'});
add('candidature-envoyee','Candidature enregistrée','candidat','/missions/:id/candidater','État de confirmation après l’envoi d’une candidature.',['Confirmation d’envoi','Lien vers le suivi'],{path:'/missions/m_'+missionId+'/candidater',setup:'applied',note:'L’envoi est simulé dans le navigateur ; aucune candidature n’est créée sur le serveur.'});
add('candidatures','Mes candidatures','candidat','/candidatures','Liste des candidatures et actions de suivi.',['États des candidatures','Retrait','Accès au détail']);
add('candidature-suivi','Suivi d’une candidature','candidat','/candidatures/:id','Historique des étapes jusqu’à l’affectation.',['Chronologie des événements','Affectation','Confirmation de mission'],{path:'/candidatures/'+applicationId});
add('calendrier','Agenda par créneaux · semaine','candidat','/calendrier','Matin, après-midi et nuit : clic pour disponible, indisponible ou non renseigné.',['Trois états enregistrés','Périodes multijours','Missions confirmées'],{setup:'calendar-slots'});
add('calendrier-mois','Agenda par créneaux · mois','candidat','/calendrier','Vue mensuelle des disponibilités et indisponibilités sans chevauchement.',['Matin 06–14','Après-midi 14–22','Nuit 22–06'],{setup:'calendar-slots',variant:'month'});
add('profil','Profil professionnel','candidat','/profil','Éditeur complet du profil utilisé pour la recherche de missions.',['Identité et diplôme','Compétences et expérience','Mobilité, horaires et disponibilités']);
add('dossier','Dossier professionnel','candidat','/dossier','Justificatifs, numéro professionnel et RIB de démonstration.',['Vérification RPPS','Ajout et téléchargement de justificatifs','IBAN fictif'],{note:'Le statut RPPS affiché est une fixture visuelle ; il ne prouve aucune vérification auprès du répertoire réel.'});
add('favoris','Mes favoris','candidat','/favoris','Missions, annonces et établissements enregistrés.',['Trois types de favoris','Consultation','Retrait des favoris']);
add('etablissement-public','Fiche établissement','candidat','/etablissements/:id','Coordonnées publiques et missions ouvertes d’un établissement.',['Adresse et FINESS','Favori établissement','Liste des missions'],{path:'/etablissements/'+facilityId});
add('historique','Mes missions confirmées','candidat','/historique','Missions à venir et passées avec accès aux confirmations.',['Historique des affectations','Dates et états','Confirmation de mission']);
for(const group of ['etablissement','agence']) {
 const name=group==='agence'?'agence':'établissement';
 add('confirmation-'+group,'Compte '+name+' créé',group,'/inscription/confirmation-etablissement','Confirmation de la création du compte organisation.',['Récapitulatif de l’organisation','Identifiant professionnel','Accès à mon espace']);
 add('dashboard-'+group,'Mon espace '+name,group,'/accueil','Tableau de bord de l’activité de l’organisation.',['Missions par état','Notifications','Accès aux missions']);
 add('missions-'+group,'Missions · '+name,group,'/missions','Liste des missions accessibles à cette organisation.',['Liste et états','Accès à la gestion',...(group==='agence'?['Créer une mission']:[])]);
 add('gestion-'+group,'Gestion de mission · '+name,group,'/gestion/missions/:id',group==='agence'?'Pilotage de la mission, candidats et affectation.':'Consultation des candidats et sélection pour la mission.',['Détail de la mission','Candidats reçus',group==='agence'?'Affectation et profils proposés':'Sélection et refus des candidats'],{path:'/gestion/missions/'+missionId});
 add('organisation-'+group,'Organisation · '+name,group,'/organisation','Coordonnées et identité de l’organisation.',['Nom et adresse','Référent','Identifiants professionnels',...(group==='agence'?['Établissements rattachés']:[])]);
}
add('besoins-redirection','Ancien lien vers les missions','agence','/besoins','Redirection vers le suivi unique des missions.',['Missions et suivi'],{finalPath:'/missions'});
add('mission-nouvelle','Créer une mission','agence','/gestion/missions/nouvelle','Formulaire complet de création et publication directe d’une mission.',['Établissement rattaché','Compétences et conditions','Horaires, adresse et rémunération']);
add('mission-depuis-besoin','Compléter une ancienne annonce','agence','/gestion/missions/nouvelle?besoin='+uid(17),'Reprise des critères d’une ancienne saisie dans le formulaire de publication.',['Établissement et critères préremplis','Effectif demandé rappelé','Rémunération et coordonnées à compléter']);
add('mission-modifier','Modifier une mission','agence','/gestion/missions/:id/modifier','Modification des conditions d’une mission existante.',['Conditions préremplies','Qualification et compétences','Enregistrement des modifications'],{path:'/gestion/missions/'+missionId+'/modifier'});
add('mission-brouillon','Mission · brouillon','agence','/gestion/missions/:id','État avant publication de la mission.',['Modifier','Publier','Annuler'],{path:'/gestion/missions/'+missionId,variant:'draft'});
add('mission-pourvue','Mission · pourvue','agence','/gestion/missions/:id','État d’une mission avec une affectation confirmée.',['Affectation','Confirmation de mission','Suivi de l’état'],{path:'/gestion/missions/'+missionId,variant:'filled'});
add('suivi-organisation','Suivi candidature · organisation','agence','/candidatures/:id','Chronologie consultable par l’organisation autorisée.',['Événements de candidature','Affectation','Retour à la gestion'],{path:'/candidatures/'+applicationId});
add('mot-de-passe','Mot de passe oublié · indisponible','systeme','/mot-de-passe-oublie','Écran présent dans le code pour la récupération du mot de passe.',['Saisie email','Retour à la connexion'],{auth:'public',note:'La réinitialisation n’est pas implémentée : aucun email n’est envoyé. Ce parcours est volontairement signalé comme indisponible.'});
add('session-expiree','Confirmation · session absente','systeme','/inscription/confirmation','État affiché lorsqu’aucune session n’est disponible.',['Explication','Connexion','Nouvelle vérification'],{auth:'public',expectedAlert:true});
add('page-introuvable','Page introuvable','systeme','*','Écran de récupération pour une adresse inconnue.',['Message explicatif','Retour à mon espace'],{path:'/catalogue-exemple-introuvable',auth:'public'});
const reports=[];
const publicEntry = ({path,auth,setup,variant,draft,expectedAlert,...item}) => item;
const manifest={generatedAt:new Date().toISOString(),entries:entries.map(publicEntry)};
await mkdir(path.join(output,'captures'),{recursive:true});
await writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const browser=await chromium.launch({headless:process.env.CATALOGUE_HEADLESS==='1',executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try {
for(const entry of entries.filter(item=>!process.env.CATALOGUE_ONLY || process.env.CATALOGUE_ONLY.split(',').includes(item.id))) {
 for(const device of ['desktop','mobile']) {
  const auth=entry.auth || (entry.group==='public'||entry.group==='systeme'?'public':entry.group);
  const context=await browser.newContext({viewport:device==='desktop'?{width:1440,height:960}:{width:375,height:812},deviceScaleFactor:1,locale:'fr-FR',timezoneId:'Europe/Paris',serviceWorkers:'block'});
  if(!entry.cookies)await context.addInitScript(()=>localStorage.setItem('infimatch:cookie-preferences',JSON.stringify({version:1,savedAt:new Date().toISOString(),google:false})));
  if(entry.draft)await context.addInitScript(d=>sessionStorage.setItem('infimatch:inscription-draft-v1',JSON.stringify({version:2,createdAt:Date.now(),expiresAt:Date.now()+1800000,data:d})),{...draft,google:!!entry.google});
  const errors=[],unknown=[],calls=[],blocked=[];
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  const currentMission={...mission,status:entry.variant==='draft'?'DRAFT':entry.variant==='filled'?'FILLED':'OPEN',assignments:entry.variant==='filled'?[{id:assignmentId,status:'ACTIVE',display_name:'Camille Exemple'}]:[]};
  const application={id:applicationId,mission_id:missionId,title:mission.title,status:'SUBMITTED',created_at:'2026-09-16T08:00:00Z',updated_at:'2026-09-16T08:00:00Z',requires_reconsent:false,current_version:2};
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname.startsWith('/api/')) {
    const p=url.pathname.replace(/^\/api\/v1/,''); const method=route.request().method(); calls.push(method+' '+p);
    const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(p==='/auth/me')return auth==='public'?send({message:'Session absente'},401):send({id:nurseId,email:auth==='candidat'?'camille@example.invalid':auth+'@example.invalid',family:auth==='candidat'?'NURSE':'ENTERPRISE',organizations:auth==='candidat'?[]:[auth==='agence'?agency:facility]});
    if(p==='/auth/csrf')return send({csrfToken:'catalogue-fictional-csrf'});
    if(p==='/auth/google/config')return send({enabled:false,clientId:null});
    if(p==='/auth/google/registration')return send({email:'camille@example.invalid',firstName:'Camille',lastName:'Exemple'});
    if(p==='/profile')return send({...profile,...(entry.setup==='calendar-slots'?{available:[{start:'2026-09-21T04:00:00Z',end:'2026-09-22T04:00:00Z'},{start:'2026-09-24T04:00:00Z',end:'2026-09-26T04:00:00Z'}],unavailable:[{start:'2026-09-22T12:00:00Z',end:'2026-09-23T04:00:00Z'}]}:{}),qualifications:entry.variant==='incomplete'?[]:profile.qualifications});
    if(p==='/reference-data/finess/010000024')return send({status:'FOUND_IN_SNAPSHOT',grantsOrganizationAccess:false,generated_at:'2026-09-01T02:07:30.088Z',establishment:{finess:'010000024',name:'CENTRE HOSPITALIER DE BOURG-EN-BRESSE FLEYRIAT',address:'900 ROUTE DE PARIS',postal_code:'01440',city:'VIRIAT',latitude:46.222286,longitude:5.209181}});
    if(p==='/reference-data')return send(reference);
    if(p==='/facilities')return send([facility]);
    if(p==='/dashboards')return send({family:auth==='candidat'?'NURSE':'ENTERPRISE',counts:auth==='candidat'?{favorites:3,applications:2,assignments:1}:{DRAFT:1,OPEN:3,FILLED:1,COMPLETED:2},profile:auth==='candidat'?{display_name:'Camille',rpps_status:'FOUND'}:undefined});
    if(p==='/me/notifications')return send([{id:uid(15),kind:'MATCH',read_at:null},{id:uid(16),kind:'CONFIRMATION',read_at:'2026-09-15T12:00:00Z'}]);
    if(p==='/me/organizations')return send({organizations:[auth==='agence'?agency:facility],links:[{...facility,agency_id:agencyId}]});
    if(p==='/listings/search'||p==='/listings/external')return send({items:p.endsWith('external')?[external]:[{...currentMission,id:'m_'+missionId,kind:'INTERNAL_MISSION'},external],total:p.endsWith('external')?1:2,limit:20,offset:0});
    if(p.startsWith('/listings/'))return send(p.endsWith('e_demo-annonce')?external:{...currentMission,id:'m_'+missionId,kind:'INTERNAL_MISSION'});
    if(p==='/me/matches')return send({items:[{missionId,score:92,eligible:true,reasons:[],explanationId:null,historyStatus:'UNAVAILABLE'}],total:1,limit:20,offset:0});
    if(p.startsWith('/me/listings/'))return send({mode:'PARTIAL',score:null,eligibilityVerified:false,criteria:[],profileToComplete:[]});
    if(p==='/me/favorites')return send([{kind:'MISSION',target_id:missionId,title:mission.title},{kind:'EXTERNAL',target_id:'demo-annonce',title:external.title,active:true},{kind:'ESTABLISHMENT',target_id:facilityId,title:facility.name}]);
    if(p==='/me/applications')return send([application,{...application,id:uid(25),title:'Mission de nuit en médecine — démonstration',status:'SELECTED'}]);
    if(p==='/applications/'+applicationId)return send({...application,status:'ASSIGNED',assignments:[{id:assignmentId,status:'ACTIVE'}],events:[{event:'APPLICATION_SUBMITTED',created_at:'2026-09-15T08:00:00Z'},{event:'APPLICATION_SELECTED',created_at:'2026-09-15T12:00:00Z'},{event:'ASSIGNMENT_CREATED',created_at:'2026-09-16T08:00:00Z'}]});
    if(p==='/me/history')return send([{id:assignmentId,mission_id:missionId,title:mission.title,status:'ACTIVE',start_at:mission.start_at,end_at:mission.end_at,temporal_position:'upcoming'},{id:uid(26),mission_id:uid(27),title:'Renfort en médecine — démonstration',status:'COMPLETED',start_at:'2026-09-01T05:00:00Z',end_at:'2026-09-01T17:00:00Z',temporal_position:'past'}]);
    if(p==='/me/documents')return send([{id:documentId,kind:'UPLOAD',mime:'application/pdf',size_bytes:52000,created_at:'2026-09-15T12:00:00Z'}]);
    if(p==='/me/bank-details')return send({iban:'FR•• •••• •••• DEMO •••• 0000'});
    if(p==='/facilities/'+facilityId)return send({...facility,missions:[currentMission]});
    if(p==='/staffing-requests')return send([staffingNeed]);
    if(p==='/staffing-requests/'+staffingNeed.id)return send(staffingNeed);
    if(p==='/missions')return send([currentMission,{...currentMission,id:uid(24),title:'Remplacement en médecine — démonstration',status:'DRAFT'}]);
    if(p==='/missions/'+missionId)return send(currentMission);
    if(p==='/missions/'+missionId+'/applications')return method==='POST'?send(application,201):send(entry.variant==='draft'?[]:[{...application,nurse_id:nurseId,display_name:'Camille Exemple',qualifications:['IDE'],skills:profile.skills,rpps_status:'FOUND',experience:profile.experience,available:profile.available,city:'Paris',radius_km:30}]);
    if(p==='/missions/'+missionId+'/candidates')return send({items:[{candidateId:nurseId,display_name:'Camille Exemple',score:92,qualifications:['IDE'],skills:profile.skills,reasons:[]}]});
    unknown.push(method+' '+p); return send({message:'Fixture absente du catalogue'},501);
   }
   if(url.origin===new URL(base).origin)return route.continue();
   if(['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname))return route.continue();
   blocked.push(url.hostname+url.pathname);return route.abort('blockedbyclient');
  });
  try {
   await page.goto(base+(entry.path||entry.route),{waitUntil:'networkidle'});
   await page.evaluate(()=>document.fonts.ready);
   if(entry.setup?.includes('signup')||entry.setup==='enterprise-login') {
    const radios=page.locator('input[type=radio][name=role]');
    await radios.nth(1).check();
    if(entry.setup==='agency-signup')await page.getByLabel('Type d’organisation').selectOption('AGENCY');
   }
   if(entry.setup==='calendar-slots'){await page.getByLabel('Aller à la date').fill('2026-09-21');if(entry.variant==='month')await page.getByLabel('Vue du calendrier').selectOption('month');}
   if(entry.setup==='cookie-custom')await page.getByRole('button',{name:'Personnaliser mes choix'}).click();
   if(entry.setup==='finess-found'){await page.locator('input[name=finess]').fill('010000024');await page.getByText('Établissement trouvé',{exact:true}).waitFor();}
   if(entry.setup==='applied') {
    await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Confirmer ma candidature'}).click();await page.getByRole('heading',{name:'Candidature enregistrée'}).waitFor();
   }
   await page.evaluate(async()=>{for(const image of document.images){image.loading='eager';try{await image.decode();}catch{}}});
   await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
   await page.waitForTimeout(120);
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.waitForTimeout(140);
   assert.equal(new URL(page.url()).pathname,new URL(entry.finalPath||entry.path||entry.route,base).pathname,'Redirection inattendue');
   const headings=await page.locator('h1').allTextContents(); assert.ok(headings.some(h=>h.trim()),'Titre de page absent');
   const alerts=await page.getByRole('alert').allTextContents();if(!entry.expectedAlert)assert.deepEqual(alerts,[],'Alerte inattendue');
   const loading=await page.locator('[role=status]').allTextContents();assert.ok(!loading.some(t=>/Chargement|Vérification de votre compte en cours/i.test(t)),'Page encore en chargement');
   assert.deepEqual(errors,[],'Erreur JavaScript'); assert.deepEqual(unknown,[],'API sans fixture');
   const badImages=await page.locator('img').evaluateAll(images=>images.filter(i=>!i.complete||!i.naturalWidth).map(i=>i.getAttribute('src')));assert.deepEqual(badImages,[],'Image absente');
   const width=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));
   await page.screenshot({path:path.join(output,'captures',entry.id+'-'+device+'.png'),fullPage:true,animations:'disabled'});
   reports.push({id:entry.id,device,route:entry.route,path:entry.path||entry.route,role:auth,headings,alerts,width,api:[...new Set(calls)],blockedExternal:blocked,errors,unknown});
   console.log('PASS '+entry.id+' '+device+(width.document>width.viewport?' (débordement existant '+width.document+'px)':''));
  }catch(error){await page.screenshot({path:path.join(output,'captures','failure-'+entry.id+'-'+device+'.png'),fullPage:true});console.error('FAIL',entry.id,device,{errors,unknown,alerts:await page.getByRole('alert').allTextContents()});throw error;}
  finally{await context.close();}
 }
}
const router=await readFile('src/router.tsx','utf8');const routes=[...router.matchAll(/path:\s*["']([^"']+)["']/g)].map(m=>m[1]);const capturedRoutes=[...new Set(entries.map(e=>e.route))];const uncovered=routes.filter(r=>!capturedRoutes.includes(r)&&r!=='/catalogue');if(!process.env.CATALOGUE_ONLY)assert.deepEqual(uncovered,[],'Route frontend non couverte');
const selectedCount=entries.filter(item=>!process.env.CATALOGUE_ONLY||process.env.CATALOGUE_ONLY.split(',').includes(item.id)).length;
assert.equal(reports.length,selectedCount*2,'Une capture manque');
await mkdir('annexe/proofs',{recursive:true});await writeFile(path.join(output,'catalogue-captures.json'),JSON.stringify({generatedAt:manifest.generatedAt,partial:Boolean(process.env.CATALOGUE_ONLY),entryCount:selectedCount,captureCount:reports.length,viewports:{desktop:'1440x960',mobile:'375x812'},scope:'Composants réels, API entièrement interceptée, données fictives uniquement, aucun compte ni enregistrement serveur. Polices publiques autorisées. Google OAuth hors capture. Le catalogue lui-même est la page de consultation, sans capture récursive.',routes,capturedRoutes,uncovered,reports},null,2)+'\n');
console.log(JSON.stringify({entries:entries.length,captures:reports.length,uncovered,overflow:reports.filter(r=>r.width.document>r.width.viewport).map(r=>r.id+' '+r.device)}));
}finally{await browser.close();}
