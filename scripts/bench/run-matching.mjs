import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
const root=resolve(import.meta.dirname,'../..');
const optimization=process.argv.includes('--optimization');
const proof=resolve(root,existsSync(resolve(root,'docs_intern'))?'docs_intern':'annexe','proofs',optimization?'matching-optimization':'matching-diagnostic');mkdirSync(proof,{recursive:true});
const host=Object.fromEntries(['PATH','Path','SystemRoot','SYSTEMROOT','SystemDrive','ComSpec','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','ProgramData','ProgramFiles','DOCKER_CONFIG'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
const secret=randomBytes(24).toString('hex');
const env={...host,NODE_ENV:'test',INFIMATCH_SECRET_SOURCE:'vault',DATABASE_URL:`postgresql://test_admin:${secret}@127.0.0.1:55433/infimatch_test`,MONGODB_URI:`mongodb://test_admin:${secret}@127.0.0.1:57018/infimatch_test?authSource=admin`,SESSION_SECRET:randomBytes(32).toString('hex'),DOCUMENT_KEY:randomBytes(32).toString('base64'),SERVICE_TOKEN:secret,TEST_PASSWORD:secret,TEST_SERVICE_TOKEN:secret,APP_ORIGIN:'http://127.0.0.1:5173',BENCH_PROOF:proof,BENCH_COMPARE_BASELINE:optimization?'1':''};
const compose=['compose','-p','infimatch-matching-diag','--env-file','.env.vault.example','-f','infra/test.compose.yaml'];
function run(exe,args,name){const r=spawnSync(exe,args,{cwd:root,env,encoding:'utf8',timeout:300000,maxBuffer:16*1024*1024});const output=((r.stdout||'')+(r.stderr||'')).replaceAll(secret,'[REDACTED]');writeFileSync(resolve(proof,name+'.txt'),output);console.log(name+': '+r.status);if(r.status!==0)throw Error(name+' failed: '+output.slice(-1600));return output;}
let started=false;
try{
const occupied=run('docker',['ps','--filter','publish=55433','--format','{{.Names}}'],'port-check');if(occupied.trim())throw Error('Isolated test port already occupied; stop without touching that service');
const npm=process.env.npm_execpath||resolve(dirname(process.execPath),process.platform==='win32'?'node_modules/npm/bin/npm-cli.js':'../lib/node_modules/npm/bin/npm-cli.js');run(process.execPath,[npm,'run','build'],'build');
started=true;run('docker',[...compose,'up','-d','--wait','--wait-timeout','120','postgres','mongo'],'services');env.BENCH_PG_CONTAINER=run('docker',[...compose,'ps','-q','postgres'],'postgres-container').trim();
run(process.execPath,['backend/dist/cli.js','migrate'],'migrate');run(process.execPath,['scripts/bench/matching.cjs'],'measurements');
} catch(e){console.error(e.message);process.exitCode=1;}finally{if(started)run('docker',[...compose,'down','--volumes'],'cleanup');}
