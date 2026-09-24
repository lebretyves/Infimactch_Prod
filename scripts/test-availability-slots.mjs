import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {nurseWorkspaceFixture} from './nurse-workspace-fixture.mjs';
const require=createRequire(import.meta.url),{covers,overlaps}=require('../backend/dist/domain/matching');
const f=await nurseWorkspaceFixture();
const period=(date,start,end)=>({start:`2030-02-${date}T${start}:00:00Z`,end:`2030-02-${date}T${end}:00:00Z`});
const read=async()=> (await f.call(f.nurse,'GET','/profile')).body;
const patch=async changes=>(await f.call(f.nurse,'PATCH','/profile/availability',{changes})).body;
const disjoint=p=>{for(const a of p.available)for(const b of p.unavailable)assert.equal(overlaps(a,b),false)};
try{
 const before=await read();
 const all={start:'2030-02-01T00:00:00Z',end:'2030-03-01T00:00:00Z'};
 await patch([{...all,state:'available'}]);let saved=await patch([{...period('10','14','22'),state:'unavailable'}]);disjoint(saved);assert.ok(covers(period('10','06','14'),saved.available,saved.unavailable));assert.ok(!covers(period('10','14','22'),saved.available,saved.unavailable));f.ok('Unavailable afternoon splits broad availability while morning stays available');
 await patch([{...period('10','14','22'),state:'unset'}]);saved=await read();assert.ok(!covers(period('10','14','22'),saved.available,[]));assert.ok(!covers(period('10','14','22'),saved.unavailable,[]));f.ok('Third state clears both availability and unavailability');
 for(let i=1;i<=3;i++){for(const state of ['available','unavailable','unset']){saved=await patch([{...period('10','14','22'),state}]);assert.equal(covers(period('10','14','22'),saved.available,[]),state==='available');assert.equal(covers(period('10','14','22'),saved.unavailable,[]),state==='unavailable');disjoint(saved);}}f.ok('Three complete click cycles persist without accumulating contradictory periods');
 const night={start:'2030-02-10T22:00:00+01:00',end:'2030-02-11T06:00:00+01:00'};saved=await patch([{...night,state:'unavailable'}]);assert.ok(covers(night,saved.unavailable,[]));assert.ok(!covers(night,saved.available,saved.unavailable));f.ok('Night spans midnight and blocks full-night matching');
 const preserved=await read();for(const key of ['details','experience','qualifications','skills','rpps_number','rpps_status','radius_km'])assert.deepEqual(preserved[key],before[key]);f.ok('Availability-only API preserves identity, qualifications, RPPS and mobility');
 const guarded=await read();const conflict=await f.call(f.nurse,'PATCH','/profile/availability',{changes:[{start:'2030-01-12T08:00:00Z',end:'2030-01-12T09:00:00Z',state:'unavailable'}]},409);assert.equal(conflict.body.code,'ACTIVE_ASSIGNMENT_INCOMPATIBLE');assert.deepEqual((await read()).available,guarded.available);assert.deepEqual((await read()).unavailable,guarded.unavailable);f.ok('Confirmed mission conflict rejected atomically with no persisted change');
 for(const changes of [[],[{...period('10','06','14'),state:'both'}],[{start:'2030-02-10T06:00',end:'2030-02-10T14:00',state:'available'}],[{...period('10','14','06'),state:'available'}]])await f.call(f.nurse,'PATCH','/profile/availability',{changes},400);f.ok('Invalid states, empty requests and invalid or unzoned periods rejected');
 await Promise.all([patch([{...period('20','06','14'),state:'unavailable'}]),patch([{...period('21','14','22'),state:'unavailable'}])]);saved=await read();assert.ok(covers(period('20','06','14'),saved.unavailable,[]));assert.ok(covers(period('21','14','22'),saved.unavailable,[]));f.ok('Independent simultaneous changes both survive');
 const full={...f.profile,available:[...f.profile.available,all],unavailable:[period('10','14','22')]};await f.call(f.nurse,'PUT','/profile',full);saved=await read();disjoint(saved);assert.ok(!covers(period('10','14','22'),saved.available,[]));f.ok('Legacy full-profile writes also remove overlapping availability');
 const priorLimit=await read();const origin=Date.parse('2030-04-01T00:00:00Z');
 await f.call(f.nurse,'PATCH','/profile/availability',{changes:Array.from({length:200},(_,i)=>({start:new Date(origin+i*7200000).toISOString(),end:new Date(origin+i*7200000+3600000).toISOString(),state:'unavailable'}))},400);assert.deepEqual((await read()).available,priorLimit.available);assert.deepEqual((await read()).unavailable,priorLimit.unavailable);f.ok('Excessive fragmented storage is rejected atomically without truncation');
 await f.db.query('UPDATE profile SET available=$2,unavailable=$3 WHERE user_id=$1',[f.nurse.id,JSON.stringify([...f.profile.available,all]),JSON.stringify([period('10','14','22')])]);const legacy=await read();disjoint(legacy);const [raw]=await f.db.query('SELECT available FROM profile WHERE user_id=$1',[f.nurse.id]);assert.equal(raw.available.length,2);f.ok('Legacy overlaps render without conflict on GET while stored history stays untouched until save');
 const other=(await f.call(f.other,'GET','/profile')).body;assert.deepEqual(other.available,[]);assert.deepEqual(other.unavailable,[]);f.ok('Another account is unaffected');
 await require('supertest')(f.app.getHttpServer()).patch('/api/v1/profile/availability').send({changes:[{...all,state:'available'}]}).expect(403);f.ok('Anonymous change is rejected');
}finally{await f.close();}
await mkdir('annexe/proofs/agenda-slots',{recursive:true});await writeFile('annexe/proofs/agenda-slots/backend.json',JSON.stringify({at:new Date().toISOString(),checks:f.checks,isolated:true,rollback:true},null,2));
