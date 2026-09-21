import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';

test('RPPS demonstration policy is explicit, versioned, reversible and does not certify profiles',()=>{
 const root=resolve(__dirname,'../../src');
 const script=`
 const assert=require('node:assert/strict');
 const {MATCH_RULES}=require(process.env.TEST_SOURCE_ROOT+'/domain/rules.js');
 const {match}=require(process.env.TEST_SOURCE_ROOT+'/domain/matching.js');
 const {assessApplication}=require(process.env.TEST_SOURCE_ROOT+'/missions/application-assessment.js');
 const {assessAssignment}=require(process.env.TEST_SOURCE_ROOT+'/missions/assignment-assessment.js');
 const optional=process.env.DEMO_OPTIONAL_RPPS==='true';
 assert.equal(MATCH_RULES.rppsRequired,!optional);
 assert.deepEqual(MATCH_RULES.weights,{C:.45,Z:.25,D:.2,E:.1});
 const slot={start:'2037-01-10T08:00:00Z',end:'2037-01-10T16:00:00Z'};
 const mission={...slot,status:'OPEN',qualification:'IDE',service:'URGENCES',requiredSkills:[],desiredSkills:[],minExperienceMonths:0,population:'ADULT',block:'NONE',specialty:null,shift:'DAY',schedulePrecision:'EXACT',latitude:48,longitude:2};
 for(const status of ['NOT_CHECKED','PENDING','NOT_FOUND','FOUND']){
  const p={qualifications:['IDE'],skills:[],experience:[],available:[slot],unavailable:[],conflicts:[],rppsStatus:status,latitude:48,longitude:2,radiusKm:30,acceptedShifts:['DAY'],preferredShifts:[]};
  const before=JSON.stringify(p);
  const expected=optional||status==='FOUND';
  assert.equal(match(p,mission,0).eligible,expected);
  const application=assessApplication(p,mission,0,0);
  assert.equal(application.blockingReasons.length===0,true);
  const assignment=assessAssignment(p,mission,0);
  assert.equal(assignment.eligible,true);
  assert.equal(application.warnings.includes('RPPS_OPTIONAL_DEMO'),optional&&status!=='FOUND');
  assert.equal(assignment.warnings.includes('RPPS_OPTIONAL_DEMO'),optional&&status!=='FOUND');
  if(!expected){assert.ok(application.warnings.includes('RPPS_'+status));assert.ok(assignment.warnings.includes('RPPS_'+status));}
  assert.equal(JSON.stringify(p),before);
  assert.ok(assessApplication({...p,qualifications:[]},mission,0,0).warnings.includes('QUALIFICATION_MISSING'));
  assert.ok(assessAssignment({...p,conflicts:[slot]},mission,0).blockingReasons.includes('ASSIGNMENT_CONFLICT'));
  assert.ok(assessAssignment(p,{...mission,schedulePrecision:'DATE'},0).blockingReasons.includes('SCHEDULE_UNCONFIRMED'));
  assert.ok(assessApplication(p,{...mission,status:'CANCELLED'},0,0).blockingReasons.includes('MISSION_NOT_OPEN'));
 }
 console.log(JSON.stringify({version:MATCH_RULES.version}));
 `;
 const versions=[];
 for(const value of ['false','true','','TRUE']){
  const result=execFileSync(process.execPath,['-e',script],{encoding:'utf8',env:{...process.env,TEST_SOURCE_ROOT:root,DEMO_OPTIONAL_RPPS:value,MATCHING_WEIGHTS_JSON:''}});
  versions.push(JSON.parse(result).version);
 }
 assert.notEqual(versions[0],versions[1]);
 assert.equal(versions[0],versions[2]);
 assert.equal(versions[0],versions[3]);
});
