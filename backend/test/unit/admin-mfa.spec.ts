import {test} from 'node:test';
import assert from 'node:assert/strict';
import {totp,verifyTotp,newTotpSecret,sealSecret,openSecret} from '../../src/admin/mfa';
import {permitted} from '../../src/admin/permissions';
const secret='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
test('TOTP matches RFC6238 SHA1 vectors',()=>{for(const [time,expected] of [[59,'94287082'],[1111111109,'07081804'],[1111111111,'14050471'],[1234567890,'89005924'],[2000000000,'69279037'],[20000000000,'65353130']] as const)assert.equal(totp(secret,Math.floor(time/30),8),expected);});
test('MFA rejects replay, expired code and invalid input',()=>{const now=1234567890000,counter=Math.floor(now/30000),code=totp(secret,counter);assert.equal(verifyTotp(secret,code,counter-1,now),counter);assert.equal(verifyTotp(secret,code,counter,now),null);assert.equal(verifyTotp(secret,code,-1,now+120000),null);assert.equal(verifyTotp(secret,'000x00',-1,now),null);});
test('MFA secret encryption authenticates ciphertext',()=>{const value=newTotpSecret(),sealed=sealSecret(value);assert.equal(openSecret(sealed),value);const bytes=Buffer.from(sealed,'base64');bytes[30]=bytes[30]!^1;assert.throws(()=>openSecret(bytes.toString('base64')));});
test('platform roles never grant arbitrary document or assignment access',()=>{for(const role of ['OWNER','SUPPORT','OPS','AUDITOR'] as const){assert.equal(permitted(role,'documents:download'),false);assert.equal(permitted(role,'assignments:force'),false);}assert.equal(permitted('OPS','accounts'),false);assert.equal(permitted('SUPPORT','access:write'),false);assert.equal(permitted('AUDITOR','jobs:retry'),false);});
