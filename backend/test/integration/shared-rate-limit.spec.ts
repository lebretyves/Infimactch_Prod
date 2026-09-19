import 'reflect-metadata';
import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import express from 'express';
import request from 'supertest';
import {type Options,ipKeyGenerator} from 'express-rate-limit';
import {Database} from '../../src/database/database';
import {PostgreSqlRateLimitStore,sharedRateLimit,cleanupSharedRateLimits} from '../../src/security/shared-rate-limit';
let db:Database;
const secret='fictional-shared-rate-limit-test-secret-longer-than-32';
before(async()=>{
 const u=new URL(process.env.DATABASE_URL||'https://invalid');
 if(process.env.NODE_ENV!=='test'||u.hostname!=='127.0.0.1'||u.port!=='55433'||u.pathname!=='/infimatch_test')throw Error('Requires isolated database');
 process.env.SESSION_SECRET=secret;db=await new Database().connect();await db.source.runMigrations({transaction:'all'});
});
after(async()=>{await db?.onModuleDestroy();});
const scope=()=> 'test-'+randomUUID();
function store(name:string){const instance=new PostgreSqlRateLimitStore(db,name,secret);instance.init({windowMs:60000} as Options);return instance;}

test('two independent instances atomically share one quota under concurrent traffic',async()=>{
 const name=scope(),a=store(name),b=store(name);
 const replies=await Promise.all(Array.from({length:80},(_,i)=>(i%2?a:b).increment('203.0.113.25')));
 assert.deepEqual(replies.map(r=>r.totalHits).sort((a,b)=>a-b),Array.from({length:80},(_,i)=>i+1));
 assert.equal((await a.get('203.0.113.25'))?.totalHits,80);
 const rows=await db.query('SELECT scope,key_hash,hits FROM rate_limit_bucket WHERE scope=$1',[name]);assert.equal(rows.length,1);assert.equal(rows[0].hits,80);
 assert.match(rows[0].key_hash,/^[a-f0-9]{64}$/);assert.ok(!JSON.stringify(rows).includes('203.0.113.25'));
});

test('a second Express application rejects once the first consumed the shared limit',async()=>{
 const name=scope();
 function application(){const app=express();app.use(sharedRateLimit(db,name,{windowMs:60000,limit:5,standardHeaders:'draft-8',legacyHeaders:false}));app.get('/',(_req,res)=>res.json({ok:true}));return app;}
 const a=application(),b=application();
 for(let i=0;i<5;i++)await request(i%2?a:b).get('/').expect(200);
 const denied=await request(b).get('/').expect(429);assert.ok(Number(denied.headers['retry-after'])>0);assert.ok(denied.headers.ratelimit);
});

test('the exact quota permits N requests and expiration resets once atomically',async()=>{
 const name=scope(),a=store(name),b=store(name);
 await a.increment('client');await a.increment('client');
 await db.query("UPDATE rate_limit_bucket SET reset_at=statement_timestamp()-interval '1 millisecond' WHERE scope=$1",[name]);
 assert.equal(await a.get('client'),undefined);
 const results=await Promise.all([a.increment('client'),b.increment('client')]);
 assert.deepEqual(results.map(r=>r.totalHits).sort((a,b)=>a-b),[1,2]);
 assert.equal(results[0].resetTime?.getTime(),results[1].resetTime?.getTime());
});

test('route scopes and session keys remain independent; IPv6 subnet grouping is preserved',async()=>{
 const nameA=scope(),nameB=scope(),a=store(nameA),b=store(nameB);
 assert.equal((await a.increment('session-A')).totalHits,1);assert.equal((await a.increment('session-B')).totalHits,1);assert.equal((await b.increment('session-A')).totalHits,1);
 const ipv6A=ipKeyGenerator('2001:db8:abcd:1200::1'),ipv6B=ipKeyGenerator('2001:db8:abcd:12ff::2');
 assert.equal(ipv6A,ipv6B);assert.equal((await a.increment(ipv6A)).totalHits,1);assert.equal((await b.increment(ipv6B)).totalHits,1);assert.equal((await a.increment(ipv6B)).totalHits,2);
 await a.decrement('session-A');assert.equal((await a.get('session-A'))?.totalHits,0);await a.decrement('session-A');assert.equal((await a.get('session-A'))?.totalHits,0);
 await a.resetKey('session-A');assert.equal(await a.get('session-A'),undefined);assert.equal((await a.get('session-B'))?.totalHits,1);
});

test('cleanup deletes only a bounded number of expired buckets and keeps active counters',async()=>{
 const name=scope(),a=store(name);
 for(let i=0;i<7;i++)await a.increment('expired-'+i);
 await db.query("UPDATE rate_limit_bucket SET reset_at=statement_timestamp()-interval '1 hour' WHERE scope=$1",[name]);
 await a.increment('active');
 assert.equal((await cleanupSharedRateLimits(db,3)).removed,3);
 assert.equal((await db.query('SELECT 1 FROM rate_limit_bucket WHERE scope=$1',[name])).length,5);
 assert.equal((await a.get('active'))?.totalHits,1);
 const concurrent=await Promise.all([cleanupSharedRateLimits(db,2),cleanupSharedRateLimits(db,2)]);
 assert.equal(concurrent.reduce((n,r)=>n+r.removed,0),4);assert.equal((await a.get('active'))?.totalHits,1);
});
