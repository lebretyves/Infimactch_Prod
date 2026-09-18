import 'reflect-metadata';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Database} from '../../src/database/database';
import {MissionsService} from '../../src/missions/missions.service';
import {MissionsModule} from '../../src/missions/missions.module';
import {DocumentsService} from '../../src/documents/documents.module';
import {AutomationService} from '../../src/automation/automation.module';
import {dispatchMissionEmails,generateCancellations,missionEmailContent} from '../../src/automation/mission-mail';
let db:Database,service:MissionsService,docs:DocumentsService;
before(async()=>{const u=new URL(process.env.DATABASE_URL||'http://invalid');if(process.env.NODE_ENV!=='test'||u.hostname!=='127.0.0.1'||u.port!=='55433'||u.pathname!=='/infimatch_test')throw Error('Requires isolated database');process.env.APP_ORIGIN='https://example.invalid';process.env.DOCUMENT_STORAGE='postgres';process.env.SMTP2GO_API_KEY='test-only';process.env.SMTP2GO_FROM='InfiMatch <missions@example.invalid>';db=await new Database().connect();await db.source.runMigrations({transaction:'all'});service=new MissionsService(db);docs=new DocumentsService(db);});
after(async()=>{await db?.onModuleDestroy();});
async function fixture(){
 const [n]=await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture','NURSE','fixture') RETURNING id",[randomUUID()+'@example.invalid']);
 const [r]=await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture','ENTERPRISE','fixture') RETURNING id",[randomUUID()+'@example.invalid']);
 await db.query("INSERT INTO profile(user_id,display_name,qualifications,rpps_status,latitude,longitude,radius_km,accepted_shifts) VALUES($1,'Camille Test',ARRAY['IDE'],'FOUND',48,2,30,ARRAY['DAY'])",[n.id]);
 const [org]=await db.query("INSERT INTO organization(kind,name,address,referent,finess) VALUES('ESTABLISHMENT','Fictional test','Fictional address','Test','000000000') RETURNING id");
 await db.query('INSERT INTO membership(user_id,organization_id) VALUES($1,$2)',[r.id,org.id]);
 const [m]=await db.query("INSERT INTO mission(establishment_id,title,description,qualification,service,population,block,start_at,end_at,shift,address,location,hourly_salary,status) VALUES($1,'Fictional email test','Fixture only','IDE','URGENCES','ADULT','NONE',now()+interval '10 days',now()+interval '10 days 8 hours','DAY','Fictional address',ST_SetSRID(ST_MakePoint(2,48),4326)::geography,25,'OPEN') RETURNING *",[org.id]);
 const application=await service.apply(n.id,m.id,1,randomUUID());
 const a=await service.assign(r.id,m.id,application.id,randomUUID());
 return {n:n.id,r:r.id,m,a,org:org.id};
}
const sent:any[]=[];
const transport:typeof fetch=async(url,options)=>{assert.equal(url,'https://api.smtp2go.com/v3/email/send');const body=JSON.parse(options!.body as string);assert.equal(body.to.length,1);assert.equal(Buffer.from(body.attachments[0].fileblob,'base64').subarray(0,5).toString(),'%PDF-');assert.equal((options!.headers as any)['X-Smtp2go-Api-Key'],'test-only');sent.push({body,key:(options!.headers as any)['Idempotency-Key']});return Response.json({data:{email_id:randomUUID(),succeeded:1,failed:0}});};
test('confirmation queues PDF email for both parties exactly once; SMTP2GO receives individual attachments',async()=>{
 const f=await fixture();const [e]=await db.query("SELECT id FROM outbox WHERE event='AssignmentCreated' AND payload->>'assignmentId'=$1",[f.a.id]);
 const automation=new AutomationService(db,docs);assert.equal((await automation.confirmation(e.id)).status,'READY');await automation.confirmation(e.id);
 assert.equal((await db.query('SELECT id FROM mission_email WHERE assignment_id=$1',[f.a.id])).length,2);
 assert.equal((await dispatchMissionEmails(db,docs,10,transport)).sent,2);assert.equal((await dispatchMissionEmails(db,docs,10,transport)).sent,0);
 assert.ok(sent.some(x=>x.body.html_body.includes('/missions/m_'+f.m.id)));assert.ok(sent.some(x=>x.body.html_body.includes('/gestion/missions/'+f.m.id)));
});
test('nurse cancellation releases agenda, reopens mission and generates one downloadable PDF for both parties',async()=>{
 const f=await fixture(),key=randomUUID();
 await assert.rejects(service.cancelAssignment(f.r,f.a.id,key),(e:any)=>e.getStatus()===404);
 await service.cancelAssignment(f.n,f.a.id,key);await service.cancelAssignment(f.n,f.a.id,key);
 assert.equal((await db.query('SELECT status FROM mission WHERE id=$1',[f.m.id]))[0].status,'OPEN');
 assert.equal((await db.query("SELECT id FROM assignment WHERE nurse_id=$1 AND status='ACTIVE'",[f.n])).length,0);
 assert.equal((await db.query('SELECT id FROM mission_cancellation WHERE assignment_id=$1',[f.a.id])).length,1);
 await Promise.all([generateCancellations(db,docs),generateCancellations(db,docs)]);
 const [c]=await db.query('SELECT * FROM mission_cancellation WHERE assignment_id=$1',[f.a.id]);assert.equal(c.status,'READY');assert.equal(c.details.cancellation.initiator,'NURSE');
 assert.equal((await docs.read(f.r,c.document_id)).data.subarray(0,5).toString(),'%PDF-');await docs.read(f.n,c.document_id);
 const [Controller]=Reflect.getMetadata('controllers',MissionsModule),controller=new Controller(service,db);
 await assert.rejects(controller.cancellationDocument({session:{userId:randomUUID()}},f.a.id),(e:any)=>e.getStatus()===404);
 assert.equal((await controller.cancellationDocument({session:{userId:f.n}},f.a.id)).document_id,c.document_id);
 assert.equal((await dispatchMissionEmails(db,docs,10,transport)).sent,2);
 await service.apply(f.n,f.m.id,1,randomUUID()); // Former assignment no longer blocks the same slot.
});
test('company cancellation preserves snapshot after reopening and suppresses queued confirmation',async()=>{
 const f=await fixture();const [e]=await db.query("SELECT id FROM outbox WHERE event='AssignmentCreated' AND payload->>'assignmentId'=$1",[f.a.id]);await new AutomationService(db,docs).confirmation(e.id);
 await service.transition(f.r,f.m.id,'cancel',randomUUID());await service.transition(f.r,f.m.id,'reopen',randomUUID());
 await db.query("UPDATE mission SET title='Changed after cancellation' WHERE id=$1",[f.m.id]);await generateCancellations(db,docs);
 const [c]=await db.query('SELECT * FROM mission_cancellation WHERE assignment_id=$1',[f.a.id]);assert.equal(c.details.title,'Fictional email test');assert.equal(c.details.cancellation.initiator,'ENTERPRISE');
 const before=sent.length;await dispatchMissionEmails(db,docs,10,transport);assert.equal(sent.length-before,2);assert.ok(sent.slice(before).every(x=>x.body.subject.includes('Annulation')));
 assert.equal((await db.query("SELECT id FROM mission_email WHERE assignment_id=$1 AND kind='CONFIRMATION' AND status='CANCELLED'",[f.a.id])).length,2);
});
test('rate limiting retries the same payload; changed recipient and ambiguous interrupted sends never send',async()=>{
 const f=await fixture();await service.cancelAssignment(f.n,f.a.id,randomUUID());await generateCancellations(db,docs);
 let first:any;
 await dispatchMissionEmails(db,docs,1,async(_url,options)=>{first={body:options!.body,key:(options!.headers as any)['Idempotency-Key']};return new Response('',{status:429});});
 const [pending]=await db.query("SELECT * FROM mission_email WHERE assignment_id=$1 AND attempts=1",[f.a.id]);
 await db.query("UPDATE mission_email SET available_at=now()+interval '1 hour' WHERE assignment_id=$1 AND id<>$2",[f.a.id,pending.id]);
 await db.query('UPDATE mission_email SET available_at=now() WHERE id=$1',[pending.id]);
 await dispatchMissionEmails(db,docs,1,async(_url,options)=>{assert.equal(options!.body,first.body);assert.equal((options!.headers as any)['Idempotency-Key'],first.key);return Response.json({data:{email_id:randomUUID(),succeeded:1,failed:0}});});
 await db.query("UPDATE mission_email SET status='SENDING',lease_until=now()-interval '1 minute' WHERE assignment_id=$1 AND status='PENDING'",[f.a.id]);
 await dispatchMissionEmails(db,docs,10,async()=>{throw Error('must not send');});
 assert.equal((await db.query("SELECT id FROM mission_email WHERE assignment_id=$1 AND status='UNCERTAIN'",[f.a.id])).length,1);
 const g=await fixture();await service.cancelAssignment(g.n,g.a.id,randomUUID());await generateCancellations(db,docs);await db.query("UPDATE account SET email=id::text||'changed@example.invalid' WHERE id IN($1,$2)",[g.n,g.r]);
 assert.equal((await dispatchMissionEmails(db,docs,10,transport)).sent,0);
});
test('HTTP 200 with provider rejection is not sent, and a timed-out request is never retried blindly',async()=>{
 const f=await fixture();await service.cancelAssignment(f.n,f.a.id,randomUUID());await generateCancellations(db,docs);
 let calls=0;
 await dispatchMissionEmails(db,docs,10,async()=>{calls++;return Response.json({data:{succeeded:0,failed:1,failures:['Unverified sender']}});});
 assert.equal(calls,2);assert.equal((await db.query("SELECT id FROM mission_email WHERE assignment_id=$1 AND status='FAILED'",[f.a.id])).length,2);
 const g=await fixture();await service.cancelAssignment(g.n,g.a.id,randomUUID());await generateCancellations(db,docs);
 await dispatchMissionEmails(db,docs,10,async()=>{throw Error('response lost');});
 assert.equal((await db.query("SELECT id FROM mission_email WHERE assignment_id=$1 AND status='UNCERTAIN'",[g.a.id])).length,2);
 let repeated=0;await dispatchMissionEmails(db,docs,10,async()=>{repeated++;return Response.json({});});assert.equal(repeated,0);
});
test('email markup escapes mission content and missing configuration does not send',async()=>{
 assert.ok(!missionEmailContent('CONFIRMATION','<img src=x>','https://example.invalid').html.includes('<img src=x>'));
 delete process.env.SMTP2GO_API_KEY;assert.deepEqual(await dispatchMissionEmails(db,docs),{configured:false,sent:0});
});
