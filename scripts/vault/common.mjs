import { readFile, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import https from 'node:https';
import {getCACertificates} from 'node:tls';
export const root = resolve(import.meta.dirname, '../..');
export const privateDir = resolve(root, 'data/vault');
export const address = 'https://127.0.0.1:58200';
export const backendKeys = ['DATABASE_URL','MONGODB_URI','SESSION_SECRET','DOCUMENT_KEY','SERVICE_TOKEN','RPPS_API_KEY','FT_CLIENT_ID','FT_CLIENT_SECRET','JOBSPIPE_API_KEY','GOOGLE_CLIENT_ID'];
export const infraKeys = ['POSTGRES_PASSWORD','MONGO_PASSWORD','N8N_ENCRYPTION_KEY','SERVICE_TOKEN'];
export const configKeys = ['NODE_ENV','PORT','APP_ORIGIN','TRUST_PROXY','DOCUMENT_KEY_VERSION','DOCUMENT_QUOTA_BYTES','MATCHING_RETENTION_DAYS','BUSINESS_HISTORY_RETENTION_DAYS','MATCHING_WEIGHTS_JSON','N8N_WEBHOOK_BASE','REMINDER_DELAY_MINUTES','GOOGLE_CLIENT_ID'];
export async function readJson(name) { return JSON.parse(await readFile(resolve(privateDir,name),'utf8')); }
export async function saveJson(name, data) {
  const path=resolve(privateDir,name), temporary=path+'.tmp';
  await writeFile(temporary,JSON.stringify(data,null,2)+'\n',{mode:0o600});
  await rename(temporary,path);
}
export async function request(path, {method='GET',data,token,raw=false}={}) {
  const ca=[await readFile(resolve(privateDir,'tls/ca.crt')),...getCACertificates('system')];
  return new Promise((ok,fail)=>{
    const body=data===undefined?undefined:JSON.stringify(data);
    const req=https.request(new URL('/v1/'+path,address),{method,ca,rejectUnauthorized:true,
      headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{'X-Vault-Token':token}:{})}},res=>{
      const chunks=[];let length=0;
      res.on('data',chunk=>{length+=chunk.length;if(length>32*1024*1024)req.destroy(new Error('VAULT_RESPONSE_TOO_LARGE'));else chunks.push(chunk);});
      res.on('error',()=>fail(new Error('VAULT_RESPONSE_FAILED')));
      res.on('end',()=>{
        const bytes=Buffer.concat(chunks),status=res.statusCode;
        if(status<200||status>=300){const e=new Error('VAULT_HTTP_'+status+' at '+path);e.status=status;return fail(e);}
        try{ok(raw?bytes:(bytes.length?JSON.parse(bytes.toString()):{}));}catch{fail(new Error('VAULT_INVALID_JSON'));}
      });
    });
    req.setTimeout(10000,()=>req.destroy(new Error('VAULT_TIMEOUT')));
    req.on('error',()=>fail(new Error('VAULT_CONNECTION_FAILED')));
    req.end(body);
  });
}
export async function login(role) {
  const credentials=await readJson(role+'.json');
  const result=await request('auth/approle/login',{method:'POST',data:{role_id:credentials.role_id,secret_id:credentials.secret_id}});
  if(!result.auth?.client_token)throw new Error('VAULT_LOGIN_FAILED');
  return result.auth.client_token;
}
export async function revoke(token) { await request('auth/token/revoke-self',{method:'POST',token}); }
export async function withRole(role, operation) {
  const token=await login(role);
  try{return await operation(token);}finally{await revoke(token);}
}
export function selectKeys(input,keys) { return Object.fromEntries(keys.filter(k=>typeof input[k]==='string').map(k=>[k,input[k]])); }
export function keyList(input) { return [...backendKeys,...Object.keys(input).filter(k=>/^DOCUMENT_KEY_V[1-9][0-9]*$/.test(k))]; }
export function validateSecrets(values,group) {
  if(!values||typeof values!=='object'||Array.isArray(values))throw new Error('VAULT_INVALID_SECRET_OBJECT');
  const allowed=group==='backend'?keyList(values):infraKeys;
  for(const [key,value] of Object.entries(values)) if(!allowed.includes(key)||typeof value!=='string'||value.includes('\0'))throw new Error('VAULT_INVALID_SECRET_FIELD');
  const required=group==='backend'?backendKeys.slice(0,5):infraKeys;
  for(const key of required)if(!values[key]||values[key].startsWith('GENERATE_'))throw new Error('VAULT_REQUIRED_SECRET_MISSING');
  return values;
}
export function cleanEnvironment(env) {
  const result={...env};
  for(const key of Object.keys(result))if(keyList(result).includes(key)||infraKeys.includes(key)||key.startsWith('VAULT_')||key.startsWith('INFIMATCH_VAULT_'))delete result[key];
  return result;
}
