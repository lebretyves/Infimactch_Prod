import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {parse} from 'dotenv';
import https from 'node:https';
import {root,address,request,withRole,readJson,validateSecrets,cleanEnvironment,selectKeys,keyList} from './common.mjs';

test('Vault secret payload rejects unexpected environment injection',()=>{
  assert.throws(()=>validateSecrets({NODE_OPTIONS:'--inspect'},'backend'),/INVALID_SECRET_FIELD/);
  assert.throws(()=>validateSecrets({},'backend'),/REQUIRED_SECRET_MISSING/);
});
test('Parent environment cannot supply stale backend or infrastructure secrets',()=>{
  const env=cleanEnvironment({PATH:'safe',DATABASE_URL:'old',MONGODB_URI:'old',DOCUMENT_KEY_V2:'old',POSTGRES_PASSWORD:'old',VAULT_TOKEN:'old'});
  assert.deepEqual(env,{PATH:'safe'});
});
test('Vault mode does not silently load secrets from the legacy .env',()=>{
  const env=cleanEnvironment(process.env);env.INFIMATCH_SECRET_SOURCE='vault';
  const p=spawnSync(process.execPath,['-e',"try{require('./backend/dist/config').validateConfiguration();process.exitCode=2;}catch{console.log('startup refused');}"],{cwd:root,env,encoding:'utf8'});
  assert.equal(p.status,0);assert.equal(p.stdout.trim(),'startup refused');
});
test('Real Vault is initialized and unsealed on persistent Raft',async()=>{
  const status=await request('sys/seal-status');
  assert.equal(status.initialized,true);assert.equal(status.sealed,false);assert.equal(status.storage_type,'raft');
});
test('HTTPS rejects the local certificate without the configured CA',async()=>{
  await assert.rejects(new Promise((ok,fail)=>{const r=https.get(address+'/v1/sys/init',{ca:[]},res=>{res.resume();ok();});r.setTimeout(3000,()=>r.destroy(new Error('timeout')));r.on('error',fail);}),e=>/CERT|ISSUER|SELF_SIGNED|SIGNATURE/.test(e.code));
});
test('Backend can read its exact existing secrets, and no infrastructure secret',async()=>{
  await withRole('backend',async token=>{
    const result=await request('kv/data/infimatch/v1/backend',{token});
    validateSecrets(result.data.data,'backend');
    const expected=selectKeys(parse(await readFile(resolve(root,'.env'))),keyList(result.data.data));
    assert.equal(JSON.stringify(Object.entries(result.data.data).sort())===JSON.stringify(Object.entries(expected).sort()),true,'Vault values must match the existing credentials without changing them');
    await assert.rejects(request('kv/data/infimatch/v1/infra',{token}),e=>e.status===403);
    await assert.rejects(request('kv/data/infimatch/v2/backend',{token}),e=>e.status===403);
    await assert.rejects(request('sys/policies/acl',{token}),e=>e.status===403);
    await assert.rejects(request('kv/data/infimatch/v1/forbidden-test',{method:'POST',token,data:{options:{cas:0},data:{sentinel:'not-a-secret'}}}),e=>e.status===403);
  });
});
test('Infrastructure role cannot read backend secrets',async()=>{
  await withRole('infra',async token=>{
    const result=await request('kv/data/infimatch/v1/infra',{token});validateSecrets(result.data.data,'infra');
    await assert.rejects(request('kv/data/infimatch/v1/backend',{token}),e=>e.status===403);
  });
});
test('Invalid AppRole credentials are refused',async()=>{
  const role=await readJson('backend.json');
  await assert.rejects(request('auth/approle/login',{method:'POST',data:{role_id:role.role_id,secret_id:'invalid-test-credential'}}),e=>[400,403].includes(e.status));
});
test('Short-lived launcher token is revoked after use',async()=>{
  let temporary;
  await withRole('backend',async token=>{temporary=token;});
  await assert.rejects(request('kv/data/infimatch/v1/backend',{token:temporary}),e=>e.status===403);
});
test('Initial root token is absent from the recovery file after bootstrap',async()=>{
  const recovery=await readJson('recovery.json');
  assert.equal('root_token' in recovery,false);assert.equal(recovery.keys_base64.length,3);assert.equal(recovery.threshold,2);
});
