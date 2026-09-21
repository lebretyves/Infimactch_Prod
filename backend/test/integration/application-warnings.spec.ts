import 'reflect-metadata';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Database} from '../../src/database/database';
import {MissionsService} from '../../src/missions/missions.service';
let db:Database,service:MissionsService;
before(async()=>{const u=new URL(process.env.DATABASE_URL||'http://invalid');if(process.env.NODE_ENV!=='test'||u.hostname!=='127.0.0.1'||u.port!=='55433'||u.pathname!=='/infimatch_test')throw Error('Requires isolated database');db=await new Database().connect();await db.source.runMigrations({transaction:'all'});service=new MissionsService(db);});
after(async()=>{await db?.onModuleDestroy();});
async function fixture(){
 const [a]=await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture','NURSE','fixture') RETURNING id",[randomUUID()+'@example.invalid']);
 await db.query("INSERT INTO profile(user_id,display_name,qualifications,rpps_status,latitude,longitude,radius_km,accepted_shifts) VALUES($1,'Fictional application test',ARRAY['IDE'],'FOUND',48,2,30,ARRAY['DAY'])",[a.id]);
 const [org]=await db.query("INSERT INTO organization(kind,name,address,referent,finess) VALUES('ESTABLISHMENT','Fictional test','Fictional address','Test','000000000') RETURNING id");
 await db.query('INSERT INTO membership(user_id,organization_id) VALUES($1,$2)',[a.id,org.id]);
 const [m]=await db.query("INSERT INTO mission(establishment_id,title,description,qualification,service,population,block,required_skills,min_experience_months,start_at,end_at,shift,address,location,hourly_salary,status) VALUES($1,'Fictional application test','Fixture only','IDE','URGENCES','ADULT','NONE',ARRAY['TRIAGE'],12,now()+interval '10 days',now()+interval '10 days 8 hours','DAY','Fictional address',ST_SetSRID(ST_MakePoint(2,48),4326)::geography,25,'OPEN') RETURNING id",[org.id]);
 return {actor:a.id,mission:m.id};
}
const conflict=(e:any)=>e.getStatus()===409;
test('soft mismatch preview, application, audit and idempotent receipt agree; recruiter confirmation preserves warnings',async()=>{
 const {actor,mission}=await fixture(),preview=await service.applicationCheck(actor,mission);
 assert.deepEqual(preview.blockingReasons,[]);assert.deepEqual(preview.warnings,['REQUIRED_SKILLS_MISSING','EXPERIENCE_INSUFFICIENT','NOT_FULLY_AVAILABLE']);assert.deepEqual(preview.missingSkills,['TRIAGE']);
 const key=randomUUID(),a=await service.apply(actor,mission,1,key);assert.equal(a.status,'SUBMITTED');assert.deepEqual(a.warnings,preview.warnings);
 const replay=await service.apply(actor,mission,1,key);assert.equal(replay.id,a.id);assert.deepEqual(replay.warnings,a.warnings);
 const repeated=await service.apply(actor,mission,1,randomUUID());assert.equal(repeated.id,a.id);
 const rows=await db.query('SELECT id FROM application WHERE mission_id=$1 AND nurse_id=$2',[mission,actor]);assert.equal(rows.length,1);
 const [audit]=await db.query("SELECT details FROM audit WHERE resource_id=$1 AND event='APPLICATION_SUBMITTED' ORDER BY id LIMIT 1",[a.id]);assert.deepEqual(audit.details.warnings,preview.warnings);
 const assigned=await service.assign(actor,mission,a.id,randomUUID());assert.equal(assigned.status,'ACTIVE');
 const [confirmationAudit]=await db.query("SELECT details FROM audit WHERE resource_id=$1 AND event='ASSIGNMENT_CREATED'",[assigned.id]);assert.deepEqual(confirmationAudit.details.profileWarnings,preview.warnings);
});
test('version, mission lifecycle and account restrictions remain enforced',async()=>{
 const {actor,mission}=await fixture();await assert.rejects(service.apply(actor,mission,2,randomUUID()),conflict);
 await db.query("UPDATE mission SET status='CANCELLED' WHERE id=$1",[mission]);await assert.rejects(service.apply(actor,mission,1,randomUUID()),conflict);
 await db.query("UPDATE mission SET status='OPEN',start_at=now()-interval '1 hour',end_at=now()+interval '1 hour' WHERE id=$1",[mission]);assert.ok((await service.applicationCheck(actor,mission)).blockingReasons.includes('MISSION_ALREADY_STARTED'));await assert.rejects(service.apply(actor,mission,1,randomUUID()),conflict);
 await db.query('UPDATE account SET active=false WHERE id=$1',[actor]);await assert.rejects(service.applicationCheck(actor,mission),(e:any)=>e.getStatus()===404);
 assert.equal((await db.query('SELECT id FROM application WHERE mission_id=$1',[mission])).length,0);
});

test('incomplete profile can apply then be accepted or rejected despite warnings',async()=>{
 for(const decision of ['accept','reject']){
  const {actor,mission}=await fixture();
  await db.query("UPDATE profile SET qualifications='{}',rpps_status='PENDING',latitude=NULL,longitude=NULL,radius_km=NULL,accepted_shifts='{}' WHERE user_id=$1",[actor]);
  const preview=await service.applicationCheck(actor,mission);assert.deepEqual(preview.blockingReasons,[]);assert.ok(preview.warnings.includes('QUALIFICATION_MISSING'));
  const a=await service.apply(actor,mission,1,randomUUID());assert.equal(a.status,'SUBMITTED');assert.deepEqual(a.warnings,preview.warnings);
  if(decision==='accept')assert.equal((await service.assign(actor,mission,a.id,randomUUID())).status,'ACTIVE');
  else {await db.query('UPDATE mission SET version=2 WHERE id=$1',[mission]);assert.equal((await service.applicationAction(actor,a.id,'REJECTED',randomUUID())).status,'REJECTED');}
 }
});
