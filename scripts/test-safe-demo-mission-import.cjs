const {spawnSync}=require('node:child_process'),{randomBytes,randomUUID}=require('node:crypto'),fs=require('node:fs'),assert=require('node:assert/strict');
const path=require('node:path'),root=path.resolve(__dirname,'..'),dir=path.resolve(process.argv[2]||path.join(root,'../livrables/missions-500')),name='infimatch-demo-readiness-'+randomBytes(4).toString('hex'),password=randomBytes(24).toString('hex');
const {Client}=require(root+'/node_modules/pg');
function docker(args){const r=spawnSync('docker',args,{encoding:'utf8'});if(r.status!==0)throw Error('docker failed '+r.stderr);return r.stdout;}
(async()=>{let created=false,conn,db;try{
 docker(['run','--rm','-d','--name',name,'-p','127.0.0.1:55433:5432','-e','POSTGRES_USER=test_admin','-e','POSTGRES_DB=infimatch_test','-e','POSTGRES_PASSWORD='+password,'postgis/postgis:17-3.5@sha256:01a6a70e41e6c4467c8f55f6063555ed72db2d6662cd0d571040d42eadaeb6f6']);created=true;
 const url='postgresql://test_admin:'+password+'@127.0.0.1:55433/infimatch_test';
 for(let i=0;i<40;i++){const c=new Client({connectionString:url});try{await c.connect();conn=c;break;}catch{await c.end().catch(()=>{});await new Promise(r=>setTimeout(r,500));}}
 if(!conn)throw Error('Isolated DB unavailable');
 Object.assign(process.env,{NODE_ENV:'test',INFIMATCH_SECRET_SOURCE:'vault',DATABASE_URL:url});
 require(root+'/node_modules/reflect-metadata');
 const {Database}=require(root+'/backend/dist/database/database'),{MissionsService}=require(root+'/backend/dist/missions/missions.service');
 db=await new Database().connect();await db.source.runMigrations({transaction:'all'});const service=new MissionsService(db);
 const [actor]=await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture','ENTERPRISE','fixture') RETURNING id",[randomUUID()+'@example.invalid']);
 const [outsider]=await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture','ENTERPRISE','fixture') RETURNING id",[randomUUID()+'@example.invalid']);
 const importer=require('./safe-demo-mission-import.cjs'),loaded=importer.load(dir);
 const finess=[...new Set(loaded.envelopes.rows.map(r=>r.sourceFiness))];
 await db.query("INSERT INTO organization(kind,name,address,referent,finess) SELECT 'ESTABLISHMENT','ORGANISATION FICTIVE TEST ISOLE','Adresse de test','Fixture',f FROM unnest($1::text[]) f",[finess]);
 await db.query("INSERT INTO membership(user_id,organization_id) SELECT $1,id FROM organization WHERE name='ORGANISATION FICTIVE TEST ISOLE'",[actor.id]);
 const candidates=await importer.organizationCandidates(db,finess,actor.id),prepared=await importer.prepare(loaded,candidates,true);
 const expectedReady=loaded.envelopes.rows.filter(r=>r.dto.latitude!==null&&r.dto.longitude!==null).length;assert.equal(prepared.summary.readyVacations,expectedReady);assert.equal(prepared.summary.blockedVacations,loaded.envelopes.rows.length-expectedReady);
 const expired=await importer.prepare({...loaded,reference:{...loaded.reference,generatedAt:'2020-01-01T00:00:00Z'}},candidates,true);assert.equal(expired.summary.readyVacations,0);assert.ok(expired.rows.every(r=>r.errors.includes('FINESS_REFERENCE_EXPIRED')));
 const none=await importer.prepare(loaded,await importer.organizationCandidates(db,finess,outsider.id),true);assert.equal(none.summary.readyVacations,0);
 const ambiguous=await importer.prepare(loaded,[...candidates,{...candidates[0],id:randomUUID()}],true);assert.ok(ambiguous.rows.filter(r=>r.sourceFiness===candidates[0].finess).every(r=>r.errors.includes('ORGANIZATION_AMBIGUOUS')));
 const noReference={...loaded,byFiness:new Map(loaded.byFiness)};noReference.byFiness.delete(candidates[0].finess);const missing=await importer.prepare(noReference,candidates,true);assert.ok(missing.rows.filter(r=>r.sourceFiness===candidates[0].finess).every(r=>r.errors.includes('FINESS_MISSING_OR_CLOSED')));
 await assert.rejects(importer.applyIsolated(db,service,loaded,actor.id,'postgresql://invalid@remote.invalid/db'),/ISOLATED_TEST_DATABASE_REQUIRED/);
 const first=await importer.applyIsolated(db,service,loaded,actor.id,url);console.log('First import DRAFT',first.results.length);
 const second=await importer.applyIsolated(db,service,loaded,actor.id,url);assert.deepEqual(first.results,second.results);
 const [total]=await db.query("SELECT count(*)::integer AS n,count(*) FILTER(WHERE status!='DRAFT')::integer AS non_draft FROM mission");assert.equal(total.n,expectedReady);assert.equal(total.non_draft,0);
 let timezoneVerified=0;for(const result of first.results){const source=prepared.rows.find(r=>r.requestId===result.requestId&&r.vacationNumber===result.vacationNumber);const [stored]=await db.query('SELECT timezone,start_at,end_at FROM mission WHERE id=$1',[result.missionId]);assert.equal(stored.timezone,source.sourceTimezone);assert.equal(new Date(stored.start_at).toISOString(),new Date(source.body.start).toISOString());assert.equal(new Date(stored.end_at).toISOString(),new Date(source.body.end).toISOString());if(stored.timezone!=='Europe/Paris')timezoneVerified++;}
 const report={status:'PASS',environment:'EPHEMERAL_LOCAL_POSTGIS_127.0.0.1:55433',datasetSha256:loaded.fingerprint,productionAccess:false,publishedMissions:0,createdDrafts:total.n,blockedMissingGps:loaded.envelopes.rows.length-expectedReady,fixtureOrganizations:finess.length,expiredReferenceBlocked:true,fixtureActorOnly:true,realOrganizationMandatesVerified:false,idempotentReplay:true,nonDraftMissions:total.non_draft,unauthorizedBlocked:true,ambiguousOrganizationBlocked:true,missingFinessBlocked:true,remoteDatabaseWritesRejected:true,domTimezonesPreserved:timezoneVerified,utcIntervalsPreserved:true,containerRemovedOnCompletion:true};
 fs.writeFileSync(dir+'/safe-demo-import-isolated-test.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await db?.onModuleDestroy();await conn?.end();if(created)docker(['rm','-f',name]);}})().catch(e=>{console.error(String(e.stack||e).replaceAll(password,'[redacted]'));process.exitCode=1});
