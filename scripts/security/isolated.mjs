import {spawn,spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {randomBytes} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..'), proof=resolve(root,'docs/proofs/v1-hardening');mkdirSync(proof,{recursive:true});
const password=randomBytes(24).toString('hex'), token=randomBytes(32).toString('hex');
const env={...process.env,INFIMATCH_SECRET_SOURCE:'vault',NODE_ENV:'test',DATABASE_URL:`postgresql://test_admin:${password}@127.0.0.1:55433/infimatch_test`,MONGODB_URI:`mongodb://test_admin:${password}@127.0.0.1:57018/infimatch_test?authSource=admin`,SESSION_SECRET:randomBytes(32).toString('hex'),DOCUMENT_KEY:randomBytes(32).toString('base64'),DOCUMENT_QUOTA_BYTES:'26214400',SERVICE_TOKEN:token,APP_ORIGIN:'http://127.0.0.1:5173',API_HOST:'0.0.0.0',PORT:'3210',N8N_WEBHOOK_BASE:'http://127.0.0.1:55679/webhook',TEST_PASSWORD:password,TEST_SERVICE_TOKEN:token,DOCUMENT_DIRECTORY:resolve(root,'data/test-documents-'+Date.now()),RPPS_API_KEY:'',FT_CLIENT_ID:'',FT_CLIENT_SECRET:'',GOOGLE_CLIENT_ID:'',TRUST_PROXY:''};
const compose=['compose','--env-file',resolve(root,'.env.vault.example'),'-f',resolve(root,'infra/test.compose.yaml')];
function run(exe,args,label){const r=spawnSync(exe,args,{cwd:root,env,encoding:'utf8',maxBuffer:16*1024*1024});const output=(r.stdout||'')+(r.stderr||'');if(label)writeFileSync(resolve(proof,label+'.txt'),output);if(r.status!==0)throw new Error(label+' failed: '+output.slice(-4000));return output;}
const npm=process.env.npm_execpath||resolve(dirname(process.execPath),process.platform==='win32'?'node_modules/npm/bin/npm-cli.js':'../lib/node_modules/npm/bin/npm-cli.js');let api;
try{
 writeFileSync(resolve(proof,'result.json'),JSON.stringify({date:new Date().toISOString(),status:'RUNNING'},null,2));
 console.log('Starting isolated services');run('docker',[...compose,'up','-d','--wait','--wait-timeout','120'],'services');
 run(process.execPath,['backend/dist/cli.js','migrate'],'fresh-migrations');
 console.log('Importing and publishing three real n8n workflows');
 run('docker',[...compose,'exec','-T','n8n','n8n','import:workflow','--separate','--input=/workflows'],'n8n-import');
 for(const id of ['InfiMatchConfirm','InfiMatchMatches','InfiMatchReminders'])run('docker',[...compose,'exec','-T','n8n','n8n','publish:workflow','--id='+id],'publish-'+id);
 run('docker',[...compose,'restart','n8n'],'n8n-restart');
 api=spawn(process.execPath,['backend/dist/main.js'],{cwd:root,env,stdio:['ignore','pipe','pipe']});let logs='';api.stdout.on('data',x=>logs+=x);api.stderr.on('data',x=>logs+=x);
 for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:3210/api/v1/health')).ok&&(await fetch('http://127.0.0.1:55679/healthz')).ok)break;}catch{}await new Promise(r=>setTimeout(r,1000));}
 console.log('Running unit and integration coverage');
 run(process.execPath,[npm,'run','coverage'],'coverage');
 console.log('Running real PostgreSQL security regressions');
 run(process.execPath,['scripts/security/regressions.cjs'],'regressions');
 writeFileSync(resolve(proof,'result.json'),JSON.stringify({date:new Date().toISOString(),status:'PASS',scope:'Isolated PostgreSQL, MongoDB, real n8n workflows, unit and integration coverage, security regressions'},null,2));
 console.log('Isolated validation PASS');
}catch(e){writeFileSync(resolve(proof,'result.json'),JSON.stringify({date:new Date().toISOString(),status:'FAIL',scope:'Isolated validation did not complete; inspect step logs'},null,2));console.error(e.message);process.exitCode=1;}finally{if(api)api.kill();run('docker',[...compose,'down','--volumes'],'cleanup');}
