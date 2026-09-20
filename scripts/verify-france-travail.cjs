require('../backend/dist/config');
const {Database}=require('../backend/dist/database/database');
const {importOffers}=require('../backend/dist/public-data/offers');
const {writeFileSync,mkdirSync}=require('node:fs');
const {resolve}=require('node:path');
// Proof paths belong to this checkout, regardless of the caller's working directory.
const docsDirectory=resolve(__dirname,'../docs_intern');
const proofsDirectory=resolve(docsDirectory,'proofs');
mkdirSync(proofsDirectory,{recursive:true});
const {createHash}=require('node:crypto');
const {FranceTravailClient,FT_KEYWORDS}=require('../backend/dist/public-data/france-travail-client');
function requireIsolatedTarget(){
 const sql=new URL(process.env.DATABASE_URL||'https://invalid');
 if(process.env.NODE_ENV!=='test'||sql.hostname!=='127.0.0.1'||sql.port!=='55433'||sql.pathname!=='/infimatch_test')throw Error('Proof requires isolated PostgreSQL test database');
 const mongo=new URL(process.env.MONGODB_URI||'https://invalid');
 if(mongo.hostname!=='127.0.0.1'||mongo.port!=='57018'||mongo.pathname!=='/infimatch_test')throw Error('Proof requires isolated MongoDB test database');
 if(process.env.INFIMATCH_SECRET_SOURCE!=='vault')throw Error('Proof requires explicit Vault-loaded provider configuration');
 for(const name of ['SMTP2GO_API_KEY','RESEND_API_KEY','JOBSPIPE_API_KEY','DISCORD_BOT_TOKEN'])if(process.env[name])throw Error('Unrelated provider credentials forbidden in proof');
}
async function acquireSample(limit,transport=fetch){
 const client=new FranceTravailClient(transport),unique=new Map(),pages=[];
 if(FT_KEYWORDS.length!==4)throw Error('Review proof request budget before changing keyword coverage');
 for(const keyword of FT_KEYWORDS){
  const page=await client.search({keyword,department:'75',start:0},limit);
  pages.push({keyword,department:'75',limit,received:page.rows.length,totalReported:page.total,hasMore:page.next!==null});
  for(const row of page.rows)if(typeof row.lieuTravail?.commune==='string'&&row.lieuTravail.commune.startsWith('75'))unique.set(row.id,row);
 }
 return {raw:[...unique.values()],sampling:{department:'75',pages,maxSearchCalls:4,retriesExcludedFromSearchBudget:true,exhaustive:false,scope:'First page per keyword only; Paris commune checked locally; never a complete provider inventory'}};
}
(async()=>{
 requireIsolatedTarget();
 const {raw,sampling}=await acquireSample(50);
 if(!raw.length)throw new Error('EMPTY_PROVIDER_SAMPLE');
 const db=await new Database().connect();
 try {
  const first=await importOffers(db,raw,false);
  if(first.accepted<1)throw new Error('NO_ACCEPTED_SAMPLE_OFFER');
  const second=await importOffers(db,raw,false);
  const rows=await db.query("SELECT source_id,raw_hash,provenance FROM external_offer WHERE source='FRANCE_TRAVAIL' AND source_id=ANY($1::text[]) ORDER BY source_id",[raw.map(r=>r.id)]);
  const proof={checkedAt:new Date().toISOString(),source:'FRANCE_TRAVAIL',sampling,authentication:'SUCCESS',realAcquisition:true,first,replay:second,persistedBatchRows:rows.length,uniqueSourceIds:new Set(rows.map(r=>r.source_id)).size,provenancePresent:rows.every(r=>r.provenance?.provider==='FRANCE_TRAVAIL'&&r.provenance?.sourceUrl&&r.provenance?.fetchedAt),batchSha256:createHash('sha256').update(JSON.stringify(raw)).digest('hex'),sourceIds:rows.map(r=>r.source_id),scope:'Bounded first-page provider sample, isolated SQL persistence and replay; no production mutation, no exhaustive inventory or full provider contract validation'};
  if(rows.length!==first.accepted || proof.uniqueSourceIds!==rows.length || !proof.provenancePresent)throw new Error('Persistence/provenance check failed');
  writeFileSync(resolve(proofsDirectory,'france-travail-live.json'),JSON.stringify(proof,null,2)+'\n');
  console.log(JSON.stringify({authentication:proof.authentication,accepted:first.accepted,persisted:rows.length,replayWithoutDuplicates:true,provenancePresent:proof.provenancePresent}));
 } finally {await db.onModuleDestroy();}
})().catch(()=>{console.error('Provider verification failed; no credentials logged');process.exitCode=1;});
