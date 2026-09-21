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
test('mission state and exact schedule remain mandatory',async()=>{
  await assert.rejects(eligible(db(),p,{...m,status:'FILLED'}),rejectsWith('MISSION_NOT_OPEN'));
  await assert.rejects(eligible(db(),p,{...m,schedule_precision:'DATE'}),rejectsWith('SCHEDULE_UNCONFIRMED'));
  await assert.rejects(eligible(db(),p,{...m,shift:'UNKNOWN'}),rejectsWith('SCHEDULE_UNCONFIRMED'));
  await assert.rejects(eligible(db(),p,{...m,start_at:new Date(Date.now()-1000).toISOString()}),/Mission already started/);
});


import {MissionsService} from '../../src/missions/missions.service';
for(const pendingStatus of ['SUBMITTED','SELECTED'])test('direct acceptance creates assignment and confirmation event from '+pendingStatus,async()=>{
  const calls:{sql:string;values:any[]}[]=[];
  const em={query:async(sql:string,values:any[]=[])=>{
    calls.push({sql,values});
    if(sql.startsWith('SELECT m.*'))return [{...m,id:'mission',version:1,agency_id:null,establishment_id:'org'}];
    if(sql.includes('SELECT o.kind FROM membership'))return [{kind:'ESTABLISHMENT'}];
    if(sql.startsWith('SELECT nurse_id FROM application'))return [{nurse_id:'nurse'}];
    if(sql.startsWith('SELECT id FROM account'))return [{id:'nurse'}];
    if(sql.startsWith('SELECT * FROM profile'))return [{...p,qualifications:[],rpps_status:'PENDING'}];
    if(sql.startsWith('SELECT * FROM application'))return [{id:'application',status:pendingStatus,consent_version:1}];
    if(sql.startsWith('INSERT INTO assignment'))return [{id:'assignment',status:'ACTIVE'}];
    return [];
  }};
  const service=new MissionsService({transaction:async(fn:any)=>fn(em)} as any);
  assert.equal((await service.assign('owner','mission','application','unique-key')).id,'assignment');
  assert.ok(calls.some(c=>c.sql.includes("UPDATE application SET status='ACCEPTED'")));
  assert.ok(calls.some(c=>c.sql.includes("UPDATE mission SET status='FILLED'")));
  assert.equal(calls.filter(c=>c.sql.startsWith('INSERT INTO outbox(event,payload)')&&c.values[0]==='AssignmentCreated').length,1);
  assert.equal(calls.some(c=>c.values.includes('APPLICATION_SELECTED')),false);
});

for(const rpps_status of ['NOT_CHECKED','PENDING','NOT_FOUND'])test('incomplete profile can be accepted with visible qualification and RPPS warnings: '+rpps_status,async()=>{
 const incomplete={...p,qualifications:[],rpps_status};
 const result=await eligible(db(),incomplete,m);
 assert.equal(result.eligible,true);assert.ok(result.warnings.includes('QUALIFICATION_MISSING'));
 assert.ok(result.warnings.some(w=>w==='RPPS_'+rpps_status||w==='RPPS_OPTIONAL_DEMO'));
 await assert.rejects(eligible(db([{start_at:start,end_at:end}]),incomplete,m),rejectsWith('ASSIGNMENT_CONFLICT'));
});

test('rejection does not require a complete profile or renewed consent',async()=>{
 const writes:any[]=[];
 const em={query:async(sql:string,values:any[]=[])=>{
  if(sql.startsWith('SELECT mission_id,nurse_id'))return [{mission_id:'mission',nurse_id:'nurse'}];
  if(sql.startsWith('SELECT m.*'))return [{...m,id:'mission',version:2,establishment_id:'org'}];
  if(sql.startsWith('SELECT * FROM profile'))return [{...p,qualifications:[],rpps_status:'PENDING'}];
  if(sql.startsWith('SELECT * FROM application'))return [{id:'application',status:'SUBMITTED',consent_version:1,nurse_id:'nurse'}];
  if(sql.startsWith('SELECT organization_id FROM membership'))return [{organization_id:'org'}];
  if(sql.startsWith('UPDATE application SET status=$2'))writes.push(values);
  return [];
 }};
 const service=new MissionsService({transaction:async(fn:any)=>fn(em)} as any);
 assert.equal((await service.applicationAction('owner','application','REJECTED','unique-key')).status,'REJECTED');
 assert.deepEqual(writes,[['application','REJECTED']]);
});
