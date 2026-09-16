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
 const reg=await (await call('/auth/register','POST',{email,password:randomBytes(24).toString('hex'),family:'NURSE',termsVersion:'2026-09-14'},201)).json();actor=reg.user.id;csrf=reg.csrfToken;console.log('Registration and secure session PASS');
 await call('/auth/me');
 await call('/profile','PUT',{displayName:'Recette FICTIVE production',qualifications:['IDE'],skills:[],experience:[],available:[],unavailable:[],latitude:48.85,longitude:2.35,radiusKm:30,acceptedShifts:['DAY'],preferredShifts:[],visible:false});
 assert.equal((await (await call('/profile')).json()).display_name,'Recette FICTIVE production');console.log('Profile update and persistence PASS');
 const content=Buffer.from('%PDF-1.4\n% FICTITIOUS InfiMatch deployment test\n%%EOF\n');
 const doc=await (await call('/me/documents','POST',{mime:'application/pdf',contentBase64:content.toString('base64'),fictional:true},201)).json();
 const downloaded=Buffer.from(await (await call('/me/documents/'+doc.id)).arrayBuffer());assert.deepEqual(downloaded,content);console.log('Encrypted document upload and download PASS');
 const notices=await (await call('/me/notifications')).json();assert.ok(JSON.stringify(notices).includes('WELCOME'));console.log('Welcome notification PASS');
 const settings=await (await call('/me/notifications-settings')).json();assert.equal(settings.configured,true);console.log('Discord relay configuration PASS');
 const saved=csrf;csrf='invalid';await call('/profile','PUT',{},403);csrf=saved;console.log('CSRF rejection PASS');
 await call('/internal/automation/jobs/dispatch','POST',{},401);console.log('Internal route protection PASS');
}catch(e){console.error('Production verification failed: '+e.message);process.exitCode=1;}finally{
 await withRole('operator',async token=>{const values=(await request('kv/data/infimatch/v1/production',{token})).data.data;const u=new URL(values.DATABASE_URL_UNPOOLED);u.searchParams.set('sslmode','verify-full');const db=new Client({connectionString:u.toString()});await db.connect();try{
  await db.query('BEGIN');const rows=(await db.query('SELECT id FROM account WHERE email=$1 FOR UPDATE',[email])).rows;
  if(rows.length){const id=rows[0].id;if(actor)assert.equal(actor,id);assert.ok(email.startsWith('qa-cloud-')&&email.endsWith('@example.invalid'));
   await db.query('DELETE FROM document WHERE owner_id=$1',[id]);await db.query('DELETE FROM notification WHERE user_id=$1',[id]);await db.query('DELETE FROM profile_qualification WHERE nurse_id=$1',[id]);await db.query('DELETE FROM profile WHERE user_id=$1',[id]);await db.query('DELETE FROM idempotency WHERE actor_id=$1',[id]);await db.query('DELETE FROM audit WHERE actor_id=$1',[id]);await db.query("DELETE FROM session WHERE sess->>'userId'=$1",[id]);await db.query('DELETE FROM account WHERE id=$1 AND email=$2',[id,email]);
  }await db.query('COMMIT');console.log('Fictitious verification account and documents cleaned');
 }catch(e){await db.query('ROLLBACK');console.error('Test cleanup failed: '+(e.code||e.name));process.exitCode=1;}finally{await db.end();}});
}
