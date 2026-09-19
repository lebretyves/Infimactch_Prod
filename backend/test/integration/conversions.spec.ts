import 'reflect-metadata';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Database} from '../../src/database/database';
import {ConversionService} from '../../src/listings/conversions';
import {mutedDemoMissionIds} from '../../src/notifications/demo-suppression';
let db:Database,service:ConversionService;
const from='2024-01-01',to='2024-01-31';
before(async()=>{const u=new URL(process.env.DATABASE_URL||'http://invalid');assert.equal(process.env.NODE_ENV,'test');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55433');assert.equal(u.pathname,'/infimatch_test');db=await new Database().connect();await db.source.runMigrations({transaction:'all'});service=new ConversionService(db);});
after(async()=>{await db?.onModuleDestroy();});
async function account(family='ENTERPRISE'){return(await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture',$2,'fixture') RETURNING id",[randomUUID()+'@example.invalid',family]))[0].id as string;}
async function fixture(){const actor=await account();const [o]=await db.query("INSERT INTO organization(kind,name,address,referent,finess) VALUES('ESTABLISHMENT','Conversion fixture','Fixture','Fixture','000000000') RETURNING id");await db.query('INSERT INTO membership(user_id,organization_id) VALUES($1,$2)',[actor,o.id]);return{actor,org:o.id as string};}
async function mission(org:string,publication:string|null='2024-01-02T08:00:00Z',status='OPEN',id:string=randomUUID()){
 await db.query(`INSERT INTO mission(id,establishment_id,title,description,qualification,service,population,block,start_at,end_at,shift,address,location,hourly_salary,status,first_published_at)
 VALUES($1,$2,'Conversion fixture','Fictional local test','IDE','URGENCES','ADULT','NONE','2030-01-01T08:00:00Z','2030-01-01T16:00:00Z','DAY','Fixture',ST_SetSRID(ST_MakePoint(2,48),4326)::geography,25,$3,$4)`,[id,org,status==='FILLED'?'OPEN':status,publication]);
 // Reproduce legacy publication with genuinely unknown date despite OPEN trigger.
 if(publication===null)await db.query('UPDATE mission SET first_published_at=NULL WHERE id=$1',[id]);return id;
}
async function application(missionId:string,submitted:string|null='2024-01-02T09:00:00Z'){
 const nurse=await account('NURSE');await db.query('INSERT INTO profile(user_id) VALUES($1)',[nurse]);
 const [a]=await db.query("INSERT INTO application(mission_id,nurse_id,consent_version) VALUES($1,$2,1) RETURNING id",[missionId,nurse]);
 if(submitted)await db.query("INSERT INTO audit(event,resource_id,details,created_at) VALUES('APPLICATION_SUBMITTED',$1,$2,$3)",[a.id,JSON.stringify({previousStatus:null}),submitted]);return{id:a.id as string,nurse};
}
async function assignment(missionId:string,application:{id:string;nurse:string},status='ACTIVE',created='2024-01-03T08:00:00Z'){
 await db.transaction(async em=>{await em.query("INSERT INTO assignment(mission_id,nurse_id,application_id,status,start_at,end_at,created_at) VALUES($1,$2,$3,$4,'2030-01-01T08:00:00Z','2030-01-01T16:00:00Z',$5)",[missionId,application.nurse,application.id,status,created]);
 if(status==='ACTIVE')await em.query("UPDATE mission SET status='FILLED' WHERE id=$1",[missionId]);
 else if(status==='COMPLETED')await em.query("UPDATE mission SET status='COMPLETED' WHERE id=$1",[missionId]);});
}
const report=(f:{actor:string;org:string},period={from,to})=>service.report(f.actor,{organizationId:f.org,...period});
test('known cohorts expose exact denominators, cancelled selection and retained fill delay',async()=>{
 const f=await fixture();
 const one=await mission(f.org,'2024-01-02T08:00:00Z','FILLED');await assignment(one,await application(one),'ACTIVE','2024-01-03T08:00:00Z');
 const two=await mission(f.org,'2024-01-05T08:00:00Z','COMPLETED');await assignment(two,await application(two),'COMPLETED','2024-01-07T08:00:00Z');
 const three=await mission(f.org,'2024-01-06T08:00:00Z','CANCELLED');await assignment(three,await application(three),'CANCELLED','2024-01-06T20:00:00Z');
 await application(await mission(f.org,'2024-01-10T08:00:00Z'));
 const r=await report(f);assert.deepEqual(r.fillRate,{numerator:2,denominator:4,percent:50});assert.deepEqual(r.selectionRate,{numerator:3,denominator:4,percent:75});assert.equal(r.missionCancellationRate.percent,25);assert.deepEqual(r.assignmentCancellationRate,{numerator:1,denominator:3,percent:33.33});assert.deepEqual(r.fillDelay,{averageHours:36,samples:2});
});
test('organization authorization blocks crossed, inactive, nurse and platform accounts',async()=>{
 const a=await fixture(),b=await fixture();await mission(b.org);assert.equal((await report(a)).fillRate.denominator,0);
 await assert.rejects(service.report(a.actor,{organizationId:b.org,from,to}),(e:any)=>e.getStatus()===404);
 await db.query('UPDATE membership SET active=false WHERE user_id=$1',[a.actor]);await assert.rejects(report(a),(e:any)=>e.getStatus()===404);
 const nurse=await account('NURSE');await db.query('INSERT INTO membership(user_id,organization_id) VALUES($1,$2)',[nurse,b.org]);await assert.rejects(service.report(nurse,{organizationId:b.org,from,to}),(e:any)=>e.getStatus()===404);
 await db.query('UPDATE account SET platform_only=true WHERE id=$1',[b.actor]);await assert.rejects(report(b),(e:any)=>e.getStatus()===404);
});
test('empty periods are unavailable rather than fabricated zero percentages',async()=>{
 const r=await report(await fixture());for(const value of [r.fillRate,r.selectionRate,r.missionCancellationRate,r.assignmentCancellationRate])assert.deepEqual(value,{numerator:0,denominator:0,percent:null});assert.deepEqual(r.fillDelay,{averageHours:null,samples:0});
});
test('exact demo IDs and undated histories are excluded without title heuristics',async()=>{
 const f=await fixture();await mission(f.org,'2024-01-02T08:00:00Z','OPEN',mutedDemoMissionIds[0]!);
 const real=await mission(f.org);await db.query("UPDATE mission SET title='DEMONSTRATION sans reçu de source' WHERE id=$1",[real]);await application(real,null);
 await mission(f.org,null);const r=await report(f);assert.equal(r.fillRate.denominator,1);assert.equal(r.exclusions.demoMissions,1);assert.equal(r.exclusions.undatedPublications,1);assert.equal(r.exclusions.undatedApplications,1);assert.equal(r.selectionRate.denominator,0);
});
test('cohort boundaries use initial dates, count one application despite resubmission, and ignore unrelated dates',async()=>{
 const f=await fixture();const m=await mission(f.org,'2023-12-31T23:59:59Z');const a=await application(m,'2023-12-31T23:59:59Z');
 await db.query("INSERT INTO audit(event,resource_id,details,created_at) VALUES('APPLICATION_SUBMITTED',$1,$2,'2024-01-05T00:00:00Z')",[a.id,JSON.stringify({previousStatus:'WITHDRAWN'})]);
 await assignment(m,a,'CANCELLED','2024-01-10T00:00:00Z');
 const boundary=await mission(f.org,'2024-01-31T23:59:59Z');await application(boundary,'2024-01-31T23:59:59Z');await mission(f.org,'2024-02-01T00:00:00Z');
 const r=await report(f);assert.equal(r.fillRate.denominator,1);assert.equal(r.selectionRate.denominator,1);assert.equal(r.selectionRate.numerator,0);assert.equal(r.assignmentCancellationRate.denominator,1);assert.equal(r.assignmentCancellationRate.percent,100);
});
test('a cancelled then reassigned mission counts once and delay excludes negative timestamps',async()=>{
 const f=await fixture();const m=await mission(f.org,'2024-01-02T08:00:00Z');const a=await application(m);await assignment(m,a,'CANCELLED','2024-01-03T08:00:00Z');await assignment(m,a,'ACTIVE','2024-01-04T08:00:00Z');
 const invalid=await mission(f.org,'2024-01-10T08:00:00Z');await assignment(invalid,await application(invalid),'COMPLETED','2024-01-09T08:00:00Z');const r=await report(f);
 assert.equal(r.fillRate.numerator,2);assert.equal(r.selectionRate.numerator,2);assert.deepEqual(r.fillDelay,{averageHours:48,samples:1});assert.equal(r.assignmentCancellationRate.denominator,3);
});
