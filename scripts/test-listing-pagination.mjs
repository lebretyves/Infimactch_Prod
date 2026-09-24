import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { withRole, request, validateSecrets } from './vault/common.mjs';
const require = createRequire(import.meta.url);
require('reflect-metadata');
const { Client } = require('pg');
const { plainToInstance } = require('class-transformer');
const { validateSync } = require('class-validator');
const { listingPageQuery } = require('../backend/dist/listings/listing-page');
const { ListingsModule } = require('../backend/dist/listings/listings.module');
const { ExternalListingsDto, SearchDto } = require('../backend/dist/listings/search');
const connectionString = await withRole('backend', async token => validateSecrets((await request('kv/data/infimatch/v1/backend',{token})).data.data,'backend').DATABASE_URL);
const client = new Client({ connectionString });
const checks=[];
const check = async (label, fn) => { await fn(); checks.push(label); console.log('PASS '+label); };
try {
 await client.connect();
 await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const source = "SELECT n::text AS listing_id,'2026-09-16'::timestamp AS listed_at,jsonb_build_object('id',n,'title',CASE WHEN n=41 THEN 'Infirmier spécial 100%_fin' ELSE 'Infirmier' END,'location_label',CASE WHEN n=41 THEN 'Lyon' ELSE 'Paris' END) AS data FROM generate_series(1,41) n";
 const page = async params => { const q=listingPageQuery(source,[],params); return (await client.query(q.sql,q.parameters)).rows[0]; };
 await check('Exact total, 20 first items and stable unique ordering', async()=>{
  const a=await page({limit:20}),b=await page({limit:20,offset:20}),c=await page({limit:20,offset:40});
  assert.equal(a.total,41);assert.equal(b.total,41);assert.equal(c.total,41);
  assert.equal(a.items.length,20);assert.equal(b.items.length,20);assert.equal(c.items.length,1);
  assert.equal(new Set([...a.items,...b.items,...c.items].map(x=>x.id)).size,41);
 });
 await check('Out-of-range page retains exact total',async()=>assert.deepEqual(await page({offset:60}),{total:41,items:[]}));
 await check('Global case-insensitive location search before pagination',async()=>{const r=await page({q:'  lYoN  '});assert.equal(r.total,1);assert.equal(r.items[0].id,41)});
 await check('No result returns zero and empty array',async()=>assert.deepEqual(await page({q:'introuvable'}),{total:0,items:[]}));
 await check('Empty query does not filter',async()=>assert.equal((await page({q:'  '})).total,41));
 await check('Percent and underscore are literal text',async()=>assert.equal((await page({q:'%_'})).total,1));
 await check('SQL-like input cannot alter query',async()=>assert.deepEqual(await page({q:"' OR true --"}),{total:0,items:[]}));
 await check('Existing parameter positions are preserved',async()=>{const q=listingPageQuery(source+' WHERE n>$1',[40],{q:'Lyon',limit:1});assert.equal((await client.query(q.sql,q.parameters)).rows[0].total,1)});
 await check('HTTP query DTO accepts numeric strings and search',()=>assert.equal(validateSync(plainToInstance(ExternalListingsDto,{limit:'20',offset:'40',q:'Paris'})).length,0));
 await check('Invalid search and offsets rejected by DTOs',()=>{
  for(const value of [{q:1},{q:'a'.repeat(151)},{limit:51},{offset:-1}]) assert.ok(validateSync(plainToInstance(ExternalListingsDto,value)).length);
  assert.ok(validateSync(plainToInstance(SearchDto,{qualifications:['IDE'],q:'a'.repeat(151)})).length);
 });
 const Controller=Reflect.getMetadata('controllers',ListingsModule)[0];
 const controller=new Controller({query:async(sql,params)=> (await client.query(sql,params)).rows});
 await check('Real external route returns matching count and page',async()=>{
  const actual=await controller.external(plainToInstance(ExternalListingsDto,{}));
  const expected=(await client.query('SELECT count(*)::int total FROM external_offer WHERE active AND (expires_at IS NULL OR expires_at>now())')).rows[0].total;
  assert.equal(actual.total,expected);assert.equal(actual.limit,20);assert.equal(actual.offset,0);assert.equal(actual.items.length,Math.min(expected,20));
 });
 await check('Real external route search and empty distant page',async()=>{
  const actual=await controller.external(plainToInstance(ExternalListingsDto,{q:'Paris',offset:10000}));
  const expected=(await client.query("SELECT count(*)::int total FROM external_offer WHERE active AND (expires_at IS NULL OR expires_at>now()) AND strpos(lower(concat_ws(' ',title,location_label)),lower($1))>0",['Paris'])).rows[0].total;
  assert.equal(actual.total,expected);assert.equal(actual.items.length,0);
 });
 // Profile fixture stays only in memory; the listings query still runs against real PostgreSQL.
 const profile={user_id:'00000000-0000-4000-8000-000000000001',qualifications:['IDE'],skills:[],experience:[],available:[],unavailable:[],rpps_status:'NOT_CHECKED',latitude:48.85,longitude:2.35,radius_km:30,accepted_shifts:[],preferred_shifts:[]};
 const qualifiedController=new Controller({query:async(sql,params)=>sql==='SELECT * FROM profile WHERE user_id=$1'?[profile]:(await client.query(sql,params)).rows});
 const req={session:{userId:profile.user_id,family:'NURSE'}};
 await check('Real qualified search union count respects qualifications',async()=>{
  const r=await qualifiedController.search(req,{qualifications:profile.qualifications,limit:20,offset:0});
  const expected=(await client.query("SELECT (SELECT count(*) FROM mission WHERE status='OPEN' AND qualification=ANY($1))+(SELECT count(*) FROM external_offer WHERE active AND (expires_at IS NULL OR expires_at>now()) AND qualification=ANY($1)) total",[profile.qualifications])).rows[0].total;
  assert.equal(r.total,Number(expected));assert.equal(r.items.length,Math.min(20,r.total));
 });
 await check('Real qualified search retains total beyond last page',async()=>{
  const first=await qualifiedController.search(req,{qualifications:profile.qualifications,q:'Paris'}),last=await qualifiedController.search(req,{qualifications:profile.qualifications,q:'Paris',offset:10000});
  assert.equal(first.total,last.total);assert.equal(last.items.length,0);
 });
 await client.query('ROLLBACK');
 await mkdir('annexe/proofs/missions-pagination',{recursive:true});
 await writeFile('annexe/proofs/missions-pagination/backend-readonly.json',JSON.stringify({at:new Date().toISOString(),checks,scope:'Real PostgreSQL READ ONLY transaction, synthetic SELECT values and existing catalogue; qualified profile fixture only in memory, no persisted fixtures, no account/session changes.'},null,2));
} catch(error) {
 console.error(error.message);process.exitCode=1;
} finally {await client.end();}
