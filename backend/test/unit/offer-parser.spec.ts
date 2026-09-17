import {test} from "node:test";
import assert from "node:assert/strict";
import {parseOffer, currentParsedOffer} from "../../src/public-data/offer-parser";
const parse=(description:string)=>parseOffer({title:"IDE en intérim",description},"2026-09-16T00:00:00.000Z");
test("parser retains exact evidence offsets and deterministic input hash",()=>{
 const row={title:"IDE",description:"Diplôme infirmier requis. Horaires de 7h à 19h. Salaire : 2750€ brut/mois."};
 const a=parseOffer(row),b=parseOffer(row);
 assert.equal(a.inputHash,b.inputHash);
 for(const f of a.fields){const source=f.evidence.origin==="TITLE"?row.title:row.description;assert.equal(source.slice(f.evidence.start,f.evidence.end),f.evidence.text);}
 assert.ok(a.fields.some(f=>f.key==="salaire_structure"));
});
test("missing unit never becomes hourly salary",()=>{
 const field=parse("Salaire : 36€").fields.find(f=>f.key==="salaire_structure");
 assert.equal((field?.value as any).unit,null);
});
test("transport allowance is not a base salary",()=>{
 assert.equal(parse("Salaire selon expérience. Indemnité de transport : 3.39 euros par jour travaillé.").fields.filter(f=>f.key==="salaire_structure").length,0);
});
test("night premium does not establish a night shift",()=>{
 const fields=parse("Prime de nuit et jours fériés.").fields;
 assert.ok(!fields.some(f=>f.key==="horaire_type"));
});
test("candidate disability is not patient population",()=>{
 assert.ok(!parse("Tous nos postes sont ouverts aux personnes en situation de handicap.").fields.some(f=>f.key==="population"));
});
test("mixed diploma requirement and desired experience remain uncertain",()=>{
 const fields=parse("Expérience souhaitée, diplôme infirmier obligatoire.").fields;
 assert.ok(fields.filter(f=>f.key==="certification").every(f=>f.state==="REVIEW_REQUIRED"));
});
test("alternative diplomas are not cumulative requirements",()=>{
 assert.ok(parse("DIUST ou AFOMETRA obligatoire.").fields.filter(f=>f.key==="certification").every(f=>f.state==="REVIEW_REQUIRED"));
});
test("no housing remains negated",()=>{
 assert.ok(parse("Sans logement proposé.").fields.some(f=>f.key==="avantage"&&f.state==="NEGATED"));
});
test("full time and part time conflict is visible",()=>{
 assert.ok(parse("Temps partiel. Temps plein.").warnings.includes("TEMPS_PLEIN_PARTIEL_CONTRADICTOIRE"));
});
test("unrecognized important passages remain in review queue",()=>{
 assert.ok(parse("Vaccination demandée selon protocole local.").reviewQueue.length);
});
test("stale extraction never appears as current",()=>{
 const row={title:"IDE",description:"Salaire : 36€"};
 const parsed_offer=parseOffer(row);
 assert.ok(currentParsedOffer({...row,parsed_offer}));
 assert.equal(currentParsedOffer({...row,description:"Changed",parsed_offer}),null);
 assert.equal(currentParsedOffer({...row,parsed_offer:{...parsed_offer,parserVersion:"old"}}),null);
});

test("JSONB key ordering preserves the parser input fingerprint",()=>{
 const row={title:"IDE",description:"Description",provenance:{facts:{contract:{code:"MIS",label:"Interim"},skills:[]}}};
 const parsed_offer=parseOffer(row);
 assert.ok(currentParsedOffer({...row,provenance:{facts:{skills:[],contract:{label:"Interim",code:"MIS"}}},parsed_offer}));
});

test("hour ranges keep both bounds instead of a single start time",()=>{
 const fields=parse("Horaires : 8h00 - 20h00. Poste en service de jour.").fields.filter(f=>f.key==="horaires_detail");
 assert.ok(fields.some(f=>/8h00/.test(f.display) && /20h00/.test(f.display)));
 assert.ok(fields.every(f=>!/^\s*8h00\s*$/i.test(f.display)));
});

test("provider-only start time is ignored when the description already has a range",()=>{
 const fields=parseOffer({
  title:"IDE",
  description:"Mission de 8h00 - 20h00 en service.",
  provenance:{facts:{workingTime:"8H00"}},
 }).fields;
 assert.ok(fields.some(f=>f.key==="horaires_detail" && /20h00/.test(f.display)));
 assert.ok(!fields.some(f=>f.key==="api_horaires"));
});
