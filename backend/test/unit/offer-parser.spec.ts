import {test} from "node:test";
import assert from "node:assert/strict";
import {parseOffer, currentParsedOffer, hourPairsFromText, PARSER_VERSION} from "../../src/public-data/offer-parser";
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

test("display is the exact source, never a generated code label",()=>{
 const row={title:"Infirmier IDE en cardiologie",description:"Vous assurez la surveillance des patients en cardiologie."};
 for(const f of parseOffer(row).fields)assert.equal(f.display,f.evidence.text);
});
test("clinical emergency and facility catalog do not create job services",()=>{
 const r=parseOffer({title:"Infirmier IDE",description:"Transport des patients victimes d’AVC en urgences avec le SAMU. Notre établissement propose des activités de cardiologie et de réanimation."});
 assert.ok(!r.fields.some(f=>['service','specialite'].includes(f.key)));
});
test("an explicit service assignment remains and nearby diploma requirement is not inherited",()=>{
 const r=parseOffer({title:"IDE aux urgences",description:"Vous travaillerez en service de cardiologie ; diplôme infirmier obligatoire. Surveillance des patients, diplôme infirmier requis."});
 assert.ok(r.fields.some(f=>f.key==='service'&&f.value==='URGENCES'));
 assert.ok(r.fields.some(f=>f.key==='specialite'&&f.value==='CARDIOLOGIE'));
 assert.ok(r.fields.filter(f=>['service','specialite','competence'].includes(f.key)).every(f=>f.state!=='REQUIRED'));
});

test("hour ranges retain both bounds including compact, overnight and spaced source text",()=>{
 for(const [text,start,end] of [["Horaires :8h00-20h00","08:00","20:00"],["Mission de8h00-20h00","08:00","20:00"],["20h à 8h","20:00","08:00"],["8 H 15 — 20 H 30","08:15","20:30"],["08:00 – 20:00","08:00","20:00"]]) {
  const pairs=hourPairsFromText(text!);assert.equal(pairs.length,1,text);
  assert.deepEqual([pairs[0]!.start,pairs[0]!.end],[start,end]);
  const parsed=parse(text!),ranges=parsed.fields.filter(f=>f.key==="horaires_detail");
  assert.equal(ranges.length,1,text);assert.deepEqual(ranges[0]!.value,{start,end});
  assert.equal(text!.slice(ranges[0]!.evidence.start,ranges[0]!.evidence.end),ranges[0]!.evidence.text);
  assert.equal(ranges[0]!.state,"REVIEW_REQUIRED");
 }
});
test("invalid times do not create valid-looking ranges; ambiguous alternatives stay separate",()=>{
 for(const text of ["28h-20h","8h80-20h","8h-24h","8h-20h80","108h-20h","8h00","800-2000"])assert.deepEqual(hourPairsFromText(text),[],text);
 const fields=parse("8h-12h ou 14h-20h. 8h-12h.").fields.filter(f=>f.key==="horaires_detail");
 assert.equal(fields.length,2);assert(fields.every(f=>f.state==="REVIEW_REQUIRED"));
});
test("range patch preserves qualification and care evidence, invalidates previous parser cache",()=>{
 const description="Diplôme infirmier obligatoire. Expérience en pédiatrie souhaitée. Horaires de8h-20h.";
 const result=parse(description);assert(result.fields.some(f=>f.key==="certification"));
 assert.equal(result.parserVersion,PARSER_VERSION);
 assert.equal(currentParsedOffer({title:"IDE en intérim",description,parsed_offer:{...result,parserVersion:"4.1.0"}}),null);
 assert(!result.fields.some(f=>f.key==="availability"||f.key==="qualification"));
});

test("time evidence keeps alternatives and negative wording for display",()=>{
 for(const text of ["Pas de poste de 8h-20h.","8h-12h ou 14h-20h"]) {
  const fields=parse(text).fields.filter(f=>f.key==="horaires_detail");
  assert(fields.length>0);assert(fields.every(f=>f.evidence.text===text));
 }
});
