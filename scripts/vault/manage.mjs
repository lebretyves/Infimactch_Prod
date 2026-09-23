import {repairOperatorRotationPolicy} from './operator-policy.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {parse} from 'dotenv';
import {root,privateDir,request,readJson,saveJson,withRole,revoke,selectKeys,keyList,infraKeys,configKeys,validateSecrets} from './common.mjs';
const secretPath=group=>'kv/data/infimatch/v1/'+group;
const roleName=group=>'infimatch-v1-'+group;
async function initialized() { return (await request('sys/init')).initialized; }
async function waitReady() {
  for(let i=0;i<20;i++){
    try{await request('sys/health');return;}catch(e){if(![429,500,503].includes(e.status))throw e;await new Promise(r=>setTimeout(r,500));}
  }
  throw new Error('VAULT_NOT_READY');
}
async function unseal() {
  const state=await request('sys/seal-status');
  if(!state.sealed){await waitReady();return;}
  const recovery=await readJson('recovery.json');
  for(const key of recovery.keys_base64.slice(0,recovery.threshold??2)){
    const result=await request('sys/unseal',{method:'POST',data:{key}});
    if(!result.sealed){await waitReady();return;}
  }
  throw new Error('VAULT_UNSEAL_INCOMPLETE');
}
async function issueCredentials(group,token) {
  const role=await request('auth/approle/role/'+roleName(group)+'/role-id',{token});
  const secret=await request('auth/approle/role/'+roleName(group)+'/secret-id',{method:'POST',data:{},token});
  await saveJson(group+'.json',{role_id:role.data.role_id,secret_id:secret.data.secret_id,secret_id_accessor:secret.data.secret_id_accessor,createdAt:new Date().toISOString(),ttlSeconds:secret.data.secret_id_ttl});
}
async function writeSecrets(token,{initial=false}={}) {
  const input=parse(await readFile(resolve(root,'.env')));
  const groups={backend:validateSecrets(selectKeys(input,keyList(input)),'backend'),infra:validateSecrets(selectKeys(input,infraKeys),'infra')};
  for(const [group,data] of Object.entries(groups)){
    let current;
    try{current=await request(secretPath(group),{token});}catch(e){if(e.status!==404)throw e;}
    if(initial&&current){
      if(JSON.stringify(Object.entries(data).sort())!==JSON.stringify(Object.entries(current.data.data).sort()))throw new Error('VAULT_EXISTING_SECRET_DIFFERS_USE_SYNC');
      continue;
    }
    await request(secretPath(group),{method:'POST',token,data:{options:{cas:current?.data.metadata.version??0},data}});
  }
  const config=selectKeys(input,configKeys);
  if(!config.APP_ORIGIN)throw new Error('APP_ORIGIN_REQUIRED');
  config.NODE_ENV??='development';config.PORT??='3100';
  await saveJson('runtime.json',config);
}
async function bootstrap() {
  let ready=false;
  for(let i=0;i<20;i++) {try{await initialized();ready=true;break;}catch{await new Promise(r=>setTimeout(r,1000));}}
  if(!ready)throw new Error('VAULT_NOT_REACHABLE_TLS');
  if(!await initialized()){
    const init=await request('sys/init',{method:'POST',data:{secret_shares:3,secret_threshold:2}});
    await saveJson('recovery.json',{...init,threshold:2,createdAt:new Date().toISOString()});
  }
  await unseal();
  const recovery=await readJson('recovery.json');
  if(!recovery.root_token){await withRole('backend',token=>request(secretPath('backend'),{token}));console.log('Vault already configured; existing secrets preserved.');return;}
  const token=recovery.root_token;
  const audits=await request('sys/audit',{token});
  if(!audits['file/'])await request('sys/audit/file',{method:'POST',token,data:{type:'file',options:{file_path:'/vault/logs/audit.json',mode:'0600'}}});
  const mounts=await request('sys/mounts',{token});
  if(!mounts['kv/'])await request('sys/mounts/kv',{method:'POST',token,data:{type:'kv',options:{version:'2'}}});
  await request('kv/config',{method:'POST',token,data:{cas_required:true,max_versions:5}});
  const auth=await request('sys/auth',{token});
  if(!auth['approle/'])await request('sys/auth/approle',{method:'POST',token,data:{type:'approle'}});
  await writeSecrets(token,{initial:true});
  const self='path "auth/token/revoke-self" { capabilities = ["update"] }\n';
  for(const group of ['backend','infra','operator']){
    let policy=group==='operator'
      ? 'path "kv/data/infimatch/v1/*" { capabilities = ["read", "create", "update"] }\npath "kv/metadata/infimatch/v1/*" { capabilities = ["read"] }\npath "auth/approle/role/infimatch-v1-*/role-id" { capabilities = ["read"] }\npath "auth/approle/role/infimatch-v1-*/secret-id" { capabilities = ["update"] }\npath "auth/approle/role/infimatch-v1-*/secret-id-accessor/destroy" { capabilities = ["update"] }\npath "sys/storage/raft/snapshot" { capabilities = ["read"] }\n'
      : 'path "'+secretPath(group)+'" { capabilities = ["read"] }\n';
    if(group==='operator')policy=repairOperatorRotationPolicy(policy);
    await request('sys/policies/acl/'+roleName(group),{method:'PUT',token,data:{policy:policy+self}});
    await request('auth/approle/role/'+roleName(group),{method:'POST',token,data:{token_policies:[roleName(group)],token_no_default_policy:true,token_ttl:'5m',token_max_ttl:'10m',secret_id_ttl:group==='operator'?'720h':'168h',bind_secret_id:true}});
    await issueCredentials(group,token);
  }
  await withRole('backend',t=>request(secretPath('backend'),{token:t}));
  await revoke(token);
  delete recovery.root_token;
  await saveJson('recovery.json',recovery);
  console.log('Vault configured: TLS, persistent Raft, audit, KV v2, separate AppRoles; initial root token revoked.');
}
async function rotate() {
  await withRole('operator',async token=>{
    for(const group of ['backend','infra','operator']){
      const previous=await readJson(group+'.json');
      await issueCredentials(group,token);
      await withRole(group,async()=>{});
      await request('auth/approle/role/'+roleName(group)+'/secret-id-accessor/destroy',{method:'POST',token,data:{secret_id_accessor:previous.secret_id_accessor}});
    }
  });
  console.log('AppRole credentials rotated and previous SecretIDs revoked; database passwords and document keys unchanged.');
}
async function snapshot() {
  const bytes=await withRole('operator',token=>request('sys/storage/raft/snapshot',{token,raw:true}));
  const name='raft-'+new Date().toISOString().replace(/[:.]/g,'-')+'.snap';
  await writeFile(resolve(privateDir,name),bytes,{mode:0o600,flag:'wx'});
  console.log('Private encrypted Raft snapshot saved: data/vault/'+name);
}
try {
  const command=process.argv[2];
  if(command==='bootstrap')await bootstrap();
  else if(command==='unseal'){await unseal();console.log('Vault unsealed.');}
  else if(command==='status'){const s=await request('sys/seal-status');console.log(JSON.stringify({initialized:s.initialized,sealed:s.sealed,version:s.version,storage:s.storage_type}));}
  else if(command==='rotate')await rotate();
  else if(command==='sync'){await withRole('operator',token=>writeSecrets(token));console.log('Existing .env values copied to versioned Vault secrets; no secret printed.');}
  else if(command==='snapshot')await snapshot();
  else throw new Error('Use bootstrap, unseal, status, rotate, sync or snapshot');
} catch(e) {console.error('Vault operation failed: '+e.message);process.exitCode=1;}
