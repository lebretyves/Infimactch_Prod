require('../backend/dist/config');
const {Database}=require('../backend/dist/database/database');
const {fetchOffers,importOffers}=require('../backend/dist/public-data/offers');
const {writeFileSync}=require('node:fs');
const {createHash}=require('node:crypto');
(async()=>{
 const raw=await fetchOffers(50);
 const db=await new Database().connect();
 try {
  const first=await importOffers(db,raw,false);
  const second=await importOffers(db,raw,false);
  const rows=await db.query("SELECT source_id,raw_hash,provenance FROM external_offer WHERE source='FRANCE_TRAVAIL' AND source_id=ANY($1::text[]) ORDER BY source_id",[raw.map(r=>r.id)]);
  const proof={checkedAt:new Date().toISOString(),source:'FRANCE_TRAVAIL',authentication:'SUCCESS',realAcquisition:true,first,replay:second,persistedBatchRows:rows.length,uniqueSourceIds:new Set(rows.map(r=>r.source_id)).size,provenancePresent:rows.every(r=>r.provenance?.provider==='FRANCE_TRAVAIL'&&r.provenance?.sourceUrl&&r.provenance?.fetchedAt),batchSha256:createHash('sha256').update(JSON.stringify(raw)).digest('hex'),sourceIds:rows.map(r=>r.source_id),scope:'Real provider acquisition, SQL persistence and same-batch replay; no frontend or complete provider contract validation'};
  if(rows.length!==first.accepted || !proof.provenancePresent)throw new Error('Persistence/provenance check failed');
  writeFileSync('docs/proofs/france-travail-live.json',JSON.stringify(proof,null,2)+'\n');
  console.log(JSON.stringify({authentication:proof.authentication,accepted:first.accepted,persisted:rows.length,replayWithoutDuplicates:true,provenancePresent:proof.provenancePresent}));
 } finally {await db.onModuleDestroy();}
})().catch(()=>{console.error('Provider verification failed; no credentials logged');process.exitCode=1;});
