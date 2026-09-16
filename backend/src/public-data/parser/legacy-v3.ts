import {parseOfferV2,fold} from './legacy-v2';
import {structuredDetails} from './structured-details';
// Experimental: preserves uncertain facts and never writes application records.
export function parseOfferV3(row: any){
 const r=parseOfferV2(row);r.version=3;r.structured=structuredDetails(row.description||'');
 const add=(field: string,value: any,evidence: string,state='MENTION_A_CONFIRMER',origin='DESCRIPTION')=>{if(!r.fields.some((f: any)=>f.field===field&&JSON.stringify(f.value)===JSON.stringify(value)&&f.evidence===evidence))r.fields.push({field,value,evidence,state,origin});};
 const text=row.description||'';
 const clauses=[{s:row.title||'',origin:'TITLE'},...text.replace(/([.!?])(?=[A-ZÀ-Ý])/g,'$1\n').replace(/(Vos missions|Votre profil|Profil du candidat|Profil recherché|Pré-requis|Informations complémentaires|Temps de travail|Salaire\s*:|Horaires?\s*:|Dates de mission\s*:)/gi,'\n$1').split(/\n|[;!?](?:\s+|$)|\.(?=\s+[A-ZÀ-Ý])|\s+-\s+(?=[A-ZÀ-Ý])/).map((s: string)=>({s:s.trim(),origin:'DESCRIPTION'}))].filter((x: any)=>x.s);
 // Correct false equivalences from the previous keyword-only pilot.
 r.fields=r.fields.map((f: any)=>{
  const s=fold(f.evidence);
  if(f.field==='population'&&/postes.{0,30}ouverts|candidat.{0,30}handicap|reconnaissance.{0,20}handicap/.test(s))return {...f,field:'accessibilite_candidature',state:'NE_DECRIT_PAS_LES_PATIENTS'};
  if(f.field==='avantage'&&f.value==='TRANSPORT'&&/transport.{0,15}medicalis|rapatriement sanitaire/.test(s)&&!/rembours|indemni|prise en charge.{0,20}frais/.test(s))return {...f,field:'activite_transport_sanitaire',state:'ACTIVITE_PAS_AVANTAGE'};
  if(f.field==='service'&&f.value==='BLOC'&&/avant.{0,30}passage au bloc/.test(s))return {...f,field:'contexte_parcours',state:'NE_PROUVE_PAS_SERVICE_AFFECTATION'};
  if(f.field==='horaire_type'&&/prime|majoration/.test(s)&&!/horaires?|missions? de|poste de/.test(s))return {...f,field:'majoration_horaire',state:'NE_PROUVE_PAS_HORAIRE_POSTE'};
  if(f.field==='langue'&&/anglais/.test(s)&&/autres langues.{0,30}apprecie/.test(s))return {...f,state:'MENTION_A_CONFIRMER'};
  return f;
 });
 const terms={service:{PNEUMOLOGIE:/pneumolog/,SOINS_INTENSIFS:/soins intensifs?/,CHIRURGIE:/chirurgie/,NEPHROLOGIE:/nephrolog/,NEUROPHYSIOLOGIE:/neurophysiolog|epilepsie/},mode_exercice:{DOMICILE:/a domicile/},competence:{VENTILATION_MECANIQUE:/ventilation mecanique/,EEG:/electroencephalogrammes?|\beeg\b/,PANSEMENTS:/pansements?/,INJECTIONS:/injections?/,PERFUSIONS:/perfusions?/,DRAINS_REDONS:/drains?|redons?/,DOULEUR:/douleur|analgesie/,MEDICAMENTS:/administr.{0,35}(?:medicament|traitement)|preparation.{0,30}medicament/,PREMIERS_SECOURS:/premiers secours/}};
 for(const {s:evidence,origin} of clauses){const s=fold(evidence);
  const corporate=/cnil|donnees personnelles|chiffre d.affaires|md€|\bde ca\b/.test(s);
  if(corporate)continue;
  let state=/souhait|apprecie|idealement|serait un plus/.test(s)?'SOUHAITE':/exige|obligatoire|indispensable|requis|maitrise/.test(s)?'EXIGENCE_TEXTE':'MENTION_A_CONFIRMER';
  for(const [field,values] of Object.entries(terms))for(const [value,pattern] of Object.entries(values)){
   const m=s.match(pattern);if(!m)continue;
   const prefix=s.slice(Math.max(0,(m.index ?? 0)-30),m.index ?? 0);
   const neg=/\b(?:sans|pas de|aucun)\s*(?:\w+\s+){0,2}$/.test(prefix);
   add(field==='service'&&/experience/.test(s)?'experience_domaine':field,value,evidence,neg?'NEGATION':state,origin);
  }
  if(/jour\s*(?:et\s*\/\s*ou|et|\/)\s*(?:de\s+)?nuit/.test(s))add('alternance','JOUR_NUIT',evidence,'EXPLICITE',origin);
  if(/salaire|remuneration/.test(s)&&/selon.{0,35}(profil|experience|convention)|a convenir|reprise d.anciennete/.test(s))add('remuneration_non_chiffree',true,evidence,'AUCUN_MONTANT_INVENTE',origin);
  if(/dates?.{0,25}a completer/.test(s)){add('dates_incompletes',true,evidence,'INCONNU',origin);r.alerts.push('DATES_FOURNISSEUR_A_COMPLETER');}
  if(/acompte/.test(s)){
   const m=s.match(/(\d+)\s*fois par\s*(semaine|mois)/);
   add('acompte',m?{frequency:Number(m[1]),period:m[2]}:{frequency:null},evidence,'EXPLICITE',origin);
  }
  if(/indemnite|conges payes|prime|rembours|mutuelle|repas|navigo|titre.{0,3}restaurant/.test(s)){
   // Preserve grouped rates when assignment to each component is ambiguous.
   const rates=[...s.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)].map(m=>Number(m[1]!.replace(',','.')));
   if(rates.length)add('taux_avantages',{rates,assignment:'A_CONFIRMER_PAR_COMPOSANTE'},evidence,'EXPLICITE',origin);
   for(const m of s.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:euros?|€)(?:\s*par\s+(jour(?: travaille)?|repas))?/g)){
    // Require an allowance label near the amount; do not grab the base wage.
    const nearby=s.slice(Math.max(0,(m.index ?? 0)-55),(m.index ?? 0)+m[0].length+35);
    if(/transport|repas|indemnite/.test(nearby))add('montant_avantage',{amount:Number(m[1]!.replace(',','.')),currency:'EUR',period:m[2]||null},evidence,'RATTACHEMENT_A_CONFIRMER',origin);
   }
  }
  const days=s.match(/(\d+)\s*jours? par semaine/);if(days)add('jours_travailles_semaine',Number(days[1]),evidence,'EXPLICITE',origin);
  const pause=s.match(/(\d+)\s*(?:h(?:eures?)?\s*(\d{2})?|minutes?)\s*(?:de\s*)?pause/);
  if(pause)add('pause_minutes',/minute/.test(pause[0])?Number(pause[1]):Number(pause[1])*60+Number(pause[2]||0),evidence,'PAIEMENT_NON_DEDUIT',origin);
  if(/(?:\d+\s*ans|experience).{0,100}(?:\bsi\b|avant juillet|valletoux)/.test(s)||/valletoux/.test(s))add('condition_experience',evidence,evidence,'CONDITION_A_VERIFIER_NON_APPLIQUEE',origin);
  const duration=s.match(/(?:en|postes? de)\s*(\d{1,2})\s*h\b/);
  if(duration&&/horaires?|planning|poste|mission/.test(s)&&Number(duration[1])<=24)add('duree_poste_heures',Number(duration[1]),evidence,'EXPLICITE_A_VERIFIER',origin);
  const notice=s.match(/(\d+)\s*a\s*(\d+)\s*disponibilites.{0,25}(\d+(?:[.,]\d+)?)\s*mois/);
  if(notice)add('disponibilites_a_declarer',{min:Number(notice[1]),max:Number(notice[2]),noticeMonths:Number(notice[3]!.replace(',','.'))},evidence,'EXPLICITE',origin);
 }
 const times=new Set(r.fields.filter((f: any)=>f.field==='temps_travail').map((f: any)=>f.value));
 if(times.has('PLEIN')&&times.has('PARTIEL'))r.alerts.push('TEMPS_PLEIN_PARTIEL_CONTRADICTOIRE');
 // Coverage queue is independent of keyword matches: partial extraction never hides the whole clause.
 const important=/permis|vehicule|logiciel|logement|hebergement|vaccin|mobilite|disponibilite|convention|repos|astreinte|garde|pause|\d/;
 r.reviewQueue=clauses.filter((c: any)=>important.test(fold(c.s))&&!/cnil|donnees personnelles|\bde ca\b/.test(fold(c.s))).map((c: any)=>({evidence:c.s,extractedFields:[...new Set(r.fields.filter((f: any)=>f.evidence===c.s).map((f: any)=>f.field))],status:'RELECTURE_PARTIELLE_REQUISE'}));
 r.alerts=[...new Set(r.alerts)];return r;
}
