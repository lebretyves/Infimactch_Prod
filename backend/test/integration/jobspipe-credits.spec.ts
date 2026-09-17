import 'reflect-metadata';
import { before,after,test } from 'node:test';
import assert from 'node:assert/strict';
import { Database } from '../../src/database/database';
import { jobsPipeCreditStore } from '../../src/public-data/jobspipe-collection';
let db:Database;
before(async()=>{const url=new URL(process.env.DATABASE_URL||'http://invalid');if(process.env.NODE_ENV!=='test'||url.hostname!=='127.0.0.1'||url.port!=='55433'||url.pathname!=='/infimatch_test')throw Error('JobsPipe credit tests require isolated local test DB');db=await new Database().connect();});
after(async()=>{await db?.onModuleDestroy();});
async function isolated(work:(client:Database)=>Promise<void>){
 const runner=db.source.createQueryRunner();await runner.connect();
 try{
 await runner.query('CREATE TEMP TABLE jobspipe_request_receipt (LIKE public.jobspipe_request_receipt INCLUDING ALL)');
 const client={query:async(sql:string,params:any[])=>runner.query(sql,params),transaction:async(fn:any)=>{await runner.startTransaction();try{const value=await fn({query:(sql:string,params:any[])=>runner.query(sql,params)});await runner.commitTransaction();return value;}catch(e){await runner.rollbackTransaction();throw e;}}} as Database;
 await work(client);
 }finally{await runner.query('DROP TABLE IF EXISTS pg_temp.jobspipe_request_receipt');await runner.release();}
}
const now=new Date('2030-04-17T10:00:00Z');
test('SQL commits reservations, caps 1000, and survives new store instances without double debit',async()=>isolated(async client=>{
 const a=jobsPipeCreditStore(client);
 assert.equal((await a.reserve('first',now)).status,'READY');
 assert.equal((await jobsPipeCreditStore(client).reserve('first',now)).status,'BUSY');
 const [saved]=await client.query('SELECT charged FROM jobspipe_request_receipt WHERE request_key=$1',['first']);assert.equal(saved.charged,25);
 const page={data:[{id:'example'}],metadata:{next_cursor:null}};
 await a.finish('first',1,page,200);
 const cached=await jobsPipeCreditStore(client).reserve('first',now);assert.equal(cached.status,'CACHED');assert.deepEqual(cached.page,page);
 for(let i=0;i<39;i++)assert.equal((await a.reserve('p'+i,now)).status,'READY');
 assert.equal((await a.reserve('overflow',now)).status,'EXHAUSTED');
 const [total]=await client.query('SELECT sum(charged)::int AS used FROM jobspipe_request_receipt');assert.equal(total.used,976);
 // Releasing one known-free failed request creates enough room for one page.
 await a.finish('p0',0,null,429);assert.equal((await a.reserve('replacement',now)).status,'READY');
 assert.equal((await a.reserve('overflow',now)).status,'EXHAUSTED');
}));
test('SQL full reservations stop at 1000, expired lease can retry same key without extra charge',async()=>isolated(async client=>{
 const a=jobsPipeCreditStore(client);for(let i=0;i<40;i++)assert.equal((await a.reserve('k'+i,now)).status,'READY');
 assert.equal((await a.reserve('extra',now)).status,'EXHAUSTED');
 assert.equal((await a.reserve('k0',new Date(now.getTime()+90001))).status,'READY');
 const [total]=await client.query('SELECT sum(charged)::int AS used FROM jobspipe_request_receipt');assert.equal(total.used,1000);
 assert.equal((await a.reserve('k0',new Date(now.getTime()+23*3600000))).status,'EXPIRED');
}));
test('SQL provider402 blocks other requests for current month only',async()=>isolated(async client=>{
 const a=jobsPipeCreditStore(client);await a.reserve('blocked',now);await a.finish('blocked',0,null,402);
 assert.equal((await a.reserve('another',now)).status,'EXHAUSTED');
 assert.equal((await a.reserve('next-month',new Date('2030-05-01T00:00:00Z'))).status,'READY');
}));
