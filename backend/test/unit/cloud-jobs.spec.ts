import "reflect-metadata";
import {test} from "node:test";
import assert from "node:assert/strict";
import {CloudJobsController} from "../../src/automation/cloud-jobs.module";
test("cloud dispatch authenticates before processing and bounds work",async()=>{
 const old=process.env.SERVICE_TOKEN;process.env.SERVICE_TOKEN="cloud-worker-test-secret-32-characters";
 try{const calls:string[]=[];const jobs=new CloudJobsController({dispatch:async(n:number)=>{calls.push("events:"+n);return [];}} as any,{dispatch:async(n:number)=>{calls.push("notifications:"+n);}} as any);
 await assert.rejects(jobs.dispatch(undefined as any));await assert.rejects(jobs.dispatch("wrong"));assert.deepEqual(calls,[]);
 assert.deepEqual(await jobs.dispatch(process.env.SERVICE_TOKEN),{processed:0});assert.deepEqual(calls,["events:1","notifications:5"]);
 }finally{if(old===undefined)delete process.env.SERVICE_TOKEN;else process.env.SERVICE_TOKEN=old;}
});
