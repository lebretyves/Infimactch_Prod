// Provision the Discord relay using the user's authenticated n8n browser session.
// Secrets travel only from Vault to n8n credentials; never to stdout or workflow JSON.
import {randomBytes,randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {root,withRole,request,readJson} from './common.mjs';
const origin='https://infimatch.app.n8n.cloud';
const path='infimatch-discord-relay';
const projectId='Q16715lualIvt2C0';
const targets=await fetch('http://127.0.0.1:9223/json').then(r=>r.json());
const target=targets.find(t=>t.type==='page'&&t.url.startsWith(origin+'/'));
if(!target) throw Error('Open authenticated n8n in the dedicated Edge window');
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((ok,fail)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',fail,{once:true});});
let sequence=0;
async function evaluate(expression){const id=++sequence;return new Promise((ok,fail)=>{const timer=setTimeout(()=>{ws.removeEventListener('message',receive);fail(Error('Browser request timed out'));},45000);function receive(e){const msg=JSON.parse(e.data);if(msg.id!==id)return;clearTimeout(timer);ws.removeEventListener('message',receive);if(msg.error||msg.result?.exceptionDetails)return fail(Error('Browser configuration failed'));ok(msg.result?.result?.value);}ws.addEventListener('message',receive);ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));});}
async function api(endpoint,method='GET',body){
 const code=`(async()=>{let browserId=localStorage.getItem('n8n-browserId');try{browserId=JSON.parse(browserId)}catch{};const r=await fetch(${JSON.stringify(endpoint)},{method:${JSON.stringify(method)},headers:{'Content-Type':'application/json','browser-id':browserId},body:${body===undefined?'undefined':JSON.stringify(JSON.stringify(body))}});const x=await r.json();if(!r.ok)return {error:r.status,message:x.message};return x;})()`;
 const result=await evaluate(code);if(result?.error)throw Error('n8n request failed: '+result.error+' '+(result.message||''));return result.data??result;
}
try{
 const credentials=await api('/rest/credentials');
 const bot=credentials.find(c=>c.type==='discordBotApi');if(!bot)throw Error('Discord credential missing');
 let relayToken;
 await withRole('operator',async token=>{
   const key='kv/data/infimatch/v1/backend';const current=(await request(key,{token})).data;
   relayToken=current.data.DISCORD_RELAY_TOKEN||randomBytes(32).toString('hex');
   const runtime=await readJson('runtime.json');
   await request(key,{method:'POST',token,data:{options:{cas:current.metadata.version},data:{...current.data,DISCORD_RELAY_TOKEN:relayToken,DISCORD_RELAY_URL:origin+'/webhook/'+path,NOTIFICATION_APP_ORIGIN:current.data.NOTIFICATION_APP_ORIGIN||'https://localhost:8443'}}});
 });
 const credentialName='InfiMatch Discord relay authentication';
 let auth=credentials.find(c=>c.name===credentialName&&c.type==='httpHeaderAuth');
 if(!auth) auth=await api('/rest/credentials','POST',{name:credentialName,type:'httpHeaderAuth',data:{name:'X-InfiMatch-Discord',value:relayToken},projectId});
 const validator=`const b=$json.body||{};const id='[0-9]{17,20}';
 const read=new RegExp('^/(users/@me(/guilds)?|guilds/'+id+'(/roles|/channels|/members/'+id+')?|channels/'+id+')$');
 const write=new RegExp('^/channels/'+id+'/messages$');
 if(b.method==='GET'&&read.test(b.path))return [{json:{method:'GET',path:b.path,body:{}}}];
 if(b.method==='POST'&&b.path==='/users/@me/channels'&&new RegExp('^'+id+'$').test(b.body?.recipient_id))return [{json:{method:'POST',path:b.path,body:{recipient_id:b.body.recipient_id}}}];
 if(b.method==='POST'&&write.test(b.path)&&typeof b.body?.content==='string'&&b.body.content.length>0&&b.body.content.length<=2000&&/^[a-zA-Z0-9]{1,25}$/.test(b.body.nonce||''))return [{json:{method:'POST',path:b.path,body:{content:b.body.content,nonce:b.body.nonce,enforce_nonce:true,allowed_mentions:{parse:[]}}}}];
 throw new Error('Unsupported Discord operation');`;
 const workflow={name:'InfiMatch — notifications Discord sécurisées',nodes:[
  {id:randomUUID(),name:'Réception backend',type:'n8n-nodes-base.webhook',typeVersion:2,position:[0,0],webhookId:randomUUID(),parameters:{httpMethod:'POST',path,authentication:'headerAuth',responseMode:'lastNode',options:{}},credentials:{httpHeaderAuth:{id:auth.id,name:credentialName}}},
  {id:randomUUID(),name:'Valider la demande',type:'n8n-nodes-base.code',typeVersion:2,position:[240,0],parameters:{jsCode:validator}},
  {id:randomUUID(),name:'API Discord',type:'n8n-nodes-base.httpRequest',typeVersion:4.2,position:[480,0],parameters:{method:'={{ $json.method }}',url:'={{ "https://discord.com/api/v10" + $json.path }}',authentication:'predefinedCredentialType',nodeCredentialType:'discordBotApi',sendBody:true,specifyBody:'json',jsonBody:'={{ JSON.stringify($json.body) }}',options:{timeout:15000,response:{response:{fullResponse:true,neverError:true,responseFormat:'json'}}}},credentials:{discordBotApi:{id:bot.id,name:bot.name}}}
 ],connections:{'Réception backend':{main:[[{node:'Valider la demande',type:'main',index:0}]]},'Valider la demande':{main:[[{node:'API Discord',type:'main',index:0}]]}},settings:{executionOrder:'v1',saveDataErrorExecution:'none',saveDataSuccessExecution:'none',saveManualExecutions:false,saveExecutionProgress:false},active:false};
 const listing=await api('/rest/workflows');
 const existing=(Array.isArray(listing)?listing:listing.results||[]).find(w=>w.name===workflow.name);
 const saved=existing?await api('/rest/workflows/'+existing.id,'PATCH',workflow):await api('/rest/workflows','POST',{...workflow,projectId});
 await api('/rest/workflows/'+saved.id+'/activate','POST',{versionId:saved.versionId});
 const clean=JSON.parse(JSON.stringify(workflow));for(const node of clean.nodes)delete node.credentials;
 await writeFile(resolve(root,'workflows/discord-relay.template.json'),JSON.stringify(clean,null,2)+'\n');
 console.log(JSON.stringify({workflowId:saved.id,versionId:saved.versionId,active:saved.active,vaultConfigured:true,workflowUrl:origin+'/workflow/'+saved.id}));
}finally{ws.close();}
