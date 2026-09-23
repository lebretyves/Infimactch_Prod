import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AuthController, AuthService } from "../../src/auth/auth.module";
import { GoogleAuth } from "../../src/auth/google";
import { OrganizationsModule } from "../../src/organizations/organizations.module";
import { MissionsModule } from "../../src/missions/missions.module";
import { MissionsService } from "../../src/missions/missions.service";
import {
  DocumentsController,
  DocumentsService,
} from "../../src/documents/documents.module";
import {
  ProfilesController,
  ProfilesService,
} from "../../src/profiles/profiles.module";
import { RppsService } from "../../src/profiles/rpps";
import { Database } from "../../src/database/database";
import { configureOpenApi } from "../../src/openapi";
@Module({
  controllers: [
    AuthController,
    Reflect.getMetadata("controllers", OrganizationsModule)[0],
    Reflect.getMetadata("controllers", MissionsModule)[0],
    DocumentsController,
    ProfilesController,
  ],
  providers: [
    Database,
    AuthService,
    GoogleAuth,
    MissionsService,
    DocumentsService,
    ProfilesService,
    RppsService,
  ].map((provide) => ({ provide, useValue: {} })),
})
class ApiContractFixture {}
test("generated controller metadata exposes bounded uploads, registration and mission consent contracts", async () => {
  const app = await NestFactory.create(ApiContractFixture, {
    logger: false,
    abortOnError: false,
  });
  try {
    app.setGlobalPrefix("api/v1");
    const doc: any = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle("Unit contract").setVersion("1").build(),
    );
    configureOpenApi(doc);
    const schemas = doc.components.schemas;
    assert.equal(schemas.UploadDto.properties.contentBase64.maxLength, 7000000);
    assert.deepEqual(schemas.UploadDto.properties.mime.enum, [
      "application/pdf",
      "image/png",
      "image/jpeg",
    ]);
    assert.deepEqual(
      schemas.RegistrationDetails?.properties?.family?.enum ??
        schemas.Register.properties.family.enum,
      ["NURSE", "ENTERPRISE"],
    );
    assert.ok(doc.paths["/api/v1/auth/login"].post);
    assert.ok(doc.paths["/api/v1/profile/search-area"].patch);
    assert.ok(
      doc.paths["/api/v1/missions/{id}/applications"].post.parameters.some(
        (p: any) => p.name === "Idempotency-Key",
      ),
    );
    assert.equal(schemas.DocumentCommand.properties.status.enum[0], "READY");
  } finally {
    await app.close();
  }
});
