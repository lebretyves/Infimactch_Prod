import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateSync} from 'class-validator';
import {plainToInstance} from 'class-transformer';
import {AgencyEstablishmentsService,AgencyEstablishmentDto} from '../../src/organizations/agency-establishments';
function fixture(options:{member?:boolean;kind?:string;active?:boolean;linked?:boolean;duplicate?:boolean}={}) {
 const queries:{sql:string;args:any[]}[]=[];const receipts=new Map<string,any>();
 const em={query:async(sql:string,args:any[]=[])=>{queries.push({sql,args});
  if(sql.includes('SELECT o.kind FROM membership'))return options.member===false?[]:[{kind:options.kind||'AGENCY'}];
  if(sql.includes('SELECT content_hash,response FROM idempotency'))return receipts.has(args[2])?[receipts.get(args[2])]:[];
  if(sql.startsWith('INSERT INTO idempotency')){receipts.set(args[2],{content_hash:args[3],response:JSON.parse(args[4])});return [];}
  if(sql.startsWith('SELECT o.id FROM organization o JOIN agency_link'))return options.duplicate?[{id:'existing'}]:[];
  if(sql.startsWith('INSERT INTO organization'))return [{id:'new-private-record'}];
  if(sql.startsWith('SELECT agency_id FROM agency_link'))return options.linked===false?[]:[{agency_id:'agency'}];
  if(sql.startsWith('SELECT id FROM mission'))return options.active?[{id:'active-mission'}]:[];
  return [];
 }};
 return {queries,service:new AgencyEstablishmentsService({transaction:async(fn:any)=>fn(em)} as any)};
}
const body={name:'Établissement test',address:'10 rue de test Paris',referent:'Contact test',finess:'750000001'};
test('adding uses an agency-owned record and replay does not duplicate it',async()=>{
 const f=fixture();const first=await f.service.add('actor','agency',body,'key');const second=await f.service.add('actor','agency',body,'key');assert.deepEqual(first,second);
 assert.equal(f.queries.filter(q=>q.sql.startsWith('INSERT INTO organization')).length,1);
 assert.ok(!f.queries.some(q=>q.sql.startsWith('INSERT INTO membership')));
 assert.deepEqual(f.queries.find(q=>q.sql.startsWith('INSERT INTO agency_link'))?.args,['agency','new-private-record']);
 await assert.rejects(f.service.add('actor','agency',{...body,name:'Other'},'key'),/different content/);
});
test('existing own-agency record is reused without granting another organization access',async()=>{
 const f=fixture({duplicate:true});assert.deepEqual(await f.service.add('actor','agency',body,'key'),{id:'existing',alreadyLinked:true});assert.ok(!f.queries.some(q=>q.sql.startsWith('INSERT INTO organization')));
});
for(const options of [{member:false},{kind:'ESTABLISHMENT'}])test('non-agency members cannot add or remove '+JSON.stringify(options),async()=>{
 const f=fixture(options);await assert.rejects(f.service.add('actor','agency',body,'key'));await assert.rejects(f.service.remove('actor','agency','other'));
 assert.ok(!f.queries.some(q=>/^(INSERT|DELETE|UPDATE)/.test(q.sql)));
});
test('active mission blocks removal',async()=>{
 const f=fixture({active:true});await assert.rejects(f.service.remove('actor','agency','est'),/missions en brouillon/);assert.ok(!f.queries.some(q=>q.sql.startsWith('DELETE')));
});
test('removal locks link and only deletes the agency relationship, preserving records and history',async()=>{
 const f=fixture();assert.deepEqual(await f.service.remove('actor','agency','est'),{ok:true});
 const deletes=f.queries.filter(q=>q.sql.startsWith('DELETE'));assert.equal(deletes.length,1);assert.match(deletes[0]!.sql,/DELETE FROM agency_link/);assert.deepEqual(deletes[0]!.args,['agency','est']);
 assert.match(f.queries.find(q=>q.sql.startsWith('SELECT agency_id'))!.sql,/FOR UPDATE/);
});
test('already removed link is an idempotent no-op',async()=>{
 const f=fixture({linked:false});assert.deepEqual(await f.service.remove('actor','agency','est'),{ok:true});assert.ok(!f.queries.some(q=>q.sql.startsWith('DELETE')));
});
test('manual FINESS is optional but invalid identifiers are rejected',()=>{
 const {finess,...manual}=body;assert.equal(validateSync(plainToInstance(AgencyEstablishmentDto,manual)).length,0);
 assert.ok(validateSync(plainToInstance(AgencyEstablishmentDto,{...body,finess:'bad'})).length);
});
