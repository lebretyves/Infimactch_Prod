import {productionBackupBase} from './production-backup-paths.mjs';
import {managedPostgresUrl,managedPostgresConnection} from './postgres-target.mjs';
import {RESTORE_POSTGRES_IMAGE} from '../security/restore-images.mjs';
import {withRole,request,root} from './common.mjs';
import {randomBytes,createCipheriv,hkdfSync} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import mongoose from 'mongoose';
import dns from 'node:dns';
dns.setServers(['1.1.1.1','8.8.8.8']);
const folder=resolve(await productionBackupBase({create:true}),new Date().toISOString().replace(/[:.]/g,'-'));
try{await withRole('operator',async token=>{
 const values=(await request('kv/data/infimatch/v1/production',{token})).data.data;
 const url=managedPostgresUrl(values.DATABASE_URL_UNPOOLED);
 managedPostgresConnection(values.DATABASE_URL_UNPOOLED,values.DATABASE_CA_CERT);
 const key=Buffer.from(values.DOCUMENT_KEY,'base64');if(key.length!==32)throw Error('Invalid backup key');
 await mkdir(folder,{recursive:true});
 async function encryptStream(name,stream){const salt=randomBytes(32),iv=randomBytes(12);const derived=hkdfSync('sha256',key,salt,'infimatch-production-backup-v1',32);const cipher=createCipheriv('aes-256-gcm',derived,iv);await pipeline(stream,cipher,createWriteStream(resolve(folder,name+'.enc'),{flags:'wx',mode:0o600}));return {file:name+'.enc',salt:salt.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64')};}
 const dump=spawn('docker',['run','--rm','-i',RESTORE_POSTGRES_IMAGE,'sh','-c','IFS= read -r PGPASSWORD; IFS= read -r CA_BASE64; export PGPASSWORD; export PGSSLMODE=verify-full; export PGSSLROOTCERT=system; if [ -n "$CA_BASE64" ]; then umask 077; printf %s "$CA_BASE64" | base64 -d > /tmp/infimatch-ca.crt; export PGSSLROOTCERT=/tmp/infimatch-ca.crt; fi; exec pg_dump "$@"','pg_dump','--host',url.hostname,'--port',url.port||'5432','--username',decodeURIComponent(url.username),'--dbname',url.pathname.slice(1),'--format=custom','--no-owner','--no-acl','--schema=public'],{stdio:['pipe','pipe','pipe'],shell:false,windowsHide:true});
 dump.stderr.resume();const exit=new Promise((ok,fail)=>{dump.on('error',fail);dump.on('exit',code=>code===0?ok():fail(Error('PostgreSQL backup failed')));});
 dump.stdin.end(decodeURIComponent(url.password)+'\n'+Buffer.from(values.DATABASE_CA_CERT||'').toString('base64')+'\n');
 const files=[];const [postgresFile]=await Promise.all([encryptStream('postgres.dump',dump.stdout),exit]);files.push(postgresFile);
 const mongo=await mongoose.createConnection(values.MONGODB_URI,{serverSelectionTimeoutMS:10000}).asPromise();
 try{const data={};for(const c of await mongo.db.listCollections().toArray())data[c.name]=await mongo.collection(c.name).find({}).toArray();files.push(await encryptStream('mongo.ejson',Readable.from([mongoose.mongo.BSON.EJSON.stringify(data)])));}finally{await mongo.close();}
 files.push(await encryptStream('configuration.json',Readable.from([JSON.stringify(values)])));
 await writeFile(resolve(folder,'manifest.json'),JSON.stringify({version:1,date:new Date().toISOString(),status:'COMPLETE',algorithm:'AES-256-GCM',derivation:'HKDF-SHA256 / infimatch-production-backup-v1 / DOCUMENT_KEY',files,restoreNote:'Replay the CURRENT Atlas erasureledger before reopening a SQL restore. Never replace that ledger with an older snapshot.'},null,2)+'\n');
 console.log(JSON.stringify({status:'PASS',folder,files:files.length}));
});}catch(e){console.error(JSON.stringify({status:'failed',code:e.code||e.name}));process.exitCode=1;}
