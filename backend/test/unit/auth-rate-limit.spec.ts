import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { authRateLimit } from "../../src/auth/auth-rate-limit";
process.env.SESSION_SECRET = 'fixture-session-secret-with-more-than-32-characters';
function fakeCounters() {
  const rows = new Map<string,{hits:number;reset_at:Date}>();
  return {query:async(sql:string,params:unknown[]=[])=>{
    assert.match(sql,/INSERT INTO rate_limit_bucket/);
    assert.match(String(params[1]),/^[a-f0-9]{64}$/);
    const key=params[0]+':'+params[1],old=rows.get(key);
    const row=old&&old.reset_at.getTime()>Date.now()?{...old,hits:old.hits+1}:{hits:1,reset_at:new Date(Date.now()+Number(params[2]))};
    rows.set(key,row);return [row];
  }};
}
test("Session reads do not consume login attempts, but the 51st auth write is refused", async () => {
  const app = express();
  app.use(authRateLimit(fakeCounters()));
  app.all("/auth", (_req, res) => {
    res.json({ ok: true });
  });
  for (let i = 0; i < 55; i++) await request(app).get("/auth").expect(200);
  for (let i = 0; i < 50; i++) await request(app).post("/auth").expect(200);
  const denied = await request(app).post("/auth").expect(429);
  assert.equal(denied.body.code, "RATE_LIMITED");
  assert.ok(denied.headers["retry-after"]);
  await request(app).get("/auth").expect(200);
});

test("authenticated activity does not consume shared login attempts", async () => {
 const app=express();
 app.use((req,_res,next)=>{(req as any).session={userId:"test-user"};next();});
 app.use(authRateLimit(fakeCounters()));app.post("/activity",(_req,res)=>{res.json({ok:true});});
 for(let i=0;i<55;i++) await request(app).post("/activity").expect(200);
});
