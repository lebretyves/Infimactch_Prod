// Regression coverage for audit findings F01 and F02; isolated fictional data only.
import 'reflect-metadata';
import {test} from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {writeFile,mkdir,rm} from 'node:fs/promises';import {resolve} from 'node:path';import {tmpdir} from 'node:os';import {spawnSync} from 'node:child_process';
import {Database} from '../../src/database/database';import {DocumentsService} from '../../src/documents/documents.module';import {AuthService} from '../../src/auth/auth.module';import {MissionsService} from '../../src/missions/missions.service';
function guard(){const u=new URL(process.env.DATABASE_URL!);if(process.env.NODE_ENV!=='test'||u.hostname!=='127.0.0.1'||u.port!=='55433'||u.pathname!=='/infimatch_test')throw Error('Isolated database only');}
test('Retained BANK versions count against the hard account quota',async()=>{
 guard();const db=await new Database().connect(),old=process.env.DOCUMENT_QUOTA_BYTES;
 try{process.env.DOCUMENT_QUOTA_BYTES='5242880';const [owner]=await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fictional','NURSE','test') RETURNING id",[randomUUID()+'@example.invalid']);
 const docs=new DocumentsService(db),bytes=Buffer.from(JSON.stringify({fictional:true,content:'X'.repeat(1500000)}));
 for(let i=0;i<3;i++)await docs.store(owner.id,'BANK','application/json',bytes,null,undefined,true);
 await assert.rejects(docs.store(owner.id,'BANK','application/json',bytes,null,undefined,true),/quota exceeded/);
 const [stored]=await db.query("SELECT count(*)::int AS versions,sum(size_bytes)::int AS total_bytes,sum(size_bytes) FILTER(WHERE superseded_at IS NULL)::int AS active_bytes FROM document WHERE owner_id=$1",[owner.id]);
 assert.equal(stored.versions,3);assert.ok(stored.total_bytes<=5242880);assert.ok(stored.active_bytes<5242880);console.log('REGRESSION_BANK_QUOTA '+JSON.stringify({...stored,quota:5242880}));
 }finally{if(old===undefined)delete process.env.DOCUMENT_QUOTA_BYTES;else process.env.DOCUMENT_QUOTA_BYTES=old;await db.onModuleDestroy();}
});
test('Current approved erasure replay overrides applications restored from an older snapshot',async()=>{
 guard();const db=await new Database().connect(),auth=new AuthService(db),missions=new MissionsService(db),ledger=resolve(tmpdir(),'infimatch-audit-ledger-'+randomUUID()+'.ndjson');
 try{const base={password:'Fictional-audit-password-123',termsVersion:'2026-09-14'};
 const actor=await auth.register({...base,email:randomUUID()+'@example.invalid',family:'ENTERPRISE',organizationType:'AGENCY',name:'FICTIF',address:'Adresse fictive',referent:'Fictif',siret:'00000000000001'});
 const [agency]=await db.query('SELECT organization_id AS id FROM membership WHERE user_id=$1',[actor.id]);
 const [facility]=await db.query("INSERT INTO organization(kind,name,address,referent,finess) VALUES('ESTABLISHMENT','FICTIF','Adresse fictive','Fictif','000000001') RETURNING id");await db.query('INSERT INTO agency_link VALUES($1,$2)',[agency.id,facility.id]);
 const start=new Date(Date.now()+30*86400000);start.setUTCHours(8,0,0,0);const slot={start:start.toISOString(),end:new Date(start.getTime()+8*3600000).toISOString()};
 const nurse=await auth.register({...base,email:randomUUID()+'@example.invalid',family:'NURSE',profile:{displayName:'FICTIF',qualifications:['IDE'],skills:[],experience:[],available:[slot],unavailable:[],latitude:48,longitude:2,radiusKm:30,acceptedShifts:['DAY'],preferredShifts:['DAY'],visible:true}});
 const mission=await missions.create(actor.id,{...slot,agencyId:agency.id,establishmentId:facility.id,title:'Audit FICTIF',description:'Ancien etat restaure fictif',qualification:'IDE',service:'URGENCES',population:'ADULT',block:'NONE',requiredSkills:[],desiredSkills:[],minExperienceMonths:0,shift:'DAY',address:'Lieu fictif',latitude:48,longitude:2,hourlySalary:25},randomUUID());await missions.transition(actor.id,mission.id,'publish',randomUUID());await missions.apply(nurse.id,mission.id,1,randomUUID());
 // The approved erasure entry represents a later state than this restored SQL snapshot.
 await writeFile(ledger,JSON.stringify({accountId:nurse.id,approvedAt:new Date().toISOString()})+'\n',{mode:0o600});
 const result=spawnSync(process.execPath,[resolve(process.cwd(),'dist/cli.js'),'replay-erasures','--ledger',ledger],{encoding:'utf8',env:process.env,windowsHide:true});
 assert.equal(result.status,0,result.stderr);const [account]=await db.query('SELECT active FROM account WHERE id=$1',[nurse.id]);assert.equal(account.active,false);
 const repeated=spawnSync(process.execPath,[resolve(process.cwd(),'dist/cli.js'),'replay-erasures','--ledger',ledger],{encoding:'utf8',env:process.env,windowsHide:true});assert.equal(repeated.status,0,repeated.stderr);
 console.log('REGRESSION_ERASURE_REPLAY '+JSON.stringify({exitCode:result.status,approvedErasureApplied:true,accountStillActive:account.active,idempotent:true}));
 }finally{await rm(ledger,{force:true});await db.onModuleDestroy();}
});
