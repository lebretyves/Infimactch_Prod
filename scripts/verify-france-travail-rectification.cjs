// Real bounded acquisition and replay. No credentials or provider descriptions in proof.
require("../backend/dist/config");
const {fetchOffers,importOffers,normalizeOffer}=require("../backend/dist/public-data/offers");
const {Database}=require("../backend/dist/database/database");
const {createApp}=require("../backend/dist/app");
const request=require("supertest");
const {writeFileSync}=require("node:fs");
const assert=require("node:assert/strict");
(async()=>{
 const queries=[];
 const transport=async(input,init)=>{
  const r=await fetch(input,init);
  const u=new URL(String(input));
  if(u.pathname.endsWith("/offres/search")) queries.push({keyword:u.searchParams.get("motsCles"),department:u.searchParams.get("departement"),status:r.status,range:r.headers.get("content-range")});
  return r;
 };
 const raw=await fetchOffers(150,transport,"75");
 assert(raw.length>0);
 const db=await new Database().connect();let app;
 try {
  const first=await importOffers(db,raw,false);
  const replay=await importOffers(db,raw,false);
  const ids=raw.map(o=>o.id);
  const rows=await db.query("SELECT id,source_id,qualification,provenance FROM external_offer WHERE source='FRANCE_TRAVAIL' AND source_id=ANY($1::text[])",[ids]);
  assert.equal(rows.length,first.accepted);
  assert.equal(new Set(rows.map(r=>r.source_id)).size,rows.length);
  assert(rows.every(r=>r.provenance.normalizationVersion===2));
  const counts={},warnings={};
  for(const r of rows){const q=r.qualification||"UNCONFIRMED";counts[q]=(counts[q]||0)+1;for(const w of r.provenance.facts.warnings)warnings[w]=(warnings[w]||0)+1;}
  app=await createApp();
  const detail=await request(app.getHttpServer()).get("/api/v1/listings/e_"+rows[0].id).expect(200);
  assert.equal(detail.body.correspondence.score,null);
  assert.equal(detail.body.correspondence.eligibilityVerified,false);
  
  const page=await request(app.getHttpServer()).get("/api/v1/listings/external?limit=50").maxResponseSize(10000000).expect(200);
  assert(page.body.items.every(o=>o.correspondence?.score===null));
  
  const api=await request(app.getHttpServer()).get("/api/docs-json").maxResponseSize(10000000).expect(200);
  writeFileSync("docs/openapi.json",JSON.stringify(api.body,null,2)+"\n");
  const proof={checkedAt:new Date().toISOString(),queries,uniqueAcquired:raw.length,first,replay,persisted:rows.length,replayWithoutDuplicates:true,classification:counts,warningCounts:warnings,httpPresentationVerified:true,fullMatchingScore:null,sourceIds:ids,scope:"Bounded 150 per keyword, Paris commune checked locally; SQL upsert replay and current HTTP presentation. No full external eligibility verified."};
  writeFileSync("docs/proofs/france-travail-rectification.json",JSON.stringify(proof,null,2)+"\n");
  console.log(JSON.stringify({queries,uniqueAcquired:raw.length,persisted:rows.length,classification:counts,warningCounts:warnings,replayWithoutDuplicates:true,httpPresentationVerified:true},null,2));
 } finally {if(app)await app.close();await db.onModuleDestroy();}
})().catch((e)=>{console.error("France Travail rectification verification failed; no secrets logged");process.exitCode=1;});
