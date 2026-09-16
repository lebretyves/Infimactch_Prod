import "reflect-metadata";
import {test,before,after} from "node:test";
import assert from "node:assert/strict";
import {randomUUID,createHash} from "node:crypto";
import {Database,audit} from "../../src/database/database";
import {notify} from "../../src/notifications/events";
import {NotificationsService} from "../../src/notifications/notifications.module";
let db:Database;
before(async()=>{db=await new Database().connect();});
after(async()=>{await db?.onModuleDestroy();});
async function account(){const [a]=await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'test','NURSE','test') RETURNING id",[randomUUID()+"@example.invalid"]);return a.id as string;}
test("welcome is transactional and scoped to the new account",async()=>{
 const a=await account(),b=await account();
 await db.transaction(em=>audit(em,a,"ACCOUNT_CREATED",a));
 assert.equal((await db.query("SELECT * FROM notification WHERE user_id=$1 AND kind='WELCOME'",[a])).length,1);
 assert.equal((await db.query("SELECT * FROM notification WHERE user_id=$1",[b])).length,0);
 await assert.rejects(db.transaction(async em=>{await audit(em,b,"ACCOUNT_CREATED",b);throw Error("rollback");}));
 assert.equal((await db.query("SELECT * FROM notification WHERE user_id=$1",[b])).length,0);
});
test("Discord opt-in, event filtering, revocation and delivery deduplication",async()=>{
 const a=await account(),discord=String(BigInt('400000000000000000')+BigInt(Math.floor(Math.random()*100000000)));
 await db.query("INSERT INTO discord_link(account_id,discord_user_id,username) VALUES($1,$2,'test')",[a,discord]);
 await db.query("INSERT INTO discord_destination(user_id,connected_by,target_type,target_id,enabled,events) VALUES($1,$1,'user',$2,false,ARRAY['WELCOME'])",[a,discord]);
 await db.transaction(em=>notify(em,"WELCOME",[a]));
 assert.equal((await db.query("SELECT d.id FROM notification_delivery d JOIN notification n ON n.id=d.notification_id WHERE n.user_id=$1",[a])).length,0);
 await db.query("UPDATE discord_destination SET enabled=true WHERE user_id=$1",[a]);
 await db.transaction(em=>notify(em,"WELCOME",[a]));
 await db.transaction(em=>notify(em,"RPPS_RESULT",[a]));
 const [delivery]=await db.query("SELECT d.* FROM notification_delivery d JOIN notification n ON n.id=d.notification_id WHERE n.user_id=$1",[a]);
 assert.ok(delivery);
 await db.query("INSERT INTO notification_delivery(notification_id,destination_id,destination_version,event_id,kind) SELECT notification_id,destination_id,destination_version,event_id,kind FROM notification_delivery WHERE id=$1 ON CONFLICT DO NOTHING",[delivery.id]);
 assert.equal((await db.query("SELECT d.id FROM notification_delivery d JOIN notification n ON n.id=d.notification_id WHERE n.user_id=$1",[a])).length,1);
 await db.query("DELETE FROM discord_link WHERE account_id=$1",[a]);
 assert.equal((await db.query("SELECT id FROM notification_delivery WHERE id=$1",[delivery.id])).length,0);
});
test("a code is account-bound, limited to five attempts and never reusable",async()=>{
 const a=await account(),b=await account(),service=new NotificationsService(db),code="123456";
 const discord=String(BigInt('500000000000000000')+BigInt(Math.floor(Math.random()*100000000)));
 await db.query("INSERT INTO discord_challenge(account_id,discord_user_id,code_hash,expires_at) VALUES($1,$2,$3,now()+interval '10 minutes')",[a,discord,createHash('sha256').update(a+':'+code).digest('hex')]);
 await assert.rejects(service.verify(b,code));
 for(let i=0;i<5;i++) await assert.rejects(service.verify(a,'654321'));
 await assert.rejects(service.verify(a,code));
 await db.query("UPDATE discord_challenge SET attempts=0 WHERE account_id=$1",[a]);
 assert.equal((await service.verify(a,code)).ok,true);
 await assert.rejects(service.verify(a,code));
 assert.equal((await db.query("SELECT enabled FROM discord_destination WHERE user_id=$1",[a]))[0].enabled,false);
});
test("an organization gets one queued message even with multiple members, no personal welcome",async()=>{
 const a=await account(),b=await account();
 const [org]=await db.query("INSERT INTO organization(kind,name,address,referent,siret) VALUES('AGENCY','FICTIF notification test','Test','Test','00000000000001') RETURNING id");
 await db.query("INSERT INTO membership(user_id,organization_id) VALUES($1,$3),($2,$3)",[a,b,org.id]);
 const discord=String(BigInt('600000000000000000')+BigInt(Math.floor(Math.random()*100000000)));
 await db.query("INSERT INTO discord_link(account_id,discord_user_id,username) VALUES($1,$2,'test')",[a,discord]);
 const [dest]=await db.query("INSERT INTO discord_destination(organization_id,connected_by,target_type,target_id,guild_id,enabled,events) VALUES($1,$2,'channel',$3,$3,true,ARRAY['NEED_CREATED','WELCOME']) RETURNING id",[org.id,a,discord]);
 await db.transaction(em=>notify(em,"NEED_CREATED",[],[org.id]));
 await db.transaction(em=>notify(em,"WELCOME",[a]));
 assert.equal((await db.query("SELECT id FROM notification_delivery WHERE destination_id=$1",[dest.id])).length,1);
 const rows=await db.query("SELECT user_id FROM notification WHERE organization_id=$1",[org.id]);
 assert.deepEqual(new Set(rows.map(r=>r.user_id)),new Set([a,b]));
 await db.query("DELETE FROM discord_link WHERE account_id=$1",[a]);
});

test("delivery sends once and never replays an ambiguous send",async t=>{
 const a=await account(),service=new NotificationsService(db),old=process.env.DISCORD_BOT_TOKEN;
 process.env.DISCORD_BOT_TOKEN='unit-test-not-a-real-secret';
 const discord=String(BigInt('700000000000000000')+BigInt(Math.floor(Math.random()*100000000)));
 await db.query("INSERT INTO discord_link(account_id,discord_user_id,username) VALUES($1,$2,'test')",[a,discord]);
 await db.query("INSERT INTO discord_destination(user_id,connected_by,target_type,target_id,enabled,events) VALUES($1,$1,'user',$2,true,ARRAY['WELCOME'])",[a,discord]);
 let sends=0,fail=false;
 t.mock.method(globalThis,'fetch',async(url:any,opts:any)=>{
  if(String(url).endsWith('/users/@me/channels'))return Response.json({id:'800000000000000001'});
  sends++;const payload=JSON.parse(opts.body);assert.deepEqual(payload.allowed_mentions,{parse:[]});assert.equal(payload.enforce_nonce,true);
  if(fail)throw Error('network timeout after send');
  return Response.json({id:'800000000000000002'});
 });
 try {
  await db.transaction(em=>notify(em,'WELCOME',[a]));
  assert.equal((await service.dispatch()).sent,1);await service.dispatch();assert.equal(sends,1);
  await db.transaction(em=>notify(em,'WELCOME',[a]));
  await db.query("UPDATE discord_destination SET version=version+1 WHERE user_id=$1",[a]);
  await service.dispatch();assert.equal(sends,1);
  await db.transaction(em=>notify(em,'WELCOME',[a]));fail=true;await service.dispatch();await service.dispatch();assert.equal(sends,2);
  const statuses=await db.query("SELECT d.status FROM notification_delivery d JOIN notification n ON n.id=d.notification_id WHERE n.user_id=$1 ORDER BY d.created_at",[a]);
  assert.deepEqual(statuses.map(r=>r.status),['SENT','CANCELLED','UNCERTAIN']);
 }finally{if(old===undefined)delete process.env.DISCORD_BOT_TOKEN;else process.env.DISCORD_BOT_TOKEN=old;await db.query("DELETE FROM discord_link WHERE account_id=$1",[a]);}
});
