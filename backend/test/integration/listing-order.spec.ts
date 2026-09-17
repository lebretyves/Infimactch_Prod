import 'reflect-metadata';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Database} from '../../src/database/database';
import {ListingsController} from '../../src/listings/listings.module';
import {SearchDto} from '../../src/listings/search';
let db:Database,controller:ListingsController,actor:string,near:string,far:string,recent:string,unavailable:string;
const request=()=>({session:{userId:actor}} as any);
const search=(extra:Partial<SearchDto>={})=>controller.search(request(),{qualifications:['IDE'],origine:'toutes',sort:'recent',limit:20,offset:0,...extra});
before(async()=>{
 const u=new URL(process.env.DATABASE_URL||'http://invalid');if(process.env.NODE_ENV!=='test'||u.hostname!=='127.0.0.1'||u.port!=='55433'||u.pathname!=='/infimatch_test')throw Error('Requires isolated database');
 db=await new Database().connect();await db.source.runMigrations({transaction:'all'});controller=new ListingsController(db);
 const [account]=await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture','NURSE','fixture') RETURNING id",[randomUUID()+'@example.invalid']);actor=account.id;
 await db.query("INSERT INTO profile(user_id,display_name,qualifications,rpps_status,latitude,longitude,radius_km,accepted_shifts,available) VALUES($1,'Fictional',ARRAY['IDE'],'FOUND',48,2,30,ARRAY['DAY'],$2)",[actor,JSON.stringify([{start:'2037-01-10T08:00:00Z',end:'2037-01-10T16:00:00Z'}])]);
 const [org]=await db.query("INSERT INTO organization(kind,name,address,referent,finess) VALUES('ESTABLISHMENT','Fictional','Fixture','Test','000000000') RETURNING id");
 for(const [name,lon,start,age] of [['near',2,'2037-01-10T08:00:00Z',3],['far',4,'2037-01-10T08:00:00Z',2],['unavailable',2,'2037-01-11T08:00:00Z',4]] as const){
 const [m]=await db.query("INSERT INTO mission(establishment_id,title,description,qualification,service,population,block,start_at,end_at,shift,address,location,hourly_salary,status,created_at) VALUES($1,$2,'Fixture','IDE','URGENCES','ADULT','NONE',$3::timestamptz,$3::timestamptz+interval '8 hours','DAY','Fixture',ST_SetSRID(ST_MakePoint($4,48),4326)::geography,25,'OPEN',now()-$5*interval '1 day') RETURNING id",[org.id,name,start,lon,age]);if(name==='near')near='m_'+m.id;else if(name==='far')far='m_'+m.id;else unavailable='m_'+m.id;
 }
 const [e]=await db.query("INSERT INTO external_offer(source,source_id,title,description,url,location_label,qualification,raw_hash,provenance) VALUES('FRANCE_TRAVAIL','recent','Infirmier récent','Fixture','https://example.invalid','Paris','IDE','fixture',$1) RETURNING id",[JSON.stringify({publishedAt:new Date(Date.now()-3600000).toISOString(),facts:{qualification:'IDE',location:{coordinates:{latitude:48,longitude:2.01}},warnings:[]}})]);recent='e_'+e.id;
 await db.query("INSERT INTO external_offer(source,source_id,title,description,url,location_label,qualification,raw_hash,provenance) SELECT 'FRANCE_TRAVAIL','bulk-'||i,'Infirmier ancien','Fixture','https://example.invalid','Paris','IDE','fixture',jsonb_build_object('publishedAt',to_char(now()-interval '90 days','YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"'),'facts',jsonb_build_object('qualification','IDE','warnings','[]'::jsonb)) FROM generate_series(1,501) i");
 await db.query("INSERT INTO external_offer(source,source_id,title,description,url,location_label,qualification,raw_hash) VALUES('FRANCE_TRAVAIL','unknown','Date inconnue','Fixture','https://example.invalid','Paris','IDE','fixture')");
});
after(async()=>{await db?.onModuleDestroy();});
test('global publication ordering crosses batches, preserves exact total and counts empty pages',async()=>{
 const a=await search({limit:1});assert.equal(a.total,506);assert.equal(a.items[0].id,recent);
 const b=await search({limit:1,offset:1});assert.equal(b.items[0].id,far);
 const empty=await search({offset:1000});assert.equal(empty.total,506);assert.equal(empty.items.length,0);
 const last=await search({offset:505,limit:1});assert.equal(last.items[0].publicationDate,null);
});
test('publication window excludes old offers imported now and unknown publication dates',async()=>{
 const r=await search({publishedWithinDays:1});assert.equal(r.total,1);assert.equal(r.items[0].id,recent);
});
test('distance and profile correspondence apply before pagination across origins',async()=>{
 const r=await search({sort:'distance',latitude:48,longitude:4,limit:1});assert.equal(r.total,506);assert.equal(r.items[0].id,far);assert.equal(r.items[0].distanceKm,0);
 const matched=await search({sort:'relevance',limit:1});assert.equal(matched.items[0].id,near);
 const external=await search({origine:'externes',sort:'relevance',limit:1});assert.equal(external.total,503);assert.equal(external.items[0].matching_score,null);assert.equal(external.items[0].availabilityCompatible,null);
});
test('availability filter uses actual profile schedule and excludes unverified external schedules',async()=>{
 const r=await search({availableOnly:true});assert.equal(r.total,2);assert.deepEqual(new Set(r.items.map((m:any)=>m.id)),new Set([near,far]));assert.ok(r.items.every((m:any)=>m.availabilityCompatible));
 assert.equal((await search({availableOnly:true,origine:'externes'})).total,0);
 await db.query('UPDATE profile SET unavailable=$2 WHERE user_id=$1',[actor,JSON.stringify([{start:'2037-01-10T12:00:00Z',end:'2037-01-10T13:00:00Z'}])]);assert.equal((await search({availableOnly:true})).total,0);
});
test('text and origin filters remain global and use literal bound values',async()=>{
 assert.equal((await search({q:'ancien'})).total,501);assert.equal((await search({q:"%' OR true --"})).total,0);assert.equal((await search({origine:'partenaires'})).total,3);
 const started=await search({origine:'partenaires',sort:'start',limit:3});assert.equal(started.items[2].id,unavailable);
});
test('national-size catalogue is ranked without truncation to the first pages',async()=>{
 await db.query("INSERT INTO external_offer(source,source_id,title,description,url,location_label,qualification,raw_hash,provenance) SELECT 'FRANCE_TRAVAIL','scale-'||i,'Infirmier national','Fixture','https://example.invalid','Paris','IDE','fixture',jsonb_build_object('publishedAt','2020-01-01T00:00:00Z','facts',jsonb_build_object('qualification','IDE','warnings','[]'::jsonb)) FROM generate_series(1,4500) i");
 const began=Date.now(),r=await search({sort:'recent',limit:1});assert.equal(r.total,5006);assert.equal(r.items[0].id,recent);console.log('Global sort over 5,006 fictional offers: '+(Date.now()-began)+' ms on isolated local PostgreSQL.');
});
