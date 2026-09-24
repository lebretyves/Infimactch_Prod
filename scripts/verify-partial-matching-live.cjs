require("../backend/dist/config");
const {normalizeOffer}=require("../backend/dist/public-data/offers");
const {partialOfferMatch}=require("../backend/dist/public-data/partial-matching");
const {createApp}=require("../backend/dist/app");
const {writeFileSync,mkdirSync}=require("node:fs");
const {resolve}=require('node:path');
// Proof paths belong to this checkout, regardless of the caller's working directory.
const docsDirectory=resolve(__dirname,'../annexe');
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
 const {raw,sampling}=await acquireSample(150);
 const offers=[],rejected=[];
 for(const row of raw){
  try{offers.push(normalizeOffer(row));}
  catch(error){
   if(!['INVALID_ID','MISSING_CONTENT','OTHER_PROFESSION','PERMANENT_POSITION_EXCLUDED','NOT_TEMPORARY_EMPLOYMENT'].includes(error.message))throw error;
   rejected.push({sourceId:row.id,reason:error.message});
  }
 }
 assert(offers.length>0,'Sample contains no accepted offer');
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
  app=await createApp();await app.listen(0,'127.0.0.1');
  const api={body:await readJson(app,"/api/docs-json")};
  assert(api.body.paths["/api/v1/me/listings/{id}/correspondence"]);
  writeFileSync(resolve(docsDirectory,'openapi.json'),JSON.stringify(api.body,null,2)+"\n");
 }finally{if(app)await app.close();}
 const proof={checkedAt:new Date().toISOString(),sampling,realProviderAcquisition:true,received:raw.length,rejected,uniqueOffers:offers.length,syntheticProfiles:true,profileAssumptions:profile,results,scope:"Bounded first-page public France Travail sample compared in memory to three fictional profiles. RPPS FOUND is a fixture only; no production access, no imported offer or real profile mutation; isolated app startup can update technical counters/indexes. No full eligibility or score."};
 writeFileSync(resolve(proofsDirectory,'external-partial-live.json'),JSON.stringify(proof,null,2)+"\n");
 console.log(JSON.stringify({uniqueOffers:offers.length,syntheticProfiles:true,results:results.map(({examples,...r})=>r)},null,2));
})().catch(error=>{console.error("Partial live verification failed; category="+(error.code||error.name)+"; no secrets logged");process.exitCode=1;});
