import {createCipheriv,createDecipheriv,randomBytes,hkdfSync,createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {readFile,writeFile,readdir,mkdir,realpath,lstat} from 'node:fs/promises';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {withRole,request} from '../vault/common.mjs';
import {backupRoot,newBackupKeyMetadata} from '../vault/backup-key.mjs';
const format='infimatch-legacy-archive-v1';
const maximum=512*1024*1024;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function signManifest(manifest,root){
 const {authentication,...payload}=manifest;
 return createHmac('sha256',root).update(format+'\0manifest\0'+JSON.stringify(payload)).digest('hex');
}
export function authenticateManifest(manifest,root){
 if(!/^[a-f0-9]{64}$/.test(manifest.authentication||'')||!timingSafeEqual(Buffer.from(manifest.authentication,'hex'),Buffer.from(signManifest(manifest,root),'hex')))throw Error('MANIFEST_AUTHENTICATION_FAILED');
}
export function safeRelative(name) {
 if(typeof name!=='string'||!name||name.includes('\\')||name.includes(':')||name.includes('\0')||isAbsolute(name)||name.split('/').some(part=>!part||part==='.'||part==='..'))throw Error('INVALID_ARCHIVE_PATH');
 return name;
}
function key(root,salt){return hkdfSync('sha256',root,salt,format,32);}
export function seal(bytes,root,name){
 safeRelative(name);const salt=randomBytes(32),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(root,salt),iv);
 cipher.setAAD(Buffer.from(format+'\0'+name));
 return {bytes:Buffer.concat([cipher.update(bytes),cipher.final()]),salt:salt.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64')};
}
export function open(bytes,root,entry){
 safeRelative(entry.path);if(bytes.length>maximum)throw Error('ARCHIVE_FILE_TOO_LARGE');
 const decipher=createDecipheriv('aes-256-gcm',key(root,Buffer.from(entry.salt,'base64')),Buffer.from(entry.iv,'base64'));
 decipher.setAAD(Buffer.from(format+'\0'+entry.path));decipher.setAuthTag(Buffer.from(entry.tag,'base64'));
 const clear=Buffer.concat([decipher.update(bytes),decipher.final()]);
 if(clear.length!==entry.size||hash(clear)!==entry.sha256){clear.fill(0);throw Error('ARCHIVE_CONTENT_MISMATCH');}
 return clear;
}
async function checked(root,name){
 const full=resolve(root,safeRelative(name));const info=await lstat(full);
 if(info.isSymbolicLink()||!info.isFile()||info.size>maximum)throw Error('UNSAFE_ARCHIVE_FILE');
 const actual=await realpath(full);if(!actual.startsWith(root+sep))throw Error('ARCHIVE_PATH_ESCAPE');return actual;
}
async function list(root,dir=root){
 const files=[];
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const full=resolve(dir,entry.name),actual=await realpath(full);
  if(entry.isSymbolicLink()||!actual.startsWith(root+sep))throw Error('SOURCE_PATH_ESCAPE');
  if(entry.isDirectory())files.push(...await list(root,full));else if(entry.isFile())files.push(relative(root,full).split(sep).join('/'));else throw Error('UNSUPPORTED_SOURCE_ENTRY');
 }
 return files.sort();
}
export async function verifyArchive(folder,values,source){
 folder=await realpath(folder);if(source)source=await realpath(source);
 const manifest=JSON.parse(await readFile(await checked(folder,'manifest.json'),'utf8'));
 if(manifest.format!==format||manifest.status!=='COMPLETE'||!Array.isArray(manifest.files)||!manifest.files.length)throw Error('INVALID_ARCHIVE_MANIFEST');
 const root=backupRoot(values,manifest),seen=new Set();let bytes=0;
 try {
  authenticateManifest(manifest,root);
  for(const entry of manifest.files){
   safeRelative(entry.path);if(seen.has(entry.path)||!/^\d{4}\.enc$/.test(entry.file))throw Error('INVALID_ARCHIVE_ENTRY');seen.add(entry.path);
   const clear=open(await readFile(await checked(folder,entry.file)),root,entry);
   try{
    bytes+=clear.length;
    if(source){const original=await readFile(await checked(source,entry.path));try{if(!original.equals(clear))throw Error('SOURCE_COMPARISON_FAILED');}finally{original.fill(0);}}
   }finally{clear.fill(0);}
  }
  if(source&&JSON.stringify(await list(source))!==JSON.stringify([...seen].sort()))throw Error('SOURCE_INVENTORY_CHANGED');
  return {status:'PASS',files:seen.size,bytes,sourceCompared:!!source,algorithm:'AES-256-GCM',keyFamily:manifest.keyFamily,keyVersion:manifest.keyVersion};
 }finally{root.fill(0);}
}
export async function encryptArchive(source,folder,values){
 source=await realpath(source);folder=resolve(folder);
 const parent=await realpath(resolve(folder,'..'));folder=resolve(parent,relative(resolve(folder,'..'),folder));
 if(folder===source||folder.startsWith(source+sep)||source.startsWith(folder+sep))throw Error('SOURCE_DESTINATION_OVERLAP');
 await mkdir(folder); // Fail closed if a destination already exists.
 if(process.platform==='win32'){
  const who=spawnSync('whoami',[],{encoding:'utf8',windowsHide:true});
  if(who.status!==0)throw Error('ACL_IDENTITY_FAILED');
  const acl=spawnSync('icacls',[folder,'/inheritance:r','/grant:r',who.stdout.trim()+':(OI)(CI)F','SYSTEM:(OI)(CI)F'],{windowsHide:true});
  if(acl.status!==0)throw Error('ARCHIVE_ACL_FAILED');
 }
 const metadata=newBackupKeyMetadata(values),root=backupRoot(values,metadata),files=[];
 try{
  for(const name of await list(source)){
   const clear=await readFile(await checked(source,name));
   try{
    const encrypted=seal(clear,root,name),file=String(files.length).padStart(4,'0')+'.enc';
    await writeFile(resolve(folder,file),encrypted.bytes,{flag:'wx',mode:0o600});
    files.push({path:name,file,size:clear.length,sha256:hash(clear),salt:encrypted.salt,iv:encrypted.iv,tag:encrypted.tag});
   }finally{clear.fill(0);}
  }
  const manifest={...metadata,format,status:'COMPLETE',date:new Date().toISOString(),algorithm:'AES-256-GCM',files};
  manifest.authentication=signManifest(manifest,root);
  await writeFile(resolve(folder,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});
 }finally{root.fill(0);}
 return verifyArchive(folder,values,source);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try {
  const [command,source,folder]=process.argv.slice(2);
  if(!['encrypt','verify'].includes(command)||!source||(command==='encrypt'&&!folder))throw Error('USE_ENCRYPT_SOURCE_DESTINATION_OR_VERIFY_ARCHIVE');
  const result=await withRole('operator',async token=>{
   const values=(await request('kv/data/infimatch/v1/production',{token})).data.data;
   return command==='encrypt'?encryptArchive(source,folder,values):verifyArchive(source,values);
  });console.log(JSON.stringify(result));
 }catch(error){console.error(JSON.stringify({status:'FAIL',code:/^[A-Z_]+$/.test(error.message)?error.message:'ARCHIVE_OPERATION_FAILED'}));process.exitCode=1;}
}
