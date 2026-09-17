import fs from 'node:fs';import {parseOfferV2} from './parser-v2.mjs';import {parseOfferV3} from './parser-v3.mjs';
const old=JSON.parse(fs.readFileSync('data/parser-pilot/corpus.json'));const fresh=JSON.parse(fs.readFileSync('data/parser-pilot/holdout.json'));
// Manually selected semantic checks from full descriptions. Used for tuning, not a blind benchmark.
const expectations=[
 [['acompte',null],['taux_avantages',null],['service','EHPAD']],
 [['service','PNEUMOLOGIE'],['service','SOINS_INTENSIFS'],['competence','VENTILATION_MECANIQUE'],['alternance','JOUR_NUIT']],
 [['competence','PANSEMENTS'],['competence','INJECTIONS'],['experience_domaine','GERIATRIE'],['acompte',null]],
 [['service','CHIRURGIE'],['competence','DRAINS_REDONS'],['competence','DOULEUR'],['contexte_parcours',null]],
 [['competence','PERFUSIONS'],['competence','MEDICAMENTS'],['condition_experience',null],['duree_poste_heures',12],['remuneration_non_chiffree',true]],
 [['jours_travailles_semaine',3],['pause_minutes',60],['competence','PREMIERS_SECOURS']],
 [['service','REANIMATION'],['population','ENFANTS'],['montant_avantage',null],['taux_avantages',null]],
 [['service','NEUROPHYSIOLOGIE'],['competence','EEG']],
 [['service','CHIRURGIE'],['dates_incompletes',true]],
 [['service','NEPHROLOGIE'],['experience_domaine','DIALYSE'],['alternance','JOUR_NUIT']],
 [['service','SMR'],['service','ONCOLOGIE'],['remuneration_non_chiffree',true]],
 [['mode_exercice','DOMICILE'],['population','PERSONNES_AGEES'],['accessibilite_candidature',null]]
];
const notes=[
 'Les deux taux 10% sont conserves ensemble : attribution IFM/CP a verifier. Avantages agence distincts du poste.',
 '22 euros brut sans unite horaire explicite. Montant transport 3.38 sans devise explicite : ne pas inventer EUR. Distinguer maitrise requise et experience souhaitee.',
 'Pansements/injections ajoutes ; experience geriatrie souhaitee, pas duree imposee.',
 'Passage au bloc decrit le parcours patient ; aucune affectation au bloc deduite. Texte possiblement incomplet.',
 'Condition experience cite une regle et une exception : conservee pour relecture, jamais convertie en filtre legal automatique. Horaire 12h, convention sans salaire chiffre. Frais kilometriques sans montant.',
 'CONTRADICTION texte temps partiel 3 jours/semaine versus pied de fiche temps plein. Pause 1h, lundi/mardi/mercredi conserves mais roulement hebdomadaire pas encore entierement structure.',
 'Prime nuit/ferie distincte horaire de mission. Indemnite 3.39 EUR/jour travaille reperee. Age exact des enfants absent.',
 'EEG standard/sieste/Holter repere via EEG ; sous-types et materiel restent a structurer. Description coupee.',
 'Date a completer explicitement signalee. 1.48 Md EUR de chiffre affaires ignore comme salaire. Vacation en texte peut contredire MIS normalise.',
 'Nephrologie du poste distincte experience souhaitee en hemodialyse. 22 euros brut sans periode fiable.',
 'Salaire selon profil/reprise anciennete sans montant : aucune estimation. Soins de support en texte restent a enrichir dans referentiel.',
 'Handicap concerne accessibilite des candidatures, pas population soignee. Domicile explicite ; mobilite/permis non precises.'
];
const checks=fresh.map((row,i)=>{const previous=parseOfferV2(row),current=parseOfferV3(row);const matches=(p,f,v)=>p.fields.some(x=>x.field===f&&(v===null||x.value===v));return {id:row.id,title:row.title,checks:expectations[i].map(([field,value])=>({field,value,before:matches(previous,field,value),after:matches(current,field,value)})),manualReview:notes[i]};});
const parsed=[...old,...fresh].map(parseOfferV3);
const total=checks.flatMap(r=>r.checks);const summary={historicalOffers:old.length,newOffers:fresh.length,newSources:[...new Set(fresh.map(r=>r.source))],targetedChecks:total.length,before:total.filter(c=>c.before).length,after:total.filter(c=>c.after).length,missing:checks.flatMap(r=>r.checks.filter(c=>!c.after).map(c=>({title:r.title,...c}))),reviewQueueCount:parsed.reduce((n,r)=>n+r.reviewQueue.length,0)};
fs.mkdirSync('docs/proofs/parser-pilot-v3',{recursive:true});fs.writeFileSync('docs/proofs/parser-pilot-v3/results.json',JSON.stringify({summary,checks,offers:parsed},null,2));
const esc=x=>String(x).replace(/\|/g,'/').replace(/\r?\n/g,' ');
const lines=['# Parseur V3 : classement et informations manquantes','','Essai local, lecture seule, aucun appel API ni LLM. 24 annonces historiques (dont CDI desactives, conserves comme cas de regression) + 12 nouvelles annonces France Travail. Pas de nouveau lot JobsPipe hors du corpus disponible.','',`Sur ${total.length} points cibles relus : ${summary.before} retrouves par V2, ${summary.after} par V3. Ce lot a servi a ajuster les regles : ce n est pas un benchmark aveugle, ni une garantie de precision globale.`, '', '26 tests de regression du prototype passes. Aucun raccordement de V3 au catalogue ou matching.', '', 'Changements : services et gestes supplementaires ; handicap candidat distinct des patients ; transport sanitaire distinct des frais ; experience souhaitee distincte du service ; acomptes, taux et indemnites ; nombre de jours/pause ; alerte temps plein/partiel ; dates a completer.','','Limites : alternatives encore parfois en texte, composantes de salaire a reconcilier, portee des exigences et negations complexes a revoir, localisation textuelle fine et jours nommes non entierement structures. Les textes coupes ne peuvent etre reconstitues.', '', 'Chaque passage numerique ou sensible rejoint une file de relecture meme si une partie est extraite. Cette file est heuristique et ne garantit pas la detection de toutes les omissions.',''];
for(const check of checks){const p=parsed.find(x=>x.id===check.id);lines.push(`## ${check.title}`,'',`ID : ${check.id}`,'',check.manualReview,'',`Alertes : ${p.alerts.join(', ')||'aucune automatique'}`,'','| Champ attendu | Avant | Apres |','|---|---|---|',...check.checks.map(c=>`| ${esc(c.field+' '+(c.value??''))} | ${c.before?'oui':'non'} | ${c.after?'oui':'MANQUE'} |`),'','| Champ | Valeur | Etat | Preuve |','|---|---|---|---|',...p.fields.map(f=>'| '+[f.field,JSON.stringify(f.value),f.state,f.evidence].map(esc).join(' | ')+' |'),'');}
fs.writeFileSync('docs/proofs/parser-pilot-v3/COMPARAISON.md',lines.join('\n')+'\n');console.log(JSON.stringify(summary,null,2));
