import {spawnSync} from 'node:child_process';
import {mkdir,writeFile,cp,readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {root,withRole,request,readJson} from '../vault/common.mjs';
if(!process.argv.includes('--quiesced'))throw new Error('Stop API and worker first, then pass --quiesced');
const target=resolve(root,'backups','full-v1-'+new Date().toISOString().replace(/[:.]/g,'-'));await mkdir(target,{recursive:true});
if(process.platform==='win32'){
 const who=spawnSync('whoami',[],{encoding:'utf8'}).stdout.trim();
 const r=spawnSync('icacls',[target,'/inheritance:r','/grant:r',who+':(OI)(CI)F','SYSTEM:(OI)(CI)F'],{encoding:'utf8'});if(r.status!==0)throw Error('Backup ACL failed');
}
function docker(args){const r=spawnSync('docker',args,{maxBuffer:512*1024*1024});if(r.status!==0)throw Error('Docker backup command failed: '+r.stderr.toString().slice(-400));return r.stdout;}
let stopped=false;
try{
 docker(['stop','infimatch-n8n-1']);stopped=true;
 await writeFile(resolve(target,'postgres-roles.sql'),docker(['exec','infimatch-postgres-1','pg_dumpall','-U','infimatch','--roles-only']),{mode:0o600});
 await cp(resolve(root,'data/security/database-roles.json'),resolve(target,'database-roles.json'));
 await writeFile(resolve(target,'postgres.dump'),docker(['exec','infimatch-postgres-1','pg_dump','-U','infimatch','-d','infimatch','-Fc']),{mode:0o600});
 const mongo=docker(['exec','infimatch-mongo-1','sh','-c','exec mongodump --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --archive --gzip']);
 await writeFile(resolve(target,'mongo.archive.gz'),mongo,{mode:0o600});
 const image='docker.n8n.io/n8nio/n8n:2.38.7@sha256:a8c95f75c6fdf65f5f2b7a7b354744eaa1c62bb911b5c00af6499c3f38e4cd32';
 await writeFile(resolve(target,'n8n.tar'),docker(['run','--rm','--volumes-from','infimatch-n8n-1','--entrypoint','sh',image,'-c','tar -C /home/node/.n8n -cf - .']),{mode:0o600});
 const raft=await withRole('operator',token=>request('sys/storage/raft/snapshot',{token,raw:true}));await writeFile(resolve(target,'vault.snap'),raft,{mode:0o600});
 await cp(resolve(root,'data/documents'),resolve(target,'documents'),{recursive:true});
 await cp(resolve(root,'data/vault'),resolve(target,'vault-private'),{recursive:true});
 await cp(resolve(root,'.env'),resolve(target,'legacy.env'));
 await cp(resolve(root,'workflows'),resolve(target,'workflows'),{recursive:true});
 const sqlCounts=JSON.parse(docker(['exec','infimatch-postgres-1','psql','-U','infimatch','-d','infimatch','-Atc',"SELECT json_build_object('accounts',(SELECT count(*) FROM account),'missions',(SELECT count(*) FROM mission),'assignments',(SELECT count(*) FROM assignment),'documents',(SELECT count(*) FROM document))"]).toString());
 const files=[];async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,entry.name);if(entry.isDirectory())await walk(p);else{const b=await readFile(p);files.push({path:p.slice(target.length+1).replaceAll('\\','/'),bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}}}await walk(target);
 await writeFile(resolve(target,'manifest.json'),JSON.stringify({date:new Date().toISOString(),quiesced:true,sqlCounts,components:['PostgreSQL','MongoDB','documents','Vault Raft and recovery material','n8n SQLite and encryption key','legacy configuration'],files},null,2));
 console.log(JSON.stringify({backup:target,files:files.length}));
}catch(e){await writeFile(resolve(target,'INCOMPLETE.txt'),'Backup incomplete; do not restore as a complete set.');throw e;}finally{if(stopped)docker(['start','infimatch-n8n-1']);}
