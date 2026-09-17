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
