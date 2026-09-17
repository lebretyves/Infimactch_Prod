import {request} from 'playwright';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const origin=process.env.E2E_BASE_URL||'http://127.0.0.1:5173';
const client=await request.newContext({baseURL:origin});
const email='raccordement-'+randomUUID()+'@example.invalid',password='Demo-'+randomUUID();
const checks=[];
async function write(method,path,body){const csrf=await client.get('/api/v1/auth/csrf');assert.equal(csrf.status(),200);const {csrfToken}=await csrf.json();return client.fetch('/api/v1'+path,{method,headers:{Origin:origin,'X-CSRF-Token':csrfToken},data:body});}
const profile={displayName:'Camille',qualifications:['IDE'],skills:['TRIAGE'],experience:[{service:'URGENCES',establishment:'Établissement fictif',start:'2020-01-01T00:00:00Z',end:'2021-01-01T00:00:00Z'}],available:[],unavailable:[],latitude:null,longitude:null,radiusKm:30,acceptedShifts:['DAY'],preferredShifts:[],visible:true,details:{firstName:'Camille',lastName:'Test',birthDate:'1990-02-03',phone:'0600000000',address:'1 rue fictive',postalCode:'75001',city:'Paris',diploma:'Diplôme fictif',diplomaYear:2015,transport:'Transports en commun'}};
try{
 const reg=await write('POST','/auth/register',{email,password,family:'NURSE',termsVersion:'2026-09-14',profile,rppsNumber:'10000000001'});assert.equal(reg.status(),201,await reg.text());
 const read=async()=>{const r=await client.get('/api/v1/profile');assert.equal(r.status(),200);return r.json();};
 let p=await read();assert.deepEqual(p.details,profile.details);assert.deepEqual(p.experience,profile.experience);assert.deepEqual(p.qualifications,['IDE']);assert.equal(p.rpps_number,'10000000001');assert.equal(p.rpps_status,'NOT_CHECKED');checks.push('signup_profile_atomic_all_fields');
 for(let i=1;i<=3;i++){
   profile.skills=i===2?['TRIAGE','PERFUSION']:['TRIAGE'];profile.available=[{start:`2026-11-${String(10+i).padStart(2,'0')}T23:00:00Z`,end:`2026-11-${String(11+i).padStart(2,'0')}T23:00:00Z`}];profile.acceptedShifts=i===2?['NIGHT']:['DAY','NIGHT','MIXED'];
   const result=await write('PUT','/profile',profile);assert.equal(result.status(),200,await result.text());
   for(let j=0;j<2;j++){p=await read();assert.deepEqual(p.details,profile.details);assert.deepEqual(p.available,profile.available);assert.deepEqual(p.skills,profile.skills);assert.deepEqual(p.accepted_shifts,profile.acceptedShifts);assert.equal(p.latitude,null);}
   const logout=await write('POST','/auth/logout',{});assert.equal(logout.status(),201);
   const login=await write('POST','/auth/login',{email,password});assert.equal(login.status(),201,await login.text());p=await read();assert.deepEqual(p.details,profile.details);checks.push('save_reload_relogin_round_'+i);
 }
 const locked=await write('PUT','/profile',{...profile,details:{...profile.details,lastName:'Modification interdite'}});assert.equal(locked.status(),403);p=await read();assert.deepEqual(p.details,profile.details);checks.push('personal_information_locked_after_signup');
 const invalid=await write('PUT','/profile',{...profile,details:{...profile.details,birthDate:'2026-02-30'}});assert.equal(invalid.status(),400);p=await read();assert.deepEqual(p.details,profile.details);checks.push('invalid_date_rejected_without_data_loss');
 await write('POST','/auth/logout',{});
 await mkdir('docs/proofs',{recursive:true});await writeFile('docs/proofs/profile-persistence.json',JSON.stringify({date:new Date().toISOString(),scope:'Real local API, isolated fictional account, no provider RPPS verification',checks},null,2));console.log(JSON.stringify({checks}));
}finally{await client.dispose();}
