import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import pg from 'pg';
import {withRole,request} from '../vault/common.mjs';
const require=createRequire(import.meta.url);
const {permanentContractEvidence}=require('../../backend/dist/public-data/contract-policy.js');
const v=await withRole('backend',async token=>(await request('kv/data/infimatch/v1/backend',{token})).data.data);
const c=new pg.Client({connectionString:v.DATABASE_URL});await c.connect();
try{
 const rows=(await c.query("SELECT id,source,title,description,active FROM external_offer WHERE active AND source IN ('FRANCE_TRAVAIL','JOBSPIPE')")).rows;
 const excluded=rows.map(r=>({...r,evidence:permanentContractEvidence(r.title,r.description)})).filter(r=>r.evidence);
 await mkdir('data/parser-pilot',{recursive:true});
 await writeFile('data/parser-pilot/cdi-before.json',JSON.stringify({createdAt:new Date().toISOString(),rows:excluded},null,2));
 console.log(JSON.stringify({candidates:excluded.map(({id,source,title,evidence})=>({id,source,title,evidence}))},null,2));
 if(process.argv.includes('--apply')){
  await c.query('BEGIN');let count=0;
  try{for(const r of excluded){count+=(await c.query('UPDATE external_offer SET active=false WHERE id=$1 AND active AND title=$2 AND description=$3',[r.id,r.title,r.description])).rowCount;}
   await c.query("INSERT INTO import_run(provider,status,summary) VALUES('LOCAL_CONTRACT_POLICY','SUCCESS',$1)",[JSON.stringify({operation:'EXCLUDE_CDI',count,ids:excluded.map(r=>r.id)})]);await c.query('COMMIT');console.log(JSON.stringify({deactivated:count}));
  }catch(e){await c.query('ROLLBACK');throw e;}
 }
}finally{await c.end();}
