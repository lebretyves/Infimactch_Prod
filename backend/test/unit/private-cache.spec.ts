import {test} from 'node:test';
import assert from 'node:assert/strict';
import {preventApiCaching} from '../../src/common/private-cache';
test('all API routes including unauthorized and malformed requests prohibit browser and CDN storage',()=>{
 for(const path of ['/api/v1/profile','/api/v1/auth/me','/api/v1/admin/me','/api/v1/me/documents','/api/v1/unknown','/api/v1/listings/external']){
  const headers:Record<string,string>={};let next=false;
  preventApiCaching({path} as any,{setHeader:(k:string,v:string)=>{headers[k]=v;}} as any,()=>{next=true;});
  assert.equal(next,true);for(const name of ['Cache-Control','CDN-Cache-Control','Vercel-CDN-Cache-Control'])assert.equal(headers[name],'no-store');
 }
});
test('non-API assets do not receive a blanket no-store directive',()=>{
 const headers:Record<string,string>={};preventApiCaching({path:'/assets/icon.png'} as any,{setHeader:(k:string,v:string)=>{headers[k]=v;}} as any,()=>{});assert.deepEqual(headers,{});
});
