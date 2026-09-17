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
