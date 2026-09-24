import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import pg from 'pg';
import {withRole,request,root} from '../vault/common.mjs';
const fold=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function parseOffer(row){
 const segments=((row.title||'')+'. '+(row.description||'')).replace(/<[^>]*>/g,' ').split(/\n|\s+-\s+|[.!?;](?:\s|$)/).map(s=>s.trim()).filter(Boolean);
 const found=[];
 const add=(field,value,evidence,state='A_CONFIRMER')=>{if(!found.some(f=>f.field===field&&f.value===value&&f.evidence===evidence))found.push({field,value,state,evidence:evidence.slice(0,450)});};
 const title=fold(row.title||'');
 if(/\biade\b|anesthesiste/.test(title))add('qualification','IADE',row.title,'EXPLICITE_TITRE');
 if(/\bibode\b/.test(title))add('qualification','IBODE',row.title,'EXPLICITE_TITRE');
 if(/\bide\b/.test(title))add('qualification','IDE',row.title,'EXPLICITE_TITRE');
 if(!found.length&&/infirmier/.test(title))add('qualification','IDE probable',row.title);
 const dictionaries={service:{SMR:/\bsmr\b|soins medicaux et de readaptation/,laboratoire:/laboratoire/,regulation_medicale:/regulation medicale/,reanimation:/reanimation/,urgences:/urgences/,geriatrie:/geriatr|ehpad/,psychiatrie:/psychiatr/,pediatrie:/pediatri/,medecine:/service de medecine/},specialite:{orthopedie:/orthoped/,digestif:/digestif|digestive/,urologie:/urolog/,cardiologie:/cardiolog/,ophtalmologie:/ophtalmolog/},activite_bloc:{instrumentation:/instrumentation|instrumentiste/,circulation:/circulant|circulation/,aide_operatoire:/aide operatoire/},population:{adulte:/\badultes?\b/,enfant:/\benfants?\b|pediatri/},organisation:{nuit:/\bnuit\b/,jour:/(?:poste|infirmier.{0,8}|travail|horaire).{0,12}\bde jour\b/,astreinte:/astreintes?/,garde:/\bgardes?\b/}};
 for(const segment of segments){const s=fold(segment);
  if(/\bcdi\b|\bcdd\b/.test(s))add('contrat',/\bcdi\b/.test(s)?'CDI mentionne':'CDD mentionne',segment,'ALERTE_PERIMETRE_INTERIM');
  const rate=s.match(/(?:poste|temps|activite).{0,12}?(\d{1,3})\s*%/);if(rate)add('temps_travail',rate[1]+' %',segment,'EXPLICITE_TEXTE');
  for(const [field,values] of Object.entries(dictionaries))for(const [value,pattern] of Object.entries(values))if(pattern.test(s)){
   const match=s.match(pattern);const before=s.slice(Math.max(0,match.index-30),match.index);
   add(field,value,segment,/\b(sans|aucun|pas de)\s+(?:\w+\s+){0,2}$/.test(before)?'NEGATION':/souhait|apprecie|serait un plus/.test(s)?'SOUHAITE':'MENTION_A_CONFIRMER');
  }
  const experience=s.match(/(\d+|un|une|deux|trois)\s*(ans?|annees?|mois)\s+(?:d['’ ]\s*)?experience/);
  if(experience)add('experience',experience[0],segment,/exig|obligatoire|minimum|au moins/.test(s)?'EXIGENCE_A_CONFIRMER':/souhait|apprecie/.test(s)?'SOUHAITE':'MENTION_A_CONFIRMER');
  const salary=segment.match(/(?:\d{1,3}(?:[ \u00a0]\d{3})+|\d+)(?:[.,]\d+)?\s*(?:\u20ac|euros?)(?:\s*(?:brut|net))?(?:\s*(?:par|\/)\s*(?:heure|mois|an|h)\b|\s*annuel)?/gi);
  if(salary)for(const amount of salary)add('montant_mentionne',amount,segment,'UNITE_ET_NATURE_A_CONFIRMER');

 }
 return {id:row.id,title:row.title,source:row.source,url:row.url,location:row.location_label||null,extractions:found,unknown:['dates_mission','experience_minimale_validee','salaire_normalise','competences_obligatoires_validees'],note:'Prototype : mentions descriptives, non utilisees pour filtrer ou affecter un candidat.'};
}
const values=await withRole('backend',async token=>(await request('kv/data/infimatch/v1/backend',{token})).data.data);
const client=new pg.Client({connectionString:values.DATABASE_URL});
await client.connect();let rows;
try{await client.query('BEGIN READ ONLY');rows=(await client.query("SELECT id,title,description,source,url,location_label FROM external_offer WHERE active ORDER BY imported_at DESC,id LIMIT 10")).rows;await client.query('COMMIT');}finally{await client.end();}
const parsed=rows.map(parseOffer);
const out=resolve(root,'annexe/proofs/parser-pilot');await mkdir(out,{recursive:true});
await writeFile(resolve(out,'resultats.json'),JSON.stringify({createdAt:new Date().toISOString(),mode:'READ_ONLY_NO_API_NO_LLM',offers:parsed},null,2));
const md=['# Essai du parseur metier','',`Annonces existantes examinees : ${rows.length}. Lecture seule, aucun appel API, aucun LLM.`, '', 'Les mentions ne constituent pas des exigences validees. Le texte source reste necessaire.',''];
for(const p of parsed){md.push(`## ${p.title}`,'',`Source : ${p.source} | Lieu : ${p.location||'inconnu'}`,`Lien : ${p.url}`,'','| Champ | Valeur | Etat | Extrait justificatif |','|---|---|---|---|');for(const f of p.extractions)md.push('| '+[f.field,f.value,f.state,f.evidence].map(v=>v.replace(/\|/g,'/').replace(/\r?\n/g,' ')).join(' | ')+' |');md.push('','Non valides : '+p.unknown.join(', '),'');}
await writeFile(resolve(out,'BILAN_PARSEUR.md'),md.join('\n'));
console.log(JSON.stringify(parsed.map(p=>({title:p.title,source:p.source,location:p.location,extractions:p.extractions.map(({field,value,state})=>({field,value,state}))})),null,2));
