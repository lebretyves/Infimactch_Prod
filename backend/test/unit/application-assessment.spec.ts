import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessApplication} from '../../src/missions/application-assessment';
import {match, MatchMission, Professional} from '../../src/domain/matching';
const slot={start:'2037-01-10T08:00:00Z',end:'2037-01-10T16:00:00Z'};
const mission:MatchMission={...slot,status:'OPEN',qualification:'IDE',service:'URGENCES',requiredSkills:['TRIAGE'],desiredSkills:[],minExperienceMonths:12,population:'ADULT',block:'NONE',specialty:null,shift:'DAY',latitude:48,longitude:2};
const profile:Professional={qualifications:['IDE'],skills:[],experience:[],available:[],unavailable:[],conflicts:[],rppsStatus:'FOUND',latitude:48,longitude:2,radiusKm:30,acceptedShifts:['DAY'],preferredShifts:[]};
test('application warns about matching differences while strict matching remains ineligible',()=>{
 const result=assessApplication(profile,mission,0);assert.deepEqual(result,{warnings:['REQUIRED_SKILLS_MISSING','EXPERIENCE_INSUFFICIENT','NOT_FULLY_AVAILABLE'],blockingReasons:[],missingSkills:['TRIAGE'],experienceMonths:0,requiredExperienceMonths:12,distanceKm:0});assert.equal(match(profile,mission,0).eligible,false);
});
test('preferences and unknown or distant mobility only warn for applications',()=>{
 for(const p of [{...profile,acceptedShifts:[],latitude:null},{...profile,acceptedShifts:[]}]){const r=assessApplication(p,mission,50);assert.deepEqual(r.blockingReasons,[]);assert.ok(r.warnings.includes('SHIFT_NOT_ACCEPTED'));assert.ok(r.warnings.includes(p.latitude===null?'MOBILITY_INCOMPLETE':'OUTSIDE_RADIUS'));}
});
test('hard restrictions survive alongside soft differences',()=>{
 const p={...profile,qualifications:[],rppsStatus:'PENDING' as const,conflicts:[slot]};
 const r=assessApplication(p,{...mission,status:'CANCELLED'},0,Date.parse(slot.end));assert.deepEqual(r.blockingReasons,['MISSION_NOT_OPEN','QUALIFICATION_MISSING','RPPS_PENDING','ASSIGNMENT_CONFLICT','MISSION_ALREADY_STARTED']);assert.equal(r.warnings.length,3);
});
test('implicit specialized skills are included and duplicates are removed',()=>{
 const r=assessApplication({...profile,qualifications:['IBODE']},{...mission,qualification:'IBODE',population:'MIXED',block:'SPECIALIZED',specialty:'CARDIAC',requiredSkills:['POPULATION_ADULT','TRIAGE']},0);
 assert.deepEqual(r.missingSkills,['POPULATION_ADULT','TRIAGE','POPULATION_PEDIATRIC','BLOCK_CARDIAC']);assert.deepEqual(r.blockingReasons,[]);
});
