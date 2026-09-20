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
 const name='InfiMatch production - maintenance quotidienne';
 const credentials=await api('/rest/credentials');const auth=credentials.find(c=>c.name==='InfiMatch production backend authentication'&&c.type==='httpHeaderAuth');if(!auth)throw Error('Existing backend credential required');
 const credential={httpHeaderAuth:{id:auth.id,name:auth.name}};
 const workflow={name,nodes:[{id:'81651e06-bd1d-4b5c-ae52-e26b236b301e',name:'Chaque jour',type:'n8n-nodes-base.scheduleTrigger',typeVersion:1.2,position:[0,0],parameters:{rule:{interval:[{field:'cronExpression',expression:'15 4 * * *'}]}}},{id:'c4ca470e-2e17-41a4-a752-81d4ed39451d',name:'Maintenance technique',type:'n8n-nodes-base.httpRequest',typeVersion:4.2,position:[240,0],parameters:{method:'POST',url:'https://infimactch-prod-backend.vercel.app/api/v1/internal/automation/jobs/maintenance',authentication:'genericCredentialType',genericAuthType:'httpHeaderAuth',sendHeaders:true,headerParameters:{parameters:[{name:'X-N8N-Execution-Id',value:'={{ $execution.id }}'},{name:'X-N8N-Workflow-Id',value:'={{ $workflow.id }}'}]},options:{timeout:240000}},credentials:credential}],connections:{'Chaque jour':{main:[[{node:'Maintenance technique',type:'main',index:0}]]}},settings:{timezone:'Europe/Paris',executionOrder:'v1',saveDataErrorExecution:'all',saveDataSuccessExecution:'none',saveManualExecutions:false,saveExecutionProgress:false}};
 const list=await api('/rest/workflows');const existing=(Array.isArray(list)?list:list.results||[]).find(w=>w.name===name);
 if(process.argv.includes('--apply')){
  const saved=existing?await api('/rest/workflows/'+existing.id,'PATCH',workflow):await api('/rest/workflows','POST',{...workflow,projectId});
  await api('/rest/workflows/'+saved.id+'/activate','POST',{versionId:saved.versionId});
  const checked=await api('/rest/workflows/'+saved.id);if(!checked.active)throw Error('Activation not confirmed');
  console.log(JSON.stringify({id:saved.id,name,active:true,schedule:'04:15 Europe/Paris daily',businessHistoryEnabled:false,scope:'technical maintenance only'}));
 }else console.log(JSON.stringify({mode:'preview',name,exists:!!existing,schedule:'04:15 Europe/Paris daily',businessHistoryEnabled:false}));
 const clean=structuredClone(workflow);for(const node of clean.nodes)delete node.credentials;
 await mkdir(resolve(root,'docs_intern/n8n'),{recursive:true});await writeFile(resolve(root,'docs_intern/n8n/maintenance-quotidienne.json'),JSON.stringify(clean,null,2)+'\n');
}catch(e){console.error('Maintenance configuration failed: '+e.message);process.exitCode=1;}finally{ws.close();}
