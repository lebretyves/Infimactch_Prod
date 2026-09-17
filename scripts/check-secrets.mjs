import {execFileSync} from 'node:child_process';import {readFileSync,existsSync} from 'node:fs';import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
let env='';try{env=readFileSync(resolve(root,'.env'),'utf8');}catch{}
const secrets=env.split(/\r?\n/).filter(l=>/^(SESSION_SECRET|SERVICE_TOKEN|DOCUMENT_KEY(?:_V\d+)?|POSTGRES_PASSWORD|MONGO_PASSWORD|N8N_ENCRYPTION_KEY|FT_CLIENT_SECRET|RPPS_API_KEY|JOBSPIPE_API_KEY)=/.test(l)).map(l=>l.slice(l.indexOf('=')+1)).filter(v=>v.length>=16);
for(const name of ['backend','infra','operator','recovery','userpass-lebre']){
  try{
    const value=JSON.parse(readFileSync(resolve(root,'data/vault/'+name+'.json'),'utf8'));
    for(const key of ['secret_id','root_token','password'])if(typeof value[key]==='string')secrets.push(value[key]);
    for(const key of ['keys','keys_base64'])if(Array.isArray(value[key]))secrets.push(...value[key]);
  }catch{}
}
for(const line of env.split(/\r?\n/)){
 if(/^(DATABASE_URL|MONGODB_URI)=/.test(line)){try{const password=decodeURIComponent(new URL(line.slice(line.indexOf('=')+1)).password);if(password)secrets.push(password);}catch{}}
}
try{const roles=JSON.parse(readFileSync(resolve(root,'data/security/database-roles.json'),'utf8'));secrets.push(...Object.values(roles).filter(v=>typeof v==='string'));}catch{}
const bad=files.filter(f=>{if(!existsSync(resolve(root,f)))return false;const data=readFileSync(resolve(root,f));return secrets.some(s=>data.includes(Buffer.from(s)));});
if(bad.length){console.error('Local secret detected in tracked files:',bad);process.exitCode=1;}else console.log('No configured local secret found in tracked files.');
