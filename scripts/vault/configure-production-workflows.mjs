import {offerSchedule,LEGACY_DAILY_NAME,OFFER_WORKFLOW_NAMES} from '../n8n/offer-schedules.mjs';
import {resilientReminders} from "../n8n/reminder-resilience.mjs";
import {randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {root,withRole,request} from './common.mjs';
const origin='https://infimatch.app.n8n.cloud',projectId='Q16715lualIvt2C0';
const targets=await fetch('http://127.0.0.1:9223/json').then(r=>r.json());
const target=targets.find(t=>t.type==='page'&&t.url.startsWith(origin+'/'));
if(!target)throw Error('Authenticated n8n session unavailable');
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((ok,fail)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',fail,{once:true});});
ws.send(JSON.stringify({id:0,method:"Page.setWebLifecycleState",params:{state:"active"}}));
let sequence=0;
async function evaluate(expression){const id=++sequence;return new Promise((ok,fail)=>{const timer=setTimeout(()=>{ws.removeEventListener('message',receive);fail(Error('Browser request timed out'));},45000);function receive(e){const msg=JSON.parse(e.data);if(msg.id!==id)return;clearTimeout(timer);ws.removeEventListener('message',receive);if(msg.error||msg.result?.exceptionDetails)return fail(Error('Browser configuration failed'));ok(msg.result?.result?.value);}ws.addEventListener('message',receive);ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));});}
async function api(endpoint,method='GET',body){
 const code=`(async()=>{let browserId=localStorage.getItem('n8n-browserId');try{browserId=JSON.parse(browserId)}catch{};const r=await fetch(${JSON.stringify(endpoint)},{method:${JSON.stringify(method)},headers:{'Content-Type':'application/json','browser-id':browserId},body:${body===undefined?'undefined':JSON.stringify(JSON.stringify(body))}});const x=await r.json();return r.ok?x:{error:r.status};})()`;
 const result=await evaluate(code);if(result?.error)throw Error('n8n HTTP '+result.error);return result.data??result;
}
try{
 const credentials=await api('/rest/credentials');
 const name='InfiMatch production backend authentication';
 let auth=credentials.find(c=>c.name===name&&c.type==='httpHeaderAuth');
 if(!auth){const secret=await withRole('operator',async token=>(await request('kv/data/infimatch/v1/production',{token})).data.data.SERVICE_TOKEN);auth=await api('/rest/credentials','POST',{name,type:'httpHeaderAuth',data:{name:'X-InfiMatch-Token',value:secret},projectId});}
 const credential={httpHeaderAuth:{id:auth.id,name}};
 const settings={executionOrder:'v1',saveDataErrorExecution:'none',saveDataSuccessExecution:'none',saveManualExecutions:false,saveExecutionProgress:false};
 const list=await api('/rest/workflows');const existing=Array.isArray(list)?list:list.results||[];
 const call=(name,url,position)=>({id:randomUUID(),name,type:'n8n-nodes-base.httpRequest',typeVersion:4.2,position,parameters:{method:'POST',url,authentication:'genericCredentialType',genericAuthType:'httpHeaderAuth',sendHeaders:true,headerParameters:{parameters:[{name:'X-N8N-Execution-Id',value:'={{ $execution.id }}'},{name:'X-N8N-Workflow-Id',value:'={{ $workflow.id }}'}]},options:{timeout:240000}},credentials:credential});
 const workflows=[];
 for(const action of ['matches','confirmation','cancellation','reminders']){
  const nodes=[{id:randomUUID(),name:'Reception',type:'n8n-nodes-base.webhook',typeVersion:2,position:[0,0],webhookId:randomUUID(),parameters:{httpMethod:'POST',path:'infimatch-prod/'+action,authentication:'headerAuth',responseMode:'lastNode',options:{}},credentials:credential}];
  const connections={};let previous='Reception';
  if(action!=='reminders'){nodes.push({id:randomUUID(),name:'Valider evenement',type:'n8n-nodes-base.code',typeVersion:2,position:[220,0],parameters:{jsCode:"const id=$json.body?.eventId;if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw new Error('Invalid event');return [{json:{eventId:id}}];"}});connections[previous]={main:[[{node:'Valider evenement',type:'main',index:0}]]};previous='Valider evenement';}
  nodes.push(call('Backend',action==='reminders'?'https://infimactch-prod-backend.vercel.app/api/v1/internal/automation/reminders':'={{ "https://infimactch-prod-backend.vercel.app/api/v1/internal/automation/'+action+'/" + $json.eventId }}',[440,0]));
  connections[previous]={main:[[{node:'Backend',type:'main',index:0}]]};workflows.push({name:'InfiMatch production - '+action,nodes,connections,settings});
 }
 const schedule={id:randomUUID(),name:'Toutes les 4 heures',type:'n8n-nodes-base.scheduleTrigger',typeVersion:1.2,position:[0,0],parameters:{rule:{interval:[{field:'hours',hoursInterval:4}]}}};
 workflows.push({name:'InfiMatch production - reprise et rappels',nodes:[schedule,call('Traiter la file','https://infimactch-prod-backend.vercel.app/api/v1/internal/automation/jobs/dispatch',[240,0]),call('Rappels','https://infimactch-prod-backend.vercel.app/api/v1/internal/automation/reminders',[480,0])],connections:{'Toutes les 4 heures':{main:[[{node:'Traiter la file',type:'main',index:0}]]},'Traiter la file':{main:[[{node:'Rappels',type:'main',index:0}]]}},settings});
 const daily={id:randomUUID(),name:'Chaque jour',type:'n8n-nodes-base.scheduleTrigger',typeVersion:1.2,position:[0,0],parameters:{rule:{interval:[{field:'days',daysInterval:1,triggerAtHour:4,triggerAtMinute:15}]}}};
 if(process.argv.includes('--enable-maintenance'))workflows.push({name:'InfiMatch production - maintenance quotidienne',nodes:[daily,call('Maintenance','https://infimactch-prod-backend.vercel.app/api/v1/internal/automation/jobs/maintenance',[240,0])],connections:{'Chaque jour':{main:[[{node:'Maintenance',type:'main',index:0}]]}},settings:{...settings,timezone:'Europe/Paris'}});
 workflows.push(offerSchedule('FRANCE_TRAVAIL',credential),offerSchedule('JOBSPIPE',credential));
 const periodic=workflows.find(w=>w.name==='InfiMatch production - reprise et rappels');
 periodic.settings={...periodic.settings,timezone:'Europe/Paris'};
 periodic.nodes.splice(1,0,{id:randomUUID(),name:'Verifier disponibilite API',type:'n8n-nodes-base.httpRequest',typeVersion:4.2,position:[120,-160],parameters:{method:'GET',url:'https://infimactch-prod-backend.vercel.app/api/v1/health',options:{timeout:30000}}});
 periodic.connections['Toutes les 4 heures']={main:[[{node:'Verifier disponibilite API',type:'main',index:0}]]};
 periodic.connections['Verifier disponibilite API']={main:[[{node:'Traiter la file',type:'main',index:0}]]};
 resilientReminders(periodic);
 await mkdir(resolve(root,'docs/n8n'),{recursive:true});
 for(const workflow of workflows){const old=existing.find(x=>x.name===workflow.name)||(workflow.name===OFFER_WORKFLOW_NAMES.FRANCE_TRAVAIL?existing.find(x=>x.name===LEGACY_DAILY_NAME):undefined);const saved=old?await api('/rest/workflows/'+old.id,'PATCH',workflow):await api('/rest/workflows','POST',{...workflow,projectId});await api('/rest/workflows/'+saved.id+'/activate','POST',{versionId:saved.versionId});const clean=structuredClone(workflow);for(const node of clean.nodes)delete node.credentials;await writeFile(resolve(root,'docs/n8n/'+workflow.name.replace(/[^a-z0-9]+/gi,'-')+'.json'),JSON.stringify(clean,null,2)+'\n');console.log(JSON.stringify({workflow:workflow.name,id:saved.id,published:true}));}
}catch(e){console.error('Production workflows configuration failed: '+e.message);process.exitCode=1;}finally{ws.close();}


