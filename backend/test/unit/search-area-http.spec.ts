import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Module, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { ProfilesController, ProfilesService } from '../../src/profiles/profiles.module';
import { Database } from '../../src/database/database';
import { RppsService } from '../../src/profiles/rpps';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const calls: any[] = [];
@Module({ controllers: [ProfilesController], providers: [
  { provide: Database, useValue: { query: async () => [{ ok: true }] } },
  { provide: RppsService, useValue: {} },
  { provide: ProfilesService, useValue: { changeSearchArea: async (actor: string, b: any) => {
    calls.push({ actor, b }); return { latitude: b.latitude, longitude: b.longitude,
      radius_km: b.radiusKm, details: { city: 'Nantes', mobilityCity: b.city } };
  } } },
] })
class SearchAreaTestModule {}

test('search area HTTP route requires a session, validates the PATCH and documents its response', async () => {
  const app = await NestFactory.create(SearchAreaTestModule, { logger: false });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  // Test-only session injection: real SessionGuard still checks the session and account.
  app.use((req: any, _res: any, next: any) => {
    req.session = req.headers['x-test-session'] ? { userId: 'owner', sessionVersion: 1 } : {};
    next();
  });
  try {
    await app.init();
    const body = { latitude: 48.1173, longitude: -1.6778, radiusKm: 30, city: ' Rennes ' };
    const route = '/api/v1/profile/search-area';
    await request(app.getHttpServer()).patch(route).send(body).expect(401);
    assert.equal(calls.length, 0);
    await request(app.getHttpServer()).patch(route).set('X-Test-Session', 'yes').send({ ...body, radiusKm: 0 }).expect(400);
    await request(app.getHttpServer()).patch(route).set('X-Test-Session', 'yes').send({ ...body, notificationsEnabled: true }).expect(400);
    assert.equal(calls.length, 0);
    const result = await request(app.getHttpServer()).patch(route).set('X-Test-Session', 'yes').send(body).expect(200);
    assert.equal(calls[0].actor, 'owner');
    assert.equal(calls[0].b.city, 'Rennes');
    assert.equal(result.body.details.city, 'Nantes');
    assert.equal(result.body.radius_km, 30);
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    const operation = doc.paths[route]!.patch!;
    assert.equal((operation.responses['200'] as any).content['application/json'].schema.properties.radius_km.type, 'number');
    assert.deepEqual((doc.components!.schemas!.SearchAreaDto as any).required.sort(), ['city', 'latitude', 'longitude', 'radiusKm']);
  } finally { await app.close(); }
});
