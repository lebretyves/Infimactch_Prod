import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from 'class-validator';
import { MissionDto } from '../../src/missions/mission.dto';
import { MissionsService } from '../../src/missions/missions.service';
const body: MissionDto = {establishmentId:'11111111-1111-4111-8111-111111111111',title:'Mission test',description:'Mission de test seulement',qualification:'IDE',service:'CHIRURGIE',population:'ADULT',block:'NONE',requiredSkills:[],desiredSkills:[],minExperienceMonths:0,start:'2030-07-10T12:00:00Z',end:'2030-07-10T20:00:00Z',shift:'DAY',address:'Adresse test',latitude:16,longitude:-61,hourlySalary:20};
test('Mission timezone accepts IANA DOM and Paris; rejects invalid/null/offset',async()=>{
 for(const timezone of [undefined,'Europe/Paris','America/Guadeloupe','America/Martinique','America/Cayenne','Indian/Reunion','Indian/Mayotte'])assert.equal((await validate(Object.assign(new MissionDto(),body,{timezone}))).length,0);
 for(const timezone of ['Invalid/Zone','+04:00','',null])assert.ok((await validate(Object.assign(new MissionDto(),body,{timezone}))).some(e=>e.property==='timezone'));
});
function fixture(existingZone='America/Guadeloupe'){
 const calls:{sql:string,params:any[]}[]=[];
 const mission={id:'test',agency_id:null,establishment_id:body.establishmentId,status:'DRAFT',qualification:body.qualification,service:body.service,population:body.population,block:body.block,specialty:null,required_skills:[],desired_skills:[],min_experience_months:0,start_at:body.start,end_at:body.end,shift:body.shift,address:body.address,longitude:body.longitude,latitude:body.latitude,hourly_salary:20,timezone:existingZone};
 const em={query:async(sql:string,params:any[]=[])=>{calls.push({sql,params});if(sql.includes('FROM membership'))return[{kind:'ESTABLISHMENT'}];if(sql.includes('FROM mission m'))return[mission];if(sql.startsWith('INSERT INTO mission(')||sql.startsWith('UPDATE mission SET title'))return[{id:'test',version:1,status:'DRAFT'}];return[];}};
 return {calls,service:new MissionsService({transaction:(f:any)=>f(em)}as any)};
}
test('create persists zone and unchanged UTC; omitted zone defaults Paris',async()=>{
 for(const timezone of [undefined,'America/Guadeloupe','Indian/Reunion']){
 const {service,calls}=fixture();await service.create('actor',{...body,timezone},'create-key');const q=calls.find(c=>c.sql.startsWith('INSERT INTO mission('))!;
 assert.match(q.sql,/staffing_request_id,timezone/);assert.equal(q.params[20],timezone??'Europe/Paris');assert.equal(q.params[12],body.start);assert.equal(q.params[13],body.end);
 }
});
test('edit preserves stored zone for legacy clients; explicit change revisions terms',async()=>{
 for(const timezone of [undefined,'Indian/Reunion']){
 const {service,calls}=fixture();await service.edit('actor','test',{...body,timezone},'edit-key');const q=calls.find(c=>c.sql.startsWith('UPDATE mission SET title'))!;
 assert.match(q.sql,/timezone=\$20/);assert.equal(q.params[19],timezone??'America/Guadeloupe');assert.equal(q.params[18],timezone?1:0);assert.equal(q.params[11],body.start);
 }
});
test('invalid timezone rejected before a database transaction',async()=>{
 const {service,calls}=fixture();await assert.rejects(service.create('actor',{...body,timezone:'Bad/Zone'},'key'),/Invalid mission timezone/);assert.equal(calls.length,0);
});
