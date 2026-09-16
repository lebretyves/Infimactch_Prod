import assert from 'node:assert/strict';
import { parisDateTimeToISO,parisDateTimeInput,nextDate } from '../src/lib/parisDateTime.ts';
for(const zone of ['Europe/Paris','America/Los_Angeles','Asia/Tokyo']){
  process.env.TZ=zone;
  assert.equal(parisDateTimeToISO('2030-01-10T06:30'),'2030-01-10T05:30:00.000Z');
  assert.equal(parisDateTimeToISO('2030-07-10T14:15'),'2030-07-10T12:15:00.000Z');
  assert.equal(parisDateTimeInput('2030-07-10T12:15:00.000Z'),'2030-07-10T14:15');
  assert.throws(()=>parisDateTimeToISO('2026-03-29T02:30'),/existe pas/);
  assert.throws(()=>parisDateTimeToISO('2026-10-25T02:30'),/deux fois/);
  assert.equal(parisDateTimeToISO('2026-10-25T02:30','2026-10-25T01:30:15Z'),'2026-10-25T01:30:15Z');
}
assert.equal(nextDate('2030-12-31'),'2031-01-01');
assert.throws(()=>parisDateTimeToISO('2030-02-31T06:30'),/invalide/);
console.log('20 assertions Paris HH:mm passed across 3 system timezones.');
