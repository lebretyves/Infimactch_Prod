import assert from 'node:assert/strict';
import {test} from 'node:test';
import {missionMaxDate,validateMissionHorizon} from '../src/lib/missionDateRange.ts';
test('date inputs share the local two-year calendar limit, including leap years',()=>{
 assert.equal(missionMaxDate('Europe/Paris',new Date('2026-09-19T12:00:00Z')),'2028-09-19');
 assert.equal(missionMaxDate('UTC',new Date('2024-02-29T12:00:00Z')),'2026-02-28');
 assert.equal(missionMaxDate('Europe/Paris',new Date('2026-09-19T23:00:00Z')),'2028-09-20');
 assert.equal(missionMaxDate('America/Guadeloupe',new Date('2026-09-19T23:00:00Z')),'2028-09-19');
 assert.throws(()=>validateMissionHorizon('2090-01-01','2090-01-01'));
 const max=missionMaxDate();assert.doesNotThrow(()=>validateMissionHorizon(max,max));
});
