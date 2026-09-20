require('../backend/dist/config');
const {createApp}=require('../backend/dist/app');
const {Database}=require('../backend/dist/database/database');
const assert=require('node:assert/strict');
const {writeFileSync,mkdirSync}=require('node:fs');
const {resolve}=require('node:path');
// Proof paths belong to this checkout, regardless of the caller's working directory.
const docsDirectory=resolve(__dirname,'../docs');
const proofsDirectory=resolve(docsDirectory,'proofs');
mkdirSync(proofsDirectory,{recursive:true});
function requireIsolatedTarget(){
 const sql=new URL(process.env.DATABASE_URL||'https://invalid');
 if(process.env.NODE_ENV!=='test'||sql.hostname!=='127.0.0.1'||sql.port!=='55433'||sql.pathname!=='/infimatch_test')throw Error('Proof requires isolated PostgreSQL test database');
 const mongo=new URL(process.env.MONGODB_URI||'https://invalid');
 if(mongo.hostname!=='127.0.0.1'||mongo.port!=='57018'||mongo.pathname!=='/infimatch_test')throw Error('Proof requires isolated MongoDB test database');
 if(process.env.INFIMATCH_SECRET_SOURCE!=='vault')throw Error('Proof requires explicit Vault-loaded provider configuration');
 for(const name of ['SMTP2GO_API_KEY','RESEND_API_KEY','JOBSPIPE_API_KEY','DISCORD_BOT_TOKEN'])if(process.env[name])throw Error('Unrelated provider credentials forbidden in proof');
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
 const app=await createApp();
 try {
  await app.listen(0,'127.0.0.1');
  const db=app.get(Database);
  const [meta]=await db.query("SELECT * FROM finess_snapshot WHERE id=1");
  const [counts]=await db.query("SELECT count(*)::int total,count(DISTINCT finess)::int unique_ids,count(*) FILTER(WHERE status='A')::int active,count(*) FILTER(WHERE longitude IS NOT NULL)::int with_coordinates FROM finess_establishment");
  const a=await readJson(app,'/api/v1/reference-data/finess?limit=2&offset=0',200);
  const b=await readJson(app,'/api/v1/reference-data/finess?limit=2&offset=2',200);
  assert.equal(a.items.length,2);assert.equal(a.total,counts.total);
  assert.equal(a.items.some(x=>b.items.some(y=>x.finess===y.finess)),false);
  const found=await readJson(app,'/api/v1/reference-data/finess/'+a.items[0].finess,200);
  assert.equal(found.status,'FOUND_IN_SNAPSHOT');
  assert.equal(found.grantsOrganizationAccess,false);
  const missing=await readJson(app,'/api/v1/reference-data/finess/000000000',200);
  assert.equal(missing.status,'NOT_IN_SNAPSHOT');
  await readJson(app,'/api/v1/reference-data/finess?limit=51',400);
  await readJson(app,'/api/v1/reference-data/finess/invalid',400);
  const [corse]=await db.query("SELECT finess FROM finess_establishment WHERE finess LIKE '2A%' LIMIT 1");
  assert(corse);
  await readJson(app,'/api/v1/reference-data/finess/'+corse.finess,200);
  const [unknown]=await db.query("SELECT finess FROM finess_establishment WHERE longitude IS NULL LIMIT 1");
  const unknownResult=await readJson(app,'/api/v1/reference-data/finess/'+unknown.finess,200);
  assert.equal(unknownResult.establishment.longitude,null);
  assert.equal(unknownResult.status,'FOUND_IN_SNAPSHOT');
  assert.equal(counts.total,counts.unique_ids);
  const openapi=await readJson(app,'/api/docs-json',200);
  writeFileSync(resolve(docsDirectory,'openapi.json'),JSON.stringify(openapi,null,2)+'\n');
  const proof={checkedAt:new Date().toISOString(),sourceDataset:'https://www.data.gouv.fr/datasets/finess-structures-1',snapshot:meta,counts,httpChecks:['pagination','lookup','not-in-snapshot','invalid-input','corsican-id','identity-without-coordinates'],coordinatesPolicy:'Use range-valid source pairs; no inferred projected conversion; conflicting pairs remain unknown',organizationRightsGranted:false};
  writeFileSync(resolve(proofsDirectory,'finess-live.json'),JSON.stringify(proof,null,2)+'\n');
  console.log(JSON.stringify({finessHttpChecks:'PASS',counts}));
 } finally {await app.close();}
})().catch(()=>{console.error('FINESS verification failed; inspect assertions locally');process.exitCode=1;});
