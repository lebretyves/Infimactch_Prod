import {backupRoot} from './backup-key.mjs';
import {productionBackupBase} from './production-backup-paths.mjs';
import {RESTORE_POSTGRES_IMAGE} from '../security/restore-images.mjs';
import {withRole,request,root} from './common.mjs';
import {createDecipheriv,hkdfSync} from 'node:crypto';
import {readFile,realpath} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {spawnSync} from 'node:child_process';
import {resolve,sep} from 'node:path';
const base=await productionBackupBase(),folder=await realpath(resolve(process.argv[2]||base));
if(!folder.startsWith(base+sep))throw Error('Expected a production backup folder');
try{await withRole('operator',async token=>{
 const values=(await request('kv/data/infimatch/v1/production',{token})).data.data;
 const manifest=JSON.parse(await readFile(resolve(folder,'manifest.json'),'utf8'));
 if(manifest.status!=='COMPLETE'||![1,2].includes(manifest.version))throw Error('Incomplete backup');
 if(!Array.isArray(manifest.files)||manifest.files.length!==3)throw Error('Invalid manifest');
 for(const file of manifest.files){
  if(!/^[a-z.]+\.enc$/.test(file.file))throw Error('Invalid backup file name');
  const fullPath=await realpath(resolve(folder,file.file));if(!fullPath.startsWith(folder+sep))throw Error('BACKUP_PATH_ESCAPE');
  const key=hkdfSync('sha256',backupRoot(values,manifest),Buffer.from(file.salt,'base64'),'infimatch-production-backup-v1',32);
  const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(file.iv,'base64'));decipher.setAuthTag(Buffer.from(file.tag,'base64'));
  // Authenticate every encrypted byte before pg_restore can stop after reading its TOC.
  const chunks=[];let size=0;await pipeline(createReadStream(fullPath),decipher,async source=>{for await(const chunk of source){size+=chunk.length;if(size>512*1024*1024)throw Error('BACKUP_EXCEEDS_PROBE_LIMIT');chunks.push(chunk);}});
  const clear=Buffer.concat(chunks);
  try{if(file.file==='postgres.dump.enc'){
   const child=spawnSync('docker',['run','--rm','-i','--network','none',RESTORE_POSTGRES_IMAGE,'pg_restore','--list'],{input:clear,maxBuffer:8*1024*1024,timeout:120000,windowsHide:true});
   if(child.status!==0||!child.stdout||child.stdout.length<100)throw Error('Invalid PostgreSQL archive');
  }else JSON.parse(clear.toString());}finally{clear.fill(0);for(const chunk of chunks)chunk.fill(0);}
  console.log(file.file+' authenticated and readable');
 }
 console.log('Backup integrity PASS; no database restored or modified');
});}catch(e){console.error('Backup verification failed: '+(e.code||e.name));process.exitCode=1;}
