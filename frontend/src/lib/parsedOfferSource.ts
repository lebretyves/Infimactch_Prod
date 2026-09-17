import type {ParsedField} from '@/services/parsed-offer';
const normalized=(text:string)=>text.trim().replace(/\s+/g,' ').toLocaleLowerCase('fr-FR');
function contextOnly(field:ParsedField){
 if(!['service','specialite'].includes(field.key))return false;
 const text=field.evidence.text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(field.value==='URGENCES'&&/urgence[s]? vitale|gestion des urgences|face aux urgences|(?:avc|samu|transport|transfert|evacuation).{0,100}urgence|urgence.{0,100}(?:avc|samu|transport|transfert|evacuation)/.test(text))return true;
 return /(?:etablissement|hopital|clinique|groupe).{0,60}(?:dispose|comprend|regroupe|propose|offre|couvre)|activites (?:de |en )/.test(text)&&!/(?:vous|poste|infirmier).{0,50}(?:travaill|exerc|interviendr|affectation)/.test(text);
}
/** Source quotes are presentation, codes remain internal; a passage is shown once. */
export function sourceOfferFields(fields:ParsedField[]){
 const out:ParsedField[]=[],seen=new Map<string,ParsedField>();
 for(const field of fields){
  if(!field.evidence?.text?.trim()||contextOnly(field))continue;
  const key=normalized(field.evidence.text),existing=seen.get(key);
  if(existing){
   if(existing.state!==field.state)existing.state='REVIEW_REQUIRED';
   if(existing.label!==field.label)existing.label='Passage de l’annonce';
   continue;
  }
  const item={...field,display:field.evidence.text};
  if(['service','specialite','population','equipement'].includes(item.key)&&item.state==='REQUIRED')item.state='MENTION';
  seen.set(key,item);out.push(item);
 }
 return out;
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
