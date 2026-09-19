import 'reflect-metadata';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Database} from '../../src/database/database';
import {MissionsService} from '../../src/missions/missions.service';
import {ContractsService} from '../../src/contracts/contracts.service';
import {anonymizeAccount} from '../../src/security/retention';
let db:Database,missions:MissionsService,contracts:ContractsService;
before(async()=>{
 const u=new URL(process.env.DATABASE_URL||'http://invalid');
 if(process.env.NODE_ENV!=='test'||u.hostname!=='127.0.0.1'||u.port!=='55433'||u.pathname!=='/infimatch_test')throw Error('Requires isolated database');
 db=await new Database().connect();await db.source.runMigrations({transaction:'all'});
 missions=new MissionsService(db);contracts=new ContractsService(db);
});
after(async()=>{await db?.onModuleDestroy();});
const notes={reason:'Remplacement',workSchedule:'08h-16h, pauses à préciser',payTerms:'Salaire de base indiqué, compléments à vérifier',contactName:'Service RH',additionalNotes:''};
async function account(family='ENTERPRISE'){
 return (await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture',$2,'test') RETURNING id",[randomUUID()+'@example.invalid',family]))[0].id as string;
}
async function fixture(agency=false){
 const n=await account('NURSE'),r=await account(),e=await account();
 await db.query("INSERT INTO profile(user_id,display_name,qualifications,rpps_status,details) VALUES($1,'Camille',ARRAY['IDE'],'FOUND',$2)",[n,JSON.stringify({firstName:'Camille',lastName:'Exemple',email:'private@example.invalid',iban:'PRIVATE'})]);
 const [o]=await db.query("INSERT INTO organization(kind,name,address,referent,finess) VALUES('ESTABLISHMENT','Établissement fictif','Adresse fictive','Référent','000000000') RETURNING id");
 const [a]=agency?await db.query("INSERT INTO organization(kind,name,address,referent,siret) VALUES('AGENCY','Agence fictive','Adresse fictive','Référent','00000000000000') RETURNING id"):[{id:null}];
 await db.query('INSERT INTO membership(user_id,organization_id) VALUES($1,$2),($3,$4)',[r,a.id??o.id,e,o.id]);
 if(a.id)await db.query('INSERT INTO agency_link(agency_id,establishment_id) VALUES($1,$2)',[a.id,o.id]);
 const [m]=await db.query("INSERT INTO mission(agency_id,establishment_id,title,description,qualification,service,population,block,start_at,end_at,shift,address,location,hourly_salary,status) VALUES($1,$2,'Contrat fictif','Test isolé','IDE','URGENCES','ADULT','NONE',now()+interval '10 days',now()+interval '10 days 8 hours','DAY','Adresse fictive',ST_SetSRID(ST_MakePoint(2,48),4326)::geography,25,'OPEN') RETURNING *",[a.id,o.id]);
 const application=await missions.apply(n,m.id,1,randomUUID());
 const assignment=await missions.assign(r,m.id,application.id,randomUUID());
 return {n,r,e,m,assignment,org:a.id??o.id};
}
const status=(wanted:number)=>(e:any)=>e.getStatus()===wanted;
test('preparation pre-fills the full name and actual assignment without exposing private profile fields',async()=>{
 const f=await fixture();const view=await contracts.read(f.r,f.assignment.id);
 assert.equal(view.canEdit,true);assert.equal(view.preparation.version,0);assert.equal(view.worker.displayName,'Camille Exemple');
 assert.deepEqual(Object.keys(view.worker).sort(),['displayName','firstName','lastName']);
 assert.ok(view.missingInformation.includes('SIRET de l’employeur'));assert.ok(view.missingInformation.includes('Motif du recours'));
 assert.equal(new Date(view.mission.startAt).toISOString(),new Date(f.assignment.start_at).toISOString());
 assert.equal(JSON.stringify(view).includes('PRIVATE'),false);
 const saved=await contracts.save(f.r,f.assignment.id,{version:0,notes});
 assert.equal(saved.preparation.version,1);assert.equal(saved.preparation.notes.reason,notes.reason);
 assert.equal((await contracts.read(f.n,f.assignment.id)).canEdit,false);
 await assert.rejects(contracts.save(f.n,f.assignment.id,{version:1,notes}),status(403));
});
test('unrelated accounts, inactive memberships and inactive actors cannot read or write another preparation',async()=>{
 const f=await fixture(),other=await account();
 await assert.rejects(contracts.read(other,f.assignment.id),status(404));
 await assert.rejects(contracts.save(other,f.assignment.id,{version:0,notes}),status(404));
 await assert.rejects(contracts.read(f.r,randomUUID()),status(404));
 await db.query('UPDATE membership SET active=false WHERE user_id=$1',[f.r]);
 await assert.rejects(contracts.read(f.r,f.assignment.id),status(404));
 await db.query('UPDATE account SET active=false WHERE id=$1',[f.n]);
 await assert.rejects(contracts.read(f.n,f.assignment.id),status(404));
});
test('agency-managed preparation is editable by agency and read-only for concerned establishment',async()=>{
 const f=await fixture(true);
 assert.equal((await contracts.read(f.r,f.assignment.id)).employer.kind,'AGENCY');
 assert.equal((await contracts.read(f.e,f.assignment.id)).canEdit,false);
 await assert.rejects(contracts.save(f.e,f.assignment.id,{version:0,notes}),status(403));
 await contracts.save(f.r,f.assignment.id,{version:0,notes});
 assert.equal((await contracts.read(f.e,f.assignment.id)).preparation.notes.reason,notes.reason);
});
test('concurrent changes preserve the winner and a retry of the same write creates no duplicate audit',async()=>{
 const f=await fixture();const attempts=await Promise.allSettled([
  contracts.save(f.r,f.assignment.id,{version:0,notes}),
  contracts.save(f.r,f.assignment.id,{version:0,notes:{...notes,reason:'Autre motif'}}),
 ]);
 assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
 const rejected=attempts.find(r=>r.status==='rejected') as PromiseRejectedResult;assert.equal(rejected.reason.getStatus(),409);
 const current=await contracts.read(f.r,f.assignment.id);
 const replay=await contracts.save(f.r,f.assignment.id,{version:0,notes:current.preparation.notes});assert.equal(replay.preparation.version,1);
 const [{n}]=await db.query("SELECT count(*)::int n FROM audit WHERE resource_id=$1 AND event='CONTRACT_PREPARATION_SAVED'",[f.assignment.id]);assert.equal(n,1);
 const updated=await contracts.save(f.r,f.assignment.id,{version:1,notes:{...notes,reason:'Correction'}});assert.equal(updated.preparation.version,2);
 await assert.rejects(contracts.save(f.r,f.assignment.id,{version:0,notes}),status(409));
});
test('cancelled assignments retain draft history read-only and cannot be changed',async()=>{
 const f=await fixture();await contracts.save(f.r,f.assignment.id,{version:0,notes});
 await missions.cancelAssignment(f.n,f.assignment.id,randomUUID());
 const view=await contracts.read(f.r,f.assignment.id);assert.equal(view.canEdit,false);assert.equal(view.preparation.version,1);
 await assert.rejects(contracts.save(f.r,f.assignment.id,{version:1,notes}),status(403));
});
test('account erasure deletes free-text drafts and prevents recreating them for a closed professional',async()=>{
 const f=await fixture();await contracts.save(f.r,f.assignment.id,{version:0,notes});
 await db.transaction(em=>anonymizeAccount(em,f.n));
 assert.equal((await db.query('SELECT 1 FROM contract_preparation WHERE assignment_id=$1',[f.assignment.id])).length,0);
 assert.equal((await contracts.read(f.r,f.assignment.id)).canEdit,false);
 await assert.rejects(contracts.save(f.r,f.assignment.id,{version:0,notes}),status(403));
});
