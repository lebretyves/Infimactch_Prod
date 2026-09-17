import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';
import {withRole,request} from '../vault/common.mjs';
const require=createRequire(import.meta.url);
const {importOffers}=require('../../backend/dist/public-data/offers.js');
const values=await withRole('backend',async token=>(await request('kv/data/infimatch/v1/backend',{token})).data.data);
const c=new pg.Client({connectionString:values.DATABASE_URL});await c.connect();
try {
 await c.query('BEGIN');
 const em={query:async(sql,args)=>(await c.query(sql,args)).rows};
 const db={transaction:async fn=>fn(em)};
 const id='dedup-test-'+randomUUID();
 const base={sourceId:id,title:id,description:'A unique interim nursing assignment for regression validation. '.repeat(6),locationLabel:'Test location',qualification:'IDE',rawHash:'a'.repeat(64),provenance:{test:true}};
 const ft={...base,source:'FRANCE_TRAVAIL',url:'https://candidat.francetravail.fr/offres/recherche/detail/'+id};
 const jp={...base,source:'JOBSPIPE',url:'https://example.invalid/jobs/'+id};
 await importOffers(db,[jp],false,x=>x,'JOBSPIPE');
 const result=await importOffers(db,[ft],false,x=>x,'FRANCE_TRAVAIL');
 assert.equal(result.duplicates.length,1);
 let rows=(await c.query('SELECT source,active,provenance FROM external_offer WHERE source_id=$1',[id])).rows;
 assert.equal(rows.find(r=>r.source==='FRANCE_TRAVAIL').active,true);
 assert.equal(rows.find(r=>r.source==='JOBSPIPE').active,false);
 assert.ok(rows.find(r=>r.source==='JOBSPIPE').provenance.deduplication.duplicateOf);
 await importOffers(db,[jp],false,x=>x,'JOBSPIPE');
 assert.equal((await c.query('SELECT count(*)::int AS n FROM external_offer WHERE source_id=$1 AND active',[id])).rows[0].n,1);
 console.log('PASS real SQL: JobsPipe first, France Travail priority, provenance, repeated import; all test writes rolled back.');
} finally {await c.query('ROLLBACK');await c.end();}
