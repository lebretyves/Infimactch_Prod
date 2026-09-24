import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {offerSchedule,removeOfferRefresh} from './offer-schedules.mjs';
test('provider schedules use Paris timezone and distinct cron hours and API routes',()=>{
 for(const [provider,expression] of [['FRANCE_TRAVAIL','0 0 7,15 * * *'],['JOBSPIPE','0 0 7 * * *']]){
  const w=offerSchedule(provider);assert.equal(w.settings.timezone,'Europe/Paris');assert.equal(w.nodes[0].parameters.rule.interval[0].expression,expression);
  assert.ok(w.nodes[1].parameters.url.endsWith('/'+provider));assert.equal(w.nodes[1].maxTries,2);
  for(const connection of Object.values(w.connections))for(const output of connection.main)for(const link of output)assert.ok(w.nodes.some(n=>n.name===link.node));
 }
});
test('periodic workflow retains dispatch/reminders and has no dangling import edge',()=>{
 const w=JSON.parse(readFileSync(new URL('../../annexe/n8n/InfiMatch-production-reprise-et-rappels.json',import.meta.url)));
 removeOfferRefresh(w);assert.ok(w.nodes.some(n=>n.name==='Rappels'));assert.ok(w.nodes.some(n=>n.name==='Traiter la file'));
 assert.ok(!JSON.stringify(w).includes('refresh-offers'));
 for(const connection of Object.values(w.connections))for(const output of connection.main)for(const link of output)assert.ok(w.nodes.some(n=>n.name===link.node));
});
test('continuation follows pages but stops on quota, completion, 20 batches or 3 failures',()=>{
 const w=offerSchedule('JOBSPIPE'),guard=w.nodes.find(n=>n.type==='n8n-nodes-base.code');
 const run=new Function('$json','$runIndex','$items',guard.parameters.jsCode);
 const previous=n=>()=>[{json:{failures:n}}];
 for(const status of ['SUCCESS','COOLDOWN','QUOTA_EXHAUSTED','PAUSED','BUSY'])assert.equal(run({status},0,previous(0))[0].json.hasMore,false);
 assert.equal(run({status:'IN_PROGRESS'},0,previous(0))[0].json.hasMore,true);
 assert.equal(run({status:'RETRY_REQUIRED'},0,previous(0))[0].json.waitSeconds,300);
 assert.throws(()=>run({status:'RETRY_REQUIRED'},2,previous(2)),/RETRY_LIMIT/);
 assert.throws(()=>run({status:'IN_PROGRESS'},19,previous(0)),/BATCH_LIMIT/);
 assert.throws(()=>run({},0,previous(0)),/RESPONSE_INVALID/);
});

test('quota-saving retry schedule is four hours with all trigger edges connected',()=>{
 const w=JSON.parse(readFileSync(new URL('../../annexe/n8n/InfiMatch-production-reprise-et-rappels.json',import.meta.url)));
 const triggers=w.nodes.filter(n=>n.type==='n8n-nodes-base.scheduleTrigger');
 assert.equal(triggers.length,1);assert.deepEqual(triggers[0].parameters.rule.interval,[{field:'hours',hoursInterval:4}]);
 assert.equal(w.settings.timezone,'Europe/Paris');
 assert.equal(w.connections[triggers[0].name].main[0][0].node,'Verifier disponibilite API');
 for(const name of Object.keys(w.connections))assert.ok(w.nodes.some(n=>n.name===name));
});
