import {randomUUID} from 'node:crypto';
export function resilientReminders(workflow){
 if(workflow.name!=='InfiMatch production - reprise et rappels')throw Error('Unexpected workflow');
 for(const name of ['Rappels','Verifier disponibilite API']){
  const n=workflow.nodes.find(n=>n.name===name&&n.type==='n8n-nodes-base.httpRequest');if(!n)throw Error('Required node missing');
  n.retryOnFail=true;n.maxTries=3;n.waitBetweenTries=5000;
 }
 workflow.settings={...workflow.settings,saveDataErrorExecution:'all',saveDataSuccessExecution:'none',saveManualExecutions:false,saveExecutionProgress:false};
 const guard='Valider le lot de rappels',branch='Encore des rappels';
 if(!workflow.nodes.some(n=>n.name===guard))workflow.nodes.push({id:randomUUID(),name:guard,type:'n8n-nodes-base.code',typeVersion:2,position:[680,0],parameters:{jsCode:"if(typeof $json.hasMore !== 'boolean') throw new Error('REMINDER_BATCH_RESPONSE_INVALID'); if($json.hasMore && $runIndex >= 199) throw new Error('REMINDER_BATCH_LIMIT_REACHED'); return [{json:$json}];"}});
 if(!workflow.nodes.some(n=>n.name===branch))workflow.nodes.push({id:randomUUID(),name:branch,type:'n8n-nodes-base.if',typeVersion:2.2,position:[900,0],parameters:{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},conditions:[{id:randomUUID(),leftValue:'={{ $json.hasMore }}',rightValue:'',operator:{type:'boolean',operation:'true',singleValue:true}}],combinator:'and'},options:{}}});
 workflow.connections.Rappels={main:[[{node:guard,type:'main',index:0}]]};
 workflow.connections[guard]={main:[[{node:branch,type:'main',index:0}]]};
 const continuation=workflow.nodes.find(n=>n.name==='Poursuivre les collectes');
 workflow.connections[branch]={main:[[{node:'Rappels',type:'main',index:0}],continuation?[{node:continuation.name,type:'main',index:0}]:[]]};
 if(continuation)continuation.position=[1120,120];
 return workflow;
}
