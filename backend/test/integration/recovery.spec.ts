import 'reflect-metadata';
import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import { Database } from '../../src/database/database';
import { RecoveryService, automaticRecoveryAcknowledgement, recoveryAcknowledgement, recoveryHash } from '../../src/auth/recovery';
import { RECOVERY_RESPONSE_MINIMUM_MS } from '../../src/auth/recovery-mail';
let db:Database, service:RecoveryService;
const originalFetch=globalThis.fetch;
let sends:{to:string[];text_body:string}[]=[];
let response:()=>Promise<Response>=async()=>Response.json({data:{succeeded:1,failed:0,email_id:'fixture-provider-id'}});
before(async()=>{
  const url=new URL(process.env.DATABASE_URL||'https://invalid');
  if(process.env.NODE_ENV!=='test'||url.hostname!=='127.0.0.1'||url.port!=='55433'||url.pathname!=='/infimatch_test')throw Error('Requires isolated database');
  db=await new Database().connect();await db.source.runMigrations({transaction:'all'});service=new RecoveryService(db);
});
after(async()=>{globalThis.fetch=originalFetch;await db?.onModuleDestroy();});
beforeEach(()=>{
  process.env.APP_ORIGIN='https://example.invalid';process.env.SMTP2GO_API_KEY='fictional-key';process.env.SMTP2GO_FROM='recovery@example.invalid';
  sends=[];response=async()=>Response.json({data:{succeeded:1,failed:0,email_id:randomUUID()}});
  globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.smtp2go.com/v3/email/send');sends.push(JSON.parse(String(options?.body)));return response();};
});
async function account(family='NURSE') {
  const email=randomUUID()+'@example.invalid';
  const [row]=await db.query("INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture',$2,'fixture') RETURNING id,email,session_version",[email,family]);
  return row;
}
function sentToken(email:string) {const body=sends.find(s=>s.to[0]===email);assert.ok(body);const found=body.text_body.match(/#token=([a-f0-9]{64})/);assert.ok(found);return found[1]!;}
async function requestRow(id:string) {return (await db.query('SELECT * FROM recovery_request WHERE account_id=$1 ORDER BY requested_at DESC',[id]))[0];}

test('automatic recovery sends a one-use 30-minute link, stores only a hash and revokes sessions',async()=>{
  const user=await account();
  await db.query("INSERT INTO session(sid,sess,expire) VALUES($1,$2,now()+interval '1 hour')",[randomUUID(),JSON.stringify({userId:user.id})]);
  const started=Date.now();
  assert.deepEqual(await service.request('  '+user.email.toUpperCase()+'  '),automaticRecoveryAcknowledgement);
  assert.ok(Date.now()-started>=RECOVERY_RESPONSE_MINIMUM_MS-20);
  const token=sentToken(user.email), row=await requestRow(user.id);
  assert.equal(row.status,'ISSUED');assert.equal(row.email_status,'ACCEPTED');assert.equal(row.token_hash,recoveryHash(token));
  assert.equal(new Date(row.expires_at).getTime()-new Date(row.issued_at).getTime(),30*60*1000);
  assert.ok(!JSON.stringify(row).includes(token));
  const password='A fictional changed password 2030!';
  await service.complete(token,password);
  const [updated]=await db.query('SELECT password_hash,session_version FROM account WHERE id=$1',[user.id]);
  assert.ok(await argon2.verify(updated.password_hash,password));assert.equal(updated.session_version,user.session_version+1);
  assert.equal((await db.query("SELECT 1 FROM session WHERE sess->>'userId'=$1",[user.id])).length,0);
  await assert.rejects(service.complete(token,password));
  const complete=await requestRow(user.id);assert.equal(complete.status,'COMPLETED');assert.equal(complete.token_hash,null);
  assert.ok(!JSON.stringify(await db.query('SELECT details FROM audit WHERE actor_id=$1',[user.id])).includes(token));
});

test('unknown, inactive, privileged and closing accounts have the same acknowledgement and no mail',async()=>{
  const inactive=await account(),platform=await account(),admin=await account(),closing=await account();
  await db.query('UPDATE account SET active=false WHERE id=$1',[inactive.id]);
  await db.query('UPDATE account SET platform_only=true WHERE id=$1',[platform.id]);
  await db.query("INSERT INTO platform_admin(user_id,role,active) VALUES($1,'AUDITOR',false)",[admin.id]);
  await db.query("INSERT INTO closure_request(account_id,status) VALUES($1,'APPROVED')",[closing.id]);
  const replies=await Promise.all([inactive.email,platform.email,admin.email,closing.email,randomUUID()+'@example.invalid'].map(async email=>{
    const start=Date.now();const result=await service.request(email);assert.ok(Date.now()-start>=RECOVERY_RESPONSE_MINIMUM_MS-20);return result;
  }));
  for(const reply of replies)assert.deepEqual(reply,automaticRecoveryAcknowledgement);
  assert.equal(sends.length,0);
  for(const a of [inactive,platform,admin,closing])assert.equal(await requestRow(a.id),undefined);
});

test('concurrent recovery requests obey the persistent one-hour limit and send only once',async()=>{
  const user=await account('ENTERPRISE');
  const replies=await Promise.all([service.request(user.email),service.request(user.email),service.request(user.email)]);
  for(const reply of replies)assert.deepEqual(reply,automaticRecoveryAcknowledgement);
  assert.equal(sends.length,1);assert.equal((await db.query('SELECT id FROM recovery_request WHERE account_id=$1',[user.id])).length,1);
});

test('expired links can be replaced after the one-hour delay and old tokens never work',async()=>{
  const user=await account();await service.request(user.email);const oldToken=sentToken(user.email);
  await db.query("UPDATE recovery_request SET requested_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' WHERE account_id=$1",[user.id]);
  await assert.rejects(service.complete(oldToken,'A fictional password 2030!'));
  sends=[];await service.request(user.email);assert.equal(sends.length,1);assert.notEqual(sentToken(user.email),oldToken);
  const rows=await db.query('SELECT status,token_hash FROM recovery_request WHERE account_id=$1',[user.id]);
  assert.equal(rows.length,2);assert.equal(rows.filter((r:any)=>r.status==='ISSUED').length,1);assert.equal(rows.find((r:any)=>r.status==='REJECTED').token_hash,null);
  await assert.rejects(service.complete(oldToken,'A fictional password 2030!'));
});

test('a changed account session version or new admin role invalidates the issued link',async()=>{
  const changed=await account(),promoted=await account();await Promise.all([service.request(changed.email),service.request(promoted.email)]);
  const changedToken=sentToken(changed.email),promotedToken=sentToken(promoted.email);
  await db.query('UPDATE account SET session_version=session_version+1 WHERE id=$1',[changed.id]);
  await db.query("INSERT INTO platform_admin(user_id,role) VALUES($1,'SUPPORT')",[promoted.id]);
  await assert.rejects(service.complete(changedToken,'A fictional password 2030!'));
  await assert.rejects(service.complete(promotedToken,'A fictional password 2030!'));
});

test('explicit mail rejection preserves manual assistance and suppresses repeated sends',async()=>{
  const user=await account();response=async()=>new Response('sensitive provider response',{status:429});
  assert.deepEqual(await service.request(user.email),automaticRecoveryAcknowledgement);
  const row=await requestRow(user.id);assert.equal(row.email_status,'FAILED');assert.equal(row.status,'REQUESTED');assert.equal(row.token_hash,null);
  assert.equal(row.email_last_error,'RECOVERY_PROVIDER_HTTP_429');assert.equal(row.expires_at,null);
  await service.request(user.email);assert.equal(sends.length,1);
});

test('an ambiguous mail result keeps the link valid but never retries automatically',async()=>{
  const user=await account();response=async()=>{throw Error('fictional timeout');};
  assert.deepEqual(await service.request(user.email),automaticRecoveryAcknowledgement);
  const token=sentToken(user.email),row=await requestRow(user.id);assert.equal(row.email_status,'UNCERTAIN');assert.equal(row.status,'ISSUED');
  await service.request(user.email);assert.equal(sends.length,1);
  await service.complete(token,'A fictional password 2030!');
});

test('missing SMTP uses manual recovery without generating or sending a token',async()=>{
  delete process.env.SMTP2GO_API_KEY;const user=await account();
  const [known,unknown]=await Promise.all([service.request(user.email),service.request(randomUUID()+'@example.invalid')]);
  assert.deepEqual(known,recoveryAcknowledgement);assert.deepEqual(known,unknown);assert.equal(sends.length,0);
  const row=await requestRow(user.id);assert.equal(row.status,'REQUESTED');assert.equal(row.email_status,'NOT_REQUESTED');assert.equal(row.token_hash,null);
});
