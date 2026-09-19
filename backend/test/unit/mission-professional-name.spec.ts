import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {professionalIdentityName, cancellationRecord} from '../../src/automation/mission-mail';

test('mission documents prefer the complete registered identity to the display name',()=>{
  assert.equal(professionalIdentityName({first_name:'  Camille ',last_name:' Du  Pont ',professional_name:'Camille'}),'Camille Du Pont');
  assert.equal(professionalIdentityName({first_name:'Anne-Marie',last_name:"D’Arcy",professional_name:'Pseudo'}),"Anne-Marie D’Arcy");
});
test('legacy or partial identities retain the known display name without inventing a surname',()=>{
  assert.equal(professionalIdentityName({first_name:'Camille',professional_name:'Camille Martin'}),'Camille Martin');
  assert.equal(professionalIdentityName({last_name:'Martin',professional_name:'Camille'}),'Camille');
  assert.equal(professionalIdentityName({first_name:'Camille',professional_name:'  '}),'Camille');
  assert.equal(professionalIdentityName({first_name:42,last_name:false,professional_name:'Legacy'}),'Legacy');
  assert.equal(professionalIdentityName(undefined),undefined);
});
test('cancellation freezes the full identity, assignment dates and mission references at cancellation time',async()=>{
  let saved:any;
  const em={query:async(sql:string,params:any[])=>{
    if(sql.startsWith('SELECT'))return [{first_name:'Camille',last_name:'Dupont',professional_name:'Camille',establishment_name:'Centre exemple',establishment_contact:'Referent exemple'}];
    assert.match(sql,/ON CONFLICT DO NOTHING/);
    saved=JSON.parse(params[1]);return [];
  }} as any;
  const mission={id:'mission',version:3,title:'Mission exemple',qualification:'IDE',service:'URGENCES',address:'Adresse exemple',start_at:'2026-10-02T08:00:00Z',end_at:'2026-10-02T16:00:00Z',timezone:'Europe/Paris',schedule_precision:'EXACT',hourly_salary:25,population:'ADULT',block:'NONE'};
  const assignment={id:'assignment',nurse_id:'nurse',start_at:'2026-10-01T08:00:00Z',end_at:'2026-10-01T16:00:00Z'};
  await cancellationRecord(em,mission,assignment,'NURSE','Indisponibilite');
  assert.equal(saved.professionalName,'Camille Dupont');
  assert.equal(saved.missionId,'mission');assert.equal(saved.missionVersion,3);
  assert.equal(saved.start,assignment.start_at);assert.equal(saved.end,assignment.end_at);
  assert.equal(saved.establishmentContact,'Referent exemple');
  assert.equal(saved.population,'ADULT');assert.equal(saved.block,'NONE');assert.equal(saved.schedulePrecision,'EXACT');
  assert.equal(saved.cancellation.initiator,'NURSE');
});
