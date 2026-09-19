import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCvExperience} from '../../src/profiles/cv-parser';
const now=new Date('2026-09-17T12:00:00Z');
test('CV recognises French periods, service and employer without importing education or identity',()=>{
 const r=parseCvExperience('CAMILLE TEST\nEXPERIENCES PROFESSIONNELLES\n01/02/2020 - 31/03/2021 | CHU Exemple | Cardiologie\nInfirmiere IDE\nAvril 2021 - juin 2023 | Clinique Test | Urgences\nFORMATIONS\n2015 - 2018 Diplome infirmier\nCOMPETENCES\nReanimation',now);
 assert.equal(r.experiences.length,2);assert.equal(r.experiences[0]!.establishment,'CHU Exemple');assert.equal(r.experiences[0]!.service,'CARDIOLOGIE');assert.equal(r.experiences[0]!.startDate,'2020-02-01');assert.equal(r.experiences[1]!.service,'URGENCES');assert.equal(r.experiences[1]!.endDate,'2023-06-30');assert.ok(r.experiences[1]!.warnings.some(x=>x.includes('approximatives')));assert.equal('qualifications' in r,false);
});
test('CV can associate period after employer and retain missing services for review',()=>{
 const r=parseCvExperience('Experience professionnelle\nCHU Exemple - Neurologie\n01/2020 - 02/2021\nClinique Test\n03/2021 - 04/2022',now);assert.equal(r.experiences.length,2);assert.equal(r.experiences[0]!.service,'NEUROLOGIE');assert.equal(r.experiences[1]!.establishment,'Clinique Test');assert.equal(r.experiences[1]!.service,'');
});
test('ongoing, future and impossible periods do not become completed experience',()=>{
 for(const period of ['2020 - present','2020 - aujourd’hui','01/01/2025 - 01/01/2027','31/02/2020 - 01/03/2021','2022 - 2020'])assert.equal(parseCvExperience('Experience\n'+period+' | CHU Exemple | Urgences',now).experiences.length,0,period);
});
test('year-only boundaries are explicit approximations; ambiguous service is not guessed',()=>{
 const r=parseCvExperience('Experiences\n2019 - 2020 | EHPAD Test | Cardiologie\nMissions dans plusieurs services',now);assert.equal(r.experiences[0]!.startDate,'2019-01-01');assert.equal(r.experiences[0]!.endDate,'2020-12-31');assert.equal(r.experiences[0]!.service,'');assert.ok(r.experiences[0]!.warnings.length);
});
test('empty and unstructured CVs return a manual completion warning; proposals are bounded',()=>{
 assert.equal(parseCvExperience('Formation\n2010 - 2013 universite',now).experiences.length,0);
 assert.equal(parseCvExperience('No periods',now).experiences.length,0);
 assert.ok(parseCvExperience(Array.from({length:100},(_,i)=>`2019 - 2020 | CHU ${i} | Urgences`).join('\n'),now).experiences.length<=50);
});

test('CV recognises periods split by PDF line boundaries and spaced numeric dates',()=>{
 for(const period of ['Janvier\n2020 –\nMars\n2021','01 / 2020\n–\n02 / 2021','2019\nau\n2020','01-2020 - 02-2021','01 / 02 / 2020 − 31 / 03 / 2021']){
  const r=parseCvExperience('EXPÉRIENCES PROFESSIONNELLES ET STAGES\n'+period+' | CHU Exemple | Urgences\nFORMATION\n2017 - 2018 école',now);
  assert.equal(r.experiences.length,1,period);assert.equal(r.experiences[0]!.service,'URGENCES');
 }
});
test('CV distinguishes ongoing typographic periods and never fabricates an end date',()=>{
 for(const period of ['2020 - aujourd’hui','Depuis janvier 2020','2020 - en cours']){
  const r=parseCvExperience('Expériences professionnelles\n'+period+' | CHU Exemple | Urgences',now);
  assert.equal(r.experiences.length,0);assert.ok(r.warnings.some(w=>/en cours|depuis/.test(w)),period);
 }
});
test('CV does not join dates across employers or manufacture a range from isolated years',()=>{
 const r=parseCvExperience('Expériences\n2019\nCHU Premier\n2020\nClinique Deuxième',now);
 assert.equal(r.experiences.length,0);
});


test('CV recognises French abbreviations and preserves months instead of matching only years',()=>{
 for(const [period,start,end] of [
  ['janv. 2020 - juil. 2021','2020-01-01','2021-07-31'],
  ['févr. 2020 - déc. 2021','2020-02-01','2021-12-31'],
  ['aoû. 2020 au sept. 2021','2020-08-01','2021-09-30'],
  ['juill.\n2020\n–\njanv.\n2021','2020-07-01','2021-01-31']
 ]){
  const r=parseCvExperience('Expériences professionnelles\n'+period+' | CHU Exemple | Cardiologie',now);
  assert.equal(r.experiences.length,1,period);assert.equal(r.experiences[0]!.startDate,start,period);assert.equal(r.experiences[0]!.endDate,end,period);
 }
});
test('CV preserves full written dates, hyphen dates and year-month boundaries',()=>{
 for(const [period,start,end] of [
  ['01-02-2020 - 31-03-2021','2020-02-01','2021-03-31'],
  ['1 février 2020 - 15 mars 2021','2020-02-01','2021-03-15'],
  ['1er janvier 2020 au 30 juin 2021','2020-01-01','2021-06-30'],
  ['2020/02 - 2021/03','2020-02-01','2021-03-31'],
  ['2020-02 - 2021-03','2020-02-01','2021-03-31'],
  ['2020/02/15 - 2021/03/12','2020-02-15','2021-03-12']
 ]){
  const r=parseCvExperience('Expériences professionnelles\n'+period+' | CHU Exemple | Urgences',now);
  assert.equal(r.experiences.length,1,period);assert.equal(r.experiences[0]!.startDate,start,period);assert.equal(r.experiences[0]!.endDate,end,period);
 }
});
test('expanded CV date formats still reject impossible dates and non-work sections',()=>{
 for(const period of ['31 février 2020 - 15 mars 2021','00-02-2020 - 31-03-2021','2020/13 - 2021/03','janv. 2020 - présent'])assert.equal(parseCvExperience('Expériences\n'+period+' | CHU Exemple | Urgences',now).experiences.length,0,period);
 assert.equal(parseCvExperience('Formation\njanv. 2015 - juil. 2018 | École infirmière\nExpériences\njanv. 2020 - juil. 2021 | CHU Exemple | Urgences',now).experiences.length,1);
});


test('CV proposes labelled identity and header contact with evidence, never referee identity',()=>{
 const r=parseCvExperience('Prénom : Anne-Marie\nNom : DUBOIS\nEmail : anne@example.test\nTéléphone : 06 12 34 56 78\nVille : Lyon\nCode postal : 69003\nExpériences\n2019 - 2020 | CHU Exemple | Urgences\nRéférences\nNom : Autre\nEmail : referent@example.test',now);
 assert.equal(r.suggestions.identity.firstName?.value,'Anne-Marie');assert.equal(r.suggestions.identity.lastName?.value,'DUBOIS');
 assert.equal(r.suggestions.identity.email?.value,'anne@example.test');assert.equal(r.suggestions.identity.phone?.value,'06 12 34 56 78');
 assert.equal(r.suggestions.identity.city?.value,'Lyon');assert.equal(r.suggestions.identity.postalCode?.value,'69003');
 assert.ok(r.suggestions.identity.lastName?.evidence);assert.equal(r.requiresReview,true);assert.equal(r.method,'RULES_V2');
});
test('CV distinguishes clear names, ambiguous all-caps names and contradictory header values',()=>{
 assert.equal(parseCvExperience('Camille MARTIN',now).suggestions.identity.firstName?.value,'Camille');
 assert.equal(parseCvExperience('MARTIN Camille',now).suggestions.identity.lastName?.value,'MARTIN');
 assert.deepEqual(parseCvExperience('CAMILLE MARTIN',now).suggestions.identity,{});
 for(const title of ['Infirmier IADE','Diplôme IDE','Curriculum VITAE'])assert.deepEqual(parseCvExperience(title,now).suggestions.identity,{},title);
 const r=parseCvExperience('Prénom : Camille\nPrénom : Sophie\nEmail : a@example.test b@example.test',now);
 assert.equal(r.suggestions.identity.firstName,undefined);assert.equal(r.suggestions.identity.email,undefined);assert.ok(r.warnings.some(w=>w.includes('Plusieurs valeurs')));
});
test('CV keeps separate IDE and IADE diploma years, no inferred IDE or RPPS validation',()=>{
 const r=parseCvExperience('Camille MARTIN\nRPPS : 12345678901\nDiplômes\n2014 Diplôme d’État infirmier IDE\n2020 Diplôme IADE',now);
 assert.deepEqual(r.suggestions.diplomas.map(d=>[d.qualification,d.year]),[['IDE',2014],['IADE',2020]]);
 assert.ok(r.suggestions.diplomas.every(d=>d.evidence&&d.warnings.length));assert.ok(r.warnings.some(w=>w.includes('RPPS')));
 assert.equal('rpps' in r.suggestions.identity,false);
 assert.deepEqual(parseCvExperience('Diplômes\n2020 IADE',now).suggestions.diplomas.map(d=>d.qualification),['IADE']);
 assert.deepEqual(parseCvExperience('Infirmier anesthésiste\nExpériences\n2018 - 2020 IADE CHU Exemple',now).suggestions.diplomas,[]);
});
test('CV never manufactures diploma years from training ranges, conflicting dates or shared dates',()=>{
 for(const input of ['Formation\n2018 - 2020 Diplôme IADE','Diplômes\nIADE','Diplômes\n2019 IADE\n2020 IADE','Diplômes\n2020 IDE et IADE']){
  const r=parseCvExperience(input,now);assert.ok(r.suggestions.diplomas.length);assert.ok(r.suggestions.diplomas.every(d=>d.year===null),input);
 }
 assert.equal(parseCvExperience('Diplômes\nDiplôme IBODE\n2021',now).suggestions.diplomas[0]?.year,2021);
 for(const input of ['Formation\n2027 Diplôme IADE','Formation\nDiplôme IADE en cours','Formation\nPréparation du diplôme IBODE','Formation\nIADE non obtenu'])assert.deepEqual(parseCvExperience(input,now).suggestions.diplomas,[],input);
});
test('CV catalog skills require explicit mentions, not the service or a qualification',()=>{
 const r=parseCvExperience('Expériences\n2019 - 2020 | CHU Test | Cardiologie\nCompétences\nECG, prélèvements sanguins\nVentilation non invasive\nPas de maîtrise des pansements complexes\nFormation\nSurveillance neurologique',now);
 assert.deepEqual(r.suggestions.skills.map(s=>s.code).sort(),['ECG','PRELEVEMENTS','VENTILATION_NON_INVASIVE'].sort());
 assert.ok(r.suggestions.services.some(s=>s.code==='CARDIOLOGIE'));
 assert.ok(r.suggestions.skills.every(s=>s.evidence&&s.warnings.length));
 const onlyService=parseCvExperience('Expériences\n2019 - 2020 | CHU Test | Anesthésie',now);
 assert.equal(onlyService.suggestions.skills.length,0);assert.ok(onlyService.suggestions.services.some(s=>s.code==='ANESTHESIE'));
});
test('CV no readable text, negative or ambiguous OCR produces no invented profile values',()=>{
 const r=parseCvExperience('--- | 1ADE ???\nFormation\n20?2 I8ODE\nCompétences\nECG non maîtrisé\nSans expérience en réanimation',now);
 assert.deepEqual(r.suggestions,{identity:{},diplomas:[],skills:[],services:[]});assert.equal(r.experiences.length,0);assert.ok(r.warnings.length);
});
