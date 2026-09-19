import 'reflect-metadata';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Database} from '../../src/database/database';
import {MissionsService} from '../../src/missions/missions.service';
import {ProfilesService,ProfileDto} from '../../src/profiles/profiles.module';
let db:Database,missions:MissionsService,profiles:ProfilesService;
before(async()=>{
 const u=new URL(process.env.DATABASE_URL||'http://invalid');
 if(process.env.NODE_ENV!=='test'||u.hostname!=='127.0.0.1'||u.port!=='55433'||u.pathname!=='/infimatch_test')throw Error('Requires isolated database');
 db=await new Database().connect();await db.source.runMigrations({transaction:'all'});
 missions=new MissionsService(db);profiles=new ProfilesService(db);
});
after(async()=>{await db?.onModuleDestroy();});
async function fixture(qualification='IDE',staleUnavailability=false){
 const [n]=await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture','NURSE','test') RETURNING id",[randomUUID()+'@example.invalid']);
 const [r]=await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture','ENTERPRISE','test') RETURNING id",[randomUUID()+'@example.invalid']);
 await db.query("INSERT INTO profile(user_id,display_name,qualifications,rpps_status) VALUES($1,'Fixture',ARRAY['IDE','IADE'],'FOUND')",[n.id]);
 const [o]=await db.query("INSERT INTO organization(kind,name,address,referent,finess) VALUES('ESTABLISHMENT','Fixture','Fixture','Fixture','000000000') RETURNING id");
 await db.query('INSERT INTO membership(user_id,organization_id) VALUES($1,$2)',[r.id,o.id]);
 const [m]=await db.query("INSERT INTO mission(establishment_id,title,description,qualification,service,population,block,required_skills,min_experience_months,start_at,end_at,shift,address,location,hourly_salary,status) VALUES($1,'Profile fixture','Fictional test',$2,'URGENCES','ADULT','NONE',ARRAY['TRIAGE'],12,now()+interval '10 days',now()+interval '10 days 8 hours','DAY','Fixture',ST_SetSRID(ST_MakePoint(2,48),4326)::geography,25,'OPEN') RETURNING *",[o.id,qualification]);
 if(staleUnavailability)await db.query('UPDATE profile SET unavailable=$2 WHERE user_id=$1',[n.id,JSON.stringify([{start:new Date(m.start_at).toISOString(),end:new Date(m.end_at).toISOString()}])]);
 const application=await missions.apply(n.id,m.id,1,randomUUID());
 const assignment=await missions.assign(r.id,m.id,application.id,randomUUID());
 const period={start:new Date(assignment.start_at).toISOString(),end:new Date(assignment.end_at).toISOString()};
 return {n:n.id,r:r.id,m,assignment,period};
}
async function payload(n:string):Promise<ProfileDto>{
 const [p]=await db.query('SELECT * FROM profile WHERE user_id=$1',[n]);
 return {displayName:p.display_name,qualifications:p.qualifications,skills:p.skills,experience:p.experience,available:p.available,unavailable:p.unavailable,latitude:p.latitude,longitude:p.longitude,radiusKm:p.radius_km,acceptedShifts:p.accepted_shifts,preferredShifts:p.preferred_shifts,visible:p.visible,details:p.details};
}
const incompatible=(e:any)=>e.getStatus()===409&&e.getResponse().code==='ACTIVE_ASSIGNMENT_INCOMPATIBLE';
test('incomplete confirmed nurse can edit a different day, save unchanged profile and improve partially',async()=>{
 const f=await fixture();
 const elsewhere={start:new Date(Date.parse(f.period.start)+2*86400000).toISOString(),end:new Date(Date.parse(f.period.end)+2*86400000).toISOString()};
 await profiles.changeAvailability(f.n,{changes:[{...elsewhere,state:'available'}]});
 await profiles.update(f.n,await payload(f.n));
 const partial=await payload(f.n);partial.skills=['TRIAGE'];partial.radiusKm=25;
 await profiles.update(f.n,partial);
 assert.equal((await db.query('SELECT status FROM assignment WHERE id=$1',[f.assignment.id]))[0].status,'ACTIVE');
 assert.equal((await payload(f.n)).available.length,1);
 assert.deepEqual((await payload(f.n)).skills,['TRIAGE']);
});
test('new unavailability on a confirmed slot fails for PATCH and full profile without changing stored data',async()=>{
 const f=await fixture();
 await assert.rejects(profiles.changeAvailability(f.n,{changes:[{...f.period,state:'unavailable'}]}),incompatible);
 const full=await payload(f.n);full.unavailable=[f.period];
 await assert.rejects(profiles.update(f.n,full),incompatible);
 assert.deepEqual((await payload(f.n)).unavailable,[]);
});
test('partial availability improvement is permitted but later withdrawal inside the commitment is rejected',async()=>{
 const f=await fixture();const half={start:f.period.start,end:new Date(Date.parse(f.period.start)+4*3600000).toISOString()};
 await profiles.changeAvailability(f.n,{changes:[{...half,state:'available'}]});
 await assert.rejects(profiles.changeAvailability(f.n,{changes:[{...half,state:'unset'}]}),incompatible);
 const full=await payload(f.n);full.available=[];await assert.rejects(profiles.update(f.n,full),incompatible);
 assert.deepEqual((await payload(f.n)).available,[half]);
});
test('stale unavailability can remain unchanged or be repaired after manual confirmation',async()=>{
 const f=await fixture('IDE',true);
 await profiles.update(f.n,await payload(f.n));
 await profiles.changeAvailability(f.n,{changes:[{...f.period,state:'unset'}]});
 assert.deepEqual((await payload(f.n)).unavailable,[]);
});
test('required qualification remains protected and cancelled assignments no longer lock their dates',async()=>{
 const f=await fixture('IADE');const full=await payload(f.n);full.qualifications=['IDE'];
 await assert.rejects(profiles.update(f.n,full),(e:any)=>incompatible(e)&&e.getResponse().reasons.includes('QUALIFICATION_MISSING'));
 await missions.cancelAssignment(f.n,f.assignment.id,randomUUID());
 await profiles.update(f.n,full);
 await profiles.changeAvailability(f.n,{changes:[{...f.period,state:'unavailable'}]});
 assert.deepEqual((await payload(f.n)).qualifications,['IDE']);
});
test('profile changes do not unlock overlapping confirmed assignments',async()=>{
 const f=await fixture();await profiles.update(f.n,await payload(f.n));
 const [other]=await db.query("INSERT INTO mission(establishment_id,title,description,qualification,service,population,block,start_at,end_at,shift,address,location,hourly_salary,status) SELECT establishment_id,'Conflicting mission',description,qualification,service,population,block,start_at,end_at,shift,address,location,hourly_salary,'OPEN' FROM mission WHERE id=$1 RETURNING id",[f.m.id]);
 await assert.rejects(missions.apply(f.n,other.id,1,randomUUID()),(e:any)=>e.getStatus()===409&&e.getResponse().reasons.includes('ASSIGNMENT_CONFLICT'));
});
test('API profile update rejects reversed diploma chronology without persisting it',async()=>{
 const f=await fixture();const full=await payload(f.n);full.details={ideDiplomaYear:2020,iadeDiplomaYear:2019};
 await assert.rejects(profiles.update(f.n,full),(e:any)=>e.getStatus()===400&&e.message.includes('cannot precede'));
 assert.equal((await payload(f.n)).details?.iadeDiplomaYear,undefined);
});
