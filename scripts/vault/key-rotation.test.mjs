import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
import {keyList,selectKeys,validateSecrets,cleanEnvironment,configKeys} from './common.mjs';
const require=createRequire(import.meta.url);
const {sealSecret,openSecret}=require('../../backend/dist/admin/mfa.js');
test('Vault preserves old MFA keys across selection, validation, launcher cleanup and rotation',()=>{
 const oldEnvironment={...process.env};
 try {
 const old=randomBytes(32).toString('base64'),next=randomBytes(32).toString('base64');
 process.env.ADMIN_MFA_KEY=old;process.env.ADMIN_MFA_KEY_VERSION='1';
 const sealed=sealSecret('FICTIONAL-TOTP-ROTATION');
 const values={ADMIN_MFA_KEY:next,ADMIN_MFA_KEY_VERSION:'2',ADMIN_MFA_KEY_V1:old,DOCUMENT_KEY:randomBytes(32).toString('base64'),DOCUMENT_KEY_V1:randomBytes(32).toString('base64'),SESSION_SECRET:'fictional-session-secret',DATABASE_URL:'postgresql://fictional',MONGODB_URI:'mongodb://fictional'};
 const selected=selectKeys(values,[...keyList(values),...configKeys]);
 assert.equal(selected.ADMIN_MFA_KEY_V1,old);
 assert.doesNotThrow(()=>validateSecrets(selected,'backend'));
 assert.deepEqual(cleanEnvironment({PATH:'safe',ADMIN_MFA_KEY_V1:'stale',DOCUMENT_KEY_V1:'stale'}),{PATH:'safe'});
 Object.assign(process.env,selected);assert.equal(openSecret(sealed),'FICTIONAL-TOTP-ROTATION');
 delete process.env.ADMIN_MFA_KEY_V1;assert.throws(()=>openSecret(sealed));
 }finally{for(const key of Object.keys(process.env))if(!(key in oldEnvironment))delete process.env[key];Object.assign(process.env,oldEnvironment);}
});
