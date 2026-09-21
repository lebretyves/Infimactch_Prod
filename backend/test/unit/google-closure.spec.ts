import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {UnauthorizedException} from '@nestjs/common';
import {PrivacyController} from '../../src/security/privacy.module';
const nonce='a'.repeat(64);
function fixture(options:{linked?:boolean;active?:boolean;version?:number;invalid?:boolean}={}){
 let writes=0,checks=0;
 const query=async(sql:string)=>{
  if(sql.startsWith('SELECT id,active'))return [{id:'owner',active:options.active!==false,session_version:options.version??3}];
  if(sql.includes('FROM google_identity'))return options.linked===false?[]:[{ok:1}];
  if(sql.startsWith('INSERT INTO closure_request')){writes++;return [{id:'closure',status:'REQUESTED'}];}return [];
 };
 const controller=new PrivacyController({query,transaction:async(fn:any)=>fn({query})} as any,{configuration:()=>({enabled:true}),verifyIdentity:async()=>{checks++;if(options.invalid)throw new UnauthorizedException();return {subject:'google-owner'};}} as any);
 const req:any={session:{userId:'owner',sessionVersion:3,googleClosureChallenge:{nonce,expires:Date.now()+60000,accountId:'owner'},save:(cb:any)=>cb()}};
 return {controller,req,body:{credential:'signed-token',nonce,confirmed:true},writes:()=>writes,checks:()=>checks};
}
test('linked Google identity can request closure without password; replay fails',async()=>{
 const f=fixture();assert.equal((await f.controller.requestGoogle(f.req,f.body)).status,'REQUESTED');assert.equal(f.writes(),1);assert.equal(f.req.session.googleClosureChallenge,undefined);
 await assert.rejects(f.controller.requestGoogle(f.req,f.body));assert.equal(f.writes(),1);assert.equal(f.checks(),1);
});
for(const variant of ['expired','nonce','account','consent','missing'])test('rejects '+variant+' challenge',async()=>{
 const f=fixture();if(variant==='expired')f.req.session.googleClosureChallenge.expires=0;if(variant==='nonce')f.body.nonce='b'.repeat(64);if(variant==='account')f.req.session.googleClosureChallenge.accountId='other';if(variant==='consent')f.body.confirmed=false;if(variant==='missing')delete f.req.session.googleClosureChallenge;
 await assert.rejects(f.controller.requestGoogle(f.req,f.body));assert.equal(f.writes(),0);assert.equal(f.checks(),0);
});
for(const options of [{linked:false},{active:false},{version:4},{invalid:true}])test('rejects invalid identity/account '+JSON.stringify(options),async()=>{const f=fixture(options);await assert.rejects(f.controller.requestGoogle(f.req,f.body));assert.equal(f.writes(),0);});
test('challenge is random and bound to the current account',async()=>{const f=fixture();const result=await f.controller.challenge(f.req);assert.match(result.nonce,/^[a-f0-9]{64}$/);assert.notEqual(result.nonce,nonce);assert.equal(f.req.session.googleClosureChallenge.accountId,'owner');});
