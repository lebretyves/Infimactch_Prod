import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {skillsForContext, serviceOptionsFor, clinicalSkills} from '../src/data/clinicalSkills.ts';
const catalog = JSON.parse(readFileSync(new URL('../src/data/clinical-skills.json',import.meta.url),'utf8'));
const ids = new Set(clinicalSkills.map(s => s.code));
assert.equal(ids.size,clinicalSkills.length,'Stable codes must be unique');
assert.equal(new Set(clinicalSkills.map(s=>s.label)).size,clinicalSkills.length,'No duplicate labels');
const sourceIds = new Set(catalog.sources.map(s=>s.id));
for (const skill of clinicalSkills) {
 assert.match(skill.code,/^[A-Z][A-Z0-9_]{0,79}$/);
 assert.ok(skill.sources.length && skill.sources.every(id=>sourceIds.has(id)),skill.code+' must have a source');
 assert.ok(skill.qualifications.length && skill.qualifications.every(q=>['IDE','IADE','IBODE'].includes(q)));
 assert.ok(skill.services.every(service=>service in catalog.services));
 assert.ok(skill.group in catalog.groups);
 assert.ok(!skill.label.includes('?'),'No damaged French labels');
}
for(const [role,services] of Object.entries(catalog.servicesByQualification)) {
 assert.equal(services.length,new Set(services).size,role+' services unique');
 for(const service of services) assert.ok(service in catalog.services);
}
const codes = (role,service)=>skillsForContext([role],service).map(s=>s.code);
const dialyse=codes('IDE','DIALYSE'),onco=codes('IDE','ONCOLOGIE'),iade=codes('IADE','BLOC_OPERATOIRE'),ibode=codes('IBODE','BLOC_OPERATOIRE');
assert.ok(dialyse.includes('GENERATEUR_HEMODIALYSE') && !dialyse.includes('CHIMIOTHERAPIE'));
assert.ok(onco.includes('CHIMIOTHERAPIE') && onco.includes('CATHETER_CENTRAL') && !onco.includes('GENERATEUR_HEMODIALYSE'));
assert.ok(iade.includes('INDUCTION_ANESTHESIQUE') && !iade.includes('INSTRUMENTATION'));
assert.ok(ibode.includes('INSTRUMENTATION') && ibode.includes('TRACABILITE_IMPLANTS') && !ibode.includes('INDUCTION_ANESTHESIQUE'));
assert.ok(!codes('IDE','BLOC_OPERATOIRE').includes('ASSISTANCE_CHIRURGICALE_IBODE'),'No exclusive IBODE act suggested to IDE');
assert.ok(codes('IDE','PEDIATRIE').includes('DOULEUR_PEDIATRIQUE'));
assert.ok(codes('IDE','SANTE_TRAVAIL').includes('ENTRETIEN_SANTE_TRAVAIL'));
assert.deepEqual(skillsForContext([]),[]);
assert.deepEqual(skillsForContext(['MEDECIN']),[]);
assert.ok(skillsForContext(['IDE'],'UNRECOGNIZED').every(s=>s.services.length===0),'Unknown service must not show unrelated specialties');
assert.equal(skillsForContext(['IDE','IADE','IDE']).length,new Set(skillsForContext(['IDE','IADE']).map(s=>s.code)).size);
assert.equal(serviceOptionsFor(['IDE','IADE']).length,new Set(serviceOptionsFor(['IDE','IADE']).map(s=>s.value)).size);
assert.ok(serviceOptionsFor(['IBODE']).some(s=>s.value==='STERILISATION'));
assert.ok(!serviceOptionsFor(['IBODE']).some(s=>s.value==='ANESTHESIE'));
for (const code of ['TRIAGE','POSE_VOIE_VEINEUSE','SOINS_PALLIATIFS','PERFUSION','PANSEMENTS_COMPLEXES','URGENCES_VITALES','DIALYSE','CHIMIOTHERAPIE','PRELEVEMENTS','SURVEILLANCE_POST_OPERATOIRE','EDUCATION_THERAPEUTIQUE','ANESTHESIE','SSPI']) assert.ok(ids.has(code),'Preserve legacy code '+code);
console.log(`PASS: ${clinicalSkills.length} sourced clinical skills; role/service isolation, multi-qualification, legacy codes, unknown contexts, sources and codes.`);
