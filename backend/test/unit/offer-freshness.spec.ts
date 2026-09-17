import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyClosedFranceTravailOffers} from '../../src/public-data/freshness';
const now=new Date('2030-01-02T12:00:00Z');
function fixture(count=3,apply=true){
 const updates:{sql:string;parameters:any[]}[]=[];
 const rows=Array.from({length:count},(_,i)=>({id:'row-'+i,source_id:'FT-'+i,imported_at_snapshot:'2030-01-01 00:00:00.123456+00',raw_hash:'hash-'+i,active:true}));
 return {updates,db:{query:async(sql:string,parameters:any[])=>{if(sql.startsWith('SELECT'))return rows;updates.push({sql,parameters});return apply?[{id:parameters[0]}]:[];}}};
}
test('availability only closes documented detail 204; unexpected statuses remain active',async()=>{
 for(const status of [200,204,301,400,404,410,418,422]){
  const f=fixture(1);const result=await verifyClosedFranceTravailOffers(f.db as any,async id=>{assert.equal(id,'FT-0');return {status};},{now});
  const closed=status===204;
  assert.equal(f.updates[0]!.parameters[4],closed);
  assert.equal(result.closed,closed?1:0);
  assert.equal(result.available,status===200?1:0);
  const metadata=JSON.parse(f.updates[0]!.parameters[5]);
  assert.equal(metadata.verifiedAtMs,status===200?now.getTime():undefined);
 }
});
test('auth, rate limits, network and server outages stop the batch without retiring rows',async()=>{
 for(const status of [401,403,429,500,503,null]){
  const f=fixture();let calls=0;
  const result=await verifyClosedFranceTravailOffers(f.db as any,async()=>{calls++;if(status===null)throw Error('fictional network error');return {status};},{now});
  assert.equal(calls,1);assert.equal(result.closed,0);assert.equal(result.retry,1);assert.equal(result.deferred,2);
  assert.equal(f.updates[0]!.parameters[4],false);
  assert.equal(JSON.parse(f.updates[0]!.parameters[5]).nextCheckAtMs,now.getTime()+3600000);
 }
});
test('reimport snapshot conflicts are skipped and never reported closed',async()=>{
 const f=fixture(1,false),result=await verifyClosedFranceTravailOffers(f.db as any,async()=>({status:204}),{now});
 assert.equal(result.closed,0);assert.equal(result.skipped,1);
 assert.equal(f.updates[0]!.parameters[2],'2030-01-01 00:00:00.123456+00');
 assert.equal(f.updates[0]!.parameters[3],'hash-0');
});
test('invalid bounds are rejected before database or network work',async()=>{
 const db={query:async()=>{throw Error('Unexpected DB call');}};
 for(const limit of [0,101,1.5,NaN])await assert.rejects(verifyClosedFranceTravailOffers(db as any,async()=>({status:200}),{limit}),/INVALID_AVAILABILITY/);
 await assert.rejects(verifyClosedFranceTravailOffers(db as any,async()=>({status:200}),{now:new Date(NaN)}),/INVALID_AVAILABILITY/);
});

test('detail response bodies are released without retaining offer payloads',async()=>{
 const f=fixture(1);let released=0;
 const result=await verifyClosedFranceTravailOffers(f.db as any,async()=>({status:200,body:{cancel:async()=>{released++;}}}),{now});
 assert.equal(released,1);assert.equal(result.available,1);
});

test('cycle cutoff is passed explicitly and invalid dates fail before acquisition',async()=>{
 let parameters:any[]=[];const db={query:async(_sql:string,args:any[])=>{parameters=args;return [];}};
 const cutoff=new Date('2030-01-02T00:00:00Z');await verifyClosedFranceTravailOffers(db as any,async()=>{throw Error('Unexpected network');},{now,notImportedSince:cutoff});assert.equal(parameters[4],cutoff.toISOString());
 await verifyClosedFranceTravailOffers(db as any,async()=>({status:200}),{now});assert.equal(parameters[4],null);
 await assert.rejects(verifyClosedFranceTravailOffers(db as any,async()=>({status:200}),{notImportedSince:new Date(NaN)}),/INVALID_AVAILABILITY/);
});
