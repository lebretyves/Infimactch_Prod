import assert from 'node:assert/strict';
import { slotPeriod, slotStatus, nextSlotState, buildAvailabilityChanges, parisDateInput } from '../src/lib/availabilitySlots.ts';
for (const timezone of ['Europe/Paris','America/Los_Angeles','Asia/Tokyo']) {
  process.env.TZ=timezone;
  assert.deepEqual(slotPeriod('2026-03-28','night'),{start:'2026-03-28T21:00:00.000Z',end:'2026-03-29T04:00:00.000Z'});
  assert.deepEqual(slotPeriod('2026-10-24','night'),{start:'2026-10-24T20:00:00.000Z',end:'2026-10-25T05:00:00.000Z'});
  assert.deepEqual(slotPeriod('2026-03-29','morning'),{start:'2026-03-29T04:00:00.000Z',end:'2026-03-29T12:00:00.000Z'});
  assert.equal(parisDateInput('2026-03-28T23:30:00Z'),'2026-03-29');
}
const slot=slotPeriod('2030-01-10','morning');
assert.equal(slotStatus(slot,[],[]),'unset');
assert.equal(slotStatus(slot,[slot],[]),'available');
assert.equal(slotStatus(slot,[slot],[slot]),'unavailable');
assert.equal(slotStatus(slot,[slot],[{start:slot.start,end:'2030-01-10T06:00:00Z'}]),'partial-unavailable');
assert.equal(slotStatus(slot,[{start:slot.start,end:'2030-01-10T06:00:00Z'}],[]),'partial-available');
assert.equal(nextSlotState('partial-unavailable'),'available');
assert.deepEqual(['unset','available','unavailable'].map(nextSlotState),['available','unavailable','unset']);
assert.equal(buildAvailabilityChanges('2030-01-01','2030-01-02',['morning','afternoon','night'],'available').length,6);
assert.throws(()=>buildAvailabilityChanges('2030-01-01','2030-03-08',['morning','afternoon','night'],'available'),/200/);
console.log('Agenda helpers: 21 assertions passed, Paris DST verified from 3 system timezones.');

