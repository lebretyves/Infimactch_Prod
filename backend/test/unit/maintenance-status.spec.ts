import {test} from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceStatus} from '../../src/security/maintenance-status';
test('maintenance reports missing, stale, failed, running and successful executions',async()=>{
 const now=Date.now();
 for(const [latest,success,expected] of [[null,null,'stale'],[{state:'completed',checked_at:new Date(now-40*3600000)},new Date(now-40*3600000),'stale'],[{state:'failed',checked_at:new Date(now)},new Date(now-1000),'failed'],[{state:'running',checked_at:new Date(now)},new Date(now-1000),'running'],[{state:'completed',checked_at:new Date(now)},new Date(now),'ready']] as const){
  const db={query:async(sql:string)=>sql.includes("AND state='completed'")?(success?[{checked_at:success}]:[]):latest?[latest]:[]};
  assert.equal((await maintenanceStatus(db,now)).state,expected);
 }
});
