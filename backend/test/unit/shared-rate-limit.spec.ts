import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { PostgreSqlRateLimitStore, sharedRateLimit, cleanupSharedRateLimits } from '../../src/security/shared-rate-limit';
const secret='fictional-session-secret-at-least-32-characters';
process.env.SESSION_SECRET=secret;

test('store keys are stable keyed hashes, isolated by scope and secret, with no raw IP or session',async()=>{
  const params:unknown[][]=[];
  const db={query:async(_sql:string,p:unknown[]=[])=>{params.push(p);return [{hits:1,reset_at:new Date(Date.now()+60000)}];}};
  const a=new PostgreSqlRateLimitStore(db,'auth',secret),b=new PostgreSqlRateLimitStore(db,'auth',secret),c=new PostgreSqlRateLimitStore(db,'admin',secret),d=new PostgreSqlRateLimitStore(db,'auth',secret+'2');
  for(const store of [a,b,c,d])await store.increment('203.0.113.7');
  assert.equal(params[0]![1],params[1]![1]);assert.notEqual(params[0]![1],params[2]![1]);assert.notEqual(params[0]![1],params[3]![1]);
  assert.ok(!JSON.stringify(params).includes('203.0.113.7'));
  for(const p of params)assert.match(String(p[1]),/^[a-f0-9]{64}$/);
  await a.get('private-session-cookie');await a.decrement('private-session-cookie');await a.resetKey('private-session-cookie');
  assert.ok(!JSON.stringify(params).includes('private-session-cookie'));
  assert.throws(()=>new PostgreSqlRateLimitStore(db,'auth','weak'));
  assert.throws(()=>new PostgreSqlRateLimitStore(db,'invalid scope',secret));
});

test('database failures fail closed with explicit 503 and no internal error or operation execution',async()=>{
  const app=express();let executed=0;
  app.use(sharedRateLimit({query:async()=>{throw Error('private database address');}},'auth',{windowMs:60000,limit:5,standardHeaders:'draft-8',legacyHeaders:false}));
  app.get('/',(_req,res)=>{executed++;res.json({ok:true});});
  const response=await request(app).get('/').expect(503);
  assert.equal(response.body.code,'RATE_LIMIT_UNAVAILABLE');assert.equal(response.headers['retry-after'],'60');assert.equal(executed,0);
  assert.ok(!JSON.stringify(response.body).includes('private database address'));
});

test('invalid database counters do not bypass the limiter',async()=>{
  const db={query:async()=>[{hits:0,reset_at:'invalid'}]};
  await assert.rejects(new PostgreSqlRateLimitStore(db,'auth',secret).increment('client'));
});

test('maintenance enforces a bounded batch and rejects unbounded input before SQL',async()=>{
  let calls=0;
  const db={query:async(sql:string,params:unknown[]=[])=>{calls++;assert.match(sql,/FOR UPDATE SKIP LOCKED/);assert.match(sql,/LIMIT \$1/);assert.deepEqual(params,[500]);return [{scope:'auth'}];}};
  assert.deepEqual(await cleanupSharedRateLimits(db),{removed:1});
  for(const n of [0,-1,5001,Infinity,1.5])await assert.rejects(cleanupSharedRateLimits(db,n));
  assert.equal(calls,1);
});
