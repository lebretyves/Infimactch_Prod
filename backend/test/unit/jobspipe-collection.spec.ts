import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advanceJobsPipeCollection, verifyJobsPipeOffers, jobsPipeCreditStore, CreditStore, JobsPipePage } from '../../src/public-data/jobspipe-collection';
import { Database } from '../../src/database/database';
const db = {} as Database, now = new Date('2026-09-17T12:00:00Z');
function memory() {
 const cache = new Map<string,JobsPipePage>(), charges:number[] = [];
 const store: CreditStore = { reserve:async key=>cache.has(key)?{status:'CACHED',page:cache.get(key)}:{status:'READY'},finish:async(key,cost,page)=>{charges.push(cost);if(page)cache.set(key,page)} };
 return {store,charges};
}
function transport(body: unknown, status=200): typeof fetch {return async()=>new Response(JSON.stringify(body),{status}) as any;}
test('JobsPipe durable pagination, validation and budget',async t=>{
 const old=process.env.JOBSPIPE_API_KEY;process.env.JOBSPIPE_API_KEY='fixture-only';
 try {
 await t.test('first-page crash reuses stable receipt and does not fetch or charge twice',async()=>{
 const {store,charges}=memory();let calls=0;
 const fetcher:typeof fetch=async(_url,opts)=>{calls++;const body=JSON.parse(String(opts?.body));assert.equal(body.limit,25);assert.equal(body.status,'active');assert.ok(new Headers(opts?.headers).get('Idempotency-Key'));return new Response(JSON.stringify({data:[{id:'a'}],metadata:{next_cursor:'cursor-a'}}))};
 const a=await advanceJobsPipeCollection(db,null,{now,creditStore:store,transport:fetcher});
 const replay=await advanceJobsPipeCollection(db,null,{now,creditStore:store,transport:fetcher});
 assert.equal(a.status,'CONTINUE');assert.equal(replay.state.cycleId,a.state.cycleId);assert.equal(calls,1);assert.deepEqual(charges,[1]);
 const b=await advanceJobsPipeCollection(db,a.state,{now,creditStore:store,transport:transport({data:[{id:'a'},{id:'b'}],metadata:{next_cursor:null}})});
 assert.equal(b.status,'CONTINUE');assert.deepEqual(b.rows.map(r=>r.id),['b']);assert.equal(b.state.seenIds.length,2);
 const c=await advanceJobsPipeCollection(db,b.state,{now,creditStore:store,transport:transport({data:[{id:'a'},{id:'c'}],metadata:{next_cursor:null}})});assert.equal(c.status,'COMPLETE');assert.deepEqual(c.rows.map(r=>r.id),['c']);
 });
 await t.test('repeated cursor and missing cursor metadata never claim completion',async()=>{
 for(const second of [{data:[{id:'b'}],metadata:{next_cursor:'same'}},{data:[{id:'b'}],metadata:{}}]){
 const {store}=memory();const a=await advanceJobsPipeCollection(db,null,{now,creditStore:store,transport:transport({data:[{id:'a'}],metadata:{next_cursor:'same'}})});
 const b=await advanceJobsPipeCollection(db,a.state,{now,creditStore:store,transport:transport(second)});assert.equal(b.status,'INCOMPLETE');assert.equal(b.coverage.complete,false);
 }
 });
 await t.test('monthly quota does not call provider and suspends until UTC reset',async()=>{
 const store:CreditStore={reserve:async()=>({status:'EXHAUSTED'}),finish:async()=>assert.fail('no finish')};
 const a=await advanceJobsPipeCollection(db,null,{now,creditStore:store,transport:async()=>{throw Error('must not fetch')}});assert.equal(a.status,'QUOTA_EXHAUSTED');assert.equal(a.state.retryAt,'2026-10-01T00:00:00.000Z');
 });
 await t.test('HTTP errors retain conservative costs and correct statuses',async()=>{
 for(const [status,expected,cost] of [[401,'AUTH_REQUIRED',0],[402,'QUOTA_EXHAUSTED',0],[429,'RETRY_REQUIRED',0],[400,'INCOMPLETE',1],[500,'RETRY_REQUIRED',25],[504,'RETRY_REQUIRED',0]] as const){
 const {store,charges}=memory();const a=await advanceJobsPipeCollection(db,null,{now,creditStore:store,transport:transport({},status)});assert.equal(a.status,expected);assert.deepEqual(charges,[cost]);}
 });
 await t.test('closure lookup returns only requested records and never closes missing IDs',async()=>{
 const {store,charges}=memory();const a=await verifyJobsPipeOffers(db,['a','b'],{requestId:'check-1',now,creditStore:store,transport:async(_url,opts)=>{assert.equal(JSON.parse(String(opts?.body)).status,'any');return new Response(JSON.stringify({data:[{id:'a',status:'closed'}],metadata:{next_cursor:null}}))}});assert.equal(a.rows[0].status,'closed');assert.equal(a.missingMeansClosed,false);assert.deepEqual(charges,[1]);
 });
 await t.test('uncertain network keeps full reservation and identical retry key',async()=>{
 const {store,charges}=memory();const keys:string[]=[];
 const fail:typeof fetch=async(_u,opts)=>{keys.push(new Headers(opts?.headers).get('Idempotency-Key')!);throw Error('offline')};
 const a=await advanceJobsPipeCollection(db,null,{now,creditStore:store,transport:fail});
 const b=await advanceJobsPipeCollection(db,a.state,{now:new Date(now.getTime()+300001),creditStore:store,transport:fail});
 assert.equal(a.status,'RETRY_REQUIRED');assert.equal(b.status,'RETRY_REQUIRED');assert.deepEqual(charges,[25,25]);assert.equal(keys[0],keys[1]);
 });
 await t.test('SQL receipt cache survives restart, expired reservation does not refetch',async()=>{
 for(const [prior,expected] of [[{state:'SUCCESS',response:{data:[],metadata:{next_cursor:null}}},'CACHED'],[{state:'RESERVED',charged:25,budget_month:'2026-09-01',created_at:'2026-09-16T11:00:00Z'},'EXPIRED']] as const){
 const fake={transaction:async(fn:any)=>fn({query:async(sql:string)=>sql.includes('budget_month::text')?[prior]:[]})} as Database;
 assert.equal((await jobsPipeCreditStore(fake).reserve('x',now)).status,expected);
 }
 });
 await t.test('manual reset changes failed cycle; automatic never blindly resets',async()=>{
 const {store}=memory();const first=await advanceJobsPipeCollection(db,null,{now,creditStore:store,transport:transport({},400)});
 const later=new Date(now.getTime()+300001);
 const auto=await advanceJobsPipeCollection(db,first.state,{now:later,creditStore:store,transport:async()=>{throw Error('must not call')}});assert.equal(auto.status,'INCOMPLETE');
 const manual=await advanceJobsPipeCollection(db,first.state,{manual:true,now,creditStore:store,transport:transport({data:[{id:'fixed'}],metadata:{next_cursor:null}})});
 assert.equal(manual.status,'CONTINUE');assert.notEqual(manual.state.cycleId,first.state.cycleId);
 const replay=await advanceJobsPipeCollection(db,first.state,{manual:true,now,creditStore:store,transport:async()=>{throw Error('cached')}});assert.equal(replay.status,'CONTINUE');assert.equal(replay.state.cycleId,manual.state.cycleId);
 });
 await t.test('daily discovery watermark advances only after both queries and resets monthly',async()=>{
 const {store}=memory();const fetcher=transport({data:[],metadata:{next_cursor:null}});
 const a=await advanceJobsPipeCollection(db,null,{now,creditStore:store,transport:fetcher});
 const b=await advanceJobsPipeCollection(db,a.state,{now,creditStore:store,transport:fetcher});assert.equal(b.status,'COMPLETE');
 for(const [date,delta] of [['2026-09-18T12:00:00Z',true],['2026-10-01T12:00:00Z',false]] as const){
  const c=await advanceJobsPipeCollection(db,b.state,{now:new Date(date),creditStore:memory().store,transport:async(_url,opts)=>{
   const body=JSON.parse(String(opts?.body));assert.equal(Boolean(body.discovered_at_gte),delta);return new Response(JSON.stringify({data:[],metadata:{next_cursor:null}}));
  }});assert.equal(Boolean(c.state.discoveredAfter),delta);
 }
 });
 await t.test('SQL reservation rejects over quota before insert',async()=>{
 let inserts=0;const fake={transaction:async(fn:any)=>fn({query:async(sql:string)=>{if(sql.includes('sum(charged)'))return[{used:990}];if(sql.startsWith('INSERT'))inserts++;return[]}})} as Database;
 assert.equal((await jobsPipeCreditStore(fake).reserve('x',now)).status,'EXHAUSTED');assert.equal(inserts,0);
 });
 }finally{if(old===undefined)delete process.env.JOBSPIPE_API_KEY;else process.env.JOBSPIPE_API_KEY=old;}
});
