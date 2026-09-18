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
beforeEach(async()=>{const u=new URL(process.env.DATABASE_URL!);if(process.env.NODE_ENV!=='test'||u.hostname!=='127.0.0.1'||u.port!=='55433'||u.pathname!=='/infimatch_test')throw Error('Isolated test database required');process.env.ADMIN_ORIGIN=origin;app=await createApp();await app.listen(0,'127.0.0.1');db=app.get(Database);});
afterEach(async()=>{await app?.close();});
async function account(family="NURSE"){const agent=request.agent(app.getHttpServer()),email=randomUUID()+'@example.invalid';const csrf=await agent.get('/api/v1/auth/csrf');const r=await agent.post('/api/v1/auth/register').set('Origin',process.env.APP_ORIGIN!).set('X-CSRF-Token',csrf.body.csrfToken).set('Idempotency-Key',randomUUID()).send({email,password,family,termsVersion:'2026-09-14',...(family==='ENTERPRISE'?{organizationType:'ESTABLISHMENT',name:'Organisation FICTIVE',address:'1 rue fictive Paris',referent:'Contact fictif',finess:'000000001'}:{})}).expect(201);return {agent,email,id:r.body.user.id};}
function post(agent:ReturnType<typeof request.agent>,path:string,csrf:string,body:object){return agent.post('/api/v1/admin/'+path).set('Origin',origin).set('X-CSRF-Token',csrf).send(body);}
async function enroll(role='OWNER'){const a=await account(),invitation=randomBytes(32).toString('hex');await db.query("INSERT INTO platform_admin(user_id,role,invitation_hash,invitation_expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",[a.id,role,hashInvitation(invitation)]);const agent=request.agent(app.getHttpServer()),c=await agent.get('/api/v1/admin/csrf').expect(200);const login=await post(agent,'login',c.body.csrfToken,{email:a.email,password,invitation}).expect(201);assert.equal(login.body.status,'AUTHENTICATED');assert.equal(login.body.otpauthUri,undefined);return {...a,agent,csrf:login.body.csrfToken};}
test('admin routes require authorized access and separate session, with origin isolation',async()=>{const client=await account();await client.agent.get('/api/v1/admin/overview').expect(401);const c=await client.agent.get('/api/v1/admin/csrf');await post(client.agent,'login',c.body.csrfToken,{email:client.email,password}).expect(401);const owner=await enroll();const me=await owner.agent.get('/api/v1/admin/me').expect(200);assert.equal(me.body.role,'OWNER');await owner.agent.get('/api/v1/auth/me').expect(401);await owner.agent.get('/api/v1/admin/overview').expect(200);await post(owner.agent,'accounts/'+client.id+'/state',owner.csrf,{active:false,reason:'Test isolated suspension'}).set('Origin',process.env.APP_ORIGIN!).expect(403);await post(owner.agent,'reauth',owner.csrf,{password:'incorrect-password-123'}).expect(401);});
test('admin permissions, suspension and session revocation are enforced server side',async()=>{const owner=await enroll(),ops=await enroll('OPS'),client=await account();await ops.agent.get('/api/v1/admin/accounts').expect(403);await ops.agent.get('/api/v1/admin/jobs').expect(200);await post(ops.agent,'accounts/'+client.id+'/state',ops.csrf,{active:false,reason:'Forbidden suspension'}).expect(403);await post(owner.agent,'accounts/'+client.id+'/state',owner.csrf,{active:false,reason:'Isolated suspension test'}).expect(201);await client.agent.get('/api/v1/auth/me').expect(401);await post(owner.agent,'access/'+ops.id,owner.csrf,{active:false,role:'OPS',reason:'Isolated revoke access'}).expect(201);await ops.agent.get('/api/v1/admin/jobs').expect(401);});
test('admin read endpoints expose bounded selected fields and no credentials',async()=>{const owner=await enroll();for(const path of ['accounts','organizations','missions','jobs','sources','infrastructure','audit','access','quality','backups']){const r=await owner.agent.get('/api/v1/admin/'+path).expect(200);assert.doesNotMatch(JSON.stringify(r.body),/password_hash|totp_secret|invitation_hash|postgresql:\/\//);}await owner.agent.get('/api/v1/admin/accounts?limit=1000').expect(400);});

test('last usable owner cannot be removed and sensitive actions require recent password confirmation',async()=>{
 const owner=await enroll();const others=await db.query("UPDATE platform_admin SET role='AUDITOR' WHERE role='OWNER' AND user_id<>$1 RETURNING user_id",[owner.id]);
 try {await post(owner.agent,'access/'+owner.id,owner.csrf,{active:false,role:'OWNER',reason:'Last owner rejection test'}).expect(409);} finally {await db.query("UPDATE platform_admin SET role='OWNER' WHERE user_id=ANY($1::uuid[])",[others.map(a=>a.user_id)]);}
 await db.query("UPDATE admin_session SET sess=jsonb_set(sess::jsonb,'{adminVerifiedAt}',to_jsonb($2::bigint))::json WHERE sess->>'adminId'=$1",[owner.id,Date.now()-6*60000]);
 const client=await account();const denied=await post(owner.agent,'accounts/'+client.id+'/revoke',owner.csrf,{reason:'Recent password confirmation required test'}).expect(403);assert.equal(denied.body.code,'ADMIN_REAUTH_REQUIRED');
 await post(owner.agent,'reauth',owner.csrf,{password}).expect(201);await post(owner.agent,'accounts/'+client.id+'/revoke',owner.csrf,{reason:'Recent password confirmation accepted test'}).expect(201);
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
 await post(owner.agent,'incidents/'+incident.body.id,owner.csrf,{state:'RESOLVED',reason:'Fictional service recovered'}).expect(201);
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
 assert.equal(activated.body.status,'AUTHENTICATED');
 await agent.get('/api/v1/admin/overview').expect(200);
 await post(agent,'activate',activated.body.csrfToken,{email,password,invitation}).expect(401);
 assert.equal((await agent.get('/api/v1/admin/me').expect(200)).body.role,'OWNER');
 await agent.get('/api/v1/auth/me').expect(401);
 const client=request.agent(app.getHttpServer()),csrf=await client.get('/api/v1/auth/csrf');
 await client.post('/api/v1/auth/login').set('Origin',process.env.APP_ORIGIN!).set('X-CSRF-Token',csrf.body.csrfToken).send({email,password}).expect(401);
 assert.equal((await db.query('SELECT 1 FROM membership WHERE user_id=$1',[a.id])).length,0);
 assert.equal((await db.query('SELECT 1 FROM profile WHERE user_id=$1',[a.id])).length,0);
});


test('activated dedicated administrator signs in with password alone and can reconnect after idle expiration',async()=>{
 const owner=await enroll();await db.query("UPDATE account SET platform_only=true,terms_version='ADMIN_ACTIVATED' WHERE id=$1",[owner.id]);
 await db.query("UPDATE admin_session SET sess=jsonb_set(sess::jsonb,'{adminActivityAt}','0'::jsonb)::json WHERE sess->>'adminId'=$1",[owner.id]);
 await owner.agent.get('/api/v1/admin/overview').expect(401);
 const csrf=await owner.agent.get('/api/v1/admin/csrf');
 const login=await post(owner.agent,'login',csrf.body.csrfToken,{email:owner.email,password}).expect(201);assert.equal(login.body.status,'AUTHENTICATED');
 await owner.agent.get('/api/v1/admin/overview').expect(200);
 await post(owner.agent,'mfa',login.body.csrfToken,{code:'000000'}).expect(404);
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
