import {randomBytes,createCipheriv,hkdfSync} from 'node:crypto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {totp,verifyTotp,newTotpSecret,sealSecret,openSecret} from '../../src/admin/mfa';
import {permitted} from '../../src/admin/permissions';
const secret='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
test('TOTP matches RFC6238 SHA1 vectors',()=>{for(const [time,expected] of [[59,'94287082'],[1111111109,'07081804'],[1111111111,'14050471'],[1234567890,'89005924'],[2000000000,'69279037'],[20000000000,'65353130']] as const)assert.equal(totp(secret,Math.floor(time/30),8),expected);});
test('MFA rejects replay, expired code and invalid input',()=>{const now=1234567890000,counter=Math.floor(now/30000),code=totp(secret,counter);assert.equal(verifyTotp(secret,code,counter-1,now),counter);assert.equal(verifyTotp(secret,code,counter,now),null);assert.equal(verifyTotp(secret,code,-1,now+120000),null);assert.equal(verifyTotp(secret,'000x00',-1,now),null);});
test('MFA secret encryption authenticates ciphertext',()=>{const value=newTotpSecret(),sealed=sealSecret(value);assert.equal(openSecret(sealed),value);const bytes=Buffer.from(sealed,'base64');bytes[30]=bytes[30]!^1;assert.throws(()=>openSecret(bytes.toString('base64')));});
test('platform roles never grant arbitrary document or assignment access',()=>{for(const role of ['OWNER','SUPPORT','OPS','AUDITOR'] as const){assert.equal(permitted(role,'documents:download'),false);assert.equal(permitted(role,'assignments:force'),false);}assert.equal(permitted('OPS','accounts'),false);assert.equal(permitted('SUPPORT','access:write'),false);assert.equal(permitted('AUDITOR','jobs:retry'),false);});


test('legacy, versioned document and dedicated MFA secrets survive staged rotation',()=>{
 const names=['DOCUMENT_KEY','DOCUMENT_KEY_V1','DOCUMENT_KEY_VERSION','ADMIN_MFA_KEY','ADMIN_MFA_KEY_V1','ADMIN_MFA_KEY_VERSION'];const saved=Object.fromEntries(names.map(k=>[k,process.env[k]]));
 try{
  for(const k of names)delete process.env[k];const old=randomBytes(32);process.env.DOCUMENT_KEY=old.toString('base64');
  const root=hkdfSync('sha256',old,Buffer.from('infimatch-admin'),Buffer.from('totp-v1'),32),iv=randomBytes(12),c=createCipheriv('aes-256-gcm',Buffer.from(root),iv),ciphertext=Buffer.concat([c.update(secret),c.final()]);const legacy=Buffer.concat([iv,c.getAuthTag(),ciphertext]).toString('base64');
  const v1=sealSecret(secret);process.env.DOCUMENT_KEY_V1=process.env.DOCUMENT_KEY;process.env.DOCUMENT_KEY=randomBytes(32).toString('base64');process.env.DOCUMENT_KEY_VERSION='2';
  assert.equal(openSecret(legacy),secret);assert.equal(openSecret(v1),secret);
  process.env.ADMIN_MFA_KEY=randomBytes(32).toString('base64');const mfa=sealSecret(secret);assert.match(mfa,/^mfa\.1\./);
  process.env.ADMIN_MFA_KEY_V1=process.env.ADMIN_MFA_KEY;process.env.ADMIN_MFA_KEY=randomBytes(32).toString('base64');process.env.ADMIN_MFA_KEY_VERSION='2';assert.equal(openSecret(mfa),secret);
  delete process.env.ADMIN_MFA_KEY_V1;assert.throws(()=>openSecret(mfa));
 }finally{for(const [k,v] of Object.entries(saved)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
