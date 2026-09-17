import {withRole,request} from './common.mjs';
import {Client} from 'pg';
import {readFile} from 'node:fs/promises';
const proof=JSON.parse(await readFile(new URL('../../docs/quality/restore-production.json',import.meta.url),'utf8'));
if(proof.status!=='PASS'||proof.synthetic!==false||proof.network!=='none'||proof.productionModified!==false)throw Error('Verified isolated production restore required');
await withRole('operator',async token=>{
 const values=(await request('kv/data/infimatch/v1/production',{token})).data.data;
 const u=new URL(values.DATABASE_URL_UNPOOLED);if(!u.hostname.endsWith('.neon.tech'))throw Error('Unexpected target');u.searchParams.set('sslmode','verify-full');
 const db=new Client({connectionString:u.href});await db.connect();
 try{await db.query("INSERT INTO operational_check(service,state,summary,checked_at) VALUES('backup-restore','verified',$1,$2)",[JSON.stringify({elapsedMs:proof.elapsedMs,sqlCounts:proof.sqlCounts,mongoCollections:proof.mongoCollections,mongoDocuments:proof.mongoDocuments,decryptedDocuments:proof.decryptedDocuments,network:'none',productionModified:false,reopeningAllowed:false,scheduledBackup:false}),proof.date]);console.log('Verified restoration metadata recorded; no document or secret recorded');}finally{await db.end();}
});
