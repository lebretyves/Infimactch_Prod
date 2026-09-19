import {createHash} from 'node:crypto';
const nodeId=(provider,name)=>{const h=createHash('sha256').update(provider+':'+name).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;};
export const OFFER_WORKFLOW_NAMES = {
 FRANCE_TRAVAIL: 'InfiMatch production - import France Travail',
 JOBSPIPE: 'InfiMatch production - import JobsPipe',
};
export const LEGACY_DAILY_NAME='InfiMatch production - actualisation quotidienne';
const endpoint='https://infimactch-prod-backend.vercel.app/api/v1/internal/automation/jobs/refresh-offers';
export function removeOfferRefresh(workflow){
 const removed=new Set(workflow.nodes.filter(n=>typeof n.parameters?.url==='string'&&n.parameters.url.startsWith(endpoint)).map(n=>n.name));
 workflow.nodes=workflow.nodes.filter(n=>!removed.has(n.name));
 for(const name of removed)delete workflow.connections[name];
 for(const connection of Object.values(workflow.connections))for(const outputs of Object.values(connection))for(let i=0;i<outputs.length;i++)outputs[i]=outputs[i].filter(link=>!removed.has(link.node));
 return workflow;
}
export function offerSchedule(provider,credentials){
 if(!Object.hasOwn(OFFER_WORKFLOW_NAMES,provider))throw Error('UNKNOWN_PROVIDER');
 const node=(name,type,position,parameters,typeVersion)=>({id:nodeId(provider,name),name,type,position,parameters,typeVersion});
 const schedule=node('Horaires Paris','n8n-nodes-base.scheduleTrigger',[0,0],{rule:{interval:[{field:'cronExpression',expression:provider==='FRANCE_TRAVAIL'?'0 0 7,15 * * *':'0 0 7 * * *'}]}},1.2);
 const request=node('Importer un lot','n8n-nodes-base.httpRequest',[240,0],{method:'POST',url:endpoint+'/'+provider,authentication:'genericCredentialType',genericAuthType:'httpHeaderAuth',sendHeaders:true,headerParameters:{parameters:[{name:'X-N8N-Execution-Id',value:'={{ $execution.id }}'},{name:'X-N8N-Workflow-Id',value:'={{ $workflow.id }}'}]},options:{timeout:240000}},4.2);
 if(credentials)request.credentials=structuredClone(credentials);
 // Checkpoints make a single transport retry safe; business failures are handled below.
 Object.assign(request,{retryOnFail:true,maxTries:2,waitBetweenTries:5000});
 const guard=node('Decider la reprise','n8n-nodes-base.code',[480,0],{jsCode:`const status=$json.status;
const allowed=['SUCCESS','IN_PROGRESS','UP_TO_DATE','COOLDOWN','PAUSED','BUSY','QUOTA_EXHAUSTED','RETRY_REQUIRED','INCOMPLETE','AUTH_REQUIRED'];
if(!allowed.includes(status))throw new Error('IMPORT_RESPONSE_INVALID');
if(status==='INCOMPLETE'||status==='AUTH_REQUIRED')throw new Error('IMPORT_'+status);
const previous=$runIndex>0?$items('Decider la reprise',0,$runIndex-1)[0].json.failures:0;
const failures=previous+(status==='RETRY_REQUIRED'?1:0);
if(failures>2)throw new Error('IMPORT_RETRY_LIMIT_REACHED');
const hasMore=status==='IN_PROGRESS'||status==='RETRY_REQUIRED';
if(hasMore&&$runIndex>=19)throw new Error('IMPORT_BATCH_LIMIT_REACHED_CHECKPOINT_SAVED');
return [{json:{...$json,hasMore,failures,waitSeconds:status==='RETRY_REQUIRED'?300:1}}];`},2);
 const branch=node('Encore des pages','n8n-nodes-base.if',[720,0],{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},conditions:[{id:nodeId(provider,'condition'),leftValue:'={{ $json.hasMore }}',rightValue:'',operator:{type:'boolean',operation:'true',singleValue:true}}],combinator:'and'},options:{}},2.2);
 const wait=node('Attendre avant reprise','n8n-nodes-base.wait',[960,-80],{amount:'={{ $json.waitSeconds }}',unit:'seconds'},1.1);
 const edge=name=>({node:name,type:'main',index:0});
 return {name:OFFER_WORKFLOW_NAMES[provider],nodes:[schedule,request,guard,branch,wait],connections:{'Horaires Paris':{main:[[edge(request.name)]]},[request.name]:{main:[[edge(guard.name)]]},[guard.name]:{main:[[edge(branch.name)]]},[branch.name]:{main:[[edge(wait.name)],[]]},[wait.name]:{main:[[edge(request.name)]]}},settings:{executionOrder:'v1',timezone:'Europe/Paris',executionTimeout:3600,saveDataErrorExecution:'all',saveDataSuccessExecution:'none',saveManualExecutions:false,saveExecutionProgress:false}};
}
