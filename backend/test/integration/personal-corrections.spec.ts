import 'reflect-metadata';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Database} from '../../src/database/database';
import {PersonalCorrectionsService,PersonalCorrectionsController,AdminPersonalCorrectionsController} from '../../src/profiles/personal-corrections';
import {ProfilesService,ProfileDto} from '../../src/profiles/profiles.module';
let db:Database,service:PersonalCorrectionsService,actor:string;
const base={displayName:'Camille',qualifications:['IDE'],skills:[],experience:[],available:[],unavailable:[],latitude:null,longitude:null,radiusKm:null,acceptedShifts:[],preferredShifts:[],visible:true,details:{firstName:'Camille',lastName:'Test',city:'Paris'}} as ProfileDto;
async function account(){const [a]=await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture','NURSE','fixture') RETURNING id",[randomUUID()+'@example.invalid']);await db.query('INSERT INTO profile(user_id,display_name,details) VALUES($1,$2,$3)',[a.id,base.displayName,JSON.stringify(base.details)]);return a.id;}
before(async()=>{const u=new URL(process.env.DATABASE_URL||'http://invalid');if(process.env.NODE_ENV!=='test'||u.hostname!=='127.0.0.1'||u.port!=='55433'||u.pathname!=='/infimatch_test')throw Error('Requires isolated database');db=await new Database().connect();await db.source.runMigrations({transaction:'all'});service=new PersonalCorrectionsService(db);actor=await account();});
after(async()=>{await db?.onModuleDestroy();});
test('server blocks protected profile writes while accepting professional changes',async()=>{
 const id=await account(),profiles=new ProfilesService(db);
 await assert.rejects(profiles.update(id,{...base,details:{...base.details,city:'Lyon'}}),e=>(e as any).getStatus()===403);
 await assert.rejects(profiles.update(id,{...base,details:{}}),e=>(e as any).getStatus()===403);
 await profiles.update(id,{...base,skills:['TRIAGE']});const [p]=await db.query('SELECT details,skills FROM profile WHERE user_id=$1',[id]);assert.equal(p.details.city,'Paris');assert.deepEqual(p.skills,['TRIAGE']);
});
test('request does not modify profile; owner-only history; approval applies once; rejected requests preserve value',async()=>{
 const id=await account(),other=await account();const r=await service.request(id,{field:'city',value:'Lyon'});
 assert.equal((await db.query('SELECT details FROM profile WHERE user_id=$1',[id]))[0].details.city,'Paris');
 const controller=new PersonalCorrectionsController(db,service);assert.equal((await controller.get({session:{userId:other}} as any)).request,null);
 await assert.rejects(service.request(id,{field:'phone',value:'0600000000'}));
 await assert.rejects(service.decide(actor,r.id,{reason:'Test correction'},true));
 await service.decide(actor,r.id,{reason:'Identité et correction vérifiées',identityVerified:true},true);
 assert.equal((await db.query('SELECT details FROM profile WHERE user_id=$1',[id]))[0].details.city,'Lyon');
 await assert.rejects(service.decide(actor,r.id,{reason:'Duplicate operation',identityVerified:true},true));
 const rejected=await service.request(id,{field:'city',value:'Nice'});await service.decide(actor,rejected.id,{reason:'Informations non confirmées'},false);
 assert.equal((await db.query('SELECT details FROM profile WHERE user_id=$1',[id]))[0].details.city,'Lyon');
});
test('admin permissions and recent reauthentication are mandatory',()=>{
 const c=new AdminPersonalCorrectionsController(db,service);
 for(const req of [{session:{adminId:actor,adminVerifiedAt:Date.now()},adminRole:'AUDITOR'},{session:{adminId:actor,adminVerifiedAt:0},adminRole:'OWNER'}])assert.throws(()=>c.approve(req as any,randomUUID(),{reason:'Verified correction',identityVerified:true}));
});
test('stale values and concurrent duplicate requests are rejected',async()=>{
 const id=await account();const results=await Promise.allSettled([service.request(id,{field:'city',value:'Lyon'}),service.request(id,{field:'city',value:'Nice'})]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
 const r=(results.find(x=>x.status==='fulfilled') as PromiseFulfilledResult<any>).value;await db.query("UPDATE profile SET details=details||'{\"city\":\"Bordeaux\"}'::jsonb WHERE user_id=$1",[id]);
 await assert.rejects(service.decide(actor,r.id,{reason:'Verified correction',identityVerified:true},true));
});
test('email correction checks uniqueness and invalidates sessions; identity correction resets RPPS',async()=>{
 const id=await account(),other=await account(),email=(await db.query('SELECT email FROM account WHERE id=$1',[other]))[0].email;
 const duplicate=await service.request(id,{field:'email',value:email});await assert.rejects(service.decide(actor,duplicate.id,{reason:'Verified correction',identityVerified:true},true));await service.decide(actor,duplicate.id,{reason:'Adresse déjà utilisée'},false);
 const requested=randomUUID()+'@example.invalid',r=await service.request(id,{field:'email',value:requested});const version=(await db.query('SELECT session_version FROM account WHERE id=$1',[id]))[0].session_version;
 await service.decide(actor,r.id,{reason:'Verified correction',identityVerified:true},true);const [a]=await db.query('SELECT email,session_version FROM account WHERE id=$1',[id]);assert.equal(a.email,requested);assert.equal(a.session_version,version+1);
 const name=await service.request(id,{field:'firstName',value:'Alex'});await db.query("UPDATE profile SET rpps_status='FOUND' WHERE user_id=$1",[id]);await service.decide(actor,name.id,{reason:'Verified correction',identityVerified:true},true);const [p]=await db.query('SELECT display_name,details,rpps_status FROM profile WHERE user_id=$1',[id]);assert.equal(p.display_name,'Alex');assert.equal(p.details.firstName,'Alex');assert.equal(p.rpps_status,'NOT_CHECKED');
});
