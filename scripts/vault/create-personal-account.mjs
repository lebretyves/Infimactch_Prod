import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {root,request,readJson,saveJson,revoke} from './common.mjs';
const configPath=root+'/infra/vault/server.hcl';
const original=await readFile(configPath,'utf8');
if(original.includes('enable_unauthenticated_access'))throw new Error('REVIEW_EXISTING_RECOVERY_CONFIGURATION');
const proof={createdAt:new Date().toISOString(),username:'lebre',method:'userpass',scope:'V1 read only'};
let admin,attempt,changed=false;
async function restart(){
 execFileSync('docker',['compose','-f','infra/vault/compose.yaml','restart','vault'],{cwd:root,stdio:'pipe'});
 for(let i=0;i<20;i++){try{await request('sys/seal-status');break;}catch{await new Promise(r=>setTimeout(r,500));}}
 execFileSync(process.execPath,['scripts/vault/manage.mjs','unseal'],{cwd:root,stdio:'pipe'});
}
async function denied(path,token){await assert.rejects(request(path,{token}),e=>e.status===403);}
try {
 await writeFile(configPath,original+'\n# Temporary account setup; restored in finally.\nenable_unauthenticated_access = ["generate-root"]\n');
 changed=true;
 await restart();
 const status=await request('sys/generate-root/attempt');
 if(status.started)throw new Error('OTHER_RECOVERY_ATTEMPT_EXISTS');
 attempt=await request('sys/generate-root/attempt',{method:'POST',data:{}});
 const recovery=await readJson('recovery.json');
 let result;
 for(const key of recovery.keys_base64.slice(0,recovery.threshold??2)){
  result=await request('sys/generate-root/update',{method:'POST',data:{nonce:attempt.nonce,key}});
  if(result.complete)break;
 }
 if(!result?.complete)throw new Error('RECOVERY_INCOMPLETE');
 const encoded=Buffer.from(result.encoded_token??result.encoded_root_token,'base64');
 const otp=Buffer.from(attempt.otp);
 if(encoded.length!==otp.length)throw new Error('RECOVERY_TOKEN_LENGTH');
 admin=Buffer.from(encoded.map((b,i)=>b^otp[i])).toString();
 const auth=await request('sys/auth',{token:admin});
 if(auth['userpass/']&&auth['userpass/'].type!=='userpass')throw new Error('AUTH_PATH_OCCUPIED');
 if(!auth['userpass/'])await request('sys/auth/userpass',{method:'POST',token:admin,data:{type:'userpass',description:'InfiMatch personal local login',config:{listing_visibility:'unauth',default_lease_ttl:'30m',max_lease_ttl:'2h'}}});
 try{await request('auth/userpass/users/lebre',{token:admin});throw new Error('USER_ALREADY_EXISTS');}catch(e){if(e.status!==404)throw e;}
 const policy=await readFile(root+'/infra/vault/personal-lebre.hcl','utf8');
 await request('sys/policies/acl/infimatch-personal-lebre',{method:'PUT',token:admin,data:{policy}});
 const password=randomBytes(24).toString('base64url');
 await saveJson('userpass-lebre.json',{username:'lebre',password,method:'userpass',url:'https://127.0.0.1:58200/ui/vault/auth?with=userpass',createdAt:new Date().toISOString()});
 await request('auth/userpass/users/lebre',{method:'POST',token:admin,data:{password,token_policies:['infimatch-personal-lebre'],token_no_default_policy:true,token_ttl:'30m',token_max_ttl:'2h'}});
 proof.accountCreated=true;
 const login=await request('auth/userpass/login/lebre',{method:'POST',data:{password}});
 const token=login.auth.client_token;
 try{
  assert.deepEqual(login.auth.policies,['infimatch-personal-lebre']);
  for(const group of ['backend','infra'])await request('kv/data/infimatch/v1/'+group,{token});
  await request('kv/metadata/infimatch/v1',{method:'LIST',token});
  await denied('kv/data/infimatch/v2/backend',token);
  await denied('sys/policies/acl',token);
  const paths=['kv/data/infimatch/v1/backend','kv/data/infimatch/v1/infra','sys/auth/userpass','auth/userpass/users/another/password'];
  const caps=await request('sys/capabilities-self',{method:'POST',token,data:{paths}});
  assert.deepEqual(caps['kv/data/infimatch/v1/backend'],['read']);
  assert.deepEqual(caps['kv/data/infimatch/v1/infra'],['read']);
  assert.deepEqual(caps['sys/auth/userpass'],['deny']);
  assert.deepEqual(caps['auth/userpass/users/another/password'],['deny']);
  proof.loginAndPermissionsVerified=true;
 }finally{await revoke(token);}
} finally {
 try{
  if(admin){
   let done=false;
   for(let i=0;i<3&&!done;i++){try{await revoke(admin);done=true;}catch{await new Promise(r=>setTimeout(r,500));}}
   if(!done)throw new Error('ADMIN_REVOCATION_NEEDS_RECOVERY');
   await denied('sys/auth',admin);
   proof.temporaryRootRevoked=true;
  }else if(attempt){await request('sys/generate-root/attempt',{method:'DELETE'});}
 }finally{
  if(changed){await writeFile(configPath,original);await restart();proof.recoveryConfigurationRestored=true;}
  await writeFile(root+'/docs/proofs/vault-personal-account.json',JSON.stringify(proof,null,2)+'\n');
 }
}
await assert.rejects(request('sys/generate-root/attempt'),e=>e.status===403);
proof.unauthenticatedRecoveryDenied=true;
await writeFile(root+'/docs/proofs/vault-personal-account.json',JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify(proof));
