import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {request,readJson,privateDir,withRole,revoke} from './common.mjs';
import {repairOperatorRotationPolicy} from './operator-policy.mjs';
// This maintenance operation requires explicit authorization for temporary root recovery.
// No recovery or writes occur without --apply. Secrets and recovery keys never go to stdout.
async function repair(){
 const installation=resolve(privateDir,'../..'),configPath=resolve(installation,'infra/vault/server.hcl');
 const original=await readFile(configPath,'utf8');
 if(original.includes('enable_unauthenticated_access'))throw Error('EXISTING_RECOVERY_CONFIG');
 const proof={checkedAt:new Date().toISOString(),scope:'Repair invalid operator AppRole rotation paths only'};
 let admin,attempt,changed=false;
 async function restart(){
  execFileSync('docker',['compose','-f','infra/vault/compose.yaml','restart','vault'],{cwd:installation,stdio:'pipe',timeout:60000});
  let ready=false;
  for(let i=0;i<30;i++){try{await request('sys/seal-status');ready=true;break;}catch{await new Promise(r=>setTimeout(r,500));}}
  if(!ready)throw Error('VAULT_RESTART_TIMEOUT');
  let status=await request('sys/seal-status');
  if(status.sealed){const r=await readJson('recovery.json');for(const key of r.keys_base64.slice(0,r.threshold??2)){status=await request('sys/unseal',{method:'POST',data:{key}});if(!status.sealed)break;}}
  if(status.sealed)throw Error('VAULT_STILL_SEALED');
 }
 try{
  const snapshot=await withRole('operator',token=>request('sys/storage/raft/snapshot',{token,raw:true}));
  await writeFile(resolve(privateDir,'raft-before-policy-repair-'+Date.now()+'.snap'),snapshot,{flag:'wx',mode:0o600});proof.snapshotSaved=true;
  changed=true;await writeFile(configPath,original+'\n# Temporary quorum-based recovery; restored in finally.\nenable_unauthenticated_access = ["generate-root"]\n');
  await restart();const status=await request('sys/generate-root/attempt');if(status.started)throw Error('OTHER_RECOVERY_ACTIVE');
  attempt=await request('sys/generate-root/attempt',{method:'POST',data:{}});
  const recovery=await readJson('recovery.json');let result;
  for(const key of recovery.keys_base64.slice(0,recovery.threshold??2)){result=await request('sys/generate-root/update',{method:'POST',data:{nonce:attempt.nonce,key}});if(result.complete)break;}
  if(!result?.complete)throw Error('RECOVERY_INCOMPLETE');
  const encoded=Buffer.from(result.encoded_token??result.encoded_root_token,'base64'),otp=Buffer.from(attempt.otp);assert.equal(encoded.length,otp.length);
  admin=Buffer.from(encoded.map((b,i)=>b^otp[i])).toString();
  const path='sys/policies/acl/infimatch-v1-operator',before=(await request(path,{token:admin})).data.policy,after=repairOperatorRotationPolicy(before);
  assert.notEqual(after,before,'Expected unsupported rotation paths');assert.ok(!after.includes('infimatch-v1-*/'));
  await request(path,{method:'PUT',token:admin,data:{policy:after}});
  assert.equal((await request(path,{token:admin})).data.policy,after);
  proof.policyUpdated=true;proof.beforeHash=createHash('sha256').update(before).digest('hex');proof.afterHash=createHash('sha256').update(after).digest('hex');
 }finally{
  try{
   if(admin){await revoke(admin);await assert.rejects(request('sys/auth',{token:admin}),e=>e.status===403);proof.temporaryRootRevoked=true;}
   else if(attempt)await request('sys/generate-root/attempt',{method:'DELETE'});
  }finally{if(changed){await writeFile(configPath,original);await restart();proof.originalConfigurationRestored=(await readFile(configPath,'utf8'))===original;}}
 }
 await assert.rejects(request('sys/generate-root/attempt'),e=>e.status===403);proof.unauthenticatedRecoveryDenied=true;
 await withRole('operator',async token=>{for(const role of ['backend','infra','operator'])await request('auth/approle/role/infimatch-v1-'+role+'/role-id',{token});});proof.operatorAccessVerified=true;
 console.log(JSON.stringify(proof));
}
if(!process.argv.includes('--apply'))console.log(JSON.stringify({mode:'PLAN_ONLY',requires:'Explicit authorization for temporary Vault root recovery, restart, and operator ACL update',steps:['Save private Raft snapshot','Quorum recovery with existing local shares','Expand invalid wildcard to nine exact AppRole paths only','Revoke temporary root and restore original configuration','Verify operator access; then run vault:renew'],applicationSecretsChanged:false}));
else await repair().catch(error=>{console.error(JSON.stringify({status:'FAIL',code:/^[A-Z_]+$/.test(error.message)?error.message:'VAULT_POLICY_REPAIR_FAILED'}));process.exitCode=1;});
