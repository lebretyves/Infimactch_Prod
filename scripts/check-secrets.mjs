import {execFileSync} from 'node:child_process';import {readFileSync,existsSync} from 'node:fs';import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
let env='';try{env=readFileSync(resolve(root,'.env'),'utf8');}catch{}
const secrets=env.split(/\r?\n/).filter(l=>/^(SESSION_SECRET|SERVICE_TOKEN|DOCUMENT_KEY(?:_V\d+)?|POSTGRES_PASSWORD|MONGO_PASSWORD|N8N_ENCRYPTION_KEY|FT_CLIENT_SECRET|RPPS_API_KEY)=/.test(l)).map(l=>l.slice(l.indexOf('=')+1)).filter(v=>v.length>=16);
const bad=files.filter(f=>{if(!existsSync(resolve(root,f)))return false;const data=readFileSync(resolve(root,f));return secrets.some(s=>data.includes(Buffer.from(s)));});
if(bad.length){console.error('Local secret detected in tracked files:',bad);process.exitCode=1;}else console.log('No configured local secret found in tracked files.');
