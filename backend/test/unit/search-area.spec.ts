import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { SearchAreaDto } from '../../src/profiles/search-area';
import { ProfilesService } from '../../src/profiles/profiles.module';
import { Database, SqlClient } from '../../src/database/database';

const area = { latitude: 48.1173, longitude: -1.6778, radiusKm: 30, city: 'Rennes' };
const errors = (input: object) => validateSync(plainToInstance(SearchAreaDto, input),
  { whitelist: true, forbidNonWhitelisted: true });

test('search area accepts a selected town and rejects incomplete, global or malformed zones', () => {
  assert.equal(errors(area).length, 0);
  assert.equal(errors({ ...area, latitude: 0, longitude: 0, radiusKm: 0.1 }).length, 0);
  for (const invalid of [{}, { ...area, city: '   ' }, { ...area, city: 'x'.repeat(201) },
    { ...area, latitude: 91 }, { ...area, longitude: -181 }, { ...area, radiusKm: 0 },
    { ...area, radiusKm: 1001 }, { ...area, radiusKm: null }, { ...area, latitude: '48' },
    { ...area, longitude: NaN }, { ...area, radiusKm: Infinity },
    { ...area, details: { city: 'Paris' } }, { ...area, notificationsEnabled: true }])
    assert.ok(errors(invalid).length, JSON.stringify(invalid));
  assert.equal(plainToInstance(SearchAreaDto, { ...area, city: ' Rennes ' }).city, 'Rennes');
});

function fixture(current: any) {
  const calls: {sql: string; args: any[]}[] = [];
  const em: SqlClient = { async query(sql, args = []) {
    calls.push({ sql, args });
    if (sql.startsWith('SELECT * FROM profile')) return current ? [current] : [];
    if (sql.startsWith('UPDATE profile')) {
      current.latitude = args[1]; current.longitude = args[2]; current.radius_km = args[3];
      current.details = { ...current.details, mobilityCity: args[4] };
      return [{ latitude: current.latitude, longitude: current.longitude,
        radius_km: current.radius_km, details: current.details }];
    }
    return [];
  } };
  const db = { transaction: <T>(fn: (em: SqlClient) => Promise<T>) => fn(em) } as Database;
  return { service: new ProfilesService(db), calls };
}

test('saving Rennes as alert area preserves Nantes domicile and notification preferences; identical save is a no-op', async () => {
  const profile = { latitude: 47.2184, longitude: -1.5536, radius_km: 25,
    details: { address: '1 rue de Nantes', city: 'Nantes', postalCode: '44000', transport: 'Deux-roues' },
    available: [{ start: '2027-01-01T08:00:00Z', end: '2027-01-01T20:00:00Z' }],
    notifications_enabled: false };
  const original = structuredClone(profile);
  const { service, calls } = fixture(profile);
  const result = await service.changeSearchArea('owner', area);
  assert.equal(result.details.city, 'Nantes');
  assert.equal(result.details.address, original.details.address);
  assert.equal(result.details.postalCode, '44000');
  assert.equal(result.details.mobilityCity, 'Rennes');
  assert.equal(result.radius_km, 30);
  assert.deepEqual(profile.available, original.available);
  assert.equal(profile.notifications_enabled, false);
  const update = calls.find(c => c.sql.startsWith('UPDATE profile'))!;
  assert.ok(update.sql.includes('jsonb_set'));
  assert.ok(!update.sql.includes('notifications_enabled='));
  assert.ok(!update.sql.includes('available='));
  assert.ok(calls.some(c => c.sql.startsWith('INSERT INTO outbox') && c.args[0] === 'owner'));
  calls.length = 0;
  await service.changeSearchArea('owner', area);
  assert.ok(!calls.some(c => /^(UPDATE|INSERT)/.test(c.sql)));
});

test('an account without an interim worker profile cannot save an alert zone', async () => {
  const { service, calls } = fixture(null);
  await assert.rejects(service.changeSearchArea('other', area), (error: any) => error.getStatus() === 404);
  assert.ok(!calls.some(c => /^(UPDATE|INSERT)/.test(c.sql)));
});


test('queued mission alerts use the current area, and incomplete/disabled profiles fail closed', async () => {
  const { matchAreaStillValid } = await import('../../src/notifications/match-area');
  let enabled = true, radius = 30, distance: number | null = 100, latitude: number | null = 48;
  const em: SqlClient = { async query(sql) {
    if (sql.startsWith('SELECT latitude')) return enabled ? [{ latitude, longitude: -1, radius_km: radius }] : [];
    if (sql.startsWith('SELECT ST_Y')) return [{ latitude: 47, longitude: -1 }];
    if (sql.startsWith('SELECT ST_Distance')) return [{ distance }];
    throw Error('Unexpected query');
  } };
  assert.equal(await matchAreaStillValid(em, 'owner', 'old-nantes-mission'), false);
  distance = 12;
  assert.equal(await matchAreaStillValid(em, 'owner', 'rennes-mission'), true);
  distance = 30;
  assert.equal(await matchAreaStillValid(em, 'owner', 'boundary-mission'), true);
  radius = 5;
  assert.equal(await matchAreaStillValid(em, 'owner', 'rennes-mission'), false);
  radius = 30; enabled = false;
  assert.equal(await matchAreaStillValid(em, 'owner', 'rennes-mission'), false);
  enabled = true; latitude = null;
  assert.equal(await matchAreaStillValid(em, 'owner', 'rennes-mission'), false);
  latitude = 48; distance = null;
  assert.equal(await matchAreaStillValid(em, 'owner', 'unknown-mission'), false);
});
