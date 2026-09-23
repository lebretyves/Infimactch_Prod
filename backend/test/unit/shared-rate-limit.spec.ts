import { rankingRateLimit, rankingRoutes, rankingBudget } from '../../src/security/ranking-budget';
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

test('ranking quota is shared across all entry points and sessions but isolated by account', async () => {
  const counters = new Map<string, number>();
  const db = {query: async (_sql: string, params: unknown[] = []) => {
    const key = String(params[1]), hits = (counters.get(key) ?? 0) + 1;
    counters.set(key, hits); return [{hits, reset_at:new Date(Date.now()+60_000)}];
  }};
  function application() {
    const app = express();
    app.use((req, _res, next) => { req.session = {userId:req.get('test-account')} as any; next(); });
    app.use(rankingRoutes, rankingRateLimit(db));
    app.use((_req, res) => res.json({ok:true})); return app;
  }
  const a = application(), b = application();
  for(let i=0; i<15; i++) await request(i%2?a:b).get(rankingRoutes[i%rankingRoutes.length]!.replace(':id','11111111-1111-4111-8111-111111111111')).set('test-account','account-A').expect(200);
  for(const route of rankingRoutes) {
    const denied = await request(b).get(route.replace(':id','11111111-1111-4111-8111-111111111111')).set('test-account','account-A').expect(429);
    assert.equal(denied.body.code,'RANKING_RATE_LIMIT'); assert.ok(denied.headers['retry-after']);
  }
  await request(a).get(rankingRoutes[0]!).set('test-account','account-B').expect(200);
  await request(a).get(rankingRoutes[0]!).expect(200);
});

test('ranking stops explicitly at the work or time budget instead of returning a partial result', () => {
  let now=0; const work=rankingBudget(()=>now); work(10_000); assert.throws(()=>work(1), /Recherche trop volumineuse/);
  const time=rankingBudget(()=>now); now=8_001; assert.throws(()=>time(), /Recherche trop volumineuse/);
});
