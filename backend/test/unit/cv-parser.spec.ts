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
