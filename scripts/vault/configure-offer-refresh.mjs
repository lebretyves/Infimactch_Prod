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
 const listed=await api('/rest/workflows');const workflows=Array.isArray(listed)?listed:listed.results||[];
 const matches=workflows.filter(w=>w.name==='InfiMatch production - reprise et rappels');if(matches.length!==1)throw Error('Expected one periodic production workflow');
 const workflow=await api('/rest/workflows/'+matches[0].id);
 const reminders=workflow.nodes.find(n=>n.name==='Rappels'&&n.type==='n8n-nodes-base.httpRequest');
 if(!reminders||!reminders.credentials?.httpHeaderAuth)throw Error('Existing secure backend credential missing');
 const url='https://infimactch-prod-backend.vercel.app/api/v1/internal/automation/jobs/refresh-offers';
 let node=workflow.nodes.find(n=>n.parameters?.url===url);
 if(!node){
  if(workflow.connections.Rappels?.main?.some(output=>output.length))throw Error('Periodic workflow has an unexpected successor; inspect before changing');
  node={id:randomUUID(),name:'Poursuivre les collectes',type:'n8n-nodes-base.httpRequest',typeVersion:4.2,position:[720,0],parameters:{...structuredClone(reminders.parameters),method:'POST',url,options:{...reminders.parameters.options,timeout:240000}},credentials:structuredClone(reminders.credentials)};
  workflow.nodes.push(node);workflow.connections.Rappels={main:[[{node:node.name,type:'main',index:0}]]};
 }
 const body={name:workflow.name,nodes:workflow.nodes,connections:workflow.connections,settings:workflow.settings};
 const saved=await api('/rest/workflows/'+workflow.id,'PATCH',body);await api('/rest/workflows/'+workflow.id+'/activate','POST',{versionId:saved.versionId});
 const verified=await api('/rest/workflows/'+workflow.id);if(!verified.active||!verified.nodes.some(n=>n.parameters?.url===url))throw Error('Published refresh continuation not confirmed');
 const clean=structuredClone(body);for(const n of clean.nodes)delete n.credentials;
 await mkdir(resolve(root,'docs/n8n'),{recursive:true});await writeFile(resolve(root,'docs/n8n/InfiMatch-production-reprise-et-rappels.json'),JSON.stringify(clean,null,2)+'\n');
 console.log(JSON.stringify({status:'PASS',workflowId:workflow.id,active:verified.active,continuation:'existing 30-minute workflow; daily refresh retained',newScheduleExecutions:0}));
}catch(error){console.error('Offer workflow update failed: '+error.message);process.exitCode=1;}finally{ws.close();}
