import {totp} from '../../src/admin/mfa';
import {MatchingService} from '../../src/matching/matching.module';
import {RefreshService} from '../../src/public-data/refresh.service';
import {MATCH_RULES} from '../../src/domain/rules';
import 'reflect-metadata';
import {beforeEach,afterEach,test} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {randomUUID,randomBytes} from 'node:crypto';
import {createApp} from '../../src/app';
import {Database} from '../../src/database/database';
import {hashInvitation} from '../../src/admin/admin-auth';
let app:Awaited<ReturnType<typeof createApp>>,db:Database;
const origin='http://127.0.0.1:5174',password='Fictional-admin-account-123';
beforeEach(async()=>{const u=new URL(process.env.DATABASE_URL!);if(process.env.NODE_ENV!=='test'||u.hostname!=='127.0.0.1'||u.port!=='55433'||u.pathname!=='/infimatch_test')throw Error('Isolated test database required');process.env.ADMIN_ORIGIN=origin;app=await createApp();await app.listen(0,'127.0.0.1');db=app.get(Database);await db.query("DELETE FROM rate_limit_bucket");});
afterEach(async()=>{await app?.close();});
async function account(family="NURSE"){const agent=request.agent(app.getHttpServer()),email=randomUUID()+'@example.invalid';const csrf=await agent.get('/api/v1/auth/csrf');const r=await agent.post('/api/v1/auth/register').set('Origin',process.env.APP_ORIGIN!).set('X-CSRF-Token',csrf.body.csrfToken).set('Idempotency-Key',randomUUID()).send({email,password,family,termsVersion:'2026-09-14',...(family==='ENTERPRISE'?{organizationType:'ESTABLISHMENT',name:'Organisation FICTIVE',address:'1 rue fictive Paris',referent:'Contact fictif',finess:'000000001'}:{})}).expect(201);return {agent,email,id:r.body.user.id};}
function post(agent:ReturnType<typeof request.agent>,path:string,csrf:string,body:object){return agent.post('/api/v1/admin/'+path).set('Origin',origin).set('X-CSRF-Token',csrf).send(body);}
async function enroll(role='OWNER'){const a=await account(),invitation=randomBytes(32).toString('hex');await db.query("INSERT INTO platform_admin(user_id,role,invitation_hash,invitation_expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",[a.id,role,hashInvitation(invitation)]);const agent=request.agent(app.getHttpServer()),c=await agent.get('/api/v1/admin/csrf').expect(200);const login=await post(agent,'login',c.body.csrfToken,{email:a.email,password,invitation}).expect(201);assert.equal(login.body.status,'MFA_ENROLLMENT_REQUIRED');await agent.get('/api/v1/admin/me').expect(401);const code=totp(login.body.secret,Math.floor(Date.now()/30000));const mfa=await post(agent,'mfa',login.body.csrfToken,{code}).expect(201);assert.equal(mfa.body.status,'AUTHENTICATED');return {...a,agent,secret:login.body.secret,recoveryCodes:mfa.body.recoveryCodes,csrf:mfa.body.csrfToken};}
test('admin routes require authorized access and separate session, with origin isolation',async()=>{const client=await account();await client.agent.get('/api/v1/admin/overview').expect(401);const c=await client.agent.get('/api/v1/admin/csrf');await post(client.agent,'login',c.body.csrfToken,{email:client.email,password}).expect(401);const owner=await enroll();const me=await owner.agent.get('/api/v1/admin/me').expect(200);assert.equal(me.body.role,'OWNER');await owner.agent.get('/api/v1/auth/me').expect(401);await owner.agent.get('/api/v1/admin/overview').expect(200);await post(owner.agent,'accounts/'+client.id+'/state',owner.csrf,{active:false,reason:'Test isolated suspension'}).set('Origin',process.env.APP_ORIGIN!).expect(403);await post(owner.agent,'reauth',owner.csrf,{password:'incorrect-password-123',code:'000000'}).expect(401);});
test('admin permissions, suspension and session revocation are enforced server side',async()=>{const owner=await enroll(),ops=await enroll('OPS'),client=await account();await ops.agent.get('/api/v1/admin/accounts').expect(403);await ops.agent.get('/api/v1/admin/jobs').expect(200);await post(ops.agent,'accounts/'+client.id+'/state',ops.csrf,{active:false,reason:'Forbidden suspension'}).expect(403);await post(owner.agent,'accounts/'+client.id+'/state',owner.csrf,{active:false,reason:'Isolated suspension test'}).expect(201);await client.agent.get('/api/v1/auth/me').expect(401);await post(owner.agent,'access/'+ops.id,owner.csrf,{active:false,role:'OPS',reason:'Isolated revoke access'}).expect(201);await ops.agent.get('/api/v1/admin/jobs').expect(401);});
test('admin read endpoints expose bounded selected fields and no credentials',async()=>{const owner=await enroll();for(const path of ['accounts','organizations','missions','jobs','sources','infrastructure','audit','access','quality','backups']){const r=await owner.agent.get('/api/v1/admin/'+path).expect(200);assert.doesNotMatch(JSON.stringify(r.body),/password_hash|totp_secret|invitation_hash|postgresql:\/\//);}await owner.agent.get('/api/v1/admin/accounts?limit=1000').expect(400);});

test('last usable owner cannot be removed and sensitive actions require recent password confirmation',async()=>{
 const owner=await enroll();const others=await db.query("UPDATE platform_admin SET role='AUDITOR' WHERE role='OWNER' AND user_id<>$1 RETURNING user_id",[owner.id]);
 try {await post(owner.agent,'access/'+owner.id,owner.csrf,{active:false,role:'OWNER',reason:'Last owner rejection test'}).expect(409);} finally {await db.query("UPDATE platform_admin SET role='OWNER' WHERE user_id=ANY($1::uuid[])",[others.map(a=>a.user_id)]);}
 await db.query("UPDATE admin_session SET sess=jsonb_set(sess::jsonb,'{adminVerifiedAt}',to_jsonb($2::bigint))::json WHERE sess->>'adminId'=$1",[owner.id,Date.now()-6*60000]);
 const client=await account();const denied=await post(owner.agent,'accounts/'+client.id+'/revoke',owner.csrf,{reason:'Recent password confirmation required test'}).expect(403);assert.equal(denied.body.code,'ADMIN_REAUTH_REQUIRED');
 await post(owner.agent,'reauth',owner.csrf,{password,code:totp(owner.secret,Math.floor(Date.now()/30000)+1)}).expect(201);await post(owner.agent,'accounts/'+client.id+'/revoke',owner.csrf,{reason:'Recent password confirmation accepted test'}).expect(201);
});


test('organization membership changes preserve a manager, account family and role boundaries',async()=>{
 const owner=await enroll(),ops=await enroll('OPS'),one=await account('ENTERPRISE'),two=await account('ENTERPRISE'),nurse=await account();
 const [membership]=await db.query('SELECT organization_id FROM membership WHERE user_id=$1',[one.id]);const id=membership.organization_id;
 await owner.agent.get('/api/v1/admin/organizations/'+id).expect(200);
 await post(ops.agent,'organizations/'+id+'/members',ops.csrf,{email:two.email,active:true,reason:'Forbidden attachment test'}).expect(403);
 await post(owner.agent,'organizations/'+id+'/members',owner.csrf,{email:nurse.email,active:true,reason:'Wrong account family test'}).expect(400);
 await post(owner.agent,'organizations/'+id+'/members',owner.csrf,{email:one.email,active:false,reason:'Last member protected test'}).expect(409);
 await post(owner.agent,'organizations/'+id+'/members',owner.csrf,{email:two.email,active:true,reason:'Authorized attachment test'}).expect(201);
 await two.agent.get('/api/v1/auth/me').expect(401);
 await post(owner.agent,'organizations/'+id+'/members',owner.csrf,{email:one.email,active:false,reason:'Manager transfer isolated test'}).expect(201);
 const detail=await owner.agent.get('/api/v1/admin/organizations/'+id).expect(200);assert.equal(detail.body.members.filter((m:any)=>m.active).length,1);
});

test('manual professional review does not grant directory identity or eligibility',async()=>{
 const support=await enroll('SUPPORT'),ops=await enroll('OPS'),nurse=await account();
 await post(ops.agent,'accounts/'+nurse.id+'/verification',ops.csrf,{state:'REVIEWED',reason:'Forbidden review attempt'}).expect(403);
 await post(support.agent,'accounts/'+nurse.id+'/verification',support.csrf,{state:'REVIEWED',reason:'Fictional metadata reviewed'}).expect(201);
 const result=await support.agent.get('/api/v1/admin/accounts/'+nurse.id+'/verification').expect(200);
 assert.equal(result.body.directory.status,'NOT_CHECKED');assert.equal(result.body.professionalIdentity,null);assert.equal(result.body.reviews[0].state,'REVIEWED');
 const [profile]=await db.query('SELECT rpps_status,qualifications FROM profile WHERE user_id=$1',[nurse.id]);assert.equal(profile.rpps_status,'NOT_CHECKED');assert.deepEqual(profile.qualifications,[]);
});

test('source controls and incident lifecycle are permission checked and audited',async()=>{
 const owner=await enroll(),auditor=await enroll('AUDITOR');
 await post(auditor.agent,'operations/sources/JOBSPIPE/state',auditor.csrf,{enabled:false,reason:'Forbidden schedule change'}).expect(403);
 await post(owner.agent,'operations/sources/UNKNOWN/state',owner.csrf,{enabled:false,reason:'Unknown source rejection'}).expect(400);
 await post(owner.agent,'operations/sources/JOBSPIPE/state',owner.csrf,{enabled:false,reason:'Pause isolated scheduler'}).expect(201);
 try {assert.equal((await app.get(RefreshService).run('JOBSPIPE')).status,'PAUSED');const operations=await owner.agent.get('/api/v1/admin/operations').expect(200);assert.equal(operations.body.sources.find((x:any)=>x.provider==='JOBSPIPE').enabled,false);}finally{await db.query("UPDATE source_control SET enabled=true,last_started_at=NULL WHERE provider='JOBSPIPE'");}
 const incident=await post(owner.agent,'incidents',owner.csrf,{service:'IMPORTS',impact:'Fictional import interruption',ownerLabel:'Fictional operator',reason:'Isolated incident lifecycle'}).expect(201);
 await post(auditor.agent,'incidents/'+incident.body.id,auditor.csrf,{state:'RESOLVED',reason:'Forbidden incident mutation'}).expect(403);
 await post(owner.agent,'incidents/'+incident.body.id,owner.csrf,{state:'INVESTIGATING',reason:'Fictional diagnosis in progress'}).expect(201);
 await post(owner.agent,'incidents/'+incident.body.id,owner.csrf,{state:'RESOLVED',reason:'Fictional service recovered'}).expect(201);
 const traces=await db.query('SELECT actor_id,event,details FROM audit WHERE resource_id=$1 ORDER BY created_at,id',[incident.body.id]);
 assert.equal(traces.length,3);assert.ok(traces.every((trace:any)=>trace.actor_id===owner.id));
 assert.equal(traces.filter((trace:any)=>trace.event==='ADMIN_INCIDENT_OPENED').length,1);
 assert.deepEqual(traces.filter((trace:any)=>trace.event==='ADMIN_INCIDENT_UPDATED').map((trace:any)=>trace.details.state).sort(),['INVESTIGATING','RESOLVED']);
 const [row]=await db.query('SELECT state,resolved_at FROM operational_incident WHERE id=$1',[incident.body.id]);assert.equal(row.state,'RESOLVED');assert.ok(row.resolved_at);
 await owner.agent.get('/api/v1/admin/privacy-requests').expect(200);await auditor.agent.get('/api/v1/admin/privacy-requests').expect(403);
});

test('stored matching is readable, versioned and cannot bypass active agency links',async()=>{
 const owner=await enroll(),ops=await enroll('OPS'),nurse=await account();
 const [agency]=await db.query("INSERT INTO organization(kind,name,address,referent) VALUES('AGENCY','Fictional agency','Fictional address','Fictional contact') RETURNING id");
 const [est]=await db.query("INSERT INTO organization(kind,name,address,referent,finess) VALUES('ESTABLISHMENT','Fictional establishment','Fictional address','Fictional contact','000000001') RETURNING id");
 await post(owner.agent,'organizations/'+agency.id+'/links',owner.csrf,{otherOrganizationId:est.id,active:true,reason:'Create fictional agency link'}).expect(201);
 const [mission]=await db.query("INSERT INTO mission(agency_id,establishment_id,title,description,qualification,service,population,block,start_at,end_at,shift,address,location,hourly_salary) VALUES($1,$2,'Fictional matching mission','Fictional description','IDE','URGENCES','ADULT','NONE','2039-01-01T08:00Z','2039-01-01T16:00Z','DAY','Fictional address',ST_SetSRID(ST_MakePoint(2,48),4326),25) RETURNING id,version,status",[agency.id,est.id]);
 await post(owner.agent,'organizations/'+agency.id+'/links',owner.csrf,{otherOrganizationId:est.id,active:false,reason:'Prevent breaking active link'}).expect(409);
 // Mission detail mixes a uuid column and a JSON text field on the same parameter.
 await db.query("INSERT INTO audit(event,details) VALUES('FICTIONAL_MISSION_NOTE',jsonb_build_object('missionId',$1::text))",[mission.id]);
 const detail=await owner.agent.get('/api/v1/admin/missions/'+mission.id).expect(200);assert.equal(detail.body.mission.id,mission.id);assert.ok(detail.body.events.some((e:any)=>e.event==='FICTIONAL_MISSION_NOTE'));
 const [profile]=await db.query('SELECT updated_at,rpps_version FROM profile WHERE user_id=$1',[nurse.id]);
 const matching=app.get(MatchingService);await matching.ready();
 const run=await matching.runs.create({ownerId:nurse.id,missionId:mission.id,profileVersion:new Date(profile.updated_at).toISOString()+':'+profile.rpps_version,missionVersion:mission.version,missionStatus:mission.status,rulesVersion:MATCH_RULES.version,result:{eligible:false,score:null,components:null,reasons:['RPPS_REQUIRED'],distanceKm:0},expiresAt:new Date(Date.now()+60000)});
 try {await ops.agent.get('/api/v1/admin/missions/'+mission.id+'/matching').expect(403);let result=await owner.agent.get('/api/v1/admin/missions/'+mission.id+'/matching').expect(200);assert.equal(result.body.items[0].stale,false);assert.equal(result.body.items[0].result.eligible,false);await db.query('UPDATE profile SET rpps_version=rpps_version+1 WHERE user_id=$1',[nurse.id]);result=await owner.agent.get('/api/v1/admin/missions/'+mission.id+'/matching').expect(200);assert.equal(result.body.items[0].stale,true);}finally{await matching.runs.deleteOne({_id:run._id});}
 await db.query("UPDATE mission SET status='CANCELLED' WHERE id=$1",[mission.id]);await post(owner.agent,'organizations/'+agency.id+'/links',owner.csrf,{otherOrganizationId:est.id,active:false,reason:'End unused fictional link'}).expect(201);
});


test('dedicated administrator activation requires an invitation and never grants client access',async()=>{
 const email=randomUUID()+'@example.invalid',invitation=randomBytes(32).toString('hex');
 const [a]=await db.query("INSERT INTO account(email,password_hash,family,terms_version,platform_only) VALUES($1,'ADMIN_ACTIVATION_PENDING','ENTERPRISE','ADMIN_INVITATION',true) RETURNING id",[email]);
 await db.query("INSERT INTO platform_admin(user_id,role,invitation_hash,invitation_expires_at) VALUES($1,'OWNER',$2,now()+interval '1 hour')",[a.id,hashInvitation(invitation)]);
 const agent=request.agent(app.getHttpServer()),c=await agent.get('/api/v1/admin/csrf');
 await post(agent,'activate',c.body.csrfToken,{email,password,invitation:'x'.repeat(64)}).expect(401);
 const activated=await post(agent,'activate',c.body.csrfToken,{email,password,invitation}).expect(201);
 assert.equal(activated.body.status,'MFA_ENROLLMENT_REQUIRED');await agent.get('/api/v1/admin/overview').expect(401);const verified=await post(agent,'mfa',activated.body.csrfToken,{code:totp(activated.body.secret,Math.floor(Date.now()/30000))}).expect(201);
 await agent.get('/api/v1/admin/overview').expect(200);
 await post(agent,'activate',verified.body.csrfToken,{email,password,invitation}).expect(401);
 assert.equal((await agent.get('/api/v1/admin/me').expect(200)).body.role,'OWNER');
 await agent.get('/api/v1/auth/me').expect(401);
 const client=request.agent(app.getHttpServer()),csrf=await client.get('/api/v1/auth/csrf');
 await client.post('/api/v1/auth/login').set('Origin',process.env.APP_ORIGIN!).set('X-CSRF-Token',csrf.body.csrfToken).send({email,password}).expect(401);
 assert.equal((await db.query('SELECT 1 FROM membership WHERE user_id=$1',[a.id])).length,0);
 assert.equal((await db.query('SELECT 1 FROM profile WHERE user_id=$1',[a.id])).length,0);
});


test('activated dedicated administrator must repeat both factors after idle expiration',async()=>{
 const owner=await enroll();await db.query("UPDATE account SET platform_only=true,terms_version='ADMIN_ACTIVATED' WHERE id=$1",[owner.id]);
 await db.query("UPDATE admin_session SET sess=jsonb_set(sess::jsonb,'{adminActivityAt}','0'::jsonb)::json WHERE sess->>'adminId'=$1",[owner.id]);
 await owner.agent.get('/api/v1/admin/overview').expect(401);
 const csrf=await owner.agent.get('/api/v1/admin/csrf');
 const login=await post(owner.agent,'login',csrf.body.csrfToken,{email:owner.email,password}).expect(201);assert.equal(login.body.status,'MFA_REQUIRED');
 await owner.agent.get('/api/v1/admin/overview').expect(401);
 await post(owner.agent,'mfa',login.body.csrfToken,{code:totp(owner.secret,Math.floor(Date.now()/30000)+1)}).expect(201);
 await owner.agent.get('/api/v1/admin/overview').expect(200);
});

test('Discord infrastructure reports a checked bot identity without claiming message delivery',async()=>{
 const owner=await enroll(),oldToken=process.env.DISCORD_BOT_TOKEN,originalFetch=globalThis.fetch;
 process.env.DISCORD_BOT_TOKEN='fictional-test-token';
 try{
 globalThis.fetch=async(input:any)=>{assert.equal(String(input),'https://discord.com/api/v10/users/@me');return new Response(JSON.stringify({id:'123456789012345678',bot:true}),{status:200});};
 let response=await owner.agent.get('/api/v1/admin/infrastructure').expect(200);assert.equal(response.body.services.find((x:any)=>x.name==='n8n / Discord').state,'ready');
 globalThis.fetch=async()=>new Response('{}',{status:401});
 response=await owner.agent.get('/api/v1/admin/infrastructure').expect(200);assert.equal(response.body.services.find((x:any)=>x.name==='n8n / Discord').state,'unavailable');
 }finally{globalThis.fetch=originalFetch;if(oldToken===undefined)delete process.env.DISCORD_BOT_TOKEN;else process.env.DISCORD_BOT_TOKEN=oldToken;}
});

test('admin account Discord status is scoped, redacted and distinguishes association from preferences',async()=>{
 const owner=await enroll(),support=await enroll('SUPPORT'),ops=await enroll('OPS'),a=await account(),other=await account();
 const path='/api/v1/admin/accounts/'+a.id+'/notifications';
 await a.agent.get(path).expect(401);await ops.agent.get(path).expect(403);await owner.agent.get('/api/v1/admin/accounts/'+randomUUID()+'/notifications').expect(404);
 let response=(await support.agent.get(path).expect(200)).body;assert.equal(response.connection.state,'NOT_ASSOCIATED');assert.equal(response.personal.state,'NOT_ASSOCIATED');assert.ok(response.internal.total>=1);
 const discord=String(800000000000000000n+BigInt(Math.floor(Math.random()*100000000)));
 await db.query("INSERT INTO discord_challenge(account_id,discord_user_id,code_hash,expires_at) VALUES($1,$2,'do-not-expose-this-hash',now()+interval '10 minutes')",[a.id,discord]);
 response=(await owner.agent.get(path).expect(200)).body;assert.equal(response.connection.state,'PENDING');assert.equal(response.connection.discordUserId,null);assert.doesNotMatch(JSON.stringify(response),/do-not-expose|code_hash/);
 await db.query("UPDATE discord_challenge SET expires_at=now()-interval '1 minute' WHERE account_id=$1",[a.id]);assert.equal((await owner.agent.get(path)).body.connection.state,'EXPIRED');
 await db.query("INSERT INTO discord_link(account_id,discord_user_id,username) VALUES($1,$2,'fixture')",[a.id,discord]);
 const [dest]=await db.query("INSERT INTO discord_destination(user_id,connected_by,target_type,target_id,enabled,events) VALUES($1,$1,'user',$2,false,ARRAY['WELCOME']) RETURNING id",[a.id,discord]);
 response=(await owner.agent.get(path)).body;assert.equal(response.connection.state,'ASSOCIATED');assert.equal(response.personal.state,'DISABLED');assert.deepEqual(response.personal.effectiveEvents,[]);assert.equal(response.connection.discordUserId,discord);
 await db.query('UPDATE discord_destination SET enabled=true WHERE id=$1',[dest.id]);await db.query("INSERT INTO notification_preference(account_id,kind,discord) VALUES($1,'WELCOME',false)",[a.id]);
 assert.equal((await owner.agent.get(path)).body.personal.state,'NO_EVENTS');await db.query('DELETE FROM notification_preference WHERE account_id=$1',[a.id]);
 const [notice]=await db.query('SELECT id FROM notification WHERE user_id=$1 LIMIT 1',[a.id]);
 await db.query("INSERT INTO notification_delivery(notification_id,destination_id,destination_version,kind,status,last_error) VALUES($1,$2,1,'WELCOME','FAILED','private-content-secret')",[notice.id,dest.id]);
 response=(await owner.agent.get(path)).body;assert.equal(response.personal.state,'ENABLED');assert.deepEqual(response.personal.effectiveEvents,['WELCOME']);assert.equal(response.deliveries.latest.errorCode,'DELIVERY_FAILED');assert.equal(response.deliveries.counts.FAILED,1);assert.doesNotMatch(JSON.stringify(response),/private-content-secret|code_hash|message_id|lease_token/);
 await db.query("UPDATE notification_delivery SET last_error='DISCORD_403' WHERE destination_id=$1",[dest.id]);assert.equal((await owner.agent.get(path)).body.deliveries.latest.errorCode,'DISCORD_HTTP_403');
 const otherView=(await owner.agent.get('/api/v1/admin/accounts/'+other.id+'/notifications')).body;assert.equal(otherView.connection.state,'NOT_ASSOCIATED');assert.equal(otherView.deliveries.latest,null);
 for(let i=0;i<12;i++)await db.query("INSERT INTO notification_delivery(notification_id,destination_id,destination_version,kind,status,sent_at) VALUES($1,$2,1,'WELCOME','SENT',now())",[notice.id,dest.id]);
 response=(await owner.agent.get(path)).body;assert.equal(response.deliveries.recent.length,10);assert.equal(response.deliveries.counts.SENT,12);
 const enterprise=await account('ENTERPRISE');const orgView=(await owner.agent.get('/api/v1/admin/accounts/'+enterprise.id+'/notifications')).body;assert.equal(orgView.organizations.length,1);assert.equal(orgView.organizations[0].configured,false);assert.equal(orgView.personal.state,'NOT_ASSOCIATED');
});

async function clientPost(a:any,path:string,body:object){const c=await a.agent.get('/api/v1/auth/csrf');return a.agent.post('/api/v1/'+path).set('Origin',process.env.APP_ORIGIN!).set('X-CSRF-Token',c.body.csrfToken).send(body);}
test('manual recovery is private, authorized, single-use, expiring and revokes sessions',async()=>{
 const owner=await enroll(),ops=await enroll('OPS'),client=await account();
 const known=await clientPost(client,'auth/recovery/request',{email:client.email});assert.equal(known.status,201);
 const unknown=await clientPost(client,'auth/recovery/request',{email:randomUUID()+'@example.invalid'});assert.deepEqual(known.body,unknown.body);
 await clientPost(client,'auth/recovery/request',{email:client.email});
 const rows=await db.query('SELECT * FROM recovery_request WHERE account_id=$1',[client.id]);assert.equal(rows.length,1);const id=rows[0].id;
 await post(ops.agent,'recovery-requests/'+id+'/issue',ops.csrf,{reason:'Identity checked offline',identityVerified:true}).expect(403);
 await post(owner.agent,'recovery-requests/'+id+'/issue',owner.csrf,{reason:'Identity checked offline',identityVerified:false}).expect(400);
 const issue=()=>post(owner.agent,'recovery-requests/'+id+'/issue',owner.csrf,{reason:'Identity checked offline',identityVerified:true}).expect(201);
 const old=(await issue()).body,newer=(await issue()).body;
 const token=(url:string)=>new URLSearchParams(new URL(url).hash.slice(1)).get('token');
 const freshPassword='New-fictional-password-456';
 assert.equal((await clientPost(client,'auth/recovery/complete',{token:token(old.resetUrl),password:freshPassword})).status,400);
 const listing=await owner.agent.get('/api/v1/admin/recovery-requests?accountId='+client.id).expect(200);assert.equal(listing.body.total,1);assert.doesNotMatch(JSON.stringify(listing.body),/token_hash|resetUrl|account_version/);
 await db.query("UPDATE recovery_request SET expires_at=now()-interval '1 second' WHERE id=$1",[id]);assert.equal((await clientPost(client,'auth/recovery/complete',{token:token(newer.resetUrl),password:freshPassword})).status,400);
 const fresh=(await issue()).body;
 const result=await clientPost(client,'auth/recovery/complete',{token:token(fresh.resetUrl),password:freshPassword});assert.equal(result.status,201);
 await client.agent.get('/api/v1/auth/me').expect(401);
 assert.equal((await clientPost(client,'auth/recovery/complete',{token:token(fresh.resetUrl),password:freshPassword})).status,400);
 assert.equal((await clientPost(client,'auth/login',{email:client.email,password})).status,401);
 assert.equal((await clientPost(client,'auth/login',{email:client.email,password:freshPassword})).status,201);
 const [stored]=await db.query('SELECT status,token_hash FROM recovery_request WHERE id=$1',[id]);assert.equal(stored.status,'COMPLETED');assert.equal(stored.token_hash,null);
 const logs=await db.query('SELECT details FROM audit WHERE resource_id=$1',[id]);assert.ok(!JSON.stringify(logs).includes(token(fresh.resetUrl)!));
 await clientPost(client,'auth/recovery/request',{email:owner.email});assert.equal((await db.query('SELECT id FROM recovery_request WHERE account_id=$1',[owner.id])).length,0);
});
test('client closure needs password, owner approval and preserves organization management',async()=>{
 const owner=await enroll(),support=await enroll('SUPPORT'),client=await account(),company=await account('ENTERPRISE');
 assert.equal((await clientPost(client,'me/closure-request',{password:'wrong'})).status,400);
 const created=await clientPost(client,'me/closure-request',{password});assert.equal(created.status,201);const id=created.body.id;
 await post(support.agent,'privacy-requests/'+id+'/approve',support.csrf,{reason:'Client identity checked'}).expect(403);
 await post(owner.agent,'privacy-requests/'+id+'/execute',owner.csrf,{reason:'Client identity checked'}).expect(409);
 await post(owner.agent,'privacy-requests/'+id+'/approve',owner.csrf,{reason:'Client identity checked'}).expect(201);
 assert.equal((await db.query('SELECT active FROM account WHERE id=$1',[client.id]))[0].active,true);
 const executed=await post(owner.agent,'privacy-requests/'+id+'/execute',owner.csrf,{reason:'Confirmed isolated closure'}).expect(201);assert.equal(executed.body.status,'COMPLETED');await client.agent.get('/api/v1/auth/me').expect(401);
 const [closed]=await db.query('SELECT email,active FROM account WHERE id=$1',[client.id]);assert.equal(closed.active,false);assert.match(closed.email,/@anonymized.invalid$/);
 const requestCompany=await clientPost(company,'me/closure-request',{password});const detail=await owner.agent.get('/api/v1/admin/privacy-requests/'+requestCompany.body.id).expect(200);assert.ok(detail.body.blockers.some((x:any)=>x.code==='LAST_MANAGER'));await post(owner.agent,'privacy-requests/'+requestCompany.body.id+'/approve',owner.csrf,{reason:'Blocked last organization manager'}).expect(409);
 await post(owner.agent,'privacy-requests/'+requestCompany.body.id+'/reject',owner.csrf,{reason:'Transfer organization management first'}).expect(201);
 assert.equal((await company.agent.get('/api/v1/me/closure-request')).body.request.status,'REJECTED');
});


test('MFA has no password-only bypass, rejects replay, recovers once and invalidates old sessions',async()=>{
 const owner=await enroll();
 const fresh=request.agent(app.getHttpServer()),c=await fresh.get('/api/v1/admin/csrf');
 const login=await post(fresh,'login',c.body.csrfToken,{email:owner.email,password}).expect(201);
 assert.equal(login.body.status,'MFA_REQUIRED');assert.equal(login.body.secret,undefined);
 await fresh.get('/api/v1/admin/overview').expect(401);
 await post(fresh,'mfa',login.body.csrfToken,{code:totp(owner.secret,Math.floor(Date.now()/30000))}).expect(401);
 const [saved]=await db.query('SELECT recovery_hashes FROM platform_admin WHERE user_id=$1',[owner.id]);
 assert.equal(saved.recovery_hashes.length,8);assert.ok(!saved.recovery_hashes.includes(owner.recoveryCodes[0]));
 const recovered=await post(fresh,'mfa/recover',login.body.csrfToken,{code:owner.recoveryCodes[0]}).expect(201);
 await owner.agent.get('/api/v1/admin/me').expect(401);await fresh.get('/api/v1/admin/me').expect(401);
 const verified=await post(fresh,'mfa',recovered.body.csrfToken,{code:totp(recovered.body.secret,Math.floor(Date.now()/30000))}).expect(201);
 assert.equal(verified.body.recoveryCodes.length,8);await fresh.get('/api/v1/admin/me').expect(200);
 const again=request.agent(app.getHttpServer()),csrf=await again.get('/api/v1/admin/csrf');const next=await post(again,'login',csrf.body.csrfToken,{email:owner.email,password}).expect(201);
 await post(again,'mfa/recover',next.body.csrfToken,{code:owner.recoveryCodes[0]}).expect(401);
 await db.query("UPDATE admin_session SET sess=(sess::jsonb-'adminMfaVerified')::json WHERE sess->>'adminId'=$1",[owner.id]);
 await fresh.get('/api/v1/admin/me').expect(401);
});

test('MFA failures persist across password login and an expired challenge grants no access',async()=>{
 const owner=await enroll();let last:any;
 for(let i=0;i<5;i++){
  const agent=request.agent(app.getHttpServer()),c=await agent.get('/api/v1/admin/csrf');
  const login=await post(agent,'login',c.body.csrfToken,{email:owner.email,password}).expect(201);
  await post(agent,'mfa',login.body.csrfToken,{code:'invalid'}).expect(401);last=agent;
 }
 const [a]=await db.query('SELECT failed_attempts,locked_until FROM platform_admin WHERE user_id=$1',[owner.id]);assert.equal(a.failed_attempts,5);assert.ok(new Date(a.locked_until).getTime()>Date.now());
 const c=await last.get('/api/v1/admin/csrf');await post(last,'login',c.body.csrfToken,{email:owner.email,password}).expect(401);
 const other=await enroll(),agent=request.agent(app.getHttpServer()),c2=await agent.get('/api/v1/admin/csrf');const l=await post(agent,'login',c2.body.csrfToken,{email:other.email,password}).expect(201);
 await db.query("UPDATE admin_session SET sess=jsonb_set(sess::jsonb,'{adminChallenge,expires}','0')::json WHERE sess->'adminChallenge'->>'userId'=$1",[other.id]);
 await post(agent,'mfa',l.body.csrfToken,{code:totp(other.secret,Math.floor(Date.now()/30000)+1)}).expect(401);await agent.get('/api/v1/admin/me').expect(401);
});


test('technical maintenance really purges expired notifications and records success without business-history deletion',async()=>{
 const a=await account();
 await db.query("UPDATE notification SET created_at=now()-interval '100 days' WHERE user_id=$1",[a.id]);
 assert.ok((await db.query('SELECT 1 FROM notification WHERE user_id=$1',[a.id])).length);
 const missionCount=(await db.query('SELECT count(*)::int n FROM mission'))[0].n;
 const old=process.env.BUSINESS_HISTORY_RETENTION_DAYS;process.env.BUSINESS_HISTORY_RETENTION_DAYS='1';
 try{
  await request(app.getHttpServer()).post('/api/v1/internal/automation/jobs/maintenance').set('X-InfiMatch-Token',process.env.SERVICE_TOKEN!).expect(201);
  assert.equal((await db.query('SELECT 1 FROM notification WHERE user_id=$1',[a.id])).length,0);
  assert.equal((await db.query('SELECT count(*)::int n FROM mission'))[0].n,missionCount);
  assert.equal((await db.query("SELECT state FROM operational_check WHERE service='retention-maintenance' ORDER BY checked_at DESC LIMIT 1"))[0].state,'completed');
  assert.ok((await db.query("SELECT 1 FROM audit WHERE event='RETENTION_PURGED'")).length);
 }finally{if(old===undefined)delete process.env.BUSINESS_HISTORY_RETENTION_DAYS;else process.env.BUSINESS_HISTORY_RETENTION_DAYS=old;}
});


test('invitation guidance offers admin password creation for existing and dedicated accounts without mutation',async()=>{
 const existing=await account(),invitation=randomBytes(32).toString('hex');
 await db.query("INSERT INTO platform_admin(user_id,role,invitation_hash,invitation_expires_at) VALUES($1,'SUPPORT',$2,now()+interval '1 hour')",[existing.id,hashInvitation(invitation)]);
 const email=randomUUID()+'@example.invalid',newInvitation=randomBytes(32).toString('hex');
 const [dedicated]=await db.query("INSERT INTO account(email,password_hash,family,terms_version,platform_only) VALUES($1,'ADMIN_ACTIVATION_PENDING','ENTERPRISE','ADMIN_INVITATION',true) RETURNING id",[email]);
 await db.query("INSERT INTO platform_admin(user_id,role,invitation_hash,invitation_expires_at) VALUES($1,'SUPPORT',$2,now()+interval '1 hour')",[dedicated.id,hashInvitation(newInvitation)]);
 const agent=request.agent(app.getHttpServer()),c=await agent.get('/api/v1/admin/csrf');
 const input={email:existing.email,invitation};
 await agent.post('/api/v1/admin/invitation/check').set('Origin',origin).send(input).expect(403);
 const snapshot=()=>db.query('SELECT a.password_hash,a.session_version,p.invitation_hash,p.version,p.totp_secret FROM account a JOIN platform_admin p ON p.user_id=a.id WHERE a.id=ANY($1::uuid[]) ORDER BY a.id',[[existing.id,dedicated.id]]);
 const before=await snapshot();
 for(let i=0;i<2;i++){
  const r=await post(agent,'invitation/check',c.body.csrfToken,input).expect(201);assert.deepEqual(r.body,{passwordSetupRequired:true});assert.match(r.headers['cache-control']||'',/no-store/);
  assert.deepEqual((await post(agent,'invitation/check',c.body.csrfToken,{email,invitation:newInvitation}).expect(201)).body,{passwordSetupRequired:true});
 }
 assert.deepEqual(await snapshot(),before);await agent.get('/api/v1/admin/me').expect(401);
 await post(agent,'mfa',c.body.csrfToken,{code:'123456'}).expect(401);
 await post(agent,'login',c.body.csrfToken,{...input,password:'wrong-fixture-password'}).expect(401);
 assert.deepEqual(await snapshot(),before);
 const login=await post(agent,'login',c.body.csrfToken,{...input,password}).expect(201);assert.equal(login.body.status,'MFA_ENROLLMENT_REQUIRED');
 await agent.get('/api/v1/admin/overview').expect(401);
 await post(agent,'mfa',login.body.csrfToken,{code:totp(login.body.secret,Math.floor(Date.now()/30000))}).expect(201);
 await agent.get('/api/v1/admin/overview').expect(200);
});

test('invitation guidance rejects unknown, expired, consumed, suspended and locked invitations uniformly',async()=>{
 const existing=await account(),invitation=randomBytes(32).toString('hex');
 await db.query("INSERT INTO platform_admin(user_id,role,invitation_hash,invitation_expires_at) VALUES($1,'SUPPORT',$2,now()+interval '1 hour')",[existing.id,hashInvitation(invitation)]);
 const agent=request.agent(app.getHttpServer()),c=await agent.get('/api/v1/admin/csrf');
 const check=(body:object)=>post(agent,'invitation/check',c.body.csrfToken,body);
 const input={email:existing.email,invitation};
 const publicError=(body:any)=>{assert.equal(typeof body.requestId,'string');const {requestId,...rest}=body;return rest;};
 const unknown=await check({email:randomUUID()+'@example.invalid',invitation}).expect(401);
 assert.deepEqual(publicError((await check({...input,invitation:'x'.repeat(64)}).expect(401)).body),publicError(unknown.body));
 for(const change of ["invitation_expires_at=now()-interval '1 second'","invitation_hash=NULL","active=false","locked_until=now()+interval '15 minutes'"]){
  await db.query("UPDATE platform_admin SET invitation_hash=$2,invitation_expires_at=now()+interval '1 hour',active=true,locked_until=NULL WHERE user_id=$1",[existing.id,hashInvitation(invitation)]);
  await db.query('UPDATE platform_admin SET '+change+' WHERE user_id=$1',[existing.id]);assert.deepEqual(publicError((await check(input).expect(401)).body),publicError(unknown.body));
 }
 await db.query("UPDATE platform_admin SET locked_until=NULL WHERE user_id=$1",[existing.id]);await db.query('UPDATE account SET active=false WHERE id=$1',[existing.id]);
 assert.deepEqual(publicError((await check(input).expect(401)).body),publicError(unknown.body));
 await check({email:existing.email}).expect(400);await check({...input,invitation:'short'}).expect(400);
 await check({...input,passwordSetupRequired:true}).expect(400);
});


test('owner invitation creates a dedicated account, renews, activates with MFA and deletes it',async()=>{
 const owner=await enroll(),email=randomUUID()+'@example.invalid';
 const issued=await post(owner.agent,'access/invite',owner.csrf,{email,role:'SUPPORT',reason:'Invite fictional secondary admin'}).expect(201);
 const [a]=await db.query('SELECT id,platform_only,password_hash FROM account WHERE email=$1',[email]);
 assert.equal(a.platform_only,true);assert.equal(a.password_hash,'ADMIN_ACTIVATION_PENDING');
 const agent=request.agent(app.getHttpServer()),c=await agent.get('/api/v1/admin/csrf');
 const oldInput={email,invitation:issued.body.invitation};
 assert.equal((await post(agent,'invitation/check',c.body.csrfToken,oldInput).expect(201)).body.passwordSetupRequired,true);
 await post(owner.agent,'access/invite',owner.csrf,{email:email.toUpperCase(),role:'OPS',reason:'Duplicate invitation rejected'}).expect(409);
 const renewed=await post(owner.agent,'access/'+a.id+'/invitation',owner.csrf,{reason:'Renew fictional invitation'}).expect(201);
 await post(agent,'invitation/check',c.body.csrfToken,oldInput).expect(401);
 const input={email,invitation:renewed.body.invitation,password};
 const activated=await post(agent,'activate',c.body.csrfToken,input).expect(201);
 await agent.get('/api/v1/admin/me').expect(401);
 const mfa=await post(agent,'mfa',activated.body.csrfToken,{code:totp(activated.body.secret,Math.floor(Date.now()/30000))}).expect(201);
 assert.equal(mfa.body.recoveryCodes.length,8);
 assert.equal((await agent.get('/api/v1/admin/me').expect(200)).body.role,'SUPPORT');
 await post(owner.agent,'access/'+a.id+'/invitation',owner.csrf,{reason:'Activated invitation cannot renew'}).expect(409);
 await post(owner.agent,'access/'+a.id+'/delete',owner.csrf,{reason:'Remove fictional secondary admin'}).expect(201);
 await agent.get('/api/v1/admin/me').expect(401);
 const [removed]=await db.query('SELECT active,email,password_hash FROM account WHERE id=$1',[a.id]);
 assert.equal(removed.active,false);assert.notEqual(removed.email,email);assert.equal(removed.password_hash,'ADMIN_DELETED');
 assert.equal((await db.query('SELECT 1 FROM platform_admin WHERE user_id=$1',[a.id])).length,0);
 assert.equal((await db.query("SELECT 1 FROM audit WHERE resource_id=$1 AND event='ADMIN_ACCESS_DELETED'",[a.id])).length,1);
 await post(owner.agent,'access/invite',owner.csrf,{email,role:'AUDITOR',reason:'Invite same address again'}).expect(201);
 const [replacement]=await db.query('SELECT id FROM account WHERE email=$1',[email]);assert.notEqual(replacement.id,a.id);
});

test('deletion preserves a business account and invalidates old MFA challenges after reinvitation',async()=>{
 const owner=await enroll(),client=await account(),agent=request.agent(app.getHttpServer());
 const [before]=await db.query('SELECT password_hash FROM account WHERE id=$1',[client.id]);
 const invite=()=>post(owner.agent,'access/invite',owner.csrf,{email:client.email.toUpperCase(),role:'SUPPORT',reason:'Existing client invited as admin'});
 const issued=await invite().expect(201),c=await agent.get('/api/v1/admin/csrf');
 assert.equal((await post(agent,'invitation/check',c.body.csrfToken,{email:client.email,invitation:issued.body.invitation}).expect(201)).body.passwordSetupRequired,true);
 const login=await post(agent,'login',c.body.csrfToken,{email:client.email,password,invitation:issued.body.invitation}).expect(201);
 await post(owner.agent,'access/'+client.id+'/delete',owner.csrf,{reason:'Remove only administrative access'}).expect(201);
 const [after]=await db.query('SELECT active,password_hash,platform_only FROM account WHERE id=$1',[client.id]);
 assert.equal(after.active,true);assert.equal(after.platform_only,false);assert.equal(after.password_hash,before.password_hash);
 assert.equal((await db.query('SELECT 1 FROM profile WHERE user_id=$1',[client.id])).length,1);
 await invite().expect(201);
 await post(agent,'mfa',login.body.csrfToken,{code:totp(login.body.secret,Math.floor(Date.now()/30000))}).expect(res=>assert.ok([401,403].includes(res.status)));
 await agent.get('/api/v1/admin/me').expect(401);
});

test('invitation and deletion require owner permissions, recent authentication and protect the last owner',async()=>{
 const owner=await enroll(),ops=await enroll('OPS'),email=randomUUID()+'@example.invalid';
 await post(ops.agent,'access/invite',ops.csrf,{email,role:'OWNER',reason:'Unauthorized invitation test'}).expect(403);
 await post(ops.agent,'access/'+owner.id+'/delete',ops.csrf,{reason:'Unauthorized deletion test'}).expect(403);
 await post(owner.agent,'access/'+owner.id+'/delete',owner.csrf,{reason:'Own access deletion forbidden'}).expect(409);
 await post(owner.agent,'access/'+randomUUID()+'/delete',owner.csrf,{reason:'Missing admin deletion test'}).expect(404);
 const others=await db.query("UPDATE platform_admin SET role='AUDITOR' WHERE role='OWNER' AND user_id<>$1 RETURNING user_id",[owner.id]);
 // Invoke the protection with a second authenticated owner that is excluded as a usable owner.
 const second=await enroll();await db.query("UPDATE platform_admin SET invitation_hash='pending' WHERE user_id=$1",[second.id]);
 try {await post(second.agent,'access/'+owner.id+'/delete',second.csrf,{reason:'Last usable owner protected'}).expect(409);}
 finally {await db.query("UPDATE platform_admin SET invitation_hash=NULL WHERE user_id=$1",[second.id]);await db.query("UPDATE platform_admin SET role='OWNER' WHERE user_id=ANY($1::uuid[])",[others.map(a=>a.user_id)]);}
 await db.query("UPDATE admin_session SET sess=jsonb_set(sess::jsonb,'{adminVerifiedAt}',to_jsonb($2::bigint))::json WHERE sess->>'adminId'=$1",[owner.id,Date.now()-6*60000]);
 await post(owner.agent,'access/'+ops.id+'/delete',owner.csrf,{reason:'Stale authentication deletion test'}).expect(403);
 assert.equal((await db.query('SELECT 1 FROM platform_admin WHERE user_id=$1',[ops.id])).length,1);
});


test('pending owner invitations can be deleted and inactive accounts cannot be invited',async()=>{
 const owner=await enroll(),email=randomUUID()+'@example.invalid';
 const others=await db.query("UPDATE platform_admin SET role='AUDITOR' WHERE role='OWNER' AND user_id<>$1 RETURNING user_id",[owner.id]);
 try {
  await post(owner.agent,'access/invite',owner.csrf,{email,role:'OWNER',reason:'Pending owner invitation test'}).expect(201);
  const [pending]=await db.query('SELECT id FROM account WHERE email=$1',[email]);
  await post(owner.agent,'access/'+pending.id+'/delete',owner.csrf,{reason:'Cancel unused owner invitation'}).expect(201);
 } finally {await db.query("UPDATE platform_admin SET role='OWNER' WHERE user_id=ANY($1::uuid[])",[others.map(a=>a.user_id)]);}
 const client=await account();await db.query('UPDATE account SET active=false WHERE id=$1',[client.id]);
 await post(owner.agent,'access/invite',owner.csrf,{email:client.email,role:'SUPPORT',reason:'Inactive account cannot be invited'}).expect(409);
 assert.equal((await db.query('SELECT 1 FROM platform_admin WHERE user_id=$1',[client.id])).length,0);
});


test('invited business account creates an independent admin password and uses it for login and reauthentication',async()=>{
 const owner=await enroll(),client=await account(),adminPassword='Separate-admin-password-123';
 const issued=await post(owner.agent,'access/invite',owner.csrf,{email:client.email,role:'SUPPORT',reason:'Independent admin password test'}).expect(201);
 const agent=request.agent(app.getHttpServer()),c=await agent.get('/api/v1/admin/csrf');
 const [before]=await db.query('SELECT password_hash,session_version FROM account WHERE id=$1',[client.id]);
 const activated=await post(agent,'activate',c.body.csrfToken,{email:client.email,invitation:issued.body.invitation,password:adminPassword}).expect(201);
 const [after]=await db.query('SELECT password_hash,session_version FROM account WHERE id=$1',[client.id]);assert.deepEqual(after,before);
 await client.agent.get('/api/v1/auth/me').expect(200);
 const verified=await post(agent,'mfa',activated.body.csrfToken,{code:totp(activated.body.secret,Math.floor(Date.now()/30000))}).expect(201);
 await post(agent,'reauth',verified.body.csrfToken,{password:adminPassword,code:totp(activated.body.secret,Math.floor(Date.now()/30000)+1)}).expect(201);
 await post(agent,'logout',verified.body.csrfToken,{}).expect(201);
 const next=await agent.get('/api/v1/admin/csrf');
 await post(agent,'login',next.body.csrfToken,{email:client.email,password}).expect(401);
 assert.equal((await post(agent,'login',next.body.csrfToken,{email:client.email,password:adminPassword}).expect(201)).body.status,'MFA_REQUIRED');
});

test('unfinished dedicated enrollment can choose its password again and invalidates the previous challenge',async()=>{
 const owner=await enroll(),email=randomUUID()+'@example.invalid';
 const issued=await post(owner.agent,'access/invite',owner.csrf,{email,role:'SUPPORT',reason:'Resume unfinished activation test'}).expect(201);
 const one=request.agent(app.getHttpServer()),two=request.agent(app.getHttpServer());
 const c1=await one.get('/api/v1/admin/csrf'),c2=await two.get('/api/v1/admin/csrf');
 const input={email,invitation:issued.body.invitation};
 const first=await post(one,'activate',c1.body.csrfToken,{...input,password}).expect(201);
 assert.equal((await post(two,'invitation/check',c2.body.csrfToken,input).expect(201)).body.passwordSetupRequired,true);
 const second=await post(two,'activate',c2.body.csrfToken,{...input,password:'Replacement-admin-password-123'}).expect(201);
 await post(one,'mfa',first.body.csrfToken,{code:totp(first.body.secret,Math.floor(Date.now()/30000))}).expect(res=>assert.ok([401,403].includes(res.status)));
 await post(two,'mfa',second.body.csrfToken,{code:totp(second.body.secret,Math.floor(Date.now()/30000))}).expect(201);
 await post(two,'activate',(await two.get('/api/v1/admin/csrf')).body.csrfToken,{...input,password}).expect(401);
});


test('real browser creates admin passwords from email and invitation against the isolated API',async()=>{
 const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
 const {chromium}=require(path.resolve(process.cwd(),'../frontend/node_modules/playwright'));
 const owner=await enroll(),business=await account(),root=path.resolve(process.cwd(),'../frontend/dist-admin');
 const apiPort=(app.getHttpServer().address() as {port:number}).port;const calls:string[]=[];
 const server=http.createServer(async(req:any,res:any)=>{
  if(req.url.startsWith('/api/')){
   calls.push(req.url);
   const upstream=http.request({hostname:'127.0.0.1',port:apiPort,path:req.url,method:req.method,headers:req.headers},(response:any)=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});
   upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);return;
  }
  try{const file=path.resolve(root,'.'+new URL(req.url,origin).pathname);if(req.url!=='/'&&!file.startsWith(root+path.sep))throw Error('path');const target=req.url==='/'?path.join(root,'index.html'):file;const data=await fs.readFile(target);res.setHeader('Content-Type',target.endsWith('.js')?'text/javascript':target.endsWith('.css')?'text/css':'text/html');res.end(data);}catch{res.writeHead(404);res.end();}
 });
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(5174,'127.0.0.1',resolve);});
 let browser:any;
 try{
  browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
  for(const email of [randomUUID()+'@example.invalid',business.email]){
   const issued=await post(owner.agent,'access/invite',owner.csrf,{email,role:'SUPPORT',reason:'Real browser invitation test'}).expect(201);
   const page=await browser.newPage();
   await page.goto(origin+'/#/activation');
   await page.getByRole('heading',{name:'Vérifier votre invitation',exact:true}).waitFor();
   await page.getByLabel('Adresse e-mail',{exact:true}).fill(email);
   await page.getByLabel('Code d’invitation administrateur',{exact:true}).fill(issued.body.invitation);
   await page.getByRole('button',{name:'Vérifier mon invitation',exact:true}).click();
   await page.getByRole('heading',{name:'Créer votre mot de passe',exact:true}).waitFor();
   await page.getByLabel('Nouveau mot de passe (12 caractères minimum)',{exact:true}).fill('Browser-admin-password-123');
   await page.getByLabel('Confirmer le nouveau mot de passe',{exact:true}).fill('Mismatch-password-123');
   await page.getByRole('button',{name:'Créer mon mot de passe',exact:true}).click();
   await page.getByText('Les deux mots de passe doivent être identiques.',{exact:true}).waitFor();
   await page.getByLabel('Confirmer le nouveau mot de passe',{exact:true}).fill('Browser-admin-password-123');
   await page.getByRole('button',{name:'Créer mon mot de passe',exact:true}).click();
   await page.getByRole('heading',{name:'Configurer la double authentification',exact:true}).waitFor();
   await page.getByText('Je ne peux pas scanner le QR code',{exact:true}).click();
   const secret=await page.getByLabel('Clé de configuration confidentielle',{exact:true}).inputValue();
   await page.getByLabel('Code de sécurité',{exact:true}).fill(totp(secret,Math.floor(Date.now()/30000)));
   await page.getByRole('button',{name:'Vérifier',exact:true}).click();
   await page.getByLabel('J’ai conservé mes codes dans un endroit sûr.',{exact:true}).check();
   await page.getByRole('button',{name:'Accéder à l’administration',exact:true}).click();
   await page.getByRole('heading',{name:'Vue d’ensemble',exact:true}).waitFor();
   await page.close();
  }
  assert.equal(calls.filter(p=>p==='/api/v1/admin/activate').length,2);
  assert.equal(calls.filter(p=>p==='/api/v1/admin/login').length,0);
 }finally{await browser?.close();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});


test('SEC17 isolated drill: failed event alert, containment, incident diagnosis, recovery and audit',async()=>{
 const owner=await enroll();
 const [event]=await db.query("INSERT INTO outbox(event,payload,attempts,last_error) VALUES('AuditDrill','{}',1,'FICTIONAL_PROVIDER_UNAVAILABLE') RETURNING id");
 const [before]=await db.query("SELECT enabled FROM source_control WHERE provider='JOBSPIPE'");
 let incidentId:string|undefined;
 try {
 const detected=await owner.agent.get('/api/v1/admin/overview').expect(200);
 assert.ok(detected.body.alerts.some((alert:any)=>alert.kind==='automation'));
 assert.ok(detected.body.counts.failedEvents>=1);
 const incident=await post(owner.agent,'incidents',owner.csrf,{service:'IMPORTS',impact:'EXERCICE ISOLE : automatisation fictive en echec, aucun usager concerne',ownerLabel:'Operateur de recette fictif',reason:'Alerte automation detectee sur la vue admin; collecte des preuves et confinement'}).expect(201);incidentId=incident.body.id;
 await post(owner.agent,'operations/sources/JOBSPIPE/state',owner.csrf,{enabled:false,reason:'EXERCICE : confinement temporaire de la source fictive'}).expect(201);
 assert.equal((await app.get(RefreshService).run('JOBSPIPE')).status,'PAUSED');
 await post(owner.agent,'incidents/'+incidentId,owner.csrf,{state:'INVESTIGATING',reason:'Diagnostic : indisponibilite fournisseur simulee; aucune perte ni fuite de donnees, aucune notification externe'}).expect(201);
 // Simulate restored provider processing of this one fictional event, never discard a real failure.
 await db.query("UPDATE outbox SET completed_at=now(),last_error=NULL WHERE id=$1 AND event='AuditDrill'",[event.id]);
 await post(owner.agent,'operations/sources/JOBSPIPE/state',owner.csrf,{enabled:before.enabled,reason:'EXERCICE : retour a la configuration initiale apres reprise'}).expect(201);
 const recovered=await owner.agent.get('/api/v1/admin/overview').expect(200);
 assert.equal(recovered.body.counts.failedEvents,detected.body.counts.failedEvents-1);
 if(recovered.body.counts.failedEvents===0)assert.equal(recovered.body.alerts.some((alert:any)=>alert.kind==='automation'),false);
 await post(owner.agent,'incidents/'+incidentId,owner.csrf,{state:'RESOLVED',reason:'Reprise verifiee : evenement fictif termine, alerte retiree si aucune autre panne, configuration restauree; compte rendu de recette conserve'}).expect(201);
 const traces=await db.query('SELECT event,details FROM audit WHERE resource_id=$1 ORDER BY created_at,id',[incidentId]);
 assert.equal(traces.length,3);assert.equal(traces.filter((t:any)=>t.event==='ADMIN_INCIDENT_OPENED').length,1);
 assert.deepEqual(traces.filter((t:any)=>t.event==='ADMIN_INCIDENT_UPDATED').map((t:any)=>t.details.state).sort(),['INVESTIGATING','RESOLVED']);
 console.log('SEC17_DRILL '+JSON.stringify({detected:true,contained:true,diagnosed:true,recovered:true,auditTraces:3,externalMessages:0,productionModified:false}));
 }finally{await db.query("UPDATE source_control SET enabled=$1 WHERE provider='JOBSPIPE'",[before.enabled]);await db.query("DELETE FROM outbox WHERE id=$1 AND event='AuditDrill'",[event.id]);}
});
