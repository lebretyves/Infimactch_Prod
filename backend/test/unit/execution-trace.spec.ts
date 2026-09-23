import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lastValueFrom,of,throwError} from 'rxjs';
import {ExecutionTrace,executionReference} from '../../src/automation/execution-trace';
test('execution trace stores correlation only, including failures',async()=>{
 const old=process.env.SERVICE_TOKEN;process.env.SERVICE_TOKEN='test-service-secret';
 try {
  const records:any[]=[];const trace=new ExecutionTrace({query:async(_sql:string,params:any[])=>{records.push(params);}} as any);
  const request={headers:{'x-infimatch-token':'test-service-secret','x-n8n-execution-id':'123','x-n8n-workflow-id':'workflow_1'},path:'/api/v1/internal/automation/jobs/dispatch',body:{secret:'private-payload'}};
  const ctx={switchToHttp:()=>({getRequest:()=>request})} as any;
  const result={secret:'private-response'};
  assert.equal(await lastValueFrom(trace.intercept(ctx,{handle:()=>of(result)})),result);
  assert.equal(records[0][0],'completed');
  const metadata=JSON.parse(records[0][1]);assert.equal(metadata.executionId,'123');assert.equal(metadata.workflowId,'workflow_1');assert.equal(metadata.action,'jobs/dispatch');assert.equal(typeof metadata.durationMs,'number');
  const failure=new Error('private-error');await assert.rejects(lastValueFrom(trace.intercept(ctx,{handle:()=>throwError(()=>failure)})),error=>error===failure);
  assert.equal(records[1][0],'failed');assert.doesNotMatch(JSON.stringify(records),/private-|test-service-secret/);
  request.headers['x-infimatch-token']='invalid';await lastValueFrom(trace.intercept(ctx,{handle:()=>of(result)}));assert.equal(records.length,2);
  assert.equal(executionReference('../../private'),null);assert.equal(executionReference('x'.repeat(81)),null);
 }finally{if(old===undefined)delete process.env.SERVICE_TOKEN;else process.env.SERVICE_TOKEN=old;}
});
