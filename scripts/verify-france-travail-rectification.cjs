// Real bounded acquisition and replay. No credentials or provider descriptions in proof.
require("../backend/dist/config");
const {importOffers,normalizeOffer}=require("../backend/dist/public-data/offers");
const {Database}=require("../backend/dist/database/database");
const {createApp}=require("../backend/dist/app");
const {writeFileSync,mkdirSync}=require("node:fs");
const {resolve}=require('node:path');
// Proof paths belong to this checkout, regardless of the caller's working directory.
const docsDirectory=resolve(__dirname,'../docs');
const proofsDirectory=resolve(docsDirectory,'proofs');
mkdirSync(proofsDirectory,{recursive:true});
const assert=require("node:assert/strict");
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
async function readJson(app,path,expected=200){
 const port=app.getHttpServer().address().port;
 const response=await fetch('http://127.0.0.1:'+port+path,{signal:AbortSignal.timeout(15000)});
 assert.equal(response.status,expected,path+' status');
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{while(true){const item=await reader.read();if(item.done)break;size+=item.value.length;if(size>10000000)throw Error('Proof response too large');chunks.push(Buffer.from(item.value));}}finally{await reader.cancel();}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
(async()=>{
 requireIsolatedTarget();
 const queries=[];
 const transport=async(input,init)=>{
  const r=await fetch(input,init);
  const u=new URL(String(input));
  if(u.pathname.endsWith("/offres/search")) queries.push({keyword:u.searchParams.get("motsCles"),department:u.searchParams.get("departement"),status:r.status,range:r.headers.get("content-range")});
  return r;
 };
 const {raw,sampling}=await acquireSample(150,transport);
 assert(raw.length>0);
 const db=await new Database().connect();let app;
 try {
  const first=await importOffers(db,raw,false);
  const replay=await importOffers(db,raw,false);
  const ids=raw.map(o=>o.id);
  const rows=await db.query("SELECT id,source_id,qualification,provenance FROM external_offer WHERE source='FRANCE_TRAVAIL' AND source_id=ANY($1::text[])",[ids]);
  assert(rows.length>0,'Sample contains no accepted offer');
  assert.equal(rows.length,first.accepted);
  assert.equal(new Set(rows.map(r=>r.source_id)).size,rows.length);
  assert(rows.every(r=>r.provenance.normalizationVersion===3));
  const counts={},warnings={};
  for(const r of rows){const q=r.qualification||"UNCONFIRMED";counts[q]=(counts[q]||0)+1;for(const w of r.provenance.facts.warnings)warnings[w]=(warnings[w]||0)+1;}
  app=await createApp();await app.listen(0,'127.0.0.1');
  const detail={body:await readJson(app,"/api/v1/listings/e_"+rows[0].id)};
  assert.equal(detail.body.correspondence.score,null);
  assert.equal(detail.body.correspondence.eligibilityVerified,false);
  
  const page={body:await readJson(app,"/api/v1/listings/external?limit=50")};
  assert(page.body.items.every(o=>o.correspondence?.score===null));
  
  const api={body:await readJson(app,"/api/docs-json")};
  writeFileSync(resolve(docsDirectory,'openapi.json'),JSON.stringify(api.body,null,2)+"\n");
  const proof={checkedAt:new Date().toISOString(),sampling,queries,uniqueAcquired:raw.length,first,replay,persisted:rows.length,replayWithoutDuplicates:true,classification:counts,warningCounts:warnings,httpPresentationVerified:true,fullMatchingScore:null,sourceIds:ids,scope:"One page of at most 150 per keyword; Paris commune checked locally; isolated SQL upsert replay and HTTP presentation. Non-exhaustive provider sample; no full external eligibility verified."};
  writeFileSync(resolve(proofsDirectory,'france-travail-rectification.json'),JSON.stringify(proof,null,2)+"\n");
  console.log(JSON.stringify({queries,uniqueAcquired:raw.length,persisted:rows.length,classification:counts,warningCounts:warnings,replayWithoutDuplicates:true,httpPresentationVerified:true},null,2));
 } finally {if(app)await app.close();await db.onModuleDestroy();}
})().catch((e)=>{console.error("France Travail rectification verification failed; no secrets logged");process.exitCode=1;});
