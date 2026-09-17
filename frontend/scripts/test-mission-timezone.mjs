import assert from 'node:assert/strict';
import { zonedDateTimeToISO, zonedDateTimeInput } from '../src/lib/parisDateTime.ts';
for(const browserZone of ['Europe/Paris','America/Los_Angeles','Asia/Tokyo']){
 process.env.TZ=browserZone;
 for(const [zone,utc] of [['America/Guadeloupe','2030-07-10T12:00:00.000Z'],['America/Martinique','2030-07-10T12:00:00.000Z'],['America/Cayenne','2030-07-10T11:00:00.000Z'],['Indian/Reunion','2030-07-10T04:00:00.000Z'],['Indian/Mayotte','2030-07-10T05:00:00.000Z']]){
 assert.equal(zonedDateTimeInput(utc,zone),'2030-07-10T08:00');
 assert.equal(zonedDateTimeToISO('2030-07-10T08:00',undefined,zone),utc);
 assert.equal(zonedDateTimeToISO('2030-07-10T08:00',utc,zone),utc);
 }
 assert.throws(()=>zonedDateTimeToISO('2026-03-29T02:30',undefined,'Europe/Paris'),/existe pas/);
 assert.throws(()=>zonedDateTimeToISO('2026-10-25T02:30',undefined,'Europe/Paris'),/deux fois/);
 assert.equal(zonedDateTimeToISO('2026-10-25T02:30','2026-10-25T01:30:15Z','Europe/Paris'),'2026-10-25T01:30:15Z');
}
assert.throws(()=>zonedDateTimeToISO('2030-07-10T08:00',undefined,'Bad/Zone'));
console.log('PASS mission timezone: 5 DOM, 3 browser zones, Paris DST gap/fold and invalid zone');
