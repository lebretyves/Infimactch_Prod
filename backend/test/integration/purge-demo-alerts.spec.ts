import 'reflect-metadata';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Database, SqlClient} from '../../src/database/database';
import {purgeDemoAlerts} from '../../src/notifications/purge-demo-alerts';
import {mutedDemoMissionIds} from '../../src/notifications/demo-suppression';
let db:Database,nurse:string,org:string,destination:string,baseline:any;
const old=mutedDemoMissionIds[0]!,fresh=randomUUID();
const protectedTables=['account','profile','organization','membership','mission','application','assignment','document','document_blob','mission_email','mission_confirmation','mission_cancellation'];
async function businessSnapshot(){const result:Record<string,string>={};for(const table of protectedTables){const [r]=await db.query(`SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,'')) AS digest FROM ${table} t`);result[table]=r.digest;}return result;}
async function alert(missionId:string,kind:string,status='PENDING',legacyContext=false){
 const[e]=await db.query("INSERT INTO outbox(event,payload,completed_at) VALUES('NotificationCreated',$1,now()) RETURNING id",[JSON.stringify({missionId})]);
 const[n]=await db.query("INSERT INTO notification(user_id,event_id,kind,message,context) VALUES($1,$2,$3,'Fixture',$4) RETURNING id",[nurse,e.id,kind,JSON.stringify(legacyContext?{}:{missionId,version:1})]);
 await db.query('UPDATE notification_delivery SET status=$2 WHERE notification_id=$1',[n.id,status]);return n.id;
}
before(async()=>{
 const u=new URL(process.env.DATABASE_URL!);assert.equal(process.env.NODE_ENV,'test');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55433');assert.equal(u.pathname,'/infimatch_test');
 db=await new Database().connect();await db.source.runMigrations({transaction:'all'});
 const[a]=await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'test','NURSE','test') RETURNING id",[randomUUID()+'@example.invalid']);nurse=a.id;
 await db.query("INSERT INTO profile(user_id,display_name,qualifications) VALUES($1,'Fixture',ARRAY['IDE'])",[nurse]);
 const[o]=await db.query("INSERT INTO organization(kind,name,address,referent,finess) VALUES('ESTABLISHMENT','Fixture','Fixture','Fixture','000000000') RETURNING id");org=o.id;
 for(const id of [old,fresh])await db.query("INSERT INTO mission(id,establishment_id,title,description,qualification,service,population,block,start_at,end_at,shift,address,location,hourly_salary,status) VALUES($1,$2,'Same title','Same description','IDE','URGENCES','ADULT','NONE',now()+interval '20 days',now()+interval '20 days 8 hours','DAY','Fixture',ST_SetSRID(ST_MakePoint(2,48),4326)::geography,25,'OPEN')",[id,org]);
 const [app]=await db.query("INSERT INTO application(mission_id,nurse_id,consent_version) VALUES($1,$2,1) RETURNING id",[old,nurse]);
 await db.transaction(async em=>{await em.query("INSERT INTO assignment(mission_id,nurse_id,application_id,start_at,end_at) SELECT id,$2,$3,start_at,end_at FROM mission WHERE id=$1",[old,nurse,app.id]);await em.query("UPDATE mission SET status='FILLED' WHERE id=$1",[old]);});
 const documentId=randomUUID();await db.query("INSERT INTO document(id,owner_id,kind,mime,status,key_version,size_bytes,storage_backend) VALUES($1,$2,'CONFIRMATION','application/pdf','READY',1,4,'postgres')",[documentId,nurse]);await db.query("INSERT INTO document_blob(document_id,encrypted) VALUES($1,decode('01020304','hex'))",[documentId]);
 await db.query("INSERT INTO discord_link(account_id,discord_user_id,username) VALUES($1,'700000000000000001','fixture')",[nurse]);
 const[d]=await db.query("INSERT INTO discord_destination(user_id,connected_by,target_type,target_id,enabled,events) VALUES($1,$1,'user','700000000000000001',true,ARRAY['MATCH','REMINDER','MISSION_PUBLISHED','CONFIRMATION','CANCELLATION']) RETURNING id",[nurse]);destination=d.id;
 for(const kind of ['MATCH','REMINDER','MISSION_PUBLISHED']){await alert(old,kind);await alert(fresh,kind);}
 await alert(old,'MATCH','PENDING',true);await alert(old,'MATCH','UNCERTAIN');await alert(old,'REMINDER','SENDING');
 await alert(old,'CONFIRMATION');await alert(old,'CANCELLATION');
 for(const [missionId,event,leased] of [[old,'MissionOPEN',false],[old,'MatchRequested',false],[old,'MissionOPEN',true],[fresh,'MissionOPEN',false],[old,'AssignmentCreated',false],[old,'MissionCANCELLED',false]] as const){await db.query("INSERT INTO outbox(event,payload,lease_until) VALUES($1,$2,CASE WHEN $3 THEN now()+interval '1 hour' END)",[event,JSON.stringify({missionId,version:1}),leased]);}
 for(const [missionId,status] of [[old,'PENDING'],[old,'UNCERTAIN'],[fresh,'PENDING']]){const[e]=await db.query("INSERT INTO outbox(event,payload,completed_at) VALUES('ReminderCreated',$1,now()) RETURNING id",[JSON.stringify({missionId})]);await db.query("INSERT INTO discord_delivery(destination_id,destination_version,event_id,mission_id,mission_version,kind,status) VALUES($1,1,$2,$3,1,'REMINDER',$4)",[destination,e.id,missionId,status]);}
 baseline=await businessSnapshot();
});
after(async()=>{await db?.onModuleDestroy();});
test('preview counts exact import alerts and leaves everything unchanged',async()=>{const r=await purgeDemoAlerts(db);assert.equal(r.before.deletable_alerts,4);assert.equal(r.before.pending_events,2);assert.equal(r.before.legacy_deliveries,1);assert.deepEqual(r.before,r.after);assert.deepEqual(await businessSnapshot(),baseline);assert.equal((await db.query("SELECT 1 FROM audit WHERE event='LEGACY_DEMO_ALERTS_PURGED'")).length,0);});
test('failed purge rolls back deletes and completed events atomically',async()=>{const failing={transaction:<T>(fn:(em:SqlClient)=>Promise<T>)=>db.transaction(em=>fn({query:(sql:string,p:any[])=>{if(sql.includes('INSERT INTO audit'))throw Error('forced audit failure');return em.query(sql,p);}}))};await assert.rejects(purgeDemoAlerts(failing,true),/forced audit failure/);const r=await purgeDemoAlerts(db);assert.equal(r.before.deletable_alerts,4);assert.equal(r.before.pending_events,2);});
test('purge preserves new missions, transactional alerts, active and ambiguous deliveries, all business rows and documents',async()=>{const r=await purgeDemoAlerts(db,true);assert.equal(r.deletedAlerts,4);assert.equal(r.deletedDeliveries,4);assert.equal(r.deletedLegacyDeliveries,1);assert.equal(r.completedEvents,2);assert.equal(r.hasMore,false);assert.equal(r.after.alerts,2);assert.deepEqual(await businessSnapshot(),baseline);
 assert.equal((await db.query("SELECT id FROM notification WHERE context->>'missionId'=$1",[fresh])).length,3);
 assert.equal((await db.query("SELECT id FROM notification WHERE kind IN('CONFIRMATION','CANCELLATION')")).length,2);
 assert.equal((await db.query("SELECT id FROM notification_delivery WHERE status IN('SENDING','UNCERTAIN')")).length,2);
 assert.equal((await db.query("SELECT id FROM outbox WHERE event IN('AssignmentCreated','MissionCANCELLED') AND completed_at IS NULL")).length,2);
 assert.equal((await db.query("SELECT id FROM outbox WHERE lease_until>now() AND completed_at IS NULL")).length,1);
 assert.equal((await db.query("SELECT id FROM outbox WHERE payload->>'missionId'=$1 AND event='MissionOPEN' AND completed_at IS NULL",[fresh])).length,1);
 assert.equal((await db.query("SELECT 1 FROM workflow_receipt WHERE action='matches'")).length,2);
});
test('repeating purge does not delete more data or add audit noise',async()=>{const r=await purgeDemoAlerts(db,true);assert.equal(r.deletedAlerts+r.deletedDeliveries+r.deletedLegacyDeliveries+r.completedEvents,0);assert.equal((await db.query("SELECT 1 FROM audit WHERE event='LEGACY_DEMO_ALERTS_PURGED'")).length,1);});
test('a delivery that starts between selection and locking is preserved',async()=>{const id=await alert(old,'MATCH');let changed=false;const raced={transaction:<T>(fn:(em:SqlClient)=>Promise<T>)=>db.transaction(em=>fn({query:async(sql:string,p:any[])=>{if(!changed&&sql.startsWith('SELECT id,notification_id,status,kind')){changed=true;await db.query("UPDATE notification_delivery SET status='SENDING' WHERE notification_id=$1",[id]);}return em.query(sql,p);}}))};const r=await purgeDemoAlerts(raced,true);assert.equal(changed,true);assert.equal(r.deletedAlerts,0);assert.equal((await db.query('SELECT id FROM notification WHERE id=$1',[id])).length,1);});
test('purge is bounded to 500 alerts and reports remaining work',async()=>{for(let i=0;i<505;i++)await alert(old,'MATCH');const a=await purgeDemoAlerts(db,true);assert.equal(a.deletedAlerts,500);assert.equal(a.hasMore,true);const b=await purgeDemoAlerts(db,true);assert.equal(b.deletedAlerts,5);assert.equal(b.hasMore,false);assert.deepEqual(await businessSnapshot(),baseline);});

