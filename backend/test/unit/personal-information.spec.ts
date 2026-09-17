import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertPersonalInformationUnchanged,correctionValue,personalFields} from '../../src/profiles/personal-information';
const details={firstName:'Camille',lastName:'Test',city:'Paris',phone:'0600000000',birthDate:'1990-01-01',address:'1 rue Test',postalCode:'75001'};
test('all personal fields, removals and display name are locked after registration',()=>{
 const previous={display_name:'Camille',details};
 for(const key of personalFields){assert.throws(()=>assertPersonalInformationUnchanged(previous,{displayName:'Camille',details:{...details,[key]:'changed'}}));const removed={...details};delete (removed as any)[key];assert.throws(()=>assertPersonalInformationUnchanged(previous,{displayName:'Camille',details:removed}));}
 assert.throws(()=>assertPersonalInformationUnchanged(previous,{displayName:'Other'}));
 assert.throws(()=>assertPersonalInformationUnchanged({display_name:'Camille',details:{}},{displayName:'Camille',details:{city:'Paris'}}));
});
test('professional changes and omitted personal details remain allowed',()=>{
 assert.doesNotThrow(()=>assertPersonalInformationUnchanged({display_name:'Camille',details},{displayName:'Camille'}));
 assert.doesNotThrow(()=>assertPersonalInformationUnchanged({display_name:'Camille',details},{displayName:'Camille',details:{...details,ideDiplomaYear:2020}}));
});
test('correction values validate format and date, normalize email and permit clearing optional fields',()=>{
 assert.equal(correctionValue('email',' Test@Example.invalid '),'test@example.invalid');
 for(const [field,value] of [['email','bad'],['birthDate','2026-02-30'],['birthDate','2999-01-01'],['postalCode','123'],['firstName',''],['lastName',''],['firstName','A']])assert.throws(()=>correctionValue(field as any,value!));
 assert.equal(correctionValue('phone',''),'');assert.equal(correctionValue('firstName',' Camille '),'Camille');
});
