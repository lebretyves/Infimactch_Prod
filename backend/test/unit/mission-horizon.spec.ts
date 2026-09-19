import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withinMissionHorizon} from '../../src/domain/schedule-period';
const now=Date.parse('2026-09-19T12:00:00Z');
test('two year calendar horizon includes the last whole day and rejects 2090',()=>{
 assert.equal(withinMissionHorizon('2028-09-19T00:00:00+02:00','2028-09-20T00:00:00+02:00','Europe/Paris',now),true);
 assert.equal(withinMissionHorizon('2028-09-19T22:00:00+02:00','2028-09-20T06:00:00+02:00','Europe/Paris',now),false);
 assert.equal(withinMissionHorizon('2028-09-20T00:00:00+02:00','2028-09-20T01:00:00+02:00','Europe/Paris',now),false);
 assert.equal(withinMissionHorizon('2090-01-01T08:00:00Z','2090-01-01T16:00:00Z','Europe/Paris',now),false);
});
test('horizon handles leap day, time zones and invalid ranges',()=>{
 const leap=Date.parse('2024-02-29T12:00:00Z');
 assert.equal(withinMissionHorizon('2026-02-28T23:00:00Z','2026-03-01T00:00:00Z','UTC',leap),true);
 assert.equal(withinMissionHorizon('2026-03-01T00:00:00Z','2026-03-01T01:00:00Z','UTC',leap),false);
 const boundary=Date.parse('2026-09-19T23:00:00Z');
 assert.equal(withinMissionHorizon('2028-09-20T08:00:00+02:00','2028-09-20T16:00:00+02:00','Europe/Paris',boundary),true);
 assert.equal(withinMissionHorizon('2028-09-20T08:00:00Z','2028-09-20T16:00:00Z','UTC',boundary),false);
 for(const [a,b] of [['bad','bad'],['2027-01-01T00:00:00Z','2027-01-01T00:00:00Z']])assert.equal(withinMissionHorizon(a!,b!,'UTC',now),false);
});
