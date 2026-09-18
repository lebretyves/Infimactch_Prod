import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MatchingService } from '../../src/matching/matching.module';
import { match } from '../../src/domain/matching';
import { professional } from '../../src/profiles/profiles.module';
import { matchingMission } from '../../src/missions/missions.service';

const nextYear = new Date().getUTCFullYear() + 1;
const mission = {
  id: 'mission', status: 'OPEN', start_at: `${nextYear}-01-01T08:00:00Z`, end_at: `${nextYear}-01-01T16:00:00Z`,
  qualification: 'IDE', service: 'URGENCES', population: 'ADULT', block: 'NONE', specialty: null,
  required_skills: [], desired_skills: [], min_experience_months: 0,
  latitude: 48, longitude: 2, shift: 'DAY', schedule_precision: 'EXACT',
};
const profile = {
  qualifications: ['IDE'], skills: [], experience: [],
  available: [{ start: mission.start_at, end: mission.end_at }], unavailable: [],
  rpps_status: 'FOUND', latitude: 48, longitude: 2, radius_km: 30,
  accepted_shifts: ['DAY'], preferred_shifts: [],
};
function service(p: unknown = profile, m: unknown = mission) {
  const queries: {sql: string; params: unknown[]}[] = [];
  const instance = Object.create(MatchingService.prototype) as MatchingService;
  Object.assign(instance, {db: {query: async (sql: string, params: unknown[]) => {
    queries.push({sql, params});
    if (sql.includes('FROM profile')) return p ? [p] : [];
    if (sql.includes('FROM mission')) return m ? [m] : [];
    if (sql.includes('FROM assignment')) return [];
    if (sql.includes('ST_Distance')) return [{distance: 0}];
    throw new Error('Unexpected query');
  }}});
  return {instance, queries};
}
test('personal matching uses the same score as enterprise matching and only the authenticated profile', async () => {
  const {instance, queries} = service();
  assert.deepEqual(await instance.forPair('authenticated-user', 'mission'), match(professional(profile), matchingMission(mission), 0));
  assert.deepEqual(queries[0]?.params, ['authenticated-user']);
  assert.match(queries[1]!.sql, /m.status IN/);
  assert.deepEqual(queries[2]?.params, ['authenticated-user']);
});
test('missing profile or unavailable mission does not produce a score', async () => {
  await assert.rejects(service(null).instance.forPair('user', 'mission'), {status: 404});
  await assert.rejects(service(profile, null).instance.forPair('user', 'mission'), {status: 404});
});
test('incomplete profile returns reasons and null rather than a fabricated percentage', async () => {
  const result = await service({...profile, rpps_status: 'PENDING'}).instance.forPair('user', 'mission');
  assert.equal(result.score, null);
  assert.ok(result.reasons.includes('RPPS_PENDING'));
});
test('a started mission is not presented as a current match', async () => {
  const result = await service(profile, {...mission, start_at: '2020-01-01T08:00:00Z', end_at: '2020-01-01T16:00:00Z'}).instance.forPair('user', 'mission');
  assert.equal(result.score, null);
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.includes('MISSION_ALREADY_STARTED'));
});
