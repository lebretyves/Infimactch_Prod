import "reflect-metadata";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Database, queueProfileMatches } from "../../src/database/database";
import { AutomationService } from "../../src/automation/automation.module";
import { DocumentsService } from "../../src/documents/documents.module";
import { NotificationsService } from "../../src/notifications/notifications.module";
import { notify } from "../../src/notifications/events";
import { mutedDemoMissionIds, demoNoticeSuppressed } from "../../src/notifications/demo-suppression";
let db: Database, automation: AutomationService, nurse: string, owner: string, org: string;
const fresh = randomUUID(), muted = mutedDemoMissionIds[0]!;
before(async () => {
  const u = new URL(process.env.DATABASE_URL!);
  assert.equal(process.env.NODE_ENV, 'test'); assert.equal(u.hostname, '127.0.0.1');
  assert.equal(u.port, '55433'); assert.equal(u.pathname, '/infimatch_test');
  db = await new Database().connect(); await db.source.runMigrations({transaction:'all'});
  automation = new AutomationService(db, new DocumentsService(db));
  for (const family of ['NURSE','ENTERPRISE']) {
    const [a] = await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture',$2,'test') RETURNING id",[randomUUID()+'@example.invalid',family]);
    if(family==='NURSE')nurse=a.id;else owner=a.id;
  }
  await db.query("INSERT INTO profile(user_id,display_name,qualifications,notifications_enabled) VALUES($1,'Fixture',ARRAY['IDE'],true)",[nurse]);
  const [o] = await db.query("INSERT INTO organization(kind,name,address,referent,finess) VALUES('ESTABLISHMENT','Fixture','Fixture','Fixture','000000000') RETURNING id"); org=o.id;
  await db.query('INSERT INTO membership(user_id,organization_id) VALUES($1,$2)',[owner,org]);
  // More muted missions than one reminder batch: they must not starve a new mission.
  for (const id of [...mutedDemoMissionIds.slice(0,26),fresh]) {
    await db.query("INSERT INTO mission(id,establishment_id,title,description,qualification,service,population,block,start_at,end_at,shift,address,location,hourly_salary,status,created_at) VALUES($1,$2,'Same demo title','Same demo description','IDE','URGENCES','ADULT','NONE',now()+interval '20 days',now()+interval '20 days 8 hours','DAY','Fixture',ST_SetSRID(ST_MakePoint(2,48),4326)::geography,25,'OPEN',now()-interval '2 days')",[id,org]);
  }
});
after(async()=>{await db?.onModuleDestroy();});
test('only the recorded import is muted, with confirmation and cancellation preserved',()=>{
  assert.equal(mutedDemoMissionIds.length,3092);assert.equal(new Set(mutedDemoMissionIds).size,3092);
  for(const kind of ['MATCH','REMINDER','MISSION_PUBLISHED']) {assert.equal(demoNoticeSuppressed(muted,kind),true);assert.equal(demoNoticeSuppressed(fresh,kind),false);}
  for(const kind of ['CONFIRMATION','CANCELLATION','APPLICATION_SUBMITTED'])assert.equal(demoNoticeSuppressed(muted,kind),false);
});
test('reminders skip the old batch in SQL and still notify the new mission',async()=>{
  assert.equal((await automation.reminders()).processed,0); // Creation age is not publication age.
  await db.query("UPDATE mission SET first_published_at=now()-interval '2 days' WHERE id=ANY($1::uuid[])",[[...mutedDemoMissionIds.slice(0,26),fresh]]);
  const r=await automation.reminders();assert.equal(r.processed,1);assert.equal(r.notifications,1);assert.equal(r.hasMore,false);
  const rows=await db.query("SELECT context->>'missionId' AS id FROM notification WHERE kind='REMINDER'");assert.deepEqual(rows.map(r=>r.id),[fresh]);
  assert.equal((await automation.reminders()).processed,0);
});
test('profile refresh queues matching only for the new mission; direct old webhook emits no alerts',async()=>{
  await db.transaction(em=>queueProfileMatches(em,nurse));
  const rows=await db.query("SELECT payload->>'missionId' AS id FROM outbox WHERE event='MatchRequested'");assert.deepEqual(rows.map(r=>r.id),[fresh]);
  const [e]=await db.query("INSERT INTO outbox(event,payload) VALUES('MissionOPEN',$1) RETURNING id",[JSON.stringify({missionId:muted,version:1})]);
  assert.equal((await automation.matches(e.id) as any).notifications,0);
  assert.equal((await automation.matches(e.id)).status,'ALREADY_PROCESSED');
});
test('dispatch never invokes n8n for old queued publications, while a new mission is dispatched',async()=>{
  process.env.N8N_WEBHOOK_BASE='https://example.invalid/n8n';process.env.SERVICE_TOKEN='test-only';
  const called:string[]=[];
  const result=await automation.dispatch(20,async(_url,options)=>{const id=JSON.parse(options!.body as string).eventId;called.push(id);await db.query("INSERT INTO workflow_receipt(event_id,action) VALUES($1,'matches') ON CONFLICT DO NOTHING",[id]);return Response.json({ok:true});});
  assert.equal(called.length,1);
  const [e]=await db.query('SELECT payload FROM outbox WHERE id=$1',[called[0]]);assert.equal(e.payload.missionId,fresh);
});
test('publication notices are blocked for old missions but new notices and transactional notices remain enabled',async()=>{
  await db.transaction(em=>notify(em,'MISSION_PUBLISHED',[],[org],{missionId:muted,version:1}));
  await db.transaction(em=>notify(em,'MISSION_PUBLISHED',[],[org],{missionId:fresh,version:1}));
  const rows=await db.query("SELECT context->>'missionId' AS id FROM notification WHERE kind='MISSION_PUBLISHED'");assert.deepEqual(rows.map(r=>r.id),[fresh]);
});
test('already queued Discord alerts are cancelled for the old batch and sent for the new mission',async t=>{
  process.env.DISCORD_BOT_TOKEN='test-only';process.env.APP_ORIGIN='https://example.invalid';
  await db.query("INSERT INTO discord_link(account_id,discord_user_id,username) VALUES($1,'700000000000000001','fixture')",[nurse]);
  await db.query("INSERT INTO discord_destination(user_id,connected_by,target_type,target_id,enabled,events) VALUES($1,$1,'user','700000000000000001',true,ARRAY['MATCH'])",[nurse]);
  for(const missionId of [muted,fresh]){const[e]=await db.query("INSERT INTO outbox(event,payload,completed_at) VALUES('NotificationCreated','{}',now()) RETURNING id");await db.query("INSERT INTO notification(user_id,event_id,kind,message,href,context) VALUES($1,$2,'MATCH','Fixture','/missions',$3)",[nurse,e.id,JSON.stringify({missionId,version:1})]);}
  let sends=0;t.mock.method(globalThis,'fetch',async(url:any)=>{if(String(url).endsWith('/users/@me/channels'))return Response.json({id:'800000000000000001'});sends++;return Response.json({id:'800000000000000002'});});
  assert.equal((await new NotificationsService(db).dispatch(20)).sent,1);assert.equal(sends,1);
  const rows=await db.query("SELECT d.status,n.context->>'missionId' AS id FROM notification_delivery d JOIN notification n ON n.id=d.notification_id");
  assert.equal(rows.find(r=>r.id===muted).status,'CANCELLED');assert.equal(rows.find(r=>r.id===fresh).status,'SENT');
  delete process.env.DISCORD_BOT_TOKEN;
});
