import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RefreshService,providerName} from '../../src/public-data/refresh.service';
test('refresh skips locked, paused and cooling sources before network acquisition',async()=>{
 for(const [locked,enabled,last,status] of [[false,true,null,'BUSY'],[true,false,null,'PAUSED'],[true,true,new Date(),'COOLDOWN']] as const){
  const queries:string[]=[];
  const db={transaction:async(fn:any)=>fn({query:async(sql:string)=>{queries.push(sql);if(sql.includes('pg_try'))return [{acquired:locked}];if(sql.includes('SELECT enabled'))return [{enabled,last_started_at:last}];throw Error('Unexpected mutation');}})};
  assert.equal((await new RefreshService(db as any).run('FRANCE_TRAVAIL')).status,status);
  assert.ok(queries.length<=2);
 }
 assert.throws(()=>providerName('https://untrusted.invalid'));
 assert.equal(providerName('JOBSPIPE'),'JOBSPIPE');
});

test('scheduled batches follow pages, retain page checkpoints and stop on provider errors',async()=>{
 const service=new RefreshService({query:async()=>[]} as any);let calls=0;
 service.run=(async()=>{calls++;return {provider:'FRANCE_TRAVAIL',status:calls<3?'IN_PROGRESS':'SUCCESS',accepted:10};}) as any;
 const done=await service.runBatch('FRANCE_TRAVAIL');assert.equal(calls,3);assert.equal(done.accepted,30);assert.equal(done.status,'SUCCESS');
 calls=0;service.run=(async()=>{calls++;return {provider:'FRANCE_TRAVAIL',status:'IN_PROGRESS',accepted:1};}) as any;
 const bounded=await service.runBatch('FRANCE_TRAVAIL');assert.equal(calls,12);assert.equal(bounded.status,'IN_PROGRESS');
 calls=0;service.run=(async()=>{calls++;return {provider:'FRANCE_TRAVAIL',status:'RETRY_REQUIRED',accepted:0};}) as any;
 await service.runBatch('FRANCE_TRAVAIL');assert.equal(calls,1);
});

test('quota and idle refreshes never run geolocation repair',async()=>{
 const service=new RefreshService({query:async()=>{throw Error('Unexpected geolocation query');}} as any);
 for(const status of ['QUOTA_EXHAUSTED','COOLDOWN','UP_TO_DATE','RETRY_REQUIRED']){
  service.run=(async()=>({provider:'JOBSPIPE',status,accepted:0})) as any;
  assert.equal((await service.runBatch('JOBSPIPE')).geolocation,null);
 }
});
