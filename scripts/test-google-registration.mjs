import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { withRole, request, validateSecrets } from './vault/common.mjs';
const require=createRequire(import.meta.url);require('reflect-metadata');
const {Client}=require('pg');const {AuthService}=require('../backend/dist/auth/auth.module');const {GoogleAuth}=require('../backend/dist/auth/google');
const values=await withRole('backend',async token=>validateSecrets((await request('kv/data/infimatch/v1/backend',{token})).data.data,'backend'));
const client=new Client({connectionString:values.DATABASE_URL});const checks=[];
const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name)};
const count=async()=> (await client.query('SELECT (SELECT count(*) FROM account)::int accounts,(SELECT count(*) FROM google_identity)::int identities,(SELECT count(*) FROM profile)::int profiles,(SELECT count(*) FROM organization)::int organizations')).rows[0];
const db={query:async(sql,args)=>(await client.query(sql,args)).rows,transaction:async fn=>{await client.query('SAVEPOINT signup_case');try{const result=await fn({query:async(sql,args)=>(await client.query(sql,args)).rows});await client.query('RELEASE SAVEPOINT signup_case');return result}catch(e){await client.query('ROLLBACK TO SAVEPOINT signup_case');throw e}}};
try{
 await client.connect();const before=await count();await client.query('BEGIN');
 const service=new AuthService(db);const key=randomUUID();
 const identity={subject:'test-rollback-'+key,email:'test-'+key+'@example.invalid'};
 let account;
 await check('Google nurse account, profile and identity persist together inside transaction',async()=>{
  account=await service.registerGoogle({family:'NURSE',termsVersion:'2026-09-14'},identity);
  const row=(await client.query('SELECT a.email,a.password_hash,p.user_id,g.subject FROM account a JOIN profile p ON p.user_id=a.id JOIN google_identity g ON g.account_id=a.id WHERE a.id=$1',[account.id])).rows[0];
  assert.equal(row.email,identity.email);assert.equal(row.subject,identity.subject);assert.match(row.password_hash,/^\$argon2id\$/);
 });
 await check('Duplicate Google registration rolls back completely without duplicate account',async()=>{
  const initial=await count();await assert.rejects(service.registerGoogle({family:'NURSE',termsVersion:'2026-09-14'},identity),e=>e.getResponse().code==='GOOGLE_ACCOUNT_EXISTS');assert.deepEqual(await count(),initial);
 });
 await check('Subject conflict with different email does not leave a partial account',async()=>{
  const initial=await count();await assert.rejects(service.registerGoogle({family:'NURSE',termsVersion:'2026-09-14'},{...identity,email:'other-'+key+'@example.invalid'}));assert.deepEqual(await count(),initial);
 });
 await check('Google agency signup creates organization and membership atomically',async()=>{
  const org=await service.registerGoogle({family:'ENTERPRISE',termsVersion:'2026-09-14',organizationType:'AGENCY',name:'Rollback agency',address:'1 test street',referent:'Test User'},{subject:'org-'+key,email:'org-'+key+'@example.invalid'});
  const rows=(await client.query('SELECT o.kind FROM membership m JOIN organization o ON o.id=m.organization_id WHERE m.user_id=$1',[org.id])).rows;assert.equal(rows[0].kind,'AGENCY');
 });
 await check('Classic password registration and login still work',async()=>{
  const password='Classic-fixture-'+key,email='classic-'+key+'@example.invalid';
  const created=await service.register({family:'NURSE',termsVersion:'2026-09-14',email,password});
  assert.equal((await service.login({email,password})).id,created.id);
 });
 await client.query('ROLLBACK');assert.deepEqual(await count(),before);checks.push('Outer rollback verified: original account/identity/profile/organization counts unchanged');
 await mkdir('docs/proofs/google-registration',{recursive:true});await writeFile('docs/proofs/google-registration/database.json',JSON.stringify({at:new Date().toISOString(),checks,scope:'Real PostgreSQL writes enclosed in an outer rollback; no persisted test accounts or organizations.'},null,2));
}catch(e){await client.query('ROLLBACK').catch(()=>{});console.error(e.message);process.exitCode=1}finally{await client.end()}
