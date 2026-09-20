import 'reflect-metadata';
import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Client} from 'pg';
import {Database,type SqlClient} from '../../src/database/database';
import {advanceFranceTravailCollection,newFtCollection,type FtCollectionState} from '../../src/public-data/france-travail-collection';
import {FranceTravailClient,type FtQuery} from '../../src/public-data/france-travail-client';
import {importOffers} from '../../src/public-data/offers';

before(()=>{const url=new URL(process.env.DATABASE_URL||'http://invalid');if(process.env.NODE_ENV!=='test'||url.hostname!=='127.0.0.1'||url.port!=='55433'||url.pathname!=='/infimatch_test')throw Error('Collection integration tests require the isolated local test database');});
async function isolated(work:(db:Database,sql:SqlClient)=>Promise<void>){
 const connection=new Client({connectionString:process.env.DATABASE_URL});await connection.connect();
 try{
  // Dedicated connection and temporary tables keep concurrent journey fixtures
  // untouched. INCLUDING ALL retains the real source/source_id unique index.
  await connection.query('CREATE TEMP TABLE external_offer (LIKE public.external_offer INCLUDING ALL)');
  await connection.query('CREATE TEMP TABLE import_run (LIKE public.import_run INCLUDING ALL)');
  await connection.query('CREATE TEMP TABLE source_control(provider text PRIMARY KEY,collection_state jsonb)');
  const sql:SqlClient={query:async(statement,parameters=[])=>{const result=await connection.query(statement,parameters);return result.rows;}};
  let depth=0;
  const scoped={query:sql.query,transaction:async<T>(work:(client:SqlClient)=>Promise<T>):Promise<T>=>{
   if(depth)return work(sql);
   await connection.query('BEGIN');depth++;
   try{const result=await work(sql);await connection.query('COMMIT');return result;}
   catch(error){await connection.query('ROLLBACK');throw error;}
   finally{depth--;}
  }} as unknown as Database;
  await work(scoped,sql);
 }finally{await connection.end();}
}
function oneQuery(){const state=newFtCollection();state.queue=[{...state.queue[0]!,keyword:'infirmier',start:0}];return state;}
function offer(){return {id:'fixture-'+randomUUID(),intitule:'IDE interim fictif',description:'Mission fictive de remplacement infirmier en interim.',typeContrat:'MIS',dateCreation:'2026-01-01T12:00:00Z',dateActualisation:'2026-01-02T12:00:00Z',lieuTravail:{libelle:'Paris',commune:'75056',latitude:'48.8566',longitude:'2.3522'}};}
function pageClient(first:any[],second?:any[]){const starts:number[]=[];const client={search:async(query:FtQuery,limit:number)=>{assert.equal(limit,150);starts.push(query.start);if(query.start===0)return {rows:first,total:second?first.length+second.length:first.length,next:second?first.length:null};assert.equal(query.start,first.length);assert.ok(second);return {rows:second,total:first.length+second.length,next:null};}} as unknown as FranceTravailClient;return {client,starts};}
async function checkpoint(sql:SqlClient,state:FtCollectionState){await sql.query("INSERT INTO source_control(provider,collection_state) VALUES('FRANCE_TRAVAIL',$1) ON CONFLICT(provider) DO UPDATE SET collection_state=EXCLUDED.collection_state",[JSON.stringify(state)]);}

test('FT collection commits one page at a time, deduplicates pages and retains numeric-string coordinates',async()=>isolated(async(db,sql)=>{
 const a=offer(),b=offer(),c=offer(),initial=oneQuery(),fake=pageClient([a,b],[b,c]);
 const previousFetch=globalThis.fetch;let network=0;globalThis.fetch=(async()=>{network++;throw Error('Unexpected geocoding/network for provider coordinates');}) as typeof fetch;
 try{
  const first=await db.transaction(async()=>{const result=await advanceFranceTravailCollection(db,initial,fake.client);await checkpoint(sql,result.state);return result;});
  assert.equal(first.status,'IN_PROGRESS');assert.equal(first.state.phase,'IN_PROGRESS');assert.equal(first.state.seen.length,2);assert.equal(first.state.pages,1);assert.equal(first.accepted,2);assert.equal(first.state.queue[0]!.start,2);
  assert.equal(initial.pages,0);assert.deepEqual(initial.seen,[]);
  const second=await db.transaction(async()=>{const result=await advanceFranceTravailCollection(db,first.state,fake.client);await checkpoint(sql,result.state);return result;});
  assert.equal(second.status,'SUCCESS');assert.equal(second.state.phase,'COMPLETE');assert.equal(second.state.seen.length,3);assert.equal(second.state.pages,2);assert.equal(second.state.accepted,3);assert.equal(second.accepted,1);assert.equal(second.state.queue.length,0);assert.deepEqual(fake.starts,[0,2]);
  const rows=await sql.query('SELECT source_id,provenance FROM external_offer ORDER BY source_id');assert.equal(rows.length,3);assert.equal(new Set(rows.map(row=>row.source_id)).size,3);
  for(const row of rows){assert.deepEqual(row.provenance.facts.location.coordinates,{latitude:48.8566,longitude:2.3522});assert.equal(row.provenance.facts.location.precision,'PROVIDER_COORDINATES_UNVERIFIED');}
  assert.equal(a.lieuTravail.latitude,'48.8566');assert.equal(a.lieuTravail.longitude,'2.3522');assert.equal(network,0);
  const [saved]=await sql.query("SELECT collection_state FROM source_control WHERE provider='FRANCE_TRAVAIL'");assert.equal(saved.collection_state.phase,'COMPLETE');assert.equal(saved.collection_state.seen.length,3);
  // Replaying an already collected page updates the same source keys, not rows.
  await advanceFranceTravailCollection(db,initial,fake.client);assert.equal((await sql.query('SELECT id FROM external_offer')).length,3);
  const done=await advanceFranceTravailCollection(db,second.state,fake.client);assert.equal(done.status,'UP_TO_DATE');assert.deepEqual(fake.starts,[0,2,0]);
 }finally{globalThis.fetch=previousFetch;}
}));

test('failure after advancing a page rolls back offers, import receipt and caller checkpoint together',async()=>isolated(async(db,sql)=>{
 const initial=oneQuery(),fake=pageClient([offer(),offer()]);await checkpoint(sql,initial);
 await assert.rejects(db.transaction(async()=>{
  const result=await advanceFranceTravailCollection(db,initial,fake.client);assert.equal(result.status,'SUCCESS');
  await checkpoint(sql,result.state);assert.equal((await sql.query('SELECT id FROM external_offer')).length,2);
  throw Error('Simulated caller failure before transaction commit');
 }),/Simulated caller failure/);
 assert.equal((await sql.query('SELECT id FROM external_offer')).length,0);assert.equal((await sql.query('SELECT id FROM import_run')).length,0);
 const [saved]=await sql.query("SELECT collection_state FROM source_control WHERE provider='FRANCE_TRAVAIL'");assert.deepEqual(saved.collection_state,initial);assert.equal(initial.pages,0);
}));

test('a stale search reimport preserves provider closure and availability metadata even after a failed recheck',async()=>isolated(async(db,sql)=>{
 const raw=offer();await importOffers(db,[raw],false);
 const availabilityCheck={status:'RETRY_REQUIRED',httpStatus:503,closedAtMs:Date.now()-1000,checkedAtMs:Date.now(),nextCheckAtMs:Date.now()+3600000};
 await sql.query("UPDATE external_offer SET active=false,provenance=provenance||$2::jsonb WHERE source_id=$1",[raw.id,JSON.stringify({retiredReason:'PROVIDER_CLOSED',availabilityCheck})]);
 await importOffers(db,[{...raw,intitule:'IDE interim fictif republication index'}],false);
 const rows=await sql.query('SELECT active,provenance,title FROM external_offer WHERE source_id=$1',[raw.id]);assert.equal(rows.length,1);assert.equal(rows[0].active,false);assert.equal(rows[0].provenance.retiredReason,'PROVIDER_CLOSED');assert.deepEqual(rows[0].provenance.availabilityCheck,availabilityCheck);assert.equal(rows[0].title,'IDE interim fictif republication index');
}));

test('national import batches 151 offers and repeated import retains unique IDs',async()=>isolated(async(db,sql)=>{
 const rows=Array.from({length:151},()=>offer());
 const first=await importOffers(db,rows,false);assert.equal(first.accepted,151);
 assert.equal((await sql.query('SELECT count(*)::int AS n FROM external_offer'))[0].n,151);
 await importOffers(db,rows,false);
 assert.equal((await sql.query('SELECT count(*)::int AS n FROM external_offer'))[0].n,151);
}));

test('unchanged imports reuse parser output; changed input and parser upgrades rebuild it',async()=>isolated(async(db,sql)=>{
 const raw=offer();await importOffers(db,[raw],false);
 await sql.query("UPDATE external_offer SET parsed_offer=parsed_offer||'{\"cacheProbe\":true}'::jsonb WHERE source_id=$1",[raw.id]);
 await importOffers(db,[raw],false);
 let [row]=await sql.query('SELECT parsed_offer FROM external_offer WHERE source_id=$1',[raw.id]);assert.equal(row.parsed_offer.cacheProbe,true);
 await importOffers(db,[{...raw,description:raw.description+' Horaire de nuit.'}],false);
 [row]=await sql.query('SELECT parsed_offer FROM external_offer WHERE source_id=$1',[raw.id]);assert.equal(row.parsed_offer.cacheProbe,undefined);
 await sql.query("UPDATE external_offer SET parsed_offer=parsed_offer||'{\"parserVersion\":\"obsolete\",\"cacheProbe\":true}'::jsonb WHERE source_id=$1",[raw.id]);
 await importOffers(db,[raw],false);
 [row]=await sql.query('SELECT parsed_offer FROM external_offer WHERE source_id=$1',[raw.id]);assert.notEqual(row.parsed_offer.parserVersion,'obsolete');assert.equal(row.parsed_offer.cacheProbe,undefined);
}));

test('malformed provider dates persist as null and valid ISO dates survive import and replay',async()=>isolated(async(db,sql)=>{
 const invalid={...offer(),dateCreation:'date mal formée',dateActualisation:'2026-02-30T12:00:00Z'};
 const valid={...offer(),dateCreation:'2026-09-19T09:30:00+02:00',dateActualisation:'2026-09-19T08:15:25Z'};
 const first=await importOffers(db,[invalid,valid],false);
 assert.equal(first.accepted,2);assert.deepEqual(first.rejected,[]);
 const rows=await sql.query('SELECT source_id,provenance FROM external_offer WHERE source_id=ANY($1::text[])',[[invalid.id,valid.id]]);
 const bad=rows.find(row=>row.source_id===invalid.id),good=rows.find(row=>row.source_id===valid.id);
 assert.equal(bad.provenance.publishedAt,null);assert.equal(bad.provenance.sourceUpdatedAt,null);
 assert.equal(good.provenance.publishedAt,'2026-09-19T07:30:00.000Z');assert.equal(good.provenance.sourceUpdatedAt,'2026-09-19T08:15:25.000Z');
 const replay=await importOffers(db,[invalid,valid],false);assert.equal(replay.accepted,2);
 assert.equal((await sql.query('SELECT count(*)::int AS n FROM external_offer'))[0].n,2);
}));
