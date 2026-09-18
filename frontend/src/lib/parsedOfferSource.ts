import type {ParsedField} from '@/services/parsed-offer';
const normalized=(text:string)=>text.trim().replace(/\s+/g,' ').toLocaleLowerCase('fr-FR');
function contextOnly(field:ParsedField){
 if(!['service','specialite'].includes(field.key))return false;
 const text=field.evidence.text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(field.value==='URGENCES'&&/urgence[s]? vitale|gestion des urgences|face aux urgences|(?:avc|samu|transport|transfert|evacuation).{0,100}urgence|urgence.{0,100}(?:avc|samu|transport|transfert|evacuation)/.test(text))return true;
 return /(?:etablissement|hopital|clinique|groupe).{0,60}(?:dispose|comprend|regroupe|propose|offre|couvre)|activites (?:de |en )/.test(text)&&!/(?:vous|poste|infirmier).{0,50}(?:travaill|exerc|interviendr|affectation)/.test(text);
}
export const offerSourceGroups = [
 {id:'post',title:'Poste et lieu d’exercice'},
 {id:'activities',title:'Activités et soins'},
 {id:'profile',title:'Diplômes, compétences et expérience'},
 {id:'schedule',title:'Contrat, dates et horaires'},
 {id:'pay',title:'Rémunération et avantages'},
 {id:'context',title:'Établissement et équipe'},
 {id:'other',title:'Autres informations'},
] as const;
type SourceGroup = typeof offerSourceGroups[number]['id'];
export type SourceOfferField = ParsedField & {category:SourceGroup};
const foldText=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function passageHeading(fields:ParsedField[]):{label:string;category:SourceGroup}{
 const text=foldText(fields[0].evidence.text),keys=fields.map(f=>f.key);
 const has=(pattern:RegExp)=>keys.some(k=>pattern.test(k));
 if(fields.some(f=>f.evidence.origin==='TITLE'))return {label:'Intitulé du poste',category:'post'};
 // Benefits must not become care duties because their text mentions health or transport.
 if(/\bfast\s*t{1,2}\b|\bcse\b|mutuelle|prevoyance|avantages? sociaux|tarifs? preferentiels|tickets? restaurant|cheques? vacances/.test(text))
  return {label:has(/remuneration|salaire/)?'Rémunération et avantages':'Avantages proposés',category:'pay'};
 if(/(?:logement|hebergement|frais de (?:transport|deplacement)|repas).{0,45}(?:pris en charge|rembours|indemnis|fourni)|(?:remboursement|prise en charge).{0,35}(?:logement|transport|deplacement|repas)/.test(text))return {label:'Logement et frais',category:'pay'};
 const recruitment=/\b(?:recrut|recherch)(?:e|ons|ent)\b|poste (?:a pourvoir|propose)|pour (?:l.un|un|une) de (?:nos|ses) (?:clients|partenaires)/.test(text);
 const employer=/(?:cet|notre|l.)?\s*(?:etablissement|hopital|clinique|groupe|agence|cabinet).{0,85}(?:implante|situe|dispose|comprend|regroupe|propose|offre|couvre|compose|specialis|accompagne)|\b(?:capacite|lits et places|reseau de|leader europeen)\b/.test(text);
 if(employer&&!recruitment&&!/vous (?:assurez|realisez|effectuez|intervenez|travaillez)|vos missions|vous etes titulaire/.test(text))return {label:/agence|cabinet|recrutement/.test(text)?'Présentation du recruteur':'Présentation de l’établissement',category:'context'};
 if(recruitment&&has(/^service$|specialite|population|qualification|mode_exercice/))return {label:'Poste et lieu d’exercice',category:'post'};
 if(has(/certification|experience|alternatives_professionnelles|debutant|condition_experience/)) {
  const diploma=has(/certification|alternatives_professionnelles/),experience=has(/experience|debutant/);
  return {label:diploma&&experience?'Diplômes et expérience':diploma?'Diplômes et qualifications':'Expérience recherchée',category:'profile'};
 }
 if(/collabor|coordon|transmissions?|equipe pluridisciplinaire/.test(text)&&has(/^service$|specialite|competence|charge_et_equipe|logiciel/)&&!/surveill|pansement|injection|prelevement/.test(text))return {label:'Coordination et transmissions',category:'activities'};
 if((has(/^service$|specialite|competence|equipement|contexte_parcours|activite_transport/)||/vos missions/.test(text))&&/assurer|assurez|realiser|realisez|effectuer|effectuez|surveill|administrer|administrez|prise en charge|accompagner|accompagnez|soins (?:techniques|curatifs)|integrer le service/.test(text))return {label:'Activités et soins à réaliser',category:'activities'};
 if(has(/competence|langue|permis|logiciel/))return {label:has(/langue/)?'Langue demandée':has(/permis/)?'Permis de conduire':has(/logiciel/)?'Logiciel utilisé':'Compétences mentionnées',category:'profile'};
 if(has(/remuneration|salaire|avantage|acompte|majoration/))return {label:has(/remuneration|salaire/)?'Rémunération annoncée':has(/acompte/)?'Acompte':has(/majoration|taux_avantages/)?'Primes et majorations':'Avantages proposés',category:'pay'};
 if(has(/contrat|temps_travail|quotite|horaire|alternance|duree|pause|roulement|jours_|periode|dates_|debut_mission|planning|disponibilite|garde/)){
  const contract=has(/contrat|temps_travail|quotite/),hours=has(/horaire|alternance|pause|roulement|jours_|garde|duree_poste/);
  return {label:contract&&hours?'Contrat et horaires':contract?'Contrat et temps de travail':hours?'Horaires et organisation':'Dates et durée de mission',category:'schedule'};
 }
 if(has(/charge_et_equipe/))return {label:'Équipe et charge de travail',category:'context'};
 if(has(/^service$|specialite|population|equipement|mode_exercice|qualification|contexte/))return {label:has(/population/)?'Public accueilli':has(/equipement/)?'Matériel utilisé':has(/specialite/)?'Service et spécialité':'Service ou lieu d’exercice',category:'post'};
 if(has(/mobilite/))return {label:'Déplacements et mobilité',category:'post'};
 if(has(/accessibilite_candidature/))return {label:'Accessibilité des candidatures',category:'profile'};
 return {label:'Information complémentaire',category:'other'};
}
/** Titles categorize verbatim excerpts for reading only; parser keys and matching are unchanged. */
export function sourceOfferFields(fields:ParsedField[]):SourceOfferField[]{
 const grouped=new Map<string,ParsedField[]>();
 for(const field of fields){
  if(!field.evidence?.text?.trim()||contextOnly(field))continue;
  const key=normalized(field.evidence.text),group=grouped.get(key);
  if(group)group.push(field);else grouped.set(key,[field]);
 }
 return [...grouped.values()].map(group=>{
  const item={...group[0],display:group[0].evidence.text,...passageHeading(group)};
  if(group.some(f=>f.state!==item.state))item.state='REVIEW_REQUIRED';
  if(['service','specialite','population','equipement'].includes(item.key)&&item.state==='REQUIRED')item.state='MENTION';
  if(item.state==='NEGATED'&&item.label==='Avantages proposés')item.label='Avantages non proposés';
  return item;
 });
}
export function remainingSourcePassages(queue:string[],fields:ParsedField[]){
 const seen=new Set(fields.map(f=>normalized(f.evidence.text)));
 return queue.filter(text=>{const key=normalized(text);if(!key||seen.has(key))return false;seen.add(key);return true;});
}

/** The local legacy preview stores labels rather than parser field keys. */
export function previewContextOnly(item:{label:string;value:string;evidence:string}){
 const label=item.label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const key=/service/.test(label)?'service':/specialit/.test(label)?'specialite':'';
 const value=item.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,'_');
 return contextOnly({key,value,label:item.label,display:item.value,state:'MENTION',evidence:{origin:'DESCRIPTION',text:item.evidence,start:0,end:item.evidence.length}});
}
