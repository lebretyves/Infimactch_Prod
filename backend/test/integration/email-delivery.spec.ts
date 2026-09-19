import 'reflect-metadata';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Database} from '../../src/database/database';
import {MissionsService} from '../../src/missions/missions.service';
import {DocumentsService} from '../../src/documents/documents.module';
import {EmailDeliveryService} from '../../src/automation/email-delivery';
import {dispatchMissionEmails,missionEmailContent} from '../../src/automation/mission-mail';
let db:Database,service:EmailDeliveryService;
before(async()=>{
  const u=new URL(process.env.DATABASE_URL||'http://invalid');
  if(process.env.NODE_ENV!=='test'||u.hostname!=='127.0.0.1'||u.port!=='55433'||u.pathname!=='/infimatch_test')throw Error('Requires isolated database');
  db=await new Database().connect();await db.source.runMigrations({transaction:'all'});service=new EmailDeliveryService(db);
});
after(async()=>{await db?.onModuleDestroy();});
async function fixture(){
  const [n]=await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture','NURSE','fixture') RETURNING id,email",[randomUUID()+'@example.invalid']);
  const [r]=await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture','ENTERPRISE','fixture') RETURNING id,email",[randomUUID()+'@example.invalid']);
  await db.query("INSERT INTO profile(user_id,display_name,qualifications,rpps_status,latitude,longitude,radius_km,accepted_shifts) VALUES($1,'Fictional delivery',ARRAY['IDE'],'FOUND',48,2,30,ARRAY['DAY'])",[n.id]);
  const [org]=await db.query("INSERT INTO organization(kind,name,address,referent,finess) VALUES('ESTABLISHMENT','Fictional delivery','Fixture','Fixture','000000000') RETURNING id");
  await db.query('INSERT INTO membership(user_id,organization_id) VALUES($1,$2)',[r.id,org.id]);
  const [m]=await db.query("INSERT INTO mission(establishment_id,title,description,qualification,service,population,block,start_at,end_at,shift,address,location,hourly_salary,status) VALUES($1,'Fictional delivery','Fixture','IDE','URGENCES','ADULT','NONE',now()+interval '12 days',now()+interval '12 days 8 hours','DAY','Fixture',ST_SetSRID(ST_MakePoint(2,48),4326)::geography,25,'OPEN') RETURNING id",[org.id]);
  const missions=new MissionsService(db),application=await missions.apply(n.id,m.id,1,randomUUID());
  const assignment=await missions.assign(r.id,m.id,application.id,randomUUID());
  const [doc]=await db.query("INSERT INTO document(id,owner_id,assignment_id,kind,mime,status,size_bytes,key_version,storage_backend) VALUES(gen_random_uuid(),$1,$2,'CONFIRMATION','application/pdf','READY',10,1,'postgres') RETURNING id",[n.id,assignment.id]);
  const [email]=await db.query(`INSERT INTO mission_email(assignment_id,user_id,organization_id,kind,document_id,recipient,payload,status,attempts,first_attempt_at)
    VALUES($1,$2,$3,'CONFIRMATION',$4,$5,$6,'UNCERTAIN',1,now()-interval '10 minutes') RETURNING id`,[assignment.id,r.id,org.id,doc.id,r.email,JSON.stringify(missionEmailContent('CONFIRMATION','Fixture','https://example.invalid'))]);
  const providerId=randomUUID(),time=new Date(Date.now()-120000).toISOString();
  const callback={event:'delivered',time,email_id:providerId,rcpt:r.email,'X-InfiMatch-Email-ID':email.id};
  return {n,r,org,email,providerId,callback};
}
async function row(id:string){return (await db.query('SELECT * FROM mission_email WHERE id=$1',[id]))[0];}
test('authenticated provider receipt resolves timeout, is replay safe, and never regresses on late processed',async()=>{
 const f=await fixture();await Promise.all([service.receive(f.callback),service.receive(f.callback)]);
 let email=await row(f.email.id);assert.equal(email.status,'SENT');assert.equal(email.delivery_status,'DELIVERED');assert.equal(email.provider_id,f.providerId);
 assert.equal((await db.query('SELECT * FROM mission_email_delivery_event WHERE email_id=$1',[f.email.id])).length,1);
 await service.receive({...f.callback,event:'processed',time:new Date(Date.now()-60000).toISOString()});
 email=await row(f.email.id);assert.equal(email.delivery_status,'DELIVERED');assert.ok(email.processed_at);assert.equal(email.lease_token,null);
});
test('bounce after acceptance and delivery is recorded; out-of-order delivery cannot hide it; spam is terminal',async()=>{
 const f=await fixture();await service.receive(f.callback);
 const bounce={...f.callback,event:'bounce',bounce:'hard',time:new Date(Date.now()-60000).toISOString(),message:'Private provider detail',auth:'never stored',subject:'never stored'};
 await service.receive(bounce);assert.equal((await row(f.email.id)).delivery_status,'BOUNCED');
 await service.receive({...f.callback,time:new Date(Date.now()-90000).toISOString()});assert.equal((await row(f.email.id)).delivery_status,'BOUNCED');
 await service.receive({...f.callback,event:'spam'});assert.equal((await row(f.email.id)).delivery_status,'SPAM');
 const events=await db.query('SELECT * FROM mission_email_delivery_event WHERE email_id=$1',[f.email.id]);
 assert.ok(events.every(e=>!('auth' in e)&&!('message' in e)&&!('recipient' in e)&&!('payload' in e)));
});
test('recipient, correlation and provider identity must agree; fallback maps legacy provider id without custom header',async()=>{
 const f=await fixture();await service.receive({...f.callback,rcpt:f.n.email});assert.equal((await row(f.email.id)).delivery_status,'NOT_REPORTED');
 await db.query('UPDATE mission_email SET provider_id=$2 WHERE id=$1',[f.email.id,f.providerId]);
 await service.receive({...f.callback,email_id:'different-provider'});assert.equal((await row(f.email.id)).delivery_status,'NOT_REPORTED');
 const {['X-InfiMatch-Email-ID']:unused,...legacy}=f.callback;await service.receive(legacy);assert.equal((await row(f.email.id)).delivery_status,'DELIVERED');
 await service.receive({...f.callback,event:'open'});assert.equal((await db.query('SELECT * FROM mission_email_delivery_event WHERE email_id=$1',[f.email.id])).length,1);
});
test('a callback racing a network timeout wins and the dispatcher does not resend it',async()=>{
 const f=await fixture();await db.query("UPDATE mission_email SET status='PENDING',available_at=now() WHERE id=$1",[f.email.id]);
 const oldKey=process.env.SMTP2GO_API_KEY,oldFrom=process.env.SMTP2GO_FROM;
 process.env.SMTP2GO_API_KEY='fixture-only';process.env.SMTP2GO_FROM='fixture@example.invalid';let calls=0;
 try {
  const transport:typeof fetch=async(_url,options)=>{calls++;const body=JSON.parse(String(options?.body));assert.equal(body.custom_headers[0].header,'X-InfiMatch-Email-ID');assert.equal(body.custom_headers[0].value,f.email.id);await service.receive({...f.callback,time:new Date().toISOString()});throw Error('Network acknowledgement lost');};
  const docs={read:async()=>({data:Buffer.from('%PDF-1.4 fixture')})} as unknown as DocumentsService;
  await dispatchMissionEmails(db,docs,1,transport);assert.equal((await row(f.email.id)).status,'SENT');assert.equal((await row(f.email.id)).delivery_status,'DELIVERED');
  await dispatchMissionEmails(db,docs,1,transport);assert.equal(calls,1);
 } finally {if(oldKey===undefined)delete process.env.SMTP2GO_API_KEY;else process.env.SMTP2GO_API_KEY=oldKey;if(oldFrom===undefined)delete process.env.SMTP2GO_FROM;else process.env.SMTP2GO_FROM=oldFrom;}
});
test('delivery journals exclude other accounts and former organization members, and contain no address or mail body',async()=>{
 const f=await fixture();await service.receive(f.callback);
 const own=await service.journal(f.r.id);assert.equal(own.items.length,1);assert.equal(own.items[0].id,f.email.id);
 assert.equal((await service.journal(f.n.id)).items.length,0);
 assert.ok(!JSON.stringify(own).includes(f.r.email));assert.ok(!JSON.stringify(own).includes('html_body'));
 await db.query('UPDATE membership SET active=false WHERE user_id=$1 AND organization_id=$2',[f.r.id,f.org.id]);
 assert.equal((await service.journal(f.r.id)).items.length,0);assert.equal((await service.journal(f.r.id,true)).items.length,1);
});
