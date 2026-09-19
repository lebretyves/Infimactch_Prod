import test from 'node:test';
import assert from 'node:assert/strict';
import {contractErrors,contractPayload,contractChanged} from '../src/lib/contractPreparation.ts';
const empty = () => ({reason:'',workSchedule:'',payTerms:'',contactName:'',additionalNotes:''});
test('an empty first draft is valid and its request cannot overwrite assignment facts',()=>{
 const payload=contractPayload(0,{...empty(),hourlySalary:999,worker:{displayName:'Changed'}});
 assert.deepEqual(contractErrors(payload.notes),{});
 assert.deepEqual(payload,{version:0,notes:empty()});
});
test('contract note limits preserve a complete editable draft and identify the offending field',()=>{
 const notes={...empty(),reason:'x'.repeat(2000),contactName:'x'.repeat(150)};
 assert.deepEqual(contractErrors(notes),{});
 assert.deepEqual(Object.keys(contractErrors({...notes,reason:notes.reason+'x',contactName:notes.contactName+'x'})),['reason','contactName']);
});
test('clearing a saved note is an unsaved modification; a restored note is not',()=>{
 const saved={...empty(),workSchedule:'De 8 h à 16 h'};
 assert.equal(contractChanged(empty(),saved),true);
 assert.equal(contractChanged({...saved},saved),false);
 assert.equal(contractPayload(7,empty()).version,7);
});
