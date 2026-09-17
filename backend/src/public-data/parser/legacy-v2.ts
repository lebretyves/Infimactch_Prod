// Experimental only: no database imports and no production matching integration.
export const fold=(s: unknown)=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const dictionaries={service:{DIALYSE:/dialys/,LABORATOIRE:/laboratoire/,SMR:/\bsmr\b|readaptation/,ADDICTOLOGIE:/addictolog/,HEMATOLOGIE:/hematolog/,ONCOLOGIE:/oncolog/,SANTE_TRAVAIL:/sante au travail/,REGULATION:/regulation medicale/,IME:/\bime\b/,EHPAD:/\behpad\b/,BLOC:/bloc operatoire/,SSPI:/\bsspi\b|salle de reveil/,REANIMATION:/reanimation/,URGENCES:/\burgences\b/,GERIATRIE:/geriatr/},specialite:{GYNECOLOGIE:/gynecolog/,ORTHOPEDIE:/orthoped/,DIGESTIF:/digestif|digestive/,UROLOGIE:/urolog/,PEDIATRIE:/pediatri/,CARDIOLOGIE:/cardiolog/},population:{ENFANTS:/\benfants?\b/,ADULTES:/\badultes?\b/,PERSONNES_AGEES:/personnes agees|patients ages/,HANDICAP:/handicap/},competence:{PRELEVEMENTS:/prelevements?/,CHIMIOTHERAPIE:/chimiotherap/,TRACABILITE:/tracabilite|transmissions/,SURVEILLANCE:/surveillance|surveill/,HYGIENE:/hygiene|asepsie/,EDUCATION_THERAPEUTIQUE:/education therapeutique/,INSTRUMENTATION:/instrumentation|instrumentiste/,CIRCULATION:/circulant|circulation/,AIDE_OPERATOIRE:/aide operatoire/},certification:{RPPS:/rpps/,DIPLOME_IADE:/diplome.{0,45}(?:anesthesiste|iade)/,DIPLOME_IBODE:/diplome ibode/,DIPLOME_INFIRMIER:/diplome.{0,25}(?:infirmier|ide)|\bde infirmier|\bdei\b/,ORDRE_INFIRMIER:/ordre.{0,25}infirmier/,AFGSU:/afgsu/,DIUST:/diust/,AFOMETRA:/afometra/,LICENCE_SANTE_TRAVAIL:/licence en sante au travail/,DU_PLAIES:/du en plaies et cicatrisation/},equipement:{ROBOT:/robot.assistee?/,NIKISO_DBB_EXA:/nikiso.{0,30}dbb.exa/},langue:{ANGLAIS:/anglais/}};
export function parseOfferV2(row: any){
 const result: any={id:row.id,source:row.source,title:row.title,url:row.url,fields:[],alerts:[],unclassified:[]};
 const add=(field: string,value: any,evidence: string,origin='DESCRIPTION',state='MENTION_A_CONFIRMER')=>{if(!result.fields.some((f: any)=>f.field===field&&JSON.stringify(f.value)===JSON.stringify(value)&&f.evidence===evidence))result.fields.push({field,value,evidence,origin,state});};
 const texts=[{text:row.title||'',origin:'TITLE'},...String(row.description||'').replace(/([.!?])(?=[A-ZÀ-Ý])/g,'$1\n').replace(/(Vos missions|Pré-requis|Profil recherché|Informations complémentaires|Type de contrat|Temps de travail|Salaire\s*:|Durée\s*:|Horaires\s*:|Dates\s*:|Profil -)/gi,'\n$1').split(/\n|\s+-\s+|[.;!?](?:\s+|$)/).filter(Boolean).map(text=>({text:text.trim(),origin:'DESCRIPTION'}))];
 for(const {text,origin} of texts){const s=fold(text);const before=result.fields.length;
  const boiler=/notre cabinet.{0,100}accompagne|que vous recherchiez|recrutement cdd.cdi|vous proposant des contrats|description societe|vos donnees|votre cv|cnil/.test(s);
  const state=/souhait|apprecie|idealement|serait un plus/.test(s)?'SOUHAITE':/exig|obligatoire|indispensable|minimum|minimale|requis|justifiez|vous deten ez/.test(s)?'EXIGENCE_TEXTE':'MENTION_A_CONFIRMER';
  if(origin==='TITLE'&&/anesthesiste/.test(s))add('qualification_titre','IADE',text,origin,'CLASSIFICATION_TITRE');
  if(origin==='TITLE'){for(const q of ['IADE','IBODE','IDE'])if(new RegExp('\\b'+q.toLowerCase()+'\\b').test(s))add('qualification_titre',q,text,origin,'EXPLICITE');}
  if(boiler){if(/interim|cdi|cdd/.test(s))add('contexte_recruteur',text,text,origin,'NE_PAS_CLASSER_LE_CONTRAT');continue;}
  for(const [field,terms] of Object.entries(dictionaries))for(const [value,re] of Object.entries(terms)){const m=s.match(re);if(m){
   if(field==='service'&&value==='URGENCES'&&/face aux urgences|gestion des urgences/.test(s))continue;
   const prefix=s.slice(Math.max(0,(m.index ?? 0)-28),m.index ?? 0);
   const neg=/\b(sans|aucun|pas de)\s+(?:\w+\s+){0,2}$/.test(prefix);
   add(field==='service'&&/experience/.test(s)?'experience_domaine':field,value,text,origin,neg?'NEGATION':/selon equipement/.test(s)?'CONDITIONNEL':state);
  }}
  if((/contrat|poste|recrut|mission/.test(s)||/^(cdi|cdd)\b/.test(s))&&!/en parallele|selon vos disponibilites|si vous le souhaitez/.test(s)){
   for(const [v,re] of [['CDI',/\bcdi\b|duree indeterminee/],['CDD',/\bcdd\b|duree determinee/],['INTERIM',/interim/],['VACATION',/vacation/]])if((re as RegExp).test(s))add('contrat_texte',v,text,origin,'EXPLICITE_A_VERIFIER');
  }
  if(/experience/.test(s)){
   const m=s.match(/(\d+|une?|deux|trois|cinq)\s*(?:ans?|annees?|mois)\b/);
   if(m){const n=({un:1,une:1,deux:2,trois:3,cinq:5} as Record<string,number>)[m[1]!] ??Number(m[1]);add('experience_duree',{amount:n,unit:/mois/.test(m[0])?'MOIS':'ANS'},text,origin,/minimum|minimale|au moins/.test(s)?'EXIGENCE_TEXTE':state);}
   else add('experience_non_chiffree',text,text,origin,state);
  }
  if(/\bou\b/.test(s)&&/diust|afometra|technicien|de infirmier de bloc/.test(s))add('alternatives_professionnelles',text,text,origin,'ALTERNATIVES_PAS_CUMUL');
  if(/disponibilites|jours feries/.test(s)&&/\d/.test(s))add('contraintes_planning',text,text,origin,'A_STRUCTURER');
  if(/debutants?.{0,20}(accepte|bienvenu)|debutants? motives/.test(s))add('debutant_accepte',true,text,origin,'EXPLICITE');
  const duration=s.match(/duree\s*:\s*(\d+)\s*\/?\s*(jours?|mois|semaines?)/);if(duration)add('duree_mission',{amount:Number(duration[1]),unit:duration[2]},text,origin,'EXPLICITE');
  if(/des que possible|immediatement/.test(s))add('debut_mission','DES_QUE_POSSIBLE',text,origin,'DATE_NON_PRECISE');
  if(/dates?\s*:|jusqu.a fin|mois de septembre/.test(s))add('periode_texte',text,text,origin,'ANNEE_ET_DATES_A_CONFIRMER');
  if(/temps plein/.test(s))add('temps_travail','PLEIN',text,origin,'EXPLICITE');
  if(/temps partiel/.test(s))add('temps_travail','PARTIEL',text,origin,'EXPLICITE');
  const pct=s.match(/(?:poste|temps|activite).{0,22}?(\d{1,3})\s*%/);if(pct&&Number(pct[1])<=100)add('quotite_pct',Number(pct[1]),text,origin,'EXPLICITE');
  if(/(?:jour|jours)\s*(?:ou|\/)\s*nuits?/.test(s))add('alternance','JOUR_NUIT',text,origin,'EXPLICITE');
  if(/\bnuits?\b/.test(s))add('horaire_type','NUIT',text,origin,'MENTION_A_CONFIRMER');
  if(/de jour\b|de journee|en jour\b|jour ou nuit/.test(s)&&!/a jour/.test(s))add('horaire_type','JOUR',text,origin,'MENTION_A_CONFIRMER');
  if(/astreinte|\bgardes?\b/.test(s))add('garde_astreinte',text,text,origin,/sans|pas de|aucun/.test(s)?'NEGATION':'MENTION_A_CONFIRMER');
  if(/horaires?|amplitude|poste en \d+h|mission en \d+h|journees? de|\b35 heures\b/.test(s)&&/\d\s*h|\d\s*heures/.test(s))add('horaires_detail',text,text,origin,/ouverture|amplitude/.test(s)?'AMPLITUDE_PAS_DUREE_POSTE':'HORAIRES_A_STRUCTURER');
  if(/pause/.test(s))add('pause',text,text,origin,'EXPLICITE');
  if(/samedi|dimanche|week.end|roulement|petite.{0,5}grande semaine/.test(s))add('roulement',text,text,origin,'A_STRUCTURER');
  if(/salaire|remuneration|package|fixe compris|primes variables/.test(s)&&(/\d|convention/.test(s)))add('remuneration_texte',text,text,origin,'MONTANTS_UNITES_ET_COMPOSANTES_A_SEPARER');
  for(const [v,re] of [['REPAS',/repas|titres? restaurants?/],['TRANSPORT',/navigo|transport|carte essence|vl de fonction/],['PRIMES',/prime|segur|interessement/],['MUTUELLE',/mutuelle/],['LOGEMENT',/logement|hebergement/],['RTT',/\brtt\b/]])if((re as RegExp).test(s))add('avantage',v,text,origin,'A_STRUCTURER');
  if(/mobilite indispensable|sites d.|deplacements?/.test(s))add('mobilite',text,text,origin,state);
  if(/\d+\s*(patients|chambres|infirmier|aides.soignant|medecins)/.test(s))add('charge_et_equipe',text,text,origin,'CONTEXTE_PAS_POSTES_A_POURVOIR');
  if(/(?:poste|mission|horaires?).{0,15}\b\d{1,2}h?\s+ou\s+\d{1,2}h\b/.test(s))add('durees_poste_alternatives',text,text,origin,'DUREES_PAS_HEURES_DEBUT');
  if(/texte s.est perdu|generer un nouveau contenu/.test(s))result.alerts.push('DESCRIPTION_DEGRADEE');
  if(before===result.fields.length&&!boiler)result.unclassified.push(text);
 }
 const facts=row.provenance?.facts;
 for(const [field,value] of Object.entries({lieu:row.location_label,contrat: facts?.contract,experience:facts?.experience,salaire:row.provenance?.salaryRaw,horaires:facts?.workingTime,diplomes:facts?.education,competences:facts?.skills,coordonnees:facts?.location?.coordinates}))if(value!=null&&(!Array.isArray(value)||value.length))add('api_'+field,value,JSON.stringify(value),row.source==='JOBSPIPE'&&field==='contrat'?'NORMALISATION_EXISTANTE':'PROVENANCE_STOCKEE','NON_VERIFIE');
 const exps=result.fields.filter((f: any)=>f.field==='experience_duree'&&f.value.unit==='ANS');const apiExp=Number(facts?.experience?.label?.match(/^\d+/)?.[0]);
 if(exps.some((f: any)=>apiExp&&f.value.amount!==apiExp))result.alerts.push('EXPERIENCE_API_TEXTE_DIVERGENTE');
 if(result.fields.some((f: any)=>f.field==='contrat_texte'&&['CDI','CDD','VACATION'].includes(f.value))&&facts?.contract?.code==='MIS')result.alerts.push('CONTRAT_IMPORT_TEXTE_DIVERGENT');
 if(result.fields.some((f: any)=>f.field==='qualification_titre'&&f.value==='IBODE')&&/de infirmier de bloc serait un plus/.test(fold(row.description)))result.alerts.push('IBODE_TITRE_MAIS_DIPLOME_SOUHAITE_DANS_TEXTE');
 if(result.fields.some((f: any)=>f.field==='horaire_type'&&f.value==='NUIT')&&/journee/.test(fold(facts?.workingTime)))result.alerts.push('HORAIRES_API_TEXTE_A_RECONCILIER');
 result.alerts=[...new Set(result.alerts)];return result;
}
