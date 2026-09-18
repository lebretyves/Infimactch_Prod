import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {eligible} from '../../src/missions/missions.service';
import {match} from '../../src/domain/matching';
import {professional} from '../../src/profiles/profiles.module';
import {matchingMission} from '../../src/missions/missions.service';

const start = new Date(Date.now() + 86400000).toISOString();
const end = new Date(Date.now() + 115200000).toISOString();
const p = {user_id:'nurse', qualifications:['IDE'], skills:[], experience:[], available:[],
  unavailable:[], rpps_status:'FOUND', latitude:null, longitude:null, radius_km:null,
  accepted_shifts:[], preferred_shifts:[], details:{}};
const m = {start_at:start,end_at:end,status:'OPEN',qualification:'IDE',service:'URGENCES',
  population:'ADULT',block:'NONE',specialty:null,required_skills:['TRIAGE'],desired_skills:[],
  min_experience_months:12,latitude:48,longitude:2,shift:'DAY',schedule_precision:'EXACT'};
const db = (conflicts:any[]=[], distance=0) => ({query:async(sql:string)=>
  sql.includes('FROM assignment') ? conflicts : [{distance}]}) as any;

function rejectsWith(reason:string) {
  return (e:any) => { assert.ok(e.getResponse().reasons.includes(reason)); return true; };
}
test('recruiter can confirm incomplete declarations without changing matching eligibility',async()=>{
  const result=await eligible(db(),p,m);
  assert.equal(result.eligible,true);
  assert.deepEqual(result.warnings,['REQUIRED_SKILLS_MISSING','EXPERIENCE_INSUFFICIENT',
    'NOT_FULLY_AVAILABLE','SHIFT_NOT_ACCEPTED','MOBILITY_INCOMPLETE']);
  assert.equal(match(professional(p),matchingMission(m),null).eligible,false);
  assert.equal(result.score,null);
});
test('stale unavailability and outside radius are warnings during confirmation',async()=>{
  const result=await eligible(db([],100),{...p,latitude:48,longitude:2,radius_km:10,
    unavailable:[{start,end}]},m);
  assert.equal(result.eligible,true);
  assert.ok(result.warnings.includes('OUTSIDE_RADIUS'));
  assert.ok(result.warnings.includes('NOT_FULLY_AVAILABLE'));
});
test('confirmed overlap remains blocking even when the agenda is empty',async()=>{
  await assert.rejects(eligible(db([{start_at:start,end_at:end}]),p,m),rejectsWith('ASSIGNMENT_CONFLICT'));
});
test('adjacent confirmed missions do not conflict',async()=>{
  assert.equal((await eligible(db([{start_at:new Date(Date.parse(start)-3600000).toISOString(),end_at:start}]),p,m)).eligible,true);
});
test('qualification, RPPS, mission state and exact schedule remain mandatory',async()=>{
  await assert.rejects(eligible(db(),{...p,qualifications:[]},m),rejectsWith('QUALIFICATION_MISSING'));
  await assert.rejects(eligible(db(),{...p,rpps_status:'PENDING'},m),rejectsWith('RPPS_PENDING'));
  await assert.rejects(eligible(db(),p,{...m,status:'FILLED'}),rejectsWith('MISSION_NOT_OPEN'));
  await assert.rejects(eligible(db(),p,{...m,schedule_precision:'DATE'}),rejectsWith('SCHEDULE_UNCONFIRMED'));
  await assert.rejects(eligible(db(),p,{...m,shift:'UNKNOWN'}),rejectsWith('SCHEDULE_UNCONFIRMED'));
  await assert.rejects(eligible(db(),p,{...m,start_at:new Date(Date.now()-1000).toISOString()}),/Mission already started/);
});
