import {test} from 'node:test';
import assert from 'node:assert/strict';
import {worsensCommittedAvailability} from '../../src/domain/assignment-profile';
const at=(hour:number)=>`2026-10-01T${String(hour).padStart(2,'0')}:00:00Z`;
const period={start:at(8),end:at(16)};
const empty={available:[],unavailable:[]};
test('unchanged missing declarations and unrelated days do not invalidate a confirmed mission',()=>{
 assert.equal(worsensCommittedAvailability(period,empty,empty),false);
 assert.equal(worsensCommittedAvailability(period,empty,{...empty,available:[{start:at(17),end:at(20)}]}),false);
});
test('partial improvements are allowed even when the whole mission remains uncovered',()=>{
 assert.equal(worsensCommittedAvailability(period,empty,{...empty,available:[{start:at(8),end:at(12)}]}),false);
 assert.equal(worsensCommittedAvailability(period,{available:[],unavailable:[period]},empty),false);
});
test('new unavailability and removal of declared availability inside a commitment are rejected',()=>{
 assert.equal(worsensCommittedAvailability(period,empty,{...empty,unavailable:[{start:at(9),end:at(10)}]}),true);
 assert.equal(worsensCommittedAvailability(period,{...empty,available:[period]},{...empty,available:[{start:at(8),end:at(12)}]}),true);
 assert.equal(worsensCommittedAvailability(period,{...empty,available:[{start:at(8),end:at(10)}]},empty),true);
});
test('existing stale unavailability can remain but cannot expand inside a confirmed slot',()=>{
 const previous={...empty,unavailable:[{start:at(8),end:at(10)}]};
 assert.equal(worsensCommittedAvailability(period,previous,previous),false);
 assert.equal(worsensCommittedAvailability(period,previous,{...empty,unavailable:[{start:at(8),end:at(12)}]}),true);
});
test('half-open boundaries and equivalent fragmented declarations are preserved',()=>{
 assert.equal(worsensCommittedAvailability(period,empty,{...empty,unavailable:[{start:at(16),end:at(20)}]}),false);
 assert.equal(worsensCommittedAvailability(period,{...empty,available:[period]},{...empty,available:[{start:at(8),end:at(12)},{start:at(12),end:at(16)}]}),false);
});
