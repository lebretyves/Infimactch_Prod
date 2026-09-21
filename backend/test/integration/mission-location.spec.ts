import 'reflect-metadata';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {validate} from 'class-validator';
import {Database} from '../../src/database/database';
import {MissionDto} from '../../src/missions/mission.dto';
import {MissionsService} from '../../src/missions/missions.service';
import {MissionLocationOptional1790006400000} from '../../src/database/mission-location-optional';
let db:Database,service:MissionsService,org:string,actor:string;
const body=()=>({establishmentId:org,title:'Adresse de test',description:'Mission fictive en base isolee',qualification:'IDE',service:'URGENCES',population:'ADULT',block:'NONE',requiredSkills:[],desiredSkills:[],minExperienceMonths:0,start:new Date(Date.now()+7*86400000).toISOString(),end:new Date(Date.now()+7*86400000+8*3600000).toISOString(),shift:'DAY',address:'10 rue fictive, Paris',hourlySalary:25} as MissionDto);
before(async()=>{
 const u=new URL(process.env.DATABASE_URL!);assert.equal(process.env.NODE_ENV,'test');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55433');assert.equal(u.pathname,'/infimatch_test');
 db=await new Database().connect();service=new MissionsService(db);
 org=(await db.query("INSERT INTO organization(kind,name,address,referent,finess) VALUES('ESTABLISHMENT','Fixture','Fixture','Fixture','000000000') RETURNING id"))[0].id;
 actor=(await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture','ENTERPRISE','fixture') RETURNING id",[randomUUID()+'@example.invalid']))[0].id;
 await db.query('INSERT INTO membership(user_id,organization_id) VALUES($1,$2)',[actor,org]);
});
after(async()=>{await db?.onModuleDestroy();});
test('upgrade keeps existing coordinates and allows unknown locations',async()=>{
 const m=await service.create(actor,{...body(),latitude:48,longitude:2},randomUUID());
 await db.query('ALTER TABLE mission ALTER COLUMN location SET NOT NULL');
 const runner=db.source.createQueryRunner();try {await new MissionLocationOptional1790006400000().up(runner);}finally{await runner.release();}
 const [row]=await db.query('SELECT ST_Y(location::geometry) AS lat,ST_X(location::geometry) AS lon FROM mission WHERE id=$1',[m.id]);assert.deepEqual(row,{lat:48,lon:2});
});
test('DTO accepts absent/null positions but rejects invalid values',async()=>{
 for(const coords of [{},{latitude:null,longitude:null},{latitude:0,longitude:0}])assert.equal((await validate(Object.assign(new MissionDto(),body(),coords))).length,0);
 for(const coords of [{latitude:91,longitude:0},{latitude:0,longitude:181},{latitude:'48',longitude:2},{latitude:NaN,longitude:2}])assert.ok((await validate(Object.assign(new MissionDto(),body(),coords))).length>0);
});
test('publication without GPS persists SQL NULL and the address; partial pair is rejected',async()=>{
 for(const coords of [{},{latitude:null,longitude:null}]){
  const input={...body(),...coords};const key=randomUUID();const m=await service.create(actor,input,key,true);
  assert.equal((await service.create(actor,input,key,true)).id,m.id);
  const [row]=await db.query('SELECT status,address,location,ST_Y(location::geometry) AS latitude FROM mission WHERE id=$1',[m.id]);assert.equal(row.status,'OPEN');assert.equal(row.address,input.address);assert.equal(row.location,null);assert.equal(row.latitude,null);
 }
 for(const coords of [{latitude:48},{longitude:2}])await assert.rejects(service.create(actor,{...body(),...coords},randomUUID(),true),/supplied together/);
});
test('edit clears stale GPS after address change and later accepts a selected position',async()=>{
 const input={...body(),latitude:48,longitude:2};const m=await service.create(actor,input,randomUUID(),true);
 await service.edit(actor,m.id,{...input,address:'Nouvelle adresse non reconnue',latitude:null,longitude:null},randomUUID());
 assert.equal((await db.query('SELECT location FROM mission WHERE id=$1',[m.id]))[0].location,null);
 await service.edit(actor,m.id,{...input,address:'Adresse a Rennes',latitude:48.11,longitude:-1.68},randomUUID());
 const [row]=await db.query('SELECT ST_Y(location::geometry) AS lat,ST_X(location::geometry) AS lon FROM mission WHERE id=$1',[m.id]);assert.deepEqual(row,{lat:48.11,lon:-1.68});
});
