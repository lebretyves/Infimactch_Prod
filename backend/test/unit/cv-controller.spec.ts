import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {plainToInstance} from 'class-transformer';
import {validateSync} from 'class-validator';
import {CvController,CvTextDto} from '../../src/profiles/cv.controller';
import {Database} from '../../src/database/database';
test('CV DTO bounds extracted text and refuses arbitrary profile fields',()=>{
 const errors=(b:any)=>validateSync(plainToInstance(CvTextDto,b),{whitelist:true,forbidNonWhitelisted:true});
 assert.equal(errors({text:'Experience fictive'}).length,0);assert.ok(errors({text:''}).length);assert.ok(errors({text:'x'.repeat(60001)}).length);assert.ok(errors({text:'CV',details:{firstName:'Change'}}).length);
});
test('CV analysis requires a nurse profile and never writes the CV or profile',async()=>{
 const sql:string[]=[];let allowed=true;const db={transaction:async(fn:any)=>fn({query:async(q:string)=>{sql.push(q);return allowed?[{user_id:'fixture'}]:[];}})} as unknown as Database;
 const c=new CvController(db);const r=await c.parse({session:{userId:'fixture'}} as any,{text:'Experiences\n2020 - 2021 | CHU Exemple | Cardiologie'});assert.equal(r.experiences.length,1);assert.ok(sql.every(q=>q.startsWith('SELECT')));allowed=false;await assert.rejects(c.parse({session:{userId:'other'}} as any,{text:'CV'}));
});
