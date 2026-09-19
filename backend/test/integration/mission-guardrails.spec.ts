import 'reflect-metadata';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Database} from '../../src/database/database';
import {AutomationService} from '../../src/automation/automation.module';
import {MissionsService} from '../../src/missions/missions.service';
import {normalizeNeedDetails} from '../../src/organizations/need.dto';
let db:Database,service:MissionsService,automation:AutomationService,org:string,actor:string,nurseId:string,legacy:string;
async function mission(start='2030-01-10T08:00:00Z',end='2030-01-10T16:00:00Z',status='OPEN') {
 const [m]=await db.query(`INSERT INTO mission(establishment_id,title,description,qualification,service,population,block,start_at,end_at,shift,address,location,hourly_salary,status)
 VALUES($1,'Guardrail fixture','Fictional test mission','IDE','URGENCES','ADULT','NONE',$2,$3,'DAY','Fixture',ST_SetSRID(ST_MakePoint(2,48),4326)::geography,25,$4) RETURNING *`,[org,start,end,status]);return m;
}
async function age(id:string){await db.query("UPDATE mission SET first_published_at=now()-interval '2 days',last_reminder_at=NULL WHERE id=$1",[id]);}
async function noDue(){await db.query('UPDATE mission SET reminders_enabled=false');}
before(async()=>{
 const u=new URL(process.env.DATABASE_URL!);assert.equal(process.env.NODE_ENV,'test');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55433');assert.equal(u.pathname,'/infimatch_test');
 db=await new Database().connect();const guardrailIndex=db.source.migrations.findIndex(m=>m.constructor.name==='MissionGuardrails1789826400000');assert.ok(guardrailIndex>=0);const pending=db.source.migrations.splice(guardrailIndex);
 await db.source.runMigrations({transaction:'all'});
 const [o]=await db.query("INSERT INTO organization(kind,name,address,referent,finess) VALUES('ESTABLISHMENT','Fixture','Fixture','Fixture','000000000') RETURNING id");org=o.id;
 for(const family of ['ENTERPRISE','NURSE']){const [a]=await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture',$2,'fixture') RETURNING id",[randomUUID()+'@example.invalid',family]);if(family==='ENTERPRISE')actor=a.id;else nurseId=a.id;}
 await db.query('INSERT INTO membership(user_id,organization_id) VALUES($1,$2)',[actor,org]);
 await db.query("INSERT INTO profile(user_id,qualifications,rpps_status,visible) VALUES($1,ARRAY['IDE'],'FOUND',true)",[nurseId]);
 legacy=(await mission()).id;
 // Over 1,000 pre-existing missions: a real upgrade must exclude every one.
 await db.query(`INSERT INTO mission(establishment_id,title,description,qualification,service,population,block,start_at,end_at,shift,address,location,hourly_salary,status,created_at)
 SELECT $1,'Old fixture','No reminder','IDE','URGENCES','ADULT','NONE',now()+interval '10 days',now()+interval '11 days','DAY','Fixture',ST_SetSRID(ST_MakePoint(2,48),4326)::geography,25,'OPEN',now()-interval '10 days' FROM generate_series(1,1001)`,[org]);
 db.source.migrations.push(...pending);await db.source.runMigrations({transaction:'all'});
 service=new MissionsService(db);automation=new AutomationService(db,{} as any);
});
after(async()=>{await db?.onModuleDestroy();});
test('upgrade excludes all existing missions including edits, versions and republishing',async()=>{
 const [c]=await db.query('SELECT count(*)::int AS n FROM mission WHERE reminders_enabled');assert.equal(c.n,0);
 await db.query("UPDATE mission SET status='DRAFT',version=version+1 WHERE id=$1",[legacy]);await db.query("UPDATE mission SET status='OPEN' WHERE id=$1",[legacy]);await age(legacy);
 assert.equal((await automation.reminders()).notifications,0);
 assert.equal((await db.query("SELECT id FROM notification WHERE kind='REMINDER'")).length,0);
});
test('new missions wait from publication, enforce 24 actual hours and three lifetime reminders',async()=>{
 const m=await mission(undefined,undefined,'DRAFT');await db.query("UPDATE mission SET created_at=now()-interval '30 days' WHERE id=$1",[m.id]);
 await db.query("UPDATE mission SET status='OPEN' WHERE id=$1",[m.id]);assert.equal((await automation.reminders()).processed,0);
 await age(m.id);assert.equal((await automation.reminders()).notifications,1);
 assert.equal((await automation.reminders()).processed,0);
 await db.query("UPDATE mission SET last_reminder_at=date_trunc('hour',now())-interval '1 minute',version=version+1 WHERE id=$1",[m.id]);assert.equal((await automation.reminders()).processed,0);
 for(let i=0;i<2;i++){await db.query("UPDATE mission SET last_reminder_at=now()-interval '25 hours',version=version+1 WHERE id=$1",[m.id]);assert.equal((await automation.reminders()).notifications,1);}
 await db.query("UPDATE mission SET last_reminder_at=now()-interval '25 hours',version=version+1 WHERE id=$1",[m.id]);assert.equal((await automation.reminders()).processed,0);
 const [state]=await db.query('SELECT reminder_count FROM mission WHERE id=$1',[m.id]);assert.equal(state.reminder_count,3);
 const recipients=await db.query("SELECT DISTINCT user_id FROM notification WHERE kind='REMINDER'");assert.deepEqual(recipients.map(r=>r.user_id),[actor]);
});
test('cancelled, started missions and concurrent reminder workers never duplicate notifications',async()=>{
 await noDue();const m=await mission();await age(m.id);
 const cancelled=await mission(undefined,undefined,'CANCELLED');await age(cancelled.id);
 const started=await mission('2020-01-01T08:00:00Z','2020-01-01T16:00:00Z');await age(started.id);
 const results=await Promise.all([automation.reminders(),automation.reminders()]);assert.equal(results.reduce((n,r)=>n+r.notifications,0),1);
});
test('global budget survives repeated n8n calls and counts all organization recipients',async()=>{
 await noDue();await db.query("UPDATE reminder_window SET created_at=now()-interval '2 hours'");
 const [second]=await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture','ENTERPRISE','fixture') RETURNING id",[randomUUID()+'@example.invalid']);
 await db.query('INSERT INTO membership(user_id,organization_id) VALUES($1,$2)',[second.id,org]);
 for(let i=0;i<75;i++)await age((await mission()).id);
 let sent=0;for(let i=0;i<10;i++)sent+=(await automation.reminders()).notifications;
 assert.equal(sent,100);assert.equal((await automation.reminders()).hasMore,false);
 await db.query("UPDATE reminder_window SET created_at=now()-interval '2 hours'");assert.equal((await automation.reminders()).notifications,50);
});
test('assignment closes overlapping applications only, records reason and keeps adjacent slots',async()=>{
 const start=new Date(Date.now()+10*86400000);start.setUTCHours(8,0,0,0);const at=(hours:number)=>new Date(start.getTime()+hours*3600000).toISOString();
 const a=await mission(at(0),at(8)),b=await mission(at(4),at(12)),c=await mission(at(8),at(16)),d=await mission(at(24),at(32));
 const apps:any[]=[];for(const m of [a,b,c,d])apps.push(await service.apply(nurseId,m.id,1,randomUUID()));
 await service.applicationAction(actor,apps[1].id,'SELECTED',randomUUID());
 const key=randomUUID(),assigned=await service.assign(actor,a.id,apps[0].id,key);
 assert.equal((await service.assign(actor,a.id,apps[0].id,key)).id,assigned.id);
 const rows=await db.query('SELECT id,status,closure_reason,closed_at FROM application WHERE id=ANY($1::uuid[])',[apps.map(a=>a.id)]);
 assert.equal(rows.find(r=>r.id===apps[0].id).status,'ACCEPTED');const closed=rows.find(r=>r.id===apps[1].id);assert.equal(closed.status,'UNAVAILABLE');assert.equal(closed.closure_reason,'OTHER_ASSIGNMENT_CONFIRMED');assert.ok(closed.closed_at);
 for(const app of apps.slice(2))assert.equal(rows.find(r=>r.id===app.id).status,'SUBMITTED');
 const history=await db.query("SELECT details FROM audit WHERE resource_id=$1 AND event='APPLICATION_UNAVAILABLE'",[apps[1].id]);assert.equal(history.length,1);assert.equal(history[0].details.assignmentId,assigned.id);
 await service.cancelAssignment(nurseId,assigned.id,randomUUID());assert.equal((await db.query('SELECT status FROM application WHERE id=$1',[apps[1].id]))[0].status,'UNAVAILABLE');
 const retry=await service.apply(nurseId,b.id,1,randomUUID());assert.equal(retry.status,'SUBMITTED');assert.equal(retry.closure_reason,null);assert.equal(retry.closed_at,null);
});
test('two concurrent assignments for one nurse yield one success and one closed application',async()=>{
 const start=new Date(Date.now()+20*86400000).toISOString(),end=new Date(Date.now()+20*86400000+8*3600000).toISOString();
 const a=await mission(start,end),b=await mission(start,end);const aa=await service.apply(nurseId,a.id,1,randomUUID()),bb=await service.apply(nurseId,b.id,1,randomUUID());
 const result=await Promise.allSettled([service.assign(actor,a.id,aa.id,randomUUID()),service.assign(actor,b.id,bb.id,randomUUID())]);
 assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
 const states=(await db.query('SELECT status FROM application WHERE id=ANY($1::uuid[])',[[aa.id,bb.id]])).map(a=>a.status).sort();assert.deepEqual(states,['ACCEPTED','UNAVAILABLE']);
});
test('API create, edit, old draft publication and staffing needs reject out of horizon dates',async()=>{
 const future={establishmentId:org,title:'Future test',description:'Fictional mission',qualification:'IDE',service:'URGENCES',population:'ADULT',block:'NONE',requiredSkills:[],desiredSkills:[],minExperienceMonths:0,start:'2090-01-01T08:00:00Z',end:'2090-01-01T16:00:00Z',shift:'DAY',address:'Fixture',longitude:2,latitude:48,hourlySalary:25} as any;
 await assert.rejects(service.create(actor,future,randomUUID()),(e:any)=>e.getStatus()===400);
 const draft=await mission(future.start,future.end,'DRAFT');
 await assert.rejects(service.edit(actor,draft.id,future,randomUUID()),(e:any)=>e.getStatus()===400);
 await assert.rejects(service.transition(actor,draft.id,'publish',randomUUID()),(e:any)=>e.getStatus()===409);
 assert.throws(()=>normalizeNeedDetails({...future,headcount:1}));
});
test('a new published mission still alerts only eligible nurses with notifications enabled',async()=>{
 const start=new Date(Date.now()+50*86400000).toISOString(),end=new Date(Date.now()+50*86400000+8*3600000).toISOString();
 await db.query("UPDATE profile SET notifications_enabled=true,latitude=48,longitude=2,radius_km=30,accepted_shifts=ARRAY['DAY'],available=$2 WHERE user_id=$1",[nurseId,JSON.stringify([{start,end}])]);
 const m=await service.create(actor,{establishmentId:org,title:'New matching fixture',description:'Fictional new mission',qualification:'IDE',service:'URGENCES',population:'ADULT',block:'NONE',requiredSkills:[],desiredSkills:[],minExperienceMonths:0,start,end,shift:'DAY',address:'Fixture address',longitude:2,latitude:48,hourlySalary:25},randomUUID(),true);
 const [event]=await db.query("SELECT id FROM outbox WHERE event='MissionOPEN' AND payload->>'missionId'=$1",[m.id]);
 assert.equal((await automation.matches(event.id)).notifications,1);assert.equal((await automation.matches(event.id)).status,'ALREADY_PROCESSED');
 for(const update of ["notifications_enabled=false","notifications_enabled=true,latitude=0,longitude=0"]){
  await db.query('UPDATE profile SET '+update+' WHERE user_id=$1',[nurseId]);
  const [next]=await db.query("INSERT INTO outbox(event,payload) VALUES('MatchRequested',$1) RETURNING id",[JSON.stringify({missionId:m.id,version:m.version})]);
  assert.equal((await automation.matches(next.id)).notifications,0);
 }
});
