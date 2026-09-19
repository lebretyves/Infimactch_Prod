import {spawn,spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..'), proof=resolve(process.env.INFIMATCH_TEST_PROOF_DIR||resolve(root,'docs_intern/proofs/v1-hardening'));mkdirSync(proof,{recursive:true});
function sourceSnapshot(){
 const files=[];function visit(dir){for(const entry of readdirSync(resolve(root,dir),{withFileTypes:true})){const path=dir+'/'+entry.name;if(entry.isDirectory())visit(path);else if(/\.(ts|json)$/.test(entry.name))files.push(path);}}
 visit('backend/src');visit('backend/test');files.push('backend/package.json');files.sort();
 const items=files.map(path=>({path,sha256:createHash('sha256').update(readFileSync(resolve(root,path))).digest('hex')}));
 return {sha256:createHash('sha256').update(JSON.stringify(items)).digest('hex'),files:items};
}
const initialSnapshot=sourceSnapshot();writeFileSync(resolve(proof,'source-snapshot.json'),JSON.stringify(initialSnapshot,null,2));
const password=randomBytes(24).toString('hex'), token=randomBytes(32).toString('hex');
const hostEnv=Object.fromEntries(['PATH','Path','SystemRoot','SYSTEMROOT','SystemDrive','ComSpec','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','ProgramData','ProgramFiles','DOCKER_CONFIG'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
const env={...hostEnv,INFIMATCH_TEST_PROOF_DIR:proof,INFIMATCH_TEST_FILES:process.env.INFIMATCH_TEST_FILES||'',INFIMATCH_SECRET_SOURCE:'vault',NODE_ENV:'test',DATABASE_URL:`postgresql://test_admin:${password}@127.0.0.1:55433/infimatch_test`,MONGODB_URI:`mongodb://test_admin:${password}@127.0.0.1:57018/infimatch_test?authSource=admin`,SESSION_SECRET:randomBytes(32).toString('hex'),DOCUMENT_KEY:randomBytes(32).toString('base64'),DOCUMENT_QUOTA_BYTES:'26214400',SERVICE_TOKEN:token,APP_ORIGIN:'http://127.0.0.1:5173',API_HOST:'0.0.0.0',PORT:'3210',N8N_WEBHOOK_BASE:'http://127.0.0.1:55679/webhook',TEST_PASSWORD:password,TEST_SERVICE_TOKEN:token,DOCUMENT_DIRECTORY:resolve(root,'data/test-documents-'+Date.now()),RPPS_API_KEY:'',FT_CLIENT_ID:'',FT_CLIENT_SECRET:'',GOOGLE_CLIENT_ID:'',SMTP2GO_API_KEY:'',SMTP2GO_FROM:'',RESEND_API_KEY:'',JOBSPIPE_API_KEY:'',DISCORD_BOT_TOKEN:'',TRUST_PROXY:''};
const compose=['compose','--env-file',resolve(root,'.env.vault.example'),'-f',resolve(root,'infra/test.compose.yaml')];
function run(exe,args,label,cwd=root){const r=spawnSync(exe,args,{cwd,env,encoding:'utf8',maxBuffer:16*1024*1024});const output=((r.stdout||'')+(r.stderr||'')).replaceAll(password,'[TEST_SECRET]').replaceAll(token,'[TEST_TOKEN]');if(label)writeFileSync(resolve(proof,label+'.txt'),output);if(r.status!==0)throw new Error(label+' failed: '+output.slice(-4000));return output;}
const npm=process.env.npm_execpath||resolve(dirname(process.execPath),process.platform==='win32'?'node_modules/npm/bin/npm-cli.js':'../lib/node_modules/npm/bin/npm-cli.js');let api;let logs='';
try{
 writeFileSync(resolve(proof,'result.json'),JSON.stringify({date:new Date().toISOString(),status:'RUNNING'},null,2));
 console.log('Compiling current local backend snapshot');run(process.execPath,[npm,'run','build'],'build');run(process.execPath,[npm,'run','test:compile','--prefix','backend'],'test-compile');
 console.log('Starting isolated services');run('docker',[...compose,'up','-d','--wait','--wait-timeout','120'],'services');
 run(process.execPath,['backend/dist/cli.js','migrate'],'fresh-migrations');
 run(process.execPath,['scripts/export-openapi.cjs'],'openapi-export');
 run(process.execPath,['scripts/security/openapi-check.cjs'],'openapi-check');

 let n8nReady=false;for(let i=0;i<90;i++){try{if((await fetch('http://127.0.0.1:55679/healthz/readiness')).ok){n8nReady=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}if(!n8nReady)throw Error('Isolated n8n startup did not finish');
 console.log('Importing and publishing three real n8n workflows');
 run('docker',[...compose,'exec','-T','n8n','n8n','import:workflow','--separate','--input=/workflows'],'n8n-import');
 for(const id of ['InfiMatchConfirm','InfiMatchMatches','InfiMatchReminders'])run('docker',[...compose,'exec','-T','n8n','n8n','publish:workflow','--id='+id],'publish-'+id);
 run('docker',[...compose,'restart','n8n'],'n8n-restart');
 api=spawn(process.execPath,['backend/dist/main.js'],{cwd:root,env,stdio:['ignore','pipe','pipe']});api.stdout.on('data',x=>logs+=x);api.stderr.on('data',x=>logs+=x);
 let apiReady=false;for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:3210/api/v1/health')).ok&&(await fetch('http://127.0.0.1:55679/healthz/readiness')).ok){apiReady=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}if(!apiReady)throw Error('Isolated API or n8n did not become ready');
 const suiteMode=process.env.INFIMATCH_TEST_FILES?'test:integration':'coverage';
 console.log('Running isolated '+suiteMode);
 if(suiteMode==='coverage')run(process.execPath,[resolve(root,'node_modules/c8/bin/c8.js'),'--all','--src=src','--extension=.ts','--include=src/**','--include=.test-build/src/**','--reporter=text','--reporter=json-summary','--reporter=html','--reports-dir=../docs_intern/proofs/coverage',process.execPath,resolve(root,'scripts/security/test-suite.cjs'),'coverage'],'coverage',resolve(root,'backend'));
 else run(process.execPath,[resolve(root,'scripts/security/test-suite.cjs'),'integration'],'targeted-integration');
 console.log('Running real PostgreSQL security regressions');
 run(process.execPath,['scripts/security/regressions.cjs'],'regressions');
 const finalSnapshot=sourceSnapshot();if(finalSnapshot.sha256!==initialSnapshot.sha256)throw Error('Backend sources changed during campaign; final result requires a stable rerun');
 writeFileSync(resolve(proof,'result.json'),JSON.stringify({date:new Date().toISOString(),sourceSha256:initialSnapshot.sha256,status:'PASS',scope:process.env.INFIMATCH_TEST_FILES?'Targeted isolated integrations and security regressions':'Isolated PostgreSQL, MongoDB, real n8n workflows, unit and integration coverage, security regressions'},null,2));
 console.log('Isolated validation PASS');
}catch(e){writeFileSync(resolve(proof,'result.json'),JSON.stringify({date:new Date().toISOString(),status:'FAIL',scope:'Isolated validation did not complete; inspect step logs'},null,2));console.error(e.message);process.exitCode=1;}finally{writeFileSync(resolve(proof,'api.txt'),logs.replaceAll(password,'[TEST_SECRET]').replaceAll(token,'[TEST_TOKEN]'));if(api)api.kill();run('docker',[...compose,'down','--volumes'],'cleanup');}
