import 'reflect-metadata';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Database} from '../../src/database/database';
import {RecommendationsController,publicationDate,externalRelevance,compareRecentExternal} from '../../src/listings/recommendations';
import {externalRankingProvenanceSql} from '../../src/public-data/external-ranking';
import {partialOfferMatch} from '../../src/public-data/partial-matching';
import {externalPresentation} from '../../src/public-data/offer-quality';
import {professional} from '../../src/profiles/profile-mapping';
import {listingOrder} from '../../src/listings/listing-order';
let db:Database,actor:string;
before(async()=>{
 const u=new URL(process.env.DATABASE_URL||'http://invalid');
 if(process.env.NODE_ENV!=='test'||u.hostname!=='127.0.0.1'||u.port!=='55433'||u.pathname!=='/infimatch_test')throw Error('Requires isolated local database');
 db=await new Database().connect();await db.source.runMigrations({transaction:'all'});
 const [a]=await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture','NURSE','fixture') RETURNING id",[randomUUID()+'@example.invalid']);actor=a.id;
 await db.query("INSERT INTO profile(user_id,qualifications,skills,experience,available,unavailable,rpps_status,latitude,longitude,radius_km,accepted_shifts,preferred_shifts,details) VALUES($1,ARRAY['IDE'],ARRAY[]::text[],$2,'[]','[]','FOUND',48.85,2.35,30,ARRAY['DAY'],ARRAY[]::text[],$3)",[actor,JSON.stringify([{service:'URGENCES',start:'2020-01-01T00:00:00Z',end:'2025-01-01T00:00:00Z'}]),JSON.stringify({practiceServices:{IDE:['URGENCES']}})]);
 await db.query(`INSERT INTO external_offer(id,source,source_id,title,description,url,location_label,qualification,raw_hash,provenance)
 SELECT ('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,
 CASE WHEN i%2=0 THEN 'FRANCE_TRAVAIL' ELSE 'JOBSPIPE' END,i::text,
 CASE WHEN i%3=0 THEN 'IDE urgences' ELSE 'IDE cardiologie' END,
 repeat('Long provider description ',300),'https://example.invalid/'||i,'Paris','IDE','fixture',
 CASE WHEN i=1 THEN '{}'::jsonb WHEN i=2 THEN '{"facts":null}'::jsonb ELSE
 jsonb_build_object('publishedAt','2026-01-01T00:00:00Z','sourceUpdatedAt','2026-01-02T00:00:00Z','ignored',repeat('provider payload',500),'facts',jsonb_build_object(
 'qualification',CASE WHEN i>500 THEN 'IDE' ELSE 'IBODE' END,'workingTime',CASE WHEN i%5=0 THEN 'Travail de nuit' ELSE 'Travail en journee' END,
 'experience',jsonb_build_object('label',CASE WHEN i%7=0 THEN '2 ANS' ELSE 'Debutant accepte' END),
 'location',jsonb_build_object('coordinates',jsonb_build_object('latitude',CASE WHEN i%11=0 THEN 43.0 ELSE 48.85 END,'longitude',2.35)),
 'warnings',CASE WHEN i%13=0 THEN '["EXPERIENCE_TEXT_REVIEW_REQUIRED","LOCATION_TEXT_REVIEW_REQUIRED"]'::jsonb ELSE '[]'::jsonb END,
 'skills',jsonb_build_array(jsonb_build_object('label',repeat('unused skill ',300)))
 )) END FROM generate_series(1,520) AS i`);
});
after(async()=>{await db?.onModuleDestroy();});
test('compact SQL projection preserves every matching criterion and listing metric across legacy and rich offers',async()=>{
 const [profile]=await db.query('SELECT * FROM profile WHERE user_id=$1',[actor]);
 const rows=await db.query('SELECT title,provenance,'+externalRankingProvenanceSql('provenance')+' AS compact FROM external_offer ORDER BY id');
 const variants=[profile,{...profile,qualifications:[],experience:[],rpps_status:'PENDING',latitude:null,longitude:null,radius_km:null,accepted_shifts:[],details:{}},{...profile,rpps_status:'NOT_FOUND'}];
 for(const row of rows)for(const p of variants){
  const full={...row,id:'fixture',kind:'EXTERNAL_OFFER'},compact={...full,provenance:row.compact},person=professional(p),now='2026-09-23T12:00:00Z';
  assert.deepEqual(partialOfferMatch(compact,person,now),partialOfferMatch(full,person,now));
  assert.deepEqual(listingOrder(compact,person,{} as any,Date.parse(now)),listingOrder(full,person,{} as any,Date.parse(now)));
 }
 assert.ok(Buffer.byteLength(JSON.stringify(rows.map(r=>r.compact)))<Buffer.byteLength(JSON.stringify(rows.map(r=>r.provenance)))*0.1);
});
test('recommendations rank beyond 500 offers and preserve full presentation for the same best three',async(t)=>{
 t.mock.timers.enable({apis:['Date'],now:Date.now()});
 const req={session:{userId:actor,family:'NURSE'}} as any;
 const actual:any=await new RecommendationsController(db,{} as any).recommendations(req,{origine:'externes'});
 assert.equal(actual.external.status,'READY');
 const [profile]=await db.query('SELECT * FROM profile WHERE user_id=$1',[actor]);
 const full=await db.query('SELECT id,source,title,description,url,location_label,qualification,imported_at,expires_at,provenance,parsed_offer FROM external_offer WHERE active AND (expires_at IS NULL OR expires_at>now())');
 const expected=full.map(row=>{const comparison=partialOfferMatch(row,professional(profile),actual.generatedAt);return {...row,id:'e_'+row.id,kind:'EXTERNAL_OFFER',applicationMode:'REDIRECT',eligibility:'INCOMPLETE',profileCorrespondence:comparison,publicationDate:publicationDate(row.provenance?.publishedAt,Date.parse(actual.generatedAt)),importedAt:row.imported_at,sourceUpdatedAt:publicationDate(row.provenance?.sourceUpdatedAt,Date.parse(actual.generatedAt)),relevance:externalRelevance(comparison)};}).sort(compareRecentExternal).slice(0,3).map(({relevance,...item})=>externalPresentation(item));
 assert.deepEqual(actual.external.items,expected);
 assert.ok(actual.external.items.every((x:any)=>Number(x.id.slice(-12))>500));
});
