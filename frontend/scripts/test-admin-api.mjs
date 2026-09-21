import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdtemp, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
const folder=await mkdtemp(join(tmpdir(),'infimatch-admin-api-'));
await writeFile(join(folder,'api.mjs'),ts.transpileModule(await readFile(new URL('../src/admin/api.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
let serial=0;
const load=()=>import(pathToFileURL(join(folder,'api.mjs')).href+'?case='+serial++);
const previousFetch=globalThis.fetch,previousWindow=globalThis.window;
globalThis.window=new EventTarget();
test.after(async()=>{globalThis.fetch=previousFetch;globalThis.window=previousWindow;await rm(folder,{recursive:true,force:true});});
test('Malformed admin CSRF prevents mutation',async()=>{
 for(const body of ['null','[]','{}','{"csrfToken":42}','<html>error</html>']){
  let calls=0;globalThis.fetch=async()=>{calls++;return new Response(body);};
  const {api}=await load();await assert.rejects(api('/accounts/example/state',{active:false}),e=>e.code==='INVALID_RESPONSE');assert.equal(calls,1);
 }
});
test('Unconfirmed admin mutation is not retried and server details remain private',async()=>{
 for(const [status,body] of [[200,'null'],[200,'[]'],[200,'"ok"'],[200,'<html>error</html>'],[503,'{"message":"PRIVATE_DATABASE_DETAILS"}']]){
  const {api}=await load();let writes=0;
  globalThis.fetch=async(url)=>{if(url.endsWith('/csrf'))return Response.json({csrfToken:'fixture'});writes++;return new Response(body,{status});};
  await assert.rejects(api('/accounts/example/state',{active:false}),e=>e.status===status&&!e.message.includes('PRIVATE_DATABASE_DETAILS'));
  assert.equal(writes,1);
 }
});
test('Admin session expiry stays observable with a malformed error body',async()=>{
 const {api}=await load();let expired=0;const listener=()=>expired++;window.addEventListener('admin-session-expired',listener);
 globalThis.fetch=async()=>new Response('null',{status:401});
 try{await assert.rejects(api('/me'),e=>e.status===401);assert.equal(expired,1);}finally{window.removeEventListener('admin-session-expired',listener);}
});
