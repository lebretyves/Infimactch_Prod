import {withRole,request} from './common.mjs';
import {Client} from 'pg';
import {randomUUID,randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
const origin='https://infimactch-prod-backend-l5bc.vercel.app';
const email='qa-cloud-'+randomUUID()+'@example.invalid';
let cookie='',csrf='',actor;
async function call(path,method='GET',body,expected=200){
 const r=await fetch(origin+'/api/v1'+path,{method,headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...(body?{'Content-Type':'application/json','Idempotency-Key':randomUUID()}: {})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(45000)});
 for(const c of r.headers.getSetCookie())if(c.startsWith('infimatch.sid=')){assert.match(c,/HttpOnly/i);assert.match(c,/Secure/i);cookie=c.split(';')[0];}
 assert.equal(r.status,expected,path+' status');return r;
}
try{
 csrf=(await (await call('/auth/csrf')).json()).csrfToken;
 const reg=await (await call('/auth/register','POST',{email,password:randomBytes(24).toString('hex'),family:'ENTERPRISE',organizationType:'ESTABLISHMENT',name:'Entreprise FICTIVE recette',address:'1 rue fictive Paris',referent:'Contact fictif',finess:'000000001',termsVersion:'2026-09-14'},201)).json();actor=reg.user.id;csrf=reg.csrfToken;console.log('Registration and secure session PASS');
 const me=await (await call('/auth/me')).json(),org=me.organizations[0].id;
 await call('/organizations');
 const details={start:'2037-03-10T08:00:00Z',end:'2037-03-10T16:00:00Z',qualification:'IDE',service:'URGENCES',shift:'DAY',headcount:1,population:'ADULT',block:'NONE',requiredSkills:[],minExperienceMonths:0,address:'1 rue fictive Paris'};
 const need=await (await call('/staffing-requests','POST',{establishmentId:org,title:'Besoin FICTIF recette',description:'Recette technique fictive',details},201)).json();
 const dashboard=await (await call('/dashboards')).json();assert.equal(dashboard.activity.needs,1);assert.equal(dashboard.recentNeeds[0].id,need.id);console.log('Enterprise dashboard and need persistence PASS');
 const {headcount,...terms}=details;
 const mission=await (await call('/missions','POST',{...terms,establishmentId:org,staffingRequestId:need.id,title:'Offre FICTIVE recette',description:'Recette technique fictive',desiredSkills:[],latitude:48,longitude:2,hourlySalary:25},201)).json();assert.equal(mission.status,'DRAFT');
 const tracked=await (await call('/staffing-requests/'+need.id)).json();assert.equal(tracked.missions[0].id,mission.id);
 const managed=await (await call('/missions/'+mission.id)).json();assert.equal(managed.can_manage,true);assert.equal(managed.agency_id,null);
 await call('/listings/m_'+mission.id,'GET',undefined,404);console.log('Direct offer draft, need tracking and private visibility PASS');
 const saved=csrf;csrf='invalid';await call('/profile','PUT',{},403);csrf=saved;console.log('CSRF rejection PASS');
 await call('/internal/automation/jobs/dispatch','POST',{},401);console.log('Internal route protection PASS');
}catch(e){console.error('Production verification failed: '+e.message);process.exitCode=1;}finally{
 await withRole('operator',async token=>{const values=(await request('kv/data/infimatch/v1/production',{token})).data.data;const u=new URL(values.DATABASE_URL_UNPOOLED);u.searchParams.set('sslmode','verify-full');const db=new Client({connectionString:u.toString()});await db.connect();try{
  await db.query('BEGIN');const rows=(await db.query('SELECT id FROM account WHERE email=$1 FOR UPDATE',[email])).rows;
  if(rows.length){const id=rows[0].id;if(actor)assert.equal(actor,id);assert.ok(email.startsWith('qa-cloud-')&&email.endsWith('@example.invalid'));
   await db.query('DELETE FROM document WHERE owner_id=$1',[id]);await db.query('DELETE FROM notification WHERE user_id=$1',[id]);await db.query('DELETE FROM profile_qualification WHERE nurse_id=$1',[id]);await db.query('DELETE FROM profile WHERE user_id=$1',[id]);await db.query('DELETE FROM idempotency WHERE actor_id=$1',[id]);await db.query('DELETE FROM audit WHERE actor_id=$1',[id]);await db.query("DELETE FROM session WHERE sess->>'userId'=$1",[id]);const orgs=(await db.query('SELECT organization_id FROM membership WHERE user_id=$1',[id])).rows.map(x=>x.organization_id);
   await db.query('DELETE FROM mission WHERE establishment_id=ANY($1::uuid[]) AND agency_id IS NULL AND status=$2',[orgs,'DRAFT']);
   await db.query('DELETE FROM staffing_request WHERE created_by=$1',[id]);await db.query('DELETE FROM membership WHERE user_id=$1',[id]);await db.query('DELETE FROM organization WHERE id=ANY($1::uuid[])',[orgs]);
   await db.query('DELETE FROM account WHERE id=$1 AND email=$2',[id,email]);
  }await db.query('COMMIT');console.log('Fictitious verification account and documents cleaned');
 }catch(e){await db.query('ROLLBACK');console.error('Test cleanup failed: '+(e.code||e.name));process.exitCode=1;}finally{await db.end();}});
}
