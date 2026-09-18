import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { NestFactory } from "@nestjs/core";
import request from "supertest";
import { ReferenceDataModule, ideServices, blockSpecialties } from "../../src/reference-data/reference-data.module";
import catalog from "../../src/reference-data/clinical-skills.json";

test("public reference data exposes the sourced catalogue without changing existing reference fields", async () => {
  const app = await NestFactory.create(ReferenceDataModule, { logger: false });
  try {
    app.setGlobalPrefix("api/v1");
    await app.init();
    const response = await request(app.getHttpServer()).get("/api/v1/reference-data").expect(200);
    assert.deepEqual(response.body.qualifications, ["IDE", "IADE", "IBODE"]);
    assert.deepEqual(response.body.ideServices, ideServices);
    assert.deepEqual(response.body.blockSpecialties, blockSpecialties);
    assert.deepEqual(response.body.clinicalSkills, catalog);
    assert.ok(catalog.skills.every(skill => skill.sources.length > 0));
    assert.ok(catalog.skills.find(skill => skill.code === "INDUCTION_ANESTHESIQUE")?.qualifications.every(role => role === "IADE"));
    assert.ok(catalog.skills.find(skill => skill.code === "ASSISTANCE_CHIRURGICALE_IBODE")?.qualifications.every(role => role === "IBODE"));
  } finally {
    await app.close();
  }
});
