import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {parseOffer}=require('../../backend/dist/public-data/offer-parser.js');
const rows=JSON.parse(fs.readFileSync('data/parser-pilot/evaluation-v4-frozen.json','utf8'));
const expectations=[
 [['certification','DIPLOME_INFIRMIER'],['certification','ORDRE_INFIRMIER'],['experience_duree'],['horaires_detail']],
 [['competence','PERFUSIONS'],['competence','PANSEMENTS'],['competence','SURVEILLANCE'],['service','MEDECINE_POLYVALENTE']],
 [['service','SSPI'],['competence','DOULEUR'],['experience_domaine'],['montant_avantage']],
 [['specialite','MATERNITE']],
 [['service','BLOC'],['service','DIALYSE']],
 [['service','DIALYSE'],['competence','SURVEILLANCE']],
 [['service','LABORATOIRE'],['competence','PRELEVEMENTS']],
 [['competence','PRELEVEMENTS'],['jours_nommes'],['salaire_structure']]
];
const results=rows.map((row,i)=>{
 const parsed=parseOffer(row);
 const targets=expectations[i].map(([key,value])=>({key,value,found:parsed.fields.some(f=>f.key===key&&(value===undefined||f.value===value))}));
 const proofErrors=parsed.fields.filter(f=>(f.evidence.origin==='TITLE'?row.title:row.description).slice(f.evidence.start,f.evidence.end)!==f.evidence.text).length;
 const falsePositives=[];
 if(i===0&&parsed.fields.some(f=>f.key==='population'&&f.value==='HANDICAP'))falsePositives.push('Candidate disability classified as patients');
 if(i===2&&parsed.fields.some(f=>f.key==='salaire_structure'&&f.value.amount===3.39))falsePositives.push('Transport allowance classified as salary');
 if(i===7&&parsed.fields.some(f=>f.key==='salaire_structure'&&f.value.unit!==null))falsePositives.push('Salary period invented');
 return {id:row.id,title:row.title,source:row.source,targets,proofErrors,falsePositives,fieldCount:parsed.fields.length,reviewCount:parsed.reviewQueue.length,fields:parsed.fields};
});
const report={at:new Date().toISOString(),parserVersion:'4.0.0',scope:'8-offer development evaluation after two omissions fixed; no longer blind; targeted expectations, not exhaustive recall/precision',targets:results.flatMap(r=>r.targets).length,found:results.flatMap(r=>r.targets).filter(t=>t.found).length,proofErrors:results.reduce((n,r)=>n+r.proofErrors,0),targetedFalsePositives:results.flatMap(r=>r.falsePositives),offers:results};
fs.mkdirSync('annexe/proofs/parser-v4',{recursive:true});
fs.writeFileSync('annexe/proofs/parser-v4/evaluation.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,offers:results.map(({fields,...r})=>r)},null,2));
