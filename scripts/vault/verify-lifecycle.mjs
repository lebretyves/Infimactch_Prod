import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {root,request,withRole} from './common.mjs';
const proof={date:new Date().toISOString(),checks:[]};
const fingerprint=async()=>withRole('backend',async token=>{const r=await request('kv/data/infimatch/v1/backend',{token});return createHash('sha256').update(JSON.stringify(r.data)).digest('hex');});
function run(binary,args){const p=spawnSync(binary,args,{cwd:root,encoding:'utf8',timeout:45000});if(p.status!==0)throw new Error('Verification command failed');return p;}
let child;
try{
 const before=await fingerprint();
 run('docker',['compose','-f','infra/vault/compose.yaml','restart','vault']);
 let state;
 for(let i=0;i<20;i++){try{state=await request('sys/seal-status');break;}catch{await new Promise(r=>setTimeout(r,500));}}
 assert.equal(state?.sealed,true);proof.checks.push('restart_seals_vault');
 const refused=spawnSync(process.execPath,['scripts/vault/run.mjs','check'],{cwd:root,encoding:'utf8',timeout:15000});
 assert.equal(refused.status,1);assert.equal(refused.stdout.includes('configurationValid'),false);proof.checks.push('sealed_vault_refuses_launch_without_env_fallback');
 run(process.execPath,['scripts/vault/manage.mjs','unseal']);
 assert.equal(await fingerprint(),before);proof.checks.push('secrets_persist_after_restart_and_unseal');
 run(process.execPath,['scripts/vault/run.mjs','check']);proof.checks.push('database_connection_from_vault');
 const port=3191;
 child=spawn(process.execPath,['scripts/vault/run.mjs','api'],{cwd:root,env:{...process.env,PORT:String(port)},stdio:'ignore'});
 let response;
 for(let i=0;i<30;i++){
   if(child.exitCode!==null)throw new Error('API exited before readiness');
   try{const r=await fetch('http://127.0.0.1:'+port+'/api/v1/health',{signal:AbortSignal.timeout(1000)});if(r.ok){response=await r.json();break;}}catch{}
   await new Promise(r=>setTimeout(r,500));
 }
 assert.equal(response?.status,'ok');proof.checks.push('api_started_with_vault_secrets_health_200');
 run(process.execPath,['scripts/vault/manage.mjs','snapshot']);proof.checks.push('encrypted_raft_snapshot_created');
 proof.scope='Local Vault lifecycle and isolated API health; no live AppRole credential rotation or full restore performed.';
 await writeFile(resolve(root,'docs/proofs/vault-lifecycle.json'),JSON.stringify(proof,null,2)+'\n');
 console.log(JSON.stringify(proof,null,2));
}catch(e){console.error('Vault lifecycle verification failed: '+e.message);process.exitCode=1;}
finally{
 if(child?.pid){if(process.platform==='win32')spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore'});else child.kill('SIGTERM');}
}
