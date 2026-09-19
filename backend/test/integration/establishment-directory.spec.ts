import {fixtureDate} from './fixture-dates';
import {AutomationService} from "../../src/automation/automation.module";
import {enterpriseApplicationPage,missionApplicationPage,ApplicationInboxDto} from "../../src/missions/application-inbox";
import "reflect-metadata";
import {test,before,after} from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {validate} from "class-validator";
import {Database} from "../../src/database/database";
import {MissionsService} from "../../src/missions/missions.service";
import {MissionDto} from "../../src/missions/mission.dto";
import {enterpriseMissionSearch,establishmentPage,enterpriseMissionPage,EstablishmentsPageDto,EnterpriseMissionsPageDto} from "../../src/organizations/establishment-directory";
let db:Database;
before(async()=>{const url=new URL(process.env.DATABASE_URL!);if(process.env.NODE_ENV!=="test"||url.hostname!=="127.0.0.1"||url.port!=="55433"||url.pathname!=="/infimatch_test")throw Error("Requires isolated local test database");db=await new Database().connect();});
after(async()=>{await db?.onModuleDestroy();});
test("establishment directory scopes counts and pages; creation publishes atomically and idempotently",async()=>{
 const service=new MissionsService(db);
 async function actor(){return (await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture','ENTERPRISE','fixture') RETURNING id",[randomUUID()+'@example.invalid']))[0].id;}
 async function org(kind:string,name:string,finess?:string){return (await db.query('INSERT INTO organization(kind,name,address,referent,finess) VALUES($1,$2,$3,$4,$5) RETURNING id',[kind,name,'Paris fixture','Fixture',finess||null]))[0].id;}
 const owner=await actor(),outsider=await actor(),agency=await org('AGENCY','Fixture agency'),otherAgency=await org('AGENCY','Other fixture agency');
 for(const [a,o]of[[owner,agency],[outsider,otherAgency]])await db.query('INSERT INTO membership(user_id,organization_id) VALUES($1,$2)',[a,o]);
 const a=await org('ESTABLISHMENT','A fixture','000000001'),b=await org('ESTABLISHMENT','B fixture','000000002'),hidden=await org('ESTABLISHMENT','Hidden fixture','000000003');
 for(const site of[a,b])await db.query('INSERT INTO agency_link(agency_id,establishment_id) VALUES($1,$2)',[agency,site]);
 await db.query('INSERT INTO agency_link(agency_id,establishment_id) VALUES($1,$2)',[otherAgency,a]);
 await db.query('INSERT INTO membership(user_id,organization_id,active) VALUES($1,$2,false)',[owner,hidden]);
 const base: MissionDto={agencyId:agency,establishmentId:a,title:'Fixture mission',description:'Isolated fixture',qualification:'IDE',service:'URGENCES',population:'ADULT',block:'NONE',requiredSkills:[],desiredSkills:[],minExperienceMonths:0,start:fixtureDate('2037-01-01T08:00:00Z'),end:fixtureDate('2037-01-01T16:00:00Z'),shift:'DAY',address:'Paris fixture',latitude:48.85,longitude:2.35,hourlySalary:25,timezone:'Europe/Paris'};
 const key=randomUUID();const opened=await service.create(owner,base,key,true);assert.equal(opened.status,'OPEN');assert.deepEqual(await service.create(owner,base,key,true),opened);
 assert.equal((await db.query("SELECT count(*)::integer n FROM outbox WHERE event='MissionOPEN' AND payload->>'missionId'=$1",[opened.id]))[0].n,1);
 await assert.rejects(service.create(owner,{...base,title:'Different'},key,true));
 await assert.rejects(service.create(owner,{...base,start:'2000-01-01T08:00:00Z',end:'2000-01-01T16:00:00Z'},randomUUID(),true));
 assert.equal((await db.query('SELECT count(*)::integer n FROM mission WHERE agency_id=$1',[agency]))[0].n,1);
 await assert.rejects(service.create(outsider,base,randomUUID(),true));
 for(let i=0;i<23;i++)await service.create(owner,{...base,establishmentId:b,title:'B fixture '+i},randomUUID(),true);
 await service.create(outsider,{...base,agencyId:otherAgency,title:'Other agency private'},randomUUID(),true);
 const page=await establishmentPage(db,owner,{limit:1,offset:0});assert.equal(page.total,2);assert.equal(page.items[0].id,a);assert.equal(page.items[0].counts.OPEN,1);assert.equal(page.items[0].total,1);
 const next=await establishmentPage(db,owner,{limit:1,offset:1});assert.equal(next.items[0].id,b);assert.equal(next.items[0].total,23);
 assert.equal((await establishmentPage(db,owner,{limit:20,offset:0,q:'000000002'})).items[0].id,b);
 assert.deepEqual((await establishmentPage(db,owner,{limit:20,offset:0,q:'%'})).items,[]);
 assert.equal((await establishmentPage(db,owner,{limit:20,offset:500})).total,2);
 const filtered=await enterpriseMissionPage(db,owner,{limit:20,offset:0,establishmentId:a});assert.equal(filtered.length,1);assert.equal(filtered[0].id,opened.id);assert.equal(filtered[0].establishment_name,'A fixture');assert.equal(filtered[0].can_manage,true);
 assert.equal((await enterpriseMissionPage(db,owner,{limit:20,offset:20,establishmentId:b})).length,3);
 assert.equal((await enterpriseMissionPage(db,outsider,{limit:20,offset:0,establishmentId:b})).length,0);
 await db.query('INSERT INTO membership(user_id,organization_id) VALUES($1,$2)',[owner,a]);assert.equal((await establishmentPage(db,owner,{limit:20,offset:0})).total,2);
 assert.ok((await validate(Object.assign(new EnterpriseMissionsPageDto(),{establishmentId:'invalid'}))).length);assert.ok((await validate(Object.assign(new EstablishmentsPageDto(),{q:'x'.repeat(151)}))).length);

 assert.equal((await enterpriseMissionPage(db,owner,{limit:20,offset:20,qualification:'IDE',location:'Paris',date:fixtureDate('2037-01-01'),establishmentId:b})).length,3);
 assert.equal((await enterpriseMissionPage(db,owner,{limit:20,offset:0,qualification:'IBODE'})).length,0);
 assert.equal((await enterpriseMissionPage(db,owner,{limit:20,offset:0,location:'Unknown city'})).length,0);
 assert.equal((await enterpriseMissionPage(db,owner,{limit:20,offset:0,date:fixtureDate('2037-01-02')})).length,0);
 const shared=await enterpriseMissionPage(db,owner,{limit:20,offset:0,establishmentId:a});assert.ok(shared.some((m:any)=>m.title==='Other agency private' && m.can_manage===false));
 const night=await service.create(owner,{...base,title:'Overnight fixture',start:fixtureDate('2037-01-01T22:00:00Z'),end:fixtureDate('2037-01-02T06:00:00Z')},randomUUID(),true);
 assert.equal((await enterpriseMissionPage(db,owner,{limit:20,offset:0,date:fixtureDate('2037-01-02'),establishmentId:a}))[0].id,night.id);
 assert.ok((await validate(Object.assign(new EnterpriseMissionsPageDto(),{date:fixtureDate('2037-02-31')}))).length);
 assert.ok((await validate(Object.assign(new EnterpriseMissionsPageDto(),{qualification:'OTHER'}))).length);

 const dateBody:MissionDto={...base,title:'Date-only fixture',start:fixtureDate('2037-01-01T23:00:00Z'),end:fixtureDate('2037-01-02T23:00:00Z'),schedulePrecision:'DATE',shift:'UNKNOWN',minExperienceMonths:18};
 const dateOnly=await service.create(owner,dateBody,randomUUID(),true);assert.equal(dateOnly.status,'OPEN');
 const [stored]=await db.query('SELECT schedule_precision,shift,min_experience_months FROM mission WHERE id=$1',[dateOnly.id]);assert.equal(stored.schedule_precision,'DATE');assert.equal(stored.shift,'UNKNOWN');assert.equal(Number(stored.min_experience_months),18);
 const [exact]=await db.query('SELECT schedule_precision FROM mission WHERE id=$1',[opened.id]);assert.equal(exact.schedule_precision,'EXACT');
 await assert.rejects(service.create(owner,{...dateBody,start:fixtureDate('2037-01-02T08:00:00Z')},randomUUID(),true));
 await assert.rejects(service.edit(owner,dateOnly.id,{...dateBody,schedulePrecision:undefined,start:fixtureDate('2037-01-02T08:00:00Z')},randomUUID()));

 const targets=await enterpriseMissionPage(db,owner,{limit:20,offset:0,establishmentId:b});
 const nurses=[];
 for(let i=0;i<3;i++){
  const [n]=await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture','NURSE','fixture') RETURNING id",[randomUUID()+'@example.invalid']);nurses.push(n.id);
  await db.query("INSERT INTO profile(user_id,display_name,qualifications,rpps_status,latitude,longitude,radius_km,accepted_shifts,available) VALUES($1,$2,ARRAY['IDE'],'FOUND',48.85,2.35,30,ARRAY['DAY'],$3::jsonb)",[n.id,'Candidate '+i,JSON.stringify([{start:base.start,end:base.end}])]);
  await db.query("INSERT INTO application(mission_id,nurse_id,consent_version,status) VALUES($1,$2,1,$3)",[targets[0].id,n.id,i===2?'REJECTED':i===1?'SELECTED':'SUBMITTED']);
 }
 const inbox=await enterpriseApplicationPage(db,owner,{limit:1,offset:0});assert.equal(inbox.total,2);assert.equal(inbox.items.length,1);
 assert.equal(inbox.items[0].matching.eligible,true);assert.equal(typeof inbox.items[0].matching.score,'number');assert.equal(inbox.items[0].matching.qualificationMatches,true);
 assert.equal(inbox.items[0].mission.establishment_name,'B fixture');assert.equal(inbox.items[0].profile_data,undefined);assert.equal(inbox.items[0].rpps_number,undefined);
 const second=await enterpriseApplicationPage(db,owner,{limit:1,offset:1});assert.equal(second.total,2);assert.notEqual(second.items[0].id,inbox.items[0].id);
 assert.equal((await enterpriseApplicationPage(db,outsider,{limit:20,offset:0})).total,0);
 assert.equal((await enterpriseApplicationPage(db,nurses[0],{limit:20,offset:0})).total,0);
 assert.equal((await enterpriseApplicationPage(db,owner,{limit:20,offset:0,q:'Candidate 1'})).total,1);
 assert.equal((await enterpriseApplicationPage(db,owner,{limit:20,offset:0,q:'%'})).total,0);
 assert.equal((await enterpriseApplicationPage(db,owner,{limit:20,offset:99})).total,2);
 await db.query("UPDATE profile SET qualifications=ARRAY['IADE'],available='[]'::jsonb,latitude=NULL WHERE user_id=$1",[nurses[0]]);
 const mismatch=(await enterpriseApplicationPage(db,owner,{limit:20,offset:0,q:'Candidate 0'})).items[0];assert.equal(mismatch.matching.score,null);assert.ok(mismatch.matching.reasons.includes('QUALIFICATION_MISSING'));assert.ok(mismatch.matching.reasons.includes('NOT_FULLY_AVAILABLE'));assert.ok(mismatch.matching.reasons.includes('MOBILITY_INCOMPLETE'));
 await db.query("UPDATE mission SET schedule_precision='DATE',shift='UNKNOWN' WHERE id=$1",[targets[0].id]);
 const dateCandidates=await missionApplicationPage(db,targets[0].id,{limit:20,offset:0});assert.equal(dateCandidates.length,3);assert.ok(dateCandidates.every(c=>c.matching.reasons.includes('SCHEDULE_UNCONFIRMED')));assert.ok(dateCandidates.every(c=>!c.matching.reasons.includes('NOT_FULLY_AVAILABLE')));
 await db.query('UPDATE membership SET active=false WHERE user_id=$1 AND organization_id=$2',[owner,agency]);assert.equal((await enterpriseApplicationPage(db,owner,{limit:20,offset:0})).total,0);
 assert.ok((await validate(Object.assign(new ApplicationInboxDto(),{q:'x'.repeat(151)}))).length);

});

test("reminders process bounded batches and resume without duplicate windows",async()=>{
 const [template]=await db.query('SELECT * FROM mission LIMIT 1');
 const [owner]=await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture','ENTERPRISE','fixture') RETURNING id",[randomUUID()+'@example.invalid']);
 const [agency]=await db.query("INSERT INTO organization(kind,name,address,referent) VALUES('AGENCY','Reminder batch agency','Fixture','Fixture') RETURNING id");
 const [site]=await db.query("INSERT INTO organization(kind,name,address,referent,finess) VALUES('ESTABLISHMENT','Reminder batch facility','Fixture','Fixture','000000088') RETURNING id");
 await db.query('INSERT INTO membership(user_id,organization_id) VALUES($1,$2)',[owner.id,agency.id]);
 const ids=[];
 for(let i=0;i<61;i++){const id=randomUUID();ids.push(id);await db.query('INSERT INTO mission SELECT * FROM jsonb_populate_record(NULL::mission,$1::jsonb)',[JSON.stringify({...template,id,agency_id:agency.id,establishment_id:site.id,status:'OPEN',created_at:'2020-01-01T00:00:00Z',first_published_at:'2020-01-01T00:00:00Z',reminders_enabled:true,last_reminder_at:null,reminder_count:0,start_at:fixtureDate('2037-01-01T08:00:00Z'),end_at:fixtureDate('2037-01-01T16:00:00Z')})]);}
 const service=new AutomationService(db,{} as any);const results=[];
 for(let i=0;i<4;i++)results.push(await service.reminders());
 assert.deepEqual(results.map(r=>r.processed),[25,25,11,0]);assert.deepEqual(results.map(r=>r.hasMore),[true,true,false,false]);
 const [windows]=await db.query('SELECT count(*)::int n FROM reminder_window WHERE mission_id=ANY($1::uuid[])',[ids]);assert.equal(windows.n,61);
 const [notices]=await db.query("SELECT count(*)::int n FROM notification n JOIN outbox e ON n.event_id=e.id WHERE n.user_id=$1 AND n.kind='REMINDER' AND e.payload->>'missionId'=ANY($2::text[])",[owner.id,ids]);assert.equal(notices.n,61);
});


test("enterprise mission search counts filtered pages, preserves scope and supports local dates",async()=>{
 const service=new MissionsService(db);
 const [owner]=await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture','ENTERPRISE','fixture') RETURNING id",[randomUUID()+'@example.invalid']);
 const [outsider]=await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture','ENTERPRISE','fixture') RETURNING id",[randomUUID()+'@example.invalid']);
 const [agency]=await db.query("INSERT INTO organization(kind,name,address,referent) VALUES('AGENCY','Pagination agency','Paris','Fixture') RETURNING id");
 const [site]=await db.query("INSERT INTO organization(kind,name,address,referent,finess) VALUES('ESTABLISHMENT','Pagination hospital','Lyon','Fixture','000000021') RETURNING id");
 await db.query('INSERT INTO membership(user_id,organization_id) VALUES($1,$2),($1,$3)',[owner.id,agency.id,site.id]);
 await db.query('INSERT INTO agency_link(agency_id,establishment_id) VALUES($1,$2)',[agency.id,site.id]);
 const base:MissionDto={agencyId:agency.id,establishmentId:site.id,title:'Paged mission',description:'Isolated pagination test',qualification:'IDE',service:'URGENCES',population:'ADULT',block:'NONE',requiredSkills:[],desiredSkills:[],minExperienceMonths:0,start:fixtureDate('2037-04-01T08:00:00Z'),end:fixtureDate('2037-04-01T16:00:00Z'),shift:'DAY',address:'Lyon fixture',latitude:45.76,longitude:4.84,hourlySalary:25,timezone:'Europe/Paris'};
 const ids:string[]=[];
 for(let i=0;i<21;i++){const result=await service.create(owner.id,{...base,title:'Paged mission '+i,qualification:i===20?'IBODE':'IDE',shift:i===20?'NIGHT':'DAY'},randomUUID(),true);ids.push(result.id);}
 const first=await enterpriseMissionSearch(db,owner.id,{limit:20,offset:0});
 assert.equal(first.total,21);assert.equal(first.items.length,20);assert.equal(first.limit,20);assert.equal(first.offset,0);
 const second=await enterpriseMissionSearch(db,owner.id,{limit:20,offset:20});assert.equal(second.total,21);assert.equal(second.items.length,1);assert.equal(new Set([...first.items,...second.items].map(m=>m.id)).size,21);
 const beyond=await enterpriseMissionSearch(db,owner.id,{limit:20,offset:100});assert.equal(beyond.total,21);assert.deepEqual(beyond.items,[]);
 const hidden=await enterpriseMissionSearch(db,outsider.id,{limit:20,offset:0});assert.equal(hidden.total,0);assert.deepEqual(hidden.items,[]);
 const filtered=await enterpriseMissionSearch(db,owner.id,{limit:20,offset:0,qualification:'IBODE',shift:'NIGHT',location:'000000021',status:'OPEN',q:'Paged mission 20',date:fixtureDate('2037-04-01')});assert.equal(filtered.total,1);assert.equal(filtered.items[0].id,ids[20]);
 assert.equal((await enterpriseMissionSearch(db,owner.id,{limit:20,offset:0,qualification:'IDE'})).total,20);
 for(const q of ['%',"' OR 1=1 --",'missing'])assert.equal((await enterpriseMissionSearch(db,owner.id,{limit:20,offset:0,q})).total,0);
 await db.query("UPDATE mission SET status='CANCELLED' WHERE id=$1",[ids[0]]);
 assert.equal((await enterpriseMissionSearch(db,owner.id,{limit:20,offset:0,status:'CANCELLED'})).items[0].id,ids[0]);
 assert.equal((await enterpriseMissionSearch(db,owner.id,{limit:20,offset:0,status:'OPEN'})).total,20);
 const night=await service.create(owner.id,{...base,title:'DOM overnight',timezone:'America/Guadeloupe',start:fixtureDate('2037-04-02T02:00:00Z'),end:fixtureDate('2037-04-02T10:00:00Z'),shift:'NIGHT'},randomUUID(),true);
 for(const date of [fixtureDate('2037-04-01'),fixtureDate('2037-04-02')])assert.equal((await enterpriseMissionSearch(db,owner.id,{limit:20,offset:0,q:'DOM overnight',date})).total,1);
 assert.equal((await enterpriseMissionSearch(db,owner.id,{limit:20,offset:0,q:'DOM overnight',date:fixtureDate('2037-04-03')})).total,0);
 assert.equal((await enterpriseMissionSearch(db,owner.id,{limit:20,offset:0,sort:'start_desc'})).items[0].id,night.id);
 assert.notEqual((await enterpriseMissionSearch(db,owner.id,{limit:20,offset:0,sort:'start_asc'})).items[0].id,night.id);
 for(const invalid of [{status:'HACK'},{shift:'BAD'},{sort:'start_at;drop table mission'},{q:'x'.repeat(151)}])assert.ok((await validate(Object.assign(new EnterpriseMissionsPageDto(),invalid))).length);
 await db.query('UPDATE membership SET active=false WHERE user_id=$1',[owner.id]);assert.equal((await enterpriseMissionSearch(db,owner.id,{limit:20,offset:0})).total,0);
});
