import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { configureOpenApi } from '../../src/openapi';
import { ReverseLocationController } from '../../src/listings/reverse-location';

@Module({ controllers: [ReverseLocationController] })
class LocationContractModule {}

test('generated reverse-location contract covers coordinates, nullable address and controlled errors', async () => {
  // Exercise Swagger reflection and the same post-processing as createApp,
  // without a database, provider request or private environment configuration.
  const app = await NestFactory.create(LocationContractModule, { logger: false });
  try {
    app.setGlobalPrefix('api/v1');
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    configureOpenApi(doc);
    const operation = doc.paths['/api/v1/listings/locations/reverse']!.post!;
    const body = operation.requestBody as any;
    assert.equal(body.required, true);
    assert.equal(body.content['application/json'].schema.$ref, '#/components/schemas/ReverseLocationDto');
    const coordinates = doc.components!.schemas!.ReverseLocationDto as any;
    assert.deepEqual([...coordinates.required].sort(), ['latitude', 'longitude']);
    for (const [name, minimum, maximum] of [['latitude', -90, 90], ['longitude', -180, 180]] as const) {
      assert.equal(coordinates.properties[name].type, 'number');
      assert.equal(coordinates.properties[name].minimum, minimum);
      assert.equal(coordinates.properties[name].maximum, maximum);
      assert.equal(typeof coordinates.properties[name].example, 'number');
    }
    const success = operation.responses['200'] as any;
    const result = success.content['application/json'].schema;
    assert.deepEqual([...result.required].sort(), ['address', 'provider']);
    assert.deepEqual(result.properties.provider.enum, ['IGN']);
    assert.equal(result.properties.address.type, 'object');
    assert.equal(result.properties.address.nullable, true);
    assert.deepEqual([...result.properties.address.required].sort(), ['address', 'city', 'postalCode']);
    for (const name of ['address', 'postalCode', 'city']) {
      assert.equal(result.properties.address.properties[name].type, 'string');
    }
    assert.equal(result.properties.address.properties.postalCode.pattern, '^[0-9]{5}$');
    for (const status of ['400', '403', '429', '503']) {
      const response = operation.responses[status] as any;
      assert.equal(response.content['application/json'].schema.$ref, '#/components/schemas/Error');
    }
    const unavailable = operation.responses['503'] as any;
    assert.equal(unavailable.content['application/json'].example.code, 'LOCATIONS_UNAVAILABLE');
    assert.ok(operation.parameters?.some((p: any) => p.name === 'X-CSRF-Token' && p.required));
  } finally {
    await app.close();
  }
});
