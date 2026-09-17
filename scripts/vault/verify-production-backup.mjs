import {withRole,request,root} from './common.mjs';
import {createDecipheriv,hkdfSync} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {spawn} from 'node:child_process';
import {resolve,sep} from 'node:path';
const base=resolve(root,'data/backups/production'),folder=resolve(process.argv[2]||base);
if(!folder.startsWith(base+sep))throw Error('Expected a production backup folder');
try{await withRole('operator',async token=>{
 const values=(await request('kv/data/infimatch/v1/production',{token})).data.data;
 const manifest=JSON.parse(await readFile(resolve(folder,'manifest.json'),'utf8'));
 if(manifest.status!=='COMPLETE'||manifest.version!==1)throw Error('Incomplete backup');
 for(const file of manifest.files){
  if(!/^[a-z.]+\.enc$/.test(file.file))throw Error('Invalid backup file name');
  const key=hkdfSync('sha256',Buffer.from(values.DOCUMENT_KEY,'base64'),Buffer.from(file.salt,'base64'),'infimatch-production-backup-v1',32);
  const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(file.iv,'base64'));decipher.setAuthTag(Buffer.from(file.tag,'base64'));
  if(file.file==='postgres.dump.enc'){
   const child=spawn('docker',['exec','-i','infimatch-postgres-1','pg_restore','--list'],{stdio:['pipe','pipe','pipe'],shell:false});let size=0;child.stdout.on('data',x=>{size+=x.length;});child.stderr.resume();const done=new Promise((ok,fail)=>{child.on('error',fail);child.on('exit',c=>c===0?ok():fail(Error('Invalid PostgreSQL archive')));});await pipeline(createReadStream(resolve(folder,file.file)),decipher,child.stdin);await done;if(size<100)throw Error('Empty PostgreSQL archive');
  }else{const chunks=[];await pipeline(createReadStream(resolve(folder,file.file)),decipher,async source=>{for await(const chunk of source)chunks.push(chunk);});JSON.parse(Buffer.concat(chunks).toString());}
  console.log(file.file+' authenticated and readable');
 }
 console.log('Backup integrity PASS; no database restored or modified');
});}catch(e){console.error('Backup verification failed: '+(e.code||e.name));process.exitCode=1;}
