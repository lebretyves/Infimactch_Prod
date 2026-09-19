import {writeFile,mkdir,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {root} from './common.mjs';
import {offerSchedule,removeOfferRefresh,OFFER_WORKFLOW_NAMES,LEGACY_DAILY_NAME} from '../n8n/offer-schedules.mjs';
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
 const listed=await api('/rest/workflows'); const existing=Array.isArray(listed)?listed:listed.results||[];
 const periodicInfo=existing.filter(w=>w.name==='InfiMatch production - reprise et rappels');
 if(periodicInfo.length!==1)throw Error('Expected one periodic workflow');
 const periodic=await api('/rest/workflows/'+periodicInfo[0].id);
 const credentials=periodic.nodes.find(n=>n.name==='Rappels')?.credentials;
 if(!credentials?.httpHeaderAuth)throw Error('Secure backend credential missing');
 const workflows=[{old:periodic,body:removeOfferRefresh(structuredClone(periodic))}];
 for(const provider of ['FRANCE_TRAVAIL','JOBSPIPE']){
  const matches=existing.filter(w=>w.name===OFFER_WORKFLOW_NAMES[provider]||(provider==='FRANCE_TRAVAIL'&&w.name===LEGACY_DAILY_NAME));
  if(matches.length>1)throw Error('Duplicate import workflow');
  const old=matches.length?await api('/rest/workflows/'+matches[0].id):null;
  workflows.push({old,body:offerSchedule(provider,credentials)});
 }
 const unexpected=existing.filter(w=>w.active&&!workflows.some(x=>x.old?.id===w.id));
 for(const row of unexpected){const w=await api('/rest/workflows/'+row.id);if(w.nodes.some(n=>String(n.parameters?.url||'').includes('/jobs/refresh-offers')))throw Error('Another active import workflow requires inspection: '+w.name);}
 const apply=process.argv.includes('--apply');
 for(const {old,body} of workflows){
  const payload={name:body.name,nodes:body.nodes,connections:body.connections,settings:body.settings};
  if(apply){
   if(old?.active)await api('/rest/workflows/'+old.id+'/deactivate','POST');
   const saved=old?await api('/rest/workflows/'+old.id,'PATCH',payload):await api('/rest/workflows','POST',{...payload,projectId});
   await api('/rest/workflows/'+saved.id+'/activate','POST',{versionId:saved.versionId});
   const verified=await api('/rest/workflows/'+saved.id);
   if(!verified.active||verified.activeVersionId!==verified.versionId)throw Error('Published workflow not confirmed');
   console.log(JSON.stringify({workflow:verified.name,id:verified.id,active:true,versionId:verified.versionId,timezone:verified.settings.timezone,plan:verified.nodes.filter(n=>n.type.endsWith('scheduleTrigger')).map(n=>n.parameters.rule)}));
  }else console.log(JSON.stringify({planned:payload.name,nodes:payload.nodes.map(n=>n.name),apply:false}));
  const clean=structuredClone(payload);for(const n of clean.nodes)delete n.credentials;
  await mkdir(resolve(root,'docs/n8n'),{recursive:true});
  await writeFile(resolve(root,'docs/n8n/'+payload.name.replace(/[^a-z0-9]+/gi,'-')+'.json'),JSON.stringify(clean,null,2)+'\n');
 }
 await unlink(resolve(root,'docs/n8n/InfiMatch-production-actualisation-quotidienne.json')).catch(e=>{if(e.code!=='ENOENT')throw e;});
}catch(error){console.error('Offer schedule update failed: '+error.message);process.exitCode=1;}finally{ws.close();}
