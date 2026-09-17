require('../backend/dist/config');
const {createApp}=require('../backend/dist/app');
const {Database}=require('../backend/dist/database/database');
const request=require('supertest');
const assert=require('node:assert/strict');
const {writeFileSync}=require('node:fs');
(async()=>{
 const app=await createApp();
 try {
  const db=app.get(Database);
  const [meta]=await db.query("SELECT * FROM finess_snapshot WHERE id=1");
  const [counts]=await db.query("SELECT count(*)::int total,count(DISTINCT finess)::int unique_ids,count(*) FILTER(WHERE status='A')::int active,count(*) FILTER(WHERE longitude IS NOT NULL)::int with_coordinates FROM finess_establishment");
  const client=request(app.getHttpServer());
  const a=await client.get('/api/v1/reference-data/finess?limit=2&offset=0').expect(200);
  const b=await client.get('/api/v1/reference-data/finess?limit=2&offset=2').expect(200);
  assert.equal(a.body.items.length,2);assert.equal(a.body.total,counts.total);
  assert.equal(a.body.items.some(x=>b.body.items.some(y=>x.finess===y.finess)),false);
  const found=await client.get('/api/v1/reference-data/finess/'+a.body.items[0].finess).expect(200);
  assert.equal(found.body.status,'FOUND_IN_SNAPSHOT');
  assert.equal(found.body.grantsOrganizationAccess,false);
  const missing=await client.get('/api/v1/reference-data/finess/000000000').expect(200);
  assert.equal(missing.body.status,'NOT_IN_SNAPSHOT');
  await client.get('/api/v1/reference-data/finess?limit=51').expect(400);
  await client.get('/api/v1/reference-data/finess/invalid').expect(400);
  const [corse]=await db.query("SELECT finess FROM finess_establishment WHERE finess LIKE '2A%' LIMIT 1");
  assert(corse);
  await client.get('/api/v1/reference-data/finess/'+corse.finess).expect(200);
  const [unknown]=await db.query("SELECT finess FROM finess_establishment WHERE longitude IS NULL LIMIT 1");
  const unknownResult=await client.get('/api/v1/reference-data/finess/'+unknown.finess).expect(200);
  assert.equal(unknownResult.body.establishment.longitude,null);
  assert.equal(unknownResult.body.status,'FOUND_IN_SNAPSHOT');
  assert.equal(counts.total,counts.unique_ids);
  const openapi=await client.get('/api/docs-json').expect(200);
  writeFileSync('docs/openapi.json',JSON.stringify(openapi.body,null,2)+'\n');
  const proof={checkedAt:new Date().toISOString(),sourceDataset:'https://www.data.gouv.fr/datasets/finess-structures-1',snapshot:meta,counts,httpChecks:['pagination','lookup','not-in-snapshot','invalid-input','corsican-id','identity-without-coordinates'],coordinatesPolicy:'Use range-valid source pairs; no inferred projected conversion; conflicting pairs remain unknown',organizationRightsGranted:false};
  writeFileSync('docs/proofs/finess-live.json',JSON.stringify(proof,null,2)+'\n');
  console.log(JSON.stringify({finessHttpChecks:'PASS',counts}));
 } finally {await app.close();}
})().catch(()=>{console.error('FINESS verification failed; inspect assertions locally');process.exitCode=1;});
