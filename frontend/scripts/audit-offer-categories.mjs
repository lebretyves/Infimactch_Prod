import fs from 'node:fs';
import assert from 'node:assert/strict';
import {sourceOfferFields,offerSourceGroups} from '../src/lib/parsedOfferSource.ts';
const input=process.argv[2],out=process.argv[3];if(!input||!out)throw Error('Usage: node scripts/audit-offer-categories.mjs input.json output-directory');
const data=JSON.parse(fs.readFileSync(input,'utf8')),rows=data.items;
assert.ok(rows.length>100);assert.equal(new Set(rows.map(x=>x.id)).size,rows.length);
const stats={retrievedAt:data.retrievedAt,catalogueTotal:data.total,analyzed:rows.length,sources:{},categories:{},rawFields:0,displayedPassages:0,scope:'Automated categorization and source-integrity checks; not a measured semantic accuracy rate.'};const csv=[['Source','Identifiant','Titre annonce','URL source','Rubrique','Intitulé','Extrait exact','Statut']];
for(const row of rows){stats.sources[row.source]=(stats.sources[row.source]||0)+1;const snapshot=JSON.stringify(row.parsedOffer.fields),fields=sourceOfferFields(row.parsedOffer.fields);stats.rawFields+=row.parsedOffer.fields.length;stats.displayedPassages+=fields.length;const seen=new Set();
 for(const f of fields){assert.ok(offerSourceGroups.some(g=>g.id===f.category));assert.equal(f.display,f.evidence.text);assert.ok((f.evidence.origin==='TITLE'?row.title:row.description).includes(f.evidence.text),row.id+' source missing');const k=f.evidence.text.trim().replace(/\s+/g,' ').toLowerCase();assert.ok(!seen.has(k));seen.add(k);assert.notEqual(f.label,'Passage de l’annonce');stats.categories[f.category]=(stats.categories[f.category]||0)+1;csv.push([row.source,row.id,row.title,row.url,offerSourceGroups.find(g=>g.id===f.category).title,f.label,f.display,f.state]);}
 assert.equal(JSON.stringify(row.parsedOffer.fields),snapshot);
}
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/resultats.json',JSON.stringify(stats,null,2));fs.writeFileSync(out+'/extraits-categorises.csv','\uFEFF'+csv.map(row=>row.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(';')).join('\r\n'));console.log(JSON.stringify(stats,null,2));
