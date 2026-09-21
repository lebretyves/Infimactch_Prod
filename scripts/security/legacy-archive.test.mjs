import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {seal,open,safeRelative,signManifest,authenticateManifest} from './legacy-archive.mjs';
test('legacy archive authenticates content, key and relative filename',()=>{
 const key=randomBytes(32),bytes=Buffer.from('fictional recovery data'),path='vault-private/recovery.json';
 const encrypted=seal(bytes,key,path),entry={...encrypted,path,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
 assert.deepEqual(open(encrypted.bytes,key,entry),bytes);
 const damaged=Buffer.from(encrypted.bytes);damaged[0]^=1;
 assert.throws(()=>open(damaged,key,entry));
 assert.throws(()=>open(encrypted.bytes,randomBytes(32),entry));
 assert.throws(()=>open(encrypted.bytes,key,{...entry,path:'other.json'}));
 assert.throws(()=>open(encrypted.bytes,key,{...entry,size:1}));
});
test('archive rejects traversal, absolute and alternate stream names',()=>{
 for(const path of ['../secret','a/../b','/absolute','C:/secret','a\\b','file:stream','a//b','','a/./b','a\0b'])assert.throws(()=>safeRelative(path));
 assert.equal(safeRelative('documents/fictional.bin'),'documents/fictional.bin');
});

test('manifest authentication detects removed files and altered metadata',()=>{
 const key=randomBytes(32),manifest={version:2,keyVersion:'1',files:[{file:'0000.enc'},{file:'0001.enc'}]};
 manifest.authentication=signManifest(manifest,key);
 assert.doesNotThrow(()=>authenticateManifest(manifest,key));
 assert.throws(()=>authenticateManifest({...manifest,files:manifest.files.slice(1)},key));
 assert.throws(()=>authenticateManifest({...manifest,keyVersion:'2'},key));
 assert.throws(()=>authenticateManifest(manifest,randomBytes(32)));
});
