import "reflect-metadata";
import {test,before,after} from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {validate} from "class-validator";
import {Database} from "../../src/database/database";
import {MissionsService} from "../../src/missions/missions.service";
import {MissionDto} from "../../src/missions/mission.dto";
import {establishmentPage,enterpriseMissionPage,EstablishmentsPageDto,EnterpriseMissionsPageDto} from "../../src/organizations/establishment-directory";
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
 const base: MissionDto={agencyId:agency,establishmentId:a,title:'Fixture mission',description:'Isolated fixture',qualification:'IDE',service:'URGENCES',population:'ADULT',block:'NONE',requiredSkills:[],desiredSkills:[],minExperienceMonths:0,start:'2037-01-01T08:00:00Z',end:'2037-01-01T16:00:00Z',shift:'DAY',address:'Paris fixture',latitude:48.85,longitude:2.35,hourlySalary:25,timezone:'Europe/Paris'};
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
 const filtered=await enterpriseMissionPage(db,owner,{limit:20,offset:0,establishmentId:a});assert.equal(filtered.length,1);assert.equal(filtered[0].id,opened.id);assert.equal(filtered[0].establishment_name,'A fixture');
 assert.equal((await enterpriseMissionPage(db,owner,{limit:20,offset:20,establishmentId:b})).length,3);
 assert.equal((await enterpriseMissionPage(db,outsider,{limit:20,offset:0,establishmentId:b})).length,0);
 await db.query('INSERT INTO membership(user_id,organization_id) VALUES($1,$2)',[owner,a]);assert.equal((await establishmentPage(db,owner,{limit:20,offset:0})).total,2);
 assert.ok((await validate(Object.assign(new EnterpriseMissionsPageDto(),{establishmentId:'invalid'}))).length);assert.ok((await validate(Object.assign(new EstablishmentsPageDto(),{q:'x'.repeat(151)}))).length);

});
