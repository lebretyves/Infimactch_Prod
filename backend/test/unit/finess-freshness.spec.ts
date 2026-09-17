import test from 'node:test';
import assert from 'node:assert/strict';
import {finessFreshness} from '../../src/reference-data/finess-freshness';
const source=(date:string)=>({generated_at:date,imported_at:'2026-09-18T00:00:00Z',summary:{rows:100}});
test('FINESS monthly expiry is based on source generation, not reimport',()=>{
 const r=finessFreshness(source('2026-08-18T00:00:00Z'),new Date('2026-09-18T00:00:00Z'));
 assert.equal(r.status,'EXPIRED');assert.equal(r.daysRemaining,0);assert.equal(r.establishmentCount,100);
});
test('FINESS countdown and seven day warning',()=>{
 assert.equal(finessFreshness(source('2026-09-01T10:00:00Z'),new Date('2026-09-24T10:00:00Z')).status,'DUE');
 assert.equal(finessFreshness(source('2026-09-01T10:00:00Z'),new Date('2026-09-23T10:00:00Z')).status,'CURRENT');
});
test('FINESS calendar month clamps month end and respects Paris DST',()=>{
 assert.equal(finessFreshness(source('2026-01-31T11:00:00Z'),new Date('2026-02-01')).expiresAt,'2026-02-28T11:00:00.000Z');
 assert.equal(finessFreshness(source('2026-03-01T11:00:00Z'),new Date('2026-03-02')).expiresAt,'2026-04-01T10:00:00.000Z');
});
test('FINESS missing, invalid and future snapshots never appear current',()=>{
 const now=new Date('2026-09-18');assert.equal(finessFreshness(null,now).status,'MISSING');
 assert.equal(finessFreshness(source('bad'),now).status,'INVALID');
 assert.equal(finessFreshness(source('2026-09-19'),now).status,'INVALID');
});
