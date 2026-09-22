import {RefreshService} from '../../src/public-data/refresh.service';
import {FranceTravailClient} from '../../src/public-data/france-travail-client';
import {newFtCollection} from '../../src/public-data/france-travail-collection';
import 'reflect-metadata';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Database,type SqlClient} from '../../src/database/database';
import {retireStaleOffers,verifyClosedFranceTravailOffers} from '../../src/public-data/freshness';
let db:Database;
before(async()=>{const url=new URL(process.env.DATABASE_URL||'http://invalid');if(process.env.NODE_ENV!=='test'||url.hostname!=='127.0.0.1'||url.port!=='55433'||url.pathname!=='/infimatch_test')throw Error('Freshness integration tests require the isolated test database');db=await new Database().connect();});
after(async()=>{await db?.onModuleDestroy();});
async function isolated(work:(client:Database,em:SqlClient)=>Promise<void>){await db.transaction(async em=>{
 // Per-connection temporary table isolates these checks from concurrent journey
 // fixtures without changing any public-schema offer.
 await em.query('CREATE TEMP TABLE external_offer (LIKE public.external_offer INCLUDING DEFAULTS) ON COMMIT DROP');
 const client={query:em.query.bind(em),transaction:async(fn:any)=>fn(em)} as unknown as Database;
 await work(client,em);
});}
async function offer(em:SqlClient,id:string,imported="now()",expires="NULL"){
 const [row]=await em.query(`INSERT INTO external_offer(source,source_id,title,description,url,location_label,raw_hash,provenance,imported_at,expires_at) VALUES('FRANCE_TRAVAIL',$1,'Fictional','Fictional','https://example.invalid/offer','Paris','old-hash','{}'::jsonb,${imported},${expires}) RETURNING id`,[id]);return row.id;
}
test('detail closure is conditional on the exact import version, including timestamp microseconds',async()=>isolated(async(client,em)=>{
 const id=await offer(em,'race',"'2030-01-01 00:00:00.123456+00'::timestamptz");
 const result=await verifyClosedFranceTravailOffers(client,async()=>{await em.query("UPDATE external_offer SET imported_at=imported_at+interval '1 microsecond',raw_hash='new-hash' WHERE id=$1",[id]);return {status:204};},{now:new Date('2030-01-02')});
 assert.equal(result.skipped,1);assert.equal(result.closed,0);assert.equal((await em.query('SELECT active FROM external_offer WHERE id=$1',[id]))[0].active,true);
 const closed=await verifyClosedFranceTravailOffers(client,async()=>({status:204}),{now:new Date('2030-01-02')});assert.equal(closed.closed,1);
 const [state]=await em.query('SELECT active,provenance FROM external_offer WHERE id=$1',[id]);assert.equal(state.active,false);assert.equal(state.provenance.retiredReason,'PROVIDER_CLOSED');
 let calls=0;await verifyClosedFranceTravailOffers(client,async()=>{calls++;return {status:200};},{now:new Date('2030-02-02')});assert.equal(calls,0);assert.equal((await em.query('SELECT active FROM external_offer WHERE id=$1',[id]))[0].active,false);
}));
test('failed check retries after its delay; positive detail verification keeps an old import fresh',async()=>isolated(async(client,em)=>{
 const id=await offer(em,'available',"now()-interval '31 days'");const now=new Date();
 await verifyClosedFranceTravailOffers(client,async()=>({status:429}),{now});
 let calls=0;await verifyClosedFranceTravailOffers(client,async()=>{calls++;return {status:204};},{now:new Date(now.getTime()+1000)});assert.equal(calls,0);
 const result=await verifyClosedFranceTravailOffers(client,async()=>({status:200}),{now:new Date(now.getTime()+3600001)});assert.equal(result.available,1);
 await retireStaleOffers(client,true);assert.equal((await em.query('SELECT active FROM external_offer WHERE id=$1',[id]))[0].active,true);
 await em.query("UPDATE external_offer SET expires_at=now()-interval '1 day' WHERE id=$1",[id]);await retireStaleOffers(client,true);
 const [expired]=await em.query('SELECT active,provenance FROM external_offer WHERE id=$1',[id]);assert.equal(expired.active,false);assert.equal(expired.provenance.retiredReason,'OFFER_EXPIRED');
}));
test('malformed legacy check metadata does not crash selection or stale retirement',async()=>isolated(async(client,em)=>{
 const id=await offer(em,'legacy',"now()-interval '31 days'");await em.query("UPDATE external_offer SET provenance=$2 WHERE id=$1",[id,JSON.stringify({availabilityCheck:{nextCheckAtMs:'not a timestamp',verifiedAtMs:'not a timestamp'}})]);
 const result=await verifyClosedFranceTravailOffers(client,async()=>({status:403}));assert.equal(result.retry,1);
 await retireStaleOffers(client,true);const [state]=await em.query('SELECT active,provenance FROM external_offer WHERE id=$1',[id]);assert.equal(state.active,false);assert.equal(state.provenance.retiredReason,'STALE_UNVERIFIED');
}));

test('explicit rechecks can reopen a provider-closed offer only on a current positive detail response',async()=>isolated(async(client,em)=>{
 const id=await offer(em,'reopen');const now=new Date();
 await verifyClosedFranceTravailOffers(client,async()=>({status:204}),{now});
 for(const status of [404,410,403,429,503]){
  await em.query("UPDATE external_offer SET provenance=provenance #- '{availabilityCheck,nextCheckAtMs}' WHERE id=$1",[id]);
  const result=await verifyClosedFranceTravailOffers(client,async()=>({status}),{now,recheckClosed:true});assert.equal(result.reopened,0);assert.equal((await em.query('SELECT active FROM external_offer WHERE id=$1',[id]))[0].active,false);
 }
 await em.query("UPDATE external_offer SET provenance=provenance #- '{availabilityCheck,nextCheckAtMs}' WHERE id=$1",[id]);
 const reopened=await verifyClosedFranceTravailOffers(client,async()=>({status:200}),{now,recheckClosed:true});assert.equal(reopened.reopened,1);
 const [state]=await em.query('SELECT active,provenance FROM external_offer WHERE id=$1',[id]);assert.equal(state.active,true);assert.equal(state.provenance.retiredReason,undefined);
 // Expiration is authoritative even if a later detail check might return200.
 await em.query("UPDATE external_offer SET active=false,expires_at=now()-interval '1 day',provenance=$2 WHERE id=$1",[id,JSON.stringify({retiredReason:'PROVIDER_CLOSED'})]);
 let calls=0;await verifyClosedFranceTravailOffers(client,async()=>{calls++;return {status:200};},{now,recheckClosed:true});assert.equal(calls,0);
}));

test('cycle cutoff checks only unreturned active offers while retaining explicit closed-offer rechecks',async()=>isolated(async(client,em)=>{
 const old=await offer(em,'not-returned',"'2030-01-01T23:59:59Z'::timestamptz");
 const boundary=await offer(em,'at-cycle-start',"'2030-01-02T00:00:00Z'::timestamptz");
 const recent=await offer(em,'returned',"'2030-01-02T12:00:00Z'::timestamptz");
 const closed=await offer(em,'closed-but-indexed',"'2030-01-02T12:00:00Z'::timestamptz");
 await em.query("UPDATE external_offer SET active=false,provenance=$2 WHERE id=$1",[closed,JSON.stringify({retiredReason:'PROVIDER_CLOSED'})]);
 const checked:string[]=[];
 const result=await verifyClosedFranceTravailOffers(client,async id=>{checked.push(id);return {status:200};},{now:new Date('2030-01-03'),notImportedSince:new Date('2030-01-02'),recheckClosed:true});
 assert.deepEqual(checked.sort(),['closed-but-indexed','not-returned']);assert.equal(result.checked,2);assert.equal(result.reopened,1);
 const untouched=await em.query('SELECT id,provenance FROM external_offer WHERE id=ANY($1::uuid[])',[[boundary,recent]]);assert.equal(untouched.length,2);for(const row of untouched)assert.equal(row.provenance.availabilityCheck,undefined);
 assert.equal((await em.query('SELECT active FROM external_offer WHERE id=$1',[old]))[0].active,true);
}));


test('refresh releases catalogue locks before provider detail requests',async()=>{
 const initial=newFtCollection();initial.queue=[{keyword:'infirmier',start:0}];
 await db.query("UPDATE source_control SET enabled=true,last_started_at=NULL,collection_state=$1 WHERE provider='FRANCE_TRAVAIL'",[JSON.stringify(initial)]);
 const stale=await offer(db,'audit-lock-old',"now()-interval '1 day'");
 const search=FranceTravailClient.prototype.search,detail=FranceTravailClient.prototype.detail;let detailCalls=0;
 FranceTravailClient.prototype.search=async()=>({rows:[{id:'audit-lock-new',intitule:'Infirmier IDE en interim',description:'Mission infirmier en interim de demonstration',typeContrat:'MIS',lieuTravail:{libelle:'Paris',latitude:'48.85',longitude:'2.35'}}],total:1,next:null});
 FranceTravailClient.prototype.detail=async()=>{
  detailCalls++;
  // A different connection must be able to lock an offer while provider I/O is in progress.
  await db.transaction(async em=>{await em.query('SELECT id FROM external_offer WHERE id=$1 FOR UPDATE NOWAIT',[stale]);const [lock]=await em.query('SELECT pg_try_advisory_xact_lock(1789380901) acquired');assert.equal(lock.acquired,true);});
  return new Response(null,{status:200});
 };
 try {const result=await new RefreshService(db).run('FRANCE_TRAVAIL',true);assert.equal(result.status,'SUCCESS');assert.equal(result.accepted,1);assert.equal(detailCalls,1);}
 finally {FranceTravailClient.prototype.search=search;FranceTravailClient.prototype.detail=detail;await db.query("DELETE FROM external_offer WHERE source_id IN('audit-lock-old','audit-lock-new')");}
});
