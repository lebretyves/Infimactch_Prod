import {test} from 'node:test';import assert from 'node:assert/strict';import {randomBytes} from 'node:crypto';
import {backupRoot,newBackupKeyMetadata} from './backup-key.mjs';
import {sealBackup,openBackup} from '../security/cloud-restore-probe.mjs';
test('legacy and new backup envelopes survive root key rotations and reject missing roots',()=>{
 const old=randomBytes(32),next=randomBytes(32),dedicated=randomBytes(32),plain=Buffer.from('fictional backup fixture');
 const values={DOCUMENT_KEY:old.toString('base64'),BACKUP_KEY:dedicated.toString('base64')};
 const legacy=sealBackup(plain,old),metadata=newBackupKeyMetadata(values),fresh=sealBackup(plain,backupRoot(values,metadata));
 values.DOCUMENT_KEY_V1=values.DOCUMENT_KEY;values.DOCUMENT_KEY=next.toString('base64');values.DOCUMENT_KEY_VERSION='2';
 values.BACKUP_KEY_V1=values.BACKUP_KEY;values.BACKUP_KEY=randomBytes(32).toString('base64');values.BACKUP_KEY_VERSION='2';
 assert.deepEqual(openBackup(legacy.bytes,backupRoot(values,{version:1}),legacy),plain);
 assert.deepEqual(openBackup(fresh.bytes,backupRoot(values,metadata),fresh),plain);
 delete values.BACKUP_KEY_V1;assert.throws(()=>backupRoot(values,metadata));assert.throws(()=>backupRoot(values,{version:2,keyFamily:'DOCUMENT_KEY',keyVersion:'2'}));
 const changed=Buffer.from(legacy.bytes);changed[0]^=1;assert.throws(()=>openBackup(changed,backupRoot(values,{version:1}),legacy));
});
