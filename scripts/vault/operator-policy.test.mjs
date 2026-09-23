import {test} from 'node:test';
import assert from 'node:assert/strict';
import {repairOperatorRotationPolicy} from './operator-policy.mjs';
test('operator rotation ACL names only the three intended AppRoles and preserves secret ACLs',()=>{
 const secret='path "kv/data/infimatch/v1/*" { capabilities = ["read", "create", "update"] }';
 const input=secret+'\n'+['role-id','secret-id','secret-id-accessor/destroy'].map((suffix,i)=>`path "auth/approle/role/infimatch-v1-*/${suffix}" { capabilities = ["${i===0?'read':'update'}"] }`).join('\n');
 const output=repairOperatorRotationPolicy(input);
 assert.ok(output.startsWith(secret));assert.ok(!output.includes('infimatch-v1-*/'));
 for(const role of ['backend','infra','operator'])for(const suffix of ['role-id','secret-id','secret-id-accessor/destroy'])assert.ok(output.includes(`"auth/approle/role/infimatch-v1-${role}/${suffix}"`));
 assert.equal((output.match(/auth\/approle\/role\//g)||[]).length,9);
 assert.equal(repairOperatorRotationPolicy(output),output);
 assert.equal(repairOperatorRotationPolicy('path "unrelated/*" {capabilities=["read"]}'),'path "unrelated/*" {capabilities=["read"]}');
});
