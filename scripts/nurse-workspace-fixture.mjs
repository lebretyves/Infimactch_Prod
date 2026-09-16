/** Isolated real HTTP/database fixture. All SQL writes roll back; sessions live only in memory. */
import {createRequire} from 'node:module';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
import {withRole,request as vaultRequest,validateSecrets} from './vault/common.mjs';
const require=createRequire(import.meta.url);
export async function nurseWorkspaceFixture(){
 const values=await withRole('backend',async token=>validateSecrets((await vaultRequest('kv/data/infimatch/v1/backend',{token})).data.data,'backend'));
 Object.assign(process.env,values,{INFIMATCH_SECRET_SOURCE:'vault',NODE_ENV:'test',APP_ORIGIN:'http://127.0.0.1:5173'});
 require('reflect-metadata');
 const {Client}=require('pg');const client=new Client({connectionString:values.DATABASE_URL});await client.connect();await client.query('BEGIN');
 let queue=Promise.resolve();const serial=fn=>{const p=queue.then(fn);queue=p.catch(()=>{});return p;};
 const query=async(sql,params)=>(await client.query(sql,params)).rows;
 const {Database}=require('../backend/dist/database/database');
 Database.prototype.connect=async function(){this.query=(sql,params)=>serial(()=>query(sql,params));this.transaction=fn=>serial(async()=>{await client.query('SAVEPOINT nurse_ui_case');try{const result=await fn({query});await client.query('RELEASE SAVEPOINT nurse_ui_case');return result}catch(e){await client.query('ROLLBACK TO SAVEPOINT nurse_ui_case');await client.query('RELEASE SAVEPOINT nurse_ui_case');throw e}});return this};
 // Only the isolated test process replaces PostgreSQL sessions with memory sessions.
 const sessions=require('express-session');const pgSessionPath=require.resolve('connect-pg-simple');require(pgSessionPath);require.cache[pgSessionPath].exports=()=>class extends sessions.MemoryStore{close(){this.clear(()=>{});}};
 const {createApp}=require('../backend/dist/app');const app=await createApp();await app.listen(0,'127.0.0.1');const db=app.get(Database);
 const {DocumentsService}=require('../backend/dist/documents/documents.module');const docs=app.get(DocumentsService);const documentDirectory=await mkdtemp(join(tmpdir(),'infimatch-nurse-docs-'));docs.directory=documentDirectory;
 const {RppsService}=require('../backend/dist/profiles/rpps');const rpps=app.get(RppsService);let rppsStatus='PENDING';rpps.lookup=async()=>({status:rppsStatus,reason:'ISOLATED_PROVIDER_FIXTURE'});
 const {MatchingService}=require('../backend/dist/matching/matching.module');const matching=app.get(MatchingService);
 const request=require('supertest'),clients=[];const key=randomUUID();
 const checks=[];const ok=(name)=>{checks.push(name);console.log('PASS '+name)};
 async function makeAccount(family,organizationType){const agent=request.agent(app.getHttpServer());const csrf=await agent.get('/api/v1/auth/csrf').expect(200);const body={email:randomUUID()+'@example.invalid',password:'Fixture-'+randomUUID(),family,termsVersion:'2026-09-14',...(organizationType?{organizationType,name:'FICTIF '+organizationType,address:'1 rue fictive Paris',referent:'Contact fictif',...(organizationType==='ESTABLISHMENT'?{finess:'000000001'}:{siret:'00000000000001'})}:{})};const reg=await agent.post('/api/v1/auth/register').set('Origin',process.env.APP_ORIGIN).set('X-CSRF-Token',csrf.body.csrfToken).send(body).expect(201);const me=await agent.get('/api/v1/auth/me').expect(200);const c={agent,id:reg.body.user.id,email:body.email,password:body.password,token:reg.body.csrfToken,org:me.body.organizations[0]?.id};clients.push(c);return c;}
 async function call(c,method,path,body,status=200){let r=c.agent[method.toLowerCase()]('/api/v1'+path).set('Origin',process.env.APP_ORIGIN).set('X-CSRF-Token',c.token).set('Idempotency-Key',randomUUID());if(body!==undefined)r=r.send(body);return r.expect(status);}
 let closed=false;async function close(){if(closed)return;closed=true;try{await queue;await client.query('ROLLBACK');for(const c of clients)assert.equal((await client.query('SELECT id FROM account WHERE id=$1',[c.id])).rowCount,0);if(matching.connection.readyState===1&&clients.length)await matching.runs.deleteMany({ownerId:{$in:clients.map(c=>c.id)}});ok('Rollback verified: isolated accounts and SQL data do not persist');}finally{await app.close();await client.end();const resolved=resolve(documentDirectory);assert.ok(resolved.startsWith(resolve(tmpdir())+require('node:path').sep)&&require('node:path').basename(resolved).startsWith('infimatch-nurse-docs-'));await rm(resolved,{recursive:true,force:true});}}
 try{
 const nurse=await makeAccount('NURSE'),other=await makeAccount('NURSE'),agency=await makeAccount('ENTERPRISE','AGENCY'),facility=await makeAccount('ENTERPRISE','ESTABLISHMENT');await db.query('INSERT INTO agency_link(agency_id,establishment_id) VALUES($1,$2)',[agency.org,facility.org]);
 const profile={displayName:'Camille',qualifications:['IDE','IADE'],skills:['TRIAGE','POPULATION_ADULT','BLOCK_DIGESTIVE'],experience:[{service:'URGENCES',establishment:'Clinique fictive',start:'2020-01-01T00:00:00Z',end:'2021-01-01T00:00:00Z'}],available:[{start:'2030-01-01T00:00:00Z',end:'2030-02-01T00:00:00Z'}],unavailable:[],latitude:48.85,longitude:2.35,radiusKm:30,acceptedShifts:['DAY','NIGHT','MIXED'],preferredShifts:[],visible:true,details:{firstName:'Camille',lastName:'Exemple',city:'Paris',postalCode:'75001',ideDiplomaYear:2015,iadeDiplomaYear:2020,referenceName:'Alex Exemple',referenceRole:'Cadre de santé',referenceEstablishment:'Clinique fictive',referenceEmail:'reference@example.invalid'}};
 await call(nurse,'PUT','/profile',profile);await db.query("UPDATE profile SET rpps_status='FOUND',rpps_number='10000000001' WHERE user_id=$1",[nurse.id]);
 const missionDto={agencyId:agency.org,establishmentId:facility.org,title:'Mission infirmiere FICTIVE '+key,description:'Renfort de demonstration en urgences.',qualification:'IDE',service:'URGENCES',population:'ADULT',block:'NONE',requiredSkills:['TRIAGE'],desiredSkills:[],minExperienceMonths:0,shift:'DAY',address:'1 rue fictive Paris',latitude:48.85,longitude:2.35,hourlySalary:32,start:'2030-01-10T07:00:00Z',end:'2030-01-10T15:00:00Z'};
 async function mission(title,start){const dto={...missionDto,title,start,end:new Date(Date.parse(start)+8*3600000).toISOString()};const c=await call(agency,'POST','/missions',dto,201);await call(agency,'POST','/missions/'+c.body.id+'/publish',{},201);return c.body.id;}
 const missionId=await mission(missionDto.title,missionDto.start),confirmedMissionId=await mission('Mission confirmee FICTIVE '+key,'2030-01-12T07:00:00Z');
 const a=await call(nurse,'POST','/missions/'+confirmedMissionId+'/applications',{version:1},201);const assigned=await call(agency,'POST','/missions/'+confirmedMissionId+'/assignments',{applicationId:a.body.id},201);
 const [external]=await db.query("INSERT INTO external_offer(source,source_id,title,description,url,location_label,qualification,raw_hash,provenance) VALUES('TEST_FIXTURE',$1,'Offre IDE fictive','Offre de demonstration','https://example.invalid/offre','Paris','IDE','fixture','{\"fictional\":true}') RETURNING id",[key]);
 return {app,db,client,nurse,other,agency,facility,profile,missionId,confirmedMissionId,assignmentId:assigned.body.id,confirmedApplicationId:a.body.id,externalId:external.id,call,checks,ok,close,rpps,setRppsStatus:s=>{rppsStatus=s},documentDirectory,matching,key};
 }catch(e){await close();throw e;}
}
