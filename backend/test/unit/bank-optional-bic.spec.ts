import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ValidationPipe} from '@nestjs/common';
import {DocumentsModule} from '../../src/documents/documents.module';
const [Controller]=Reflect.getMetadata('controllers',DocumentsModule);
const pipe=new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true});
const base={iban:'FR1420041010050500013M02606',holder:'Camille Fixture',reviewed:true};
const file={mime:'application/pdf',contentBase64:Buffer.from('%PDF-1.4 fixture').toString('base64')};
async function validate(method:string,body:any){const metatype=Reflect.getMetadata('design:paramtypes',Controller.prototype,method)[2];return pipe.transform(body,{type:'body',metatype});}
test('bank API accepts omitted or empty BIC and normalizes a provided BIC on both endpoints',async()=>{
 for(const method of ['bank','bankDocument'])for(const bic of [undefined,'','  ',' bnpafrppxxx ']){
  const body=await validate(method,{...base,...(method==='bankDocument'?file:{}),...(bic===undefined?{}:{bic})});
  assert.equal(body.bic,bic===undefined?undefined:bic.trim().toUpperCase());
 }
});
test('bank API rejects malformed or non-string provided BIC on both endpoints',async()=>{
 for(const method of ['bank','bankDocument'])for(const bic of ['INVALID','BNPAFRPPXXXX',42,null,{}])
  await assert.rejects(validate(method,{...base,...(method==='bankDocument'?file:{}),bic}),(e:any)=>e.getStatus()===400);
});
test('optional BIC does not relax IBAN checksum, holder or explicit review requirements',async()=>{
 for(const patch of [{iban:'FR1420041010050500013M02607'},{holder:'A'},{reviewed:false}])
  await assert.rejects(validate('bank',{...base,...patch}),(e:any)=>e.getStatus()===400);
});
test('manual and uploaded RIB persist an empty BIC without inventing one',async()=>{
 const stored:any[]=[];
 const db={transaction:async(fn:any)=>fn({query:async()=>[{user_id:'nurse'}]})};
 const controller=new Controller(db,{store:async(...args:any[])=>{stored.push(JSON.parse(args[3].toString()));return {id:'document',status:'READY'};}});
 for(const method of ['bank','bankDocument']){
  const body=await validate(method,{...base,...(method==='bankDocument'?file:{})});
  await controller[method]({session:{userId:'nurse'}},'key',body);
 }
 assert.equal(stored.length,2);for(const document of stored){assert.equal(document.details.bic,'');assert.equal(document.details.iban,base.iban);}
 assert.equal(stored[1].file.mime,'application/pdf');
});
