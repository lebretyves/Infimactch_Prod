import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {supportText,supportOffset} from '../../src/support/support.service';
import {AdminSupportController} from '../../src/support/support.module';
import {SupportService} from '../../src/support/support.service';
test('support validates bounds and keeps script-like descriptions as inert plain text',()=>{assert.equal(supportText(' <script>alert(1)</script> ',10,4000),'<script>alert(1)</script>');for(const value of ['',null,'x'.repeat(4001),'ab\u0000cd'])assert.throws(()=>supportText(value,10,4000));for(const offset of ['-1','1.5','100001','x'])assert.throws(()=>supportOffset(offset));assert.equal(supportOffset('20'),20);});
test('support admin controls deny OPS/AUDITOR and require recent confirmation for responses',()=>{const service={list:()=>true,reply:()=>true} as unknown as SupportService;const c=new AdminSupportController(service);for(const role of ['OPS','AUDITOR'])assert.throws(()=>c.list({adminRole:role,session:{adminId:'id'}} as any));assert.equal(c.list({adminRole:'SUPPORT',session:{adminId:'id'}} as any),true);assert.throws(()=>c.reply({adminRole:'SUPPORT',session:{adminId:'id',adminVerifiedAt:Date.now()-360000}} as any,'id',{clientRequestId:'id',body:'Réponse'}));assert.equal(c.reply({adminRole:'OWNER',session:{adminId:'id',adminVerifiedAt:Date.now()}} as any,'id',{clientRequestId:'id',body:'Réponse'}),true);});
