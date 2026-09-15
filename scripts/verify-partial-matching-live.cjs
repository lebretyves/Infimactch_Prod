require("../backend/dist/config");
const {fetchOffers,normalizeOffer}=require("../backend/dist/public-data/offers");
const {partialOfferMatch}=require("../backend/dist/public-data/partial-matching");
const {createApp}=require("../backend/dist/app");
const {writeFileSync}=require("node:fs");
const request=require("supertest"), assert=require("node:assert/strict");
(async()=>{
 const raw=await fetchOffers(150,fetch,"75");
 const offers=raw.map(o=>normalizeOffer(o));
 const profile={qualifications:[],skills:[],experience:[{service:"URGENCES",start:"2022-01-01T00:00:00Z",end:"2025-01-01T00:00:00Z"}],available:[],unavailable:[],conflicts:[],rppsStatus:"FOUND",latitude:48.8566,longitude:2.3522,radiusKm:20,acceptedShifts:["DAY"],preferredShifts:[]};
 const results=[];
 for(const q of ["IDE","IADE","IBODE"]){
  const subset=offers.filter(o=>o.qualification===q);
  const outcomes={};
  const examples=[];
  for(const o of subset){
   const r=partialOfferMatch(o,{...profile,qualifications:[q]});
   assert.equal(r.score,null);assert.equal(r.eligibilityVerified,false);
   assert.equal(r.criteria.availability.status,"OFFER_MISSING");
   assert.equal(r.criteria.qualification.status,"MATCH");
   outcomes[r.result]=(outcomes[r.result]||0)+1;
   if(examples.length<2)examples.push({sourceId:o.sourceId,url:o.url,title:o.title,result:r.result,criteria:r.criteria});
  }
  results.push({qualification:q,compared:subset.length,outcomes,examples});
 }
 assert(results.every(r=>r.compared>0));
 let app;
 try{
  app=await createApp();
  const api=await request(app.getHttpServer()).get("/api/docs-json").maxResponseSize(10000000).expect(200);
  assert(api.body.paths["/api/v1/me/listings/{id}/correspondence"]);
  writeFileSync("docs/openapi.json",JSON.stringify(api.body,null,2)+"\n");
 }finally{if(app)await app.close();}
 const proof={checkedAt:new Date().toISOString(),realProviderAcquisition:true,uniqueOffers:offers.length,syntheticProfiles:true,profileAssumptions:profile,results,scope:"Fresh public France Travail offers compared in memory to three fictional profiles. RPPS FOUND is a fixture only; no real profile or database mutated, no full eligibility or score."};
 writeFileSync("docs/proofs/external-partial-live.json",JSON.stringify(proof,null,2)+"\n");
 console.log(JSON.stringify({uniqueOffers:offers.length,syntheticProfiles:true,results:results.map(({examples,...r})=>r)},null,2));
})().catch(()=>{console.error("Partial live verification failed; no secrets logged");process.exitCode=1;});
