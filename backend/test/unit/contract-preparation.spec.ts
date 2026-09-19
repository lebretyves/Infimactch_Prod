import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {plainToInstance} from 'class-transformer';
import {validate} from 'class-validator';
import {ContractPreparationDto} from '../../src/contracts/contracts.module';
const notes={reason:'',workSchedule:'',payTerms:'',contactName:'',additionalNotes:''};
const errors=(input:unknown)=>validate(plainToInstance(ContractPreparationDto,input),{whitelist:true,forbidNonWhitelisted:true});
test('contract preparation accepts an incomplete draft without inventing required values',async()=>{
 assert.equal((await errors({version:0,notes})).length,0);
});
test('contract preparation rejects malformed notes, excess fields and invalid version',async()=>{
 for(const input of [{version:-1,notes},{version:1.5,notes},{version:0},{version:0,notes:null},{version:0,notes:[]},{version:0,notes:[notes]},{version:0,notes:'invalid'},{version:0,notes:{...notes,reason:5}},{version:0,notes:{...notes,firstName:'override'}},{version:0,notes:{...notes,contactName:'a'.repeat(151)}},{version:0,notes:{...notes,reason:'a'.repeat(2001)}},{version:0,notes,worker:{firstName:'override'}}])assert.ok((await errors(input)).length,JSON.stringify(input));
});
