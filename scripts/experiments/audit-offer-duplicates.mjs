import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import pg from 'pg';
import {withRole,request} from '../vault/common.mjs';
const require=createRequire(import.meta.url);
const {findCrossSourceDuplicates,guardCrossSourceDuplicates}=require('../../backend/dist/public-data/offer-deduplication.js');
const values=await withRole('backend',async token=>(await request('kv/data/infimatch/v1/backend',{token})).data.data);
const client=new pg.Client({connectionString:values.DATABASE_URL});
await client.connect();
try {
 await client.query('BEGIN');
 await client.query('SELECT pg_advisory_xact_lock(1789380901)');
 const rows=(await client.query("SELECT id,source,title,description,url,location_label,qualification,active,provenance FROM external_offer WHERE source IN ('FRANCE_TRAVAIL','JOBSPIPE') ORDER BY id FOR UPDATE")).rows;
 const active=rows.filter(r=>r.active);
 const report={checkedAt:new Date().toISOString(),total:rows.length,active:active.length,counts:rows.reduce((s,r)=>(s[r.source]=(s[r.source]||0)+1,s),{}),allDuplicates:findCrossSourceDuplicates(rows),activeDuplicates:findCrossSourceDuplicates(active),applied:process.argv.includes('--apply')};
 await mkdir('data/offer-deduplication',{recursive:true});
 await writeFile('data/offer-deduplication/before-'+Date.now()+'.json',JSON.stringify(rows,null,2));
 if(report.applied){
  report.deactivated=await guardCrossSourceDuplicates({query:async(sql,args)=>(await client.query(sql,args)).rows});
  await client.query("INSERT INTO import_run(provider,status,summary) VALUES('CROSS_SOURCE_DEDUPLICATION','SUCCESS',$1)",[JSON.stringify(report)]);
 }
 await client.query('COMMIT');
 await mkdir('docs/proofs/offer-deduplication',{recursive:true});
 await writeFile('docs/proofs/offer-deduplication/audit.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}catch(e){await client.query('ROLLBACK');throw e;}finally{await client.end();}
