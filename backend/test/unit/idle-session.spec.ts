import { test } from "node:test";
import assert from "node:assert/strict";
import {sessionExpired, SESSION_IDLE_MS, SESSION_ABSOLUTE_MS, idleSession} from "../../src/auth/idle-session";
test("idle session expires at exactly fifteen minutes",()=>{
 const start=1000;
 assert.equal(sessionExpired({authenticatedAt:start,lastActivityAt:start},start+SESSION_IDLE_MS-1),false);
 assert.equal(sessionExpired({authenticatedAt:start,lastActivityAt:start},start+SESSION_IDLE_MS),true);
});
test("activity cannot extend absolute eight hour maximum",()=>{
 const now=SESSION_ABSOLUTE_MS+1000;
 assert.equal(sessionExpired({authenticatedAt:1000,lastActivityAt:now},now),true);
});
test("legacy or malformed sessions need fresh authentication",()=>{
 assert.equal(sessionExpired({},1000),true);
 assert.equal(sessionExpired({authenticatedAt:1,lastActivityAt:2000},1000),true);
});
test("expired cookie session is destroyed before any route executes",async()=>{
 let destroyed=false,next=false,status=0;
 const req:any={session:{userId:"test",authenticatedAt:1,lastActivityAt:1,destroy:(cb:any)=>{destroyed=true;cb();}}};
 const res:any={clearCookie:()=>{},setHeader:()=>{},status:(s:number)=>{status=s;return res;},json:()=>{}};
 idleSession(req,res,()=>{next=true;});assert.equal(destroyed,true);assert.equal(next,false);assert.equal(status,401);
});
