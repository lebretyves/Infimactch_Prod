import {withRole,request,root} from './common.mjs';
import {managedPostgresConnection} from './postgres-target.mjs';
import pg from 'pg';
import {DateTime} from 'luxon';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const apply=process.argv.includes('--apply');
const normalize=value=>{if(typeof value!=='string')return null;const d=DateTime.fromISO(value,{zone:'utc'});return d.isValid?d.toUTC().toISO():null;};
await withRole('operator',async token=>{
 const values=(await request('kv/data/infimatch/v1/production',{token})).data.data;
 const c=new pg.Client(managedPostgresConnection(values.DATABASE_URL,values.DATABASE_CA_CERT));await c.connect();
 try{
  await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='5s'");await c.query("SET LOCAL statement_timeout='60s'");
  const {rows}=await c.query("SELECT id,source,provenance FROM external_offer WHERE provenance->>'normalizationVersion'='2' ORDER BY id FOR UPDATE");
  if(rows.length>10000)throw Error('REVIEW_BATCH_LIMIT');
  const updates=rows.map(r=>({id:r.id,publishedAt:normalize(r.provenance.publishedAt),sourceUpdatedAt:normalize(r.provenance.sourceUpdatedAt)}));
  const changed=rows.filter((r,i)=>r.provenance.publishedAt!==updates[i].publishedAt||r.provenance.sourceUpdatedAt!==updates[i].sourceUpdatedAt).length;
  let affected=0;
  if(apply&&updates.length){const r=await c.query(`UPDATE external_offer e SET provenance=e.provenance || jsonb_build_object('publishedAt',u."publishedAt",'sourceUpdatedAt',u."sourceUpdatedAt",'normalizationVersion',3) FROM jsonb_to_recordset($1::jsonb) AS u(id uuid,"publishedAt" text,"sourceUpdatedAt" text) WHERE e.id=u.id AND e.provenance->>'normalizationVersion'='2'`,[JSON.stringify(updates)]);affected=r.rowCount;if(affected!==rows.length)throw Error('COUNT_MISMATCH');}
  const counts=(await c.query("SELECT source,provenance->>'normalizationVersion' version,count(*)::int total FROM external_offer GROUP BY 1,2 ORDER BY 1,2")).rows;
  await c.query(apply?'COMMIT':'ROLLBACK');
  const proof={checkedAt:new Date().toISOString(),mode:apply?'APPLIED':'DRY_RUN',candidates:rows.length,dateValuesChanged:changed,affected,counts,providerCalls:0,scope:'Only provenance publication/update dates and normalizationVersion 2 to 3. No mission dates, import timestamps, visibility or other fields changed.'};
  const dir=resolve(root,'docs_intern/proofs');mkdirSync(dir,{recursive:true});writeFileSync(resolve(dir,apply?'date-normalization-production.json':'date-normalization-dry-run.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
 }catch(e){await c.query('ROLLBACK');throw e;}finally{await c.end();}
}).catch(()=>{console.error('Date normalization failed; no secrets logged');process.exitCode=1;});
