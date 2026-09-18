import assert from 'node:assert/strict';
import { missionDateRange, localDate, inclusiveEndDate, missionDateRangeLabel } from '../src/lib/missionDateRange.ts';
for (const host of ['Europe/Paris', 'America/Los_Angeles', 'Asia/Tokyo']) {
  process.env.TZ = host;
  const ordinary = missionDateRange('2026-09-18', '2026-09-18', 'Europe/Paris');
  assert.deepEqual(ordinary, {start:'2026-09-17T22:00:00.000Z',end:'2026-09-18T22:00:00.000Z',schedulePrecision:'DATE'});
  assert.equal((Date.parse(missionDateRange('2026-03-29','2026-03-29','Europe/Paris').end)-Date.parse(missionDateRange('2026-03-29','2026-03-29','Europe/Paris').start))/3600000,23);
  assert.equal((Date.parse(missionDateRange('2026-10-25','2026-10-25','Europe/Paris').end)-Date.parse(missionDateRange('2026-10-25','2026-10-25','Europe/Paris').start))/3600000,25);
  const overseas=missionDateRange('2026-09-18','2026-09-20','America/Martinique');
  assert.equal(overseas.start,'2026-09-18T04:00:00.000Z');
  assert.equal(overseas.end,'2026-09-21T04:00:00.000Z');
  assert.equal(inclusiveEndDate(overseas.end,'America/Martinique'),'2026-09-20');
  const original={start:'2026-09-18T20:00:15.000Z',end:'2026-09-19T04:00:27.000Z',timezone:'Europe/Paris'};
  assert.deepEqual(missionDateRange('2026-09-18','2026-09-19','Europe/Paris',original),{start:original.start,end:original.end,schedulePrecision:'EXACT'});
  assert.equal(missionDateRange('2026-09-18','2026-09-20','Europe/Paris',original).schedulePrecision,'DATE');
  assert.deepEqual(missionDateRange('2026-09-18','2026-09-18','Europe/Paris',{...ordinary,timezone:'Europe/Paris'}),ordinary);
  const midnightEnd={start:'2026-09-18T06:00:00Z',end:'2026-09-18T22:00:00Z',timezone:'Europe/Paris',schedulePrecision:'EXACT'};
  assert.equal(inclusiveEndDate(midnightEnd.end,'Europe/Paris'),'2026-09-18');
  assert.equal(missionDateRange('2026-09-18','2026-09-18','Europe/Paris',midnightEnd).end,midnightEnd.end);
  assert.equal(localDate(ordinary.start,'Europe/Paris'),'2026-09-18');
  assert.doesNotMatch(missionDateRangeLabel({...ordinary,timezone:'Europe/Paris'}),/00:00/);
  assert.throws(()=>missionDateRange('2026-02-31','2026-03-02','Europe/Paris'));
  assert.throws(()=>missionDateRange('2026-09-18','2026-02-31','Europe/Paris'));
  assert.throws(()=>missionDateRange('2026-09-20','2026-09-18','Europe/Paris'));
  assert.throws(()=>missionDateRange('','2026-09-18','Europe/Paris'));
}
console.log('Date-only range checks passed across 3 host timezones: inclusive dates, DST, overseas, exact-period preservation and invalid dates.');
