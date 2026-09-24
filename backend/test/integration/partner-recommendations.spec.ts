import 'reflect-metadata';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Database} from '../../src/database/database';
import {RecommendationsController} from '../../src/listings/recommendations';
let db:Database,actor:string;
const id=(i:number)=>'00000000-0000-4000-9000-'+String(i).padStart(12,'0');
before(async()=>{
 const u=new URL(process.env.DATABASE_URL||'http://invalid');
 if(process.env.NODE_ENV!=='test'||u.hostname!=='127.0.0.1'||u.port!=='55433'||u.pathname!=='/infimatch_test')throw Error('Requires isolated local database');
 db=await new Database().connect();await db.source.runMigrations({transaction:'all'});
 const [a]=await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture','NURSE','fixture') RETURNING id",[randomUUID()+'@example.invalid']);actor=a.id;
 await db.query("INSERT INTO profile(user_id,qualifications,latitude,longitude,radius_km,accepted_shifts) VALUES($1,ARRAY['IDE'],48,2,30,ARRAY['DAY'])",[actor]);
 const [org]=await db.query("INSERT INTO organization(kind,name,address,referent,finess) VALUES('ESTABLISHMENT','Fictional ranking','Fixture','Fixture','000000000') RETURNING id");
 await db.query(`INSERT INTO mission(id,establishment_id,title,description,qualification,service,population,block,start_at,end_at,shift,address,location,hourly_salary,status)
 SELECT ('00000000-0000-4000-9000-'||lpad(i::text,12,'0'))::uuid,$1,'Fixture','Fixture',CASE WHEN i=107 THEN 'IADE' ELSE 'IDE' END,'URGENCES','ADULT','NONE',
 CASE WHEN i=108 THEN now()-interval '2 days' ELSE now()+interval '10 days' END,
 CASE WHEN i=108 THEN now()-interval '1 day' ELSE now()+interval '10 days 8 hours' END,
 'DAY','Fixture',ST_SetSRID(ST_MakePoint(CASE WHEN i<=102 THEN 2.3 ELSE 2 END,48),4326)::geography,25,CASE WHEN i=106 THEN 'DRAFT' ELSE 'OPEN' END FROM generate_series(1,108) i`,[org.id]);
});
after(async()=>{await db?.onModuleDestroy();});
test('real PostgreSQL selects three best indicative partners across batches while excluding closed past and wrong qualification',async()=>{
 const r:any=await new RecommendationsController(db).recommendations({session:{userId:actor}} as any,{origine:'partenaires'});
 assert.equal(r.internal.status,'READY');assert.equal(r.internal.personalization,'INDICATIVE');
 assert.deepEqual(r.internal.items.map((m:any)=>m.id),[103,104,105].map(i=>'m_'+id(i)));
 assert.ok(r.internal.items.every((m:any)=>m.matching_score<100&&!m.matching_eligible&&m.matching_reasons.includes('NOT_FULLY_AVAILABLE')));
 assert.equal((await db.query("SELECT count(*)::int AS n FROM audit WHERE event='MATCHING_HISTORY_UNAVAILABLE'"))[0].n,0);
});
test('inactive account cannot read recommendations',async()=>{
 await db.query('UPDATE account SET active=false WHERE id=$1',[actor]);
 await assert.rejects(new RecommendationsController(db).recommendations({session:{userId:actor}} as any,{}),(e:any)=>e.getStatus()===404);
});
