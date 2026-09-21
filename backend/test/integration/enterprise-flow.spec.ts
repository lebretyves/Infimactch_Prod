import {fixtureDate} from './fixture-dates';
import "reflect-metadata";
import {before,after,test} from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import request from "supertest";
import {createApp} from "../../src/app";
import {Database} from "../../src/database/database";
import {AutomationService} from "../../src/automation/automation.module";
let app:Awaited<ReturnType<typeof createApp>>,db:Database;
before(async()=>{const url=new URL(process.env.DATABASE_URL!);if(process.env.NODE_ENV!=="test"||url.hostname!=="127.0.0.1"||url.port!=="55433"||url.pathname!=="/infimatch_test")throw Error("Requires isolated local test database");app=await createApp();await app.listen(0,"127.0.0.1");db=app.get(Database);});
after(async()=>{await app?.close();});
async function account(family:"ENTERPRISE"|"NURSE"){
 const agent=request.agent(app.getHttpServer()),csrf=await agent.get('/api/v1/auth/csrf').expect(200);
 const body={email:randomUUID()+'@example.invalid',password:'Fictional-production-flow-123',family,termsVersion:'2026-09-14',...(family==='NURSE'?{profile:{displayName:'Professionnel FICTIF',qualifications:[],skills:[],experience:[],available:[],unavailable:[],latitude:null,longitude:null,radiusKm:null,acceptedShifts:[],preferredShifts:[],visible:false}}:{}),...(family==='ENTERPRISE'?{organizationType:'ESTABLISHMENT',name:'Entreprise FICTIVE',address:'1 rue fictive Paris',referent:'Contact fictif',finess:'000000001'}:{})};
 const response=await agent.post('/api/v1/auth/register').set('Origin',process.env.APP_ORIGIN!).set('X-CSRF-Token',csrf.body.csrfToken).set('Idempotency-Key',randomUUID()).send(body).expect(201);
 const me=await agent.get('/api/v1/auth/me').expect(200);return {agent,id:response.body.user.id,token:response.body.csrfToken,org:me.body.organizations[0]?.id};
}
function post(a:Awaited<ReturnType<typeof account>>,path:string,body?:object){return a.agent.post('/api/v1/'+path).set('Origin',process.env.APP_ORIGIN!).set('X-CSRF-Token',a.token).set('Idempotency-Key',randomUUID()).send(body);}
test('enterprise need becomes a tracked direct mission visible to nurses only after publication',async()=>{
 const owner=await account('ENTERPRISE'),other=await account('ENTERPRISE'),nurse=await account('NURSE');
 const slot={start:fixtureDate('2037-02-10T08:00:00Z'),end:fixtureDate('2037-02-10T16:00:00Z')};
 const details={...slot,qualification:'IDE',service:'URGENCES',shift:'DAY',headcount:1,population:'ADULT',block:'NONE',requiredSkills:[],minExperienceMonths:0,address:'1 rue fictive Paris'};
 const need=await post(owner,'staffing-requests',{establishmentId:owner.org,title:'Besoin FICTIF suivi',description:'Besoin de recette strictement fictif',details}).expect(201);
 const dashboard=await owner.agent.get('/api/v1/dashboards').expect(200);assert.equal(dashboard.body.activity.needs,1);assert.equal(dashboard.body.recentNeeds[0].id,need.body.id);
 await other.agent.get('/api/v1/staffing-requests/'+need.body.id).expect(404);
 const mission={...details,establishmentId:owner.org,staffingRequestId:need.body.id,title:'Offre FICTIVE directe',description:'Mission de recette strictement fictive',desiredSkills:[],latitude:48,longitude:2,hourlySalary:25};
 delete (mission as any).headcount;
 await post(other,'missions',mission).expect(404);
 await post(other,'missions',{...mission,establishmentId:other.org}).expect(404);
 const created=await post(owner,'missions',mission).expect(201),id=created.body.id;
 assert.equal(created.body.status,'DRAFT');
 await nurse.agent.get('/api/v1/listings/m_'+id).expect(404);
 const tracked=await owner.agent.get('/api/v1/staffing-requests/'+need.body.id).expect(200);assert.equal(tracked.body.missions[0].id,id);assert.equal(tracked.body.missions[0].status,'DRAFT');
 const manage=await owner.agent.get('/api/v1/missions/'+id).expect(200);assert.equal(manage.body.can_manage,true);assert.equal(manage.body.agency_id,null);
 await post(other,'missions/'+id+'/publish').expect(404);
 const key=randomUUID();await post(owner,'missions/'+id+'/publish').set('Idempotency-Key',key).expect(201);await post(owner,'missions/'+id+'/publish').set('Idempotency-Key',key).expect(201);
 await nurse.agent.get('/api/v1/listings/m_'+id).expect(200);
 await nurse.agent.put('/api/v1/profile').set('Origin',process.env.APP_ORIGIN!).set('X-CSRF-Token',nurse.token).send({displayName:(await nurse.agent.get('/api/v1/profile').expect(200)).body.display_name,qualifications:['IDE'],skills:[],experience:[],available:[slot],unavailable:[],latitude:48,longitude:2,radiusKm:30,acceptedShifts:['DAY'],preferredShifts:[],visible:true}).expect(200);
 // Isolated fixture only: no public route permits declaring an RPPS as verified.
 await db.query("UPDATE profile SET rpps_status='FOUND' WHERE user_id=$1",[nurse.id]);
 const matches=await nurse.agent.get('/api/v1/me/matches?limit=50').expect(200);assert.ok(matches.body.items.some((m:any)=>m.missionId===id));
 const application=await post(nurse,'missions/'+id+'/applications',{version:1}).expect(201);
 const activity=await owner.agent.get('/api/v1/dashboards').expect(200);assert.equal(activity.body.activity.applications,1);
 await post(owner,'applications/'+application.body.id+'/selection').expect(404);
 await post(other,'missions/'+id+'/assignments',{applicationId:application.body.id}).expect(404);
 const assigned=await post(owner,'missions/'+id+'/assignments',{applicationId:application.body.id}).expect(201);assert.ok(assigned.body.id);
 const [event]=await db.query("SELECT id FROM outbox WHERE event='AssignmentCreated' AND payload->>'missionId'=$1",[id]);
 assert.equal((await app.get(AutomationService).confirmation(event.id)).status,'READY');
 const final=await owner.agent.get('/api/v1/staffing-requests/'+need.body.id).expect(200);assert.equal(final.body.missions[0].status,'FILLED');assert.equal(Number(final.body.missions[0].application_count),1);
 await post(owner,'missions/'+id+'/cancel').expect(201);
 const cancelled=await owner.agent.get('/api/v1/missions/'+id).expect(200);assert.equal(cancelled.body.status,'CANCELLED');assert.ok(cancelled.body.events.some((e:any)=>e.event==='MISSION_CANCELLED'));
});


test('mixed recommendations keep eligible internal missions distinct from active external offers',async()=>{
 const owner=await account('ENTERPRISE'),nurse=await account('NURSE');
 const slot={start:fixtureDate('2037-10-24T20:00:00+02:00'),end:fixtureDate('2037-10-25T06:00:00+01:00')};
 await nurse.agent.put('/api/v1/profile').set('Origin',process.env.APP_ORIGIN!).set('X-CSRF-Token',nurse.token).send({displayName:(await nurse.agent.get('/api/v1/profile').expect(200)).body.display_name,qualifications:['IDE'],skills:[],experience:[],available:[slot],unavailable:[],latitude:48,longitude:2,radiusKm:30,acceptedShifts:['NIGHT'],preferredShifts:[],visible:false}).expect(200);
 await db.query("UPDATE profile SET rpps_status='FOUND' WHERE user_id=$1",[nurse.id]);
 const ids:string[]=[];
 for(const name of ['Older open','Recent open','Closed recent','Past open']){
  const created=await post(owner,'missions',{...slot,establishmentId:owner.org,title:'Fictional '+name,description:'Isolated mixed recommendation test',qualification:'IDE',service:'URGENCES',shift:'NIGHT',population:'ADULT',block:'NONE',requiredSkills:[],desiredSkills:[],minExperienceMonths:0,address:'Fictional test address',latitude:48,longitude:2,hourlySalary:25}).expect(201);
  ids.push(created.body.id);await post(owner,'missions/'+created.body.id+'/publish').expect(201);
 }
 await db.query("UPDATE audit SET created_at='2020-01-01T00:00:00Z' WHERE resource_id=$1 AND event='MISSION_OPEN'",[ids[0]]);
 await db.query("UPDATE audit SET created_at='2021-01-01T00:00:00Z' WHERE resource_id=$1 AND event='MISSION_OPEN'",[ids[1]]);
 await post(owner,'missions/'+ids[2]+'/cancel').expect(201);
 await db.query("UPDATE mission SET start_at='2000-01-01T20:00Z',end_at='2000-01-02T06:00Z' WHERE id=$1",[ids[3]]);
 const externalIds:string[]=[];
 for(const [active,expires] of [[true,null],[false,null],[true,'2000-01-01T00:00Z']] as const){const [row]=await db.query("INSERT INTO external_offer(source,source_id,title,description,url,location_label,qualification,raw_hash,active,expires_at,provenance) VALUES('JOBSPIPE',$1,'Fictional external IDE','Isolated external description','https://example.invalid/jobs/fictional','Fictional location','IDE','fictional-hash',$2,$3,$4) RETURNING id",[randomUUID(),active,expires,JSON.stringify({publishedAt:'2022-01-01T00:00:00Z',facts:{qualification:'IDE',warnings:[]}})]);externalIds.push(row.id);}
 const response=await nurse.agent.get('/api/v1/me/recommendations').expect(200),mix=response.body;
 assert.equal(mix.mode,'MIXED');assert.equal(mix.internal.status,'READY');assert.equal(mix.external.status,'READY');
 assert.deepEqual(mix.internal.items.filter((x:any)=>ids.includes(x.id.slice(2))).map((x:any)=>x.id),['m_'+ids[1],'m_'+ids[0]]);
 assert.ok(mix.internal.items.every((x:any)=>x.kind==='INTERNAL_MISSION'&&x.matching_score!==null&&Date.parse(x.start_at)>Date.now()));
 assert.ok(!mix.internal.items.some((x:any)=>['m_'+ids[2],'m_'+ids[3]].includes(x.id)));
 assert.ok(!mix.external.items.some((x:any)=>['e_'+externalIds[1],'e_'+externalIds[2]].includes(x.id)));
 assert.ok(mix.external.items.every((x:any)=>x.profileCorrespondence.score===null&&x.profileCorrespondence.eligibilityVerified===false));
 await db.query("UPDATE profile SET qualifications='{}',rpps_status='NOT_CHECKED' WHERE user_id=$1",[nurse.id]);
 const incomplete=(await nurse.agent.get('/api/v1/me/recommendations').expect(200)).body;
 assert.equal(incomplete.internal.personalization,'GENERAL_PROFILE_INCOMPLETE');assert.ok(incomplete.internal.items.length>0);assert.ok(incomplete.internal.items.every((m:any)=>m.matching_score===undefined&&m.match_explanation_id===undefined));assert.equal(incomplete.external.personalization,'GENERAL_PROFILE_INCOMPLETE');assert.ok(incomplete.external.items.length>0);
 await owner.agent.get('/api/v1/me/recommendations').expect(404);
});
