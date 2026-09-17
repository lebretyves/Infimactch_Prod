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
try {
 const workflows=await api('/rest/workflows');const list=Array.isArray(workflows)?workflows:workflows.results||[];
 console.log(JSON.stringify({workflows:list.filter(w=>w.name.startsWith('InfiMatch production')).map(w=>({id:w.id,name:w.name,active:w.active}))}));
 const executions=await api('/rest/executions?limit=20');const rows=Array.isArray(executions)?executions:executions.results||executions.data||[];
 console.log(JSON.stringify({executions:rows.map(e=>({id:e.id,workflowId:e.workflowId,status:e.status,mode:e.mode,startedAt:e.startedAt,stoppedAt:e.stoppedAt}))}));
}catch(e){console.error(e.message);process.exitCode=1;}finally{ws.close();}
