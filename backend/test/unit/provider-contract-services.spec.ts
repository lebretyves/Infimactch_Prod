import { test } from "node:test";
import assert from "node:assert/strict";
import { RppsService } from "../../src/profiles/rpps";
import * as database from "../../src/database/database";
import { configureOpenApi } from "../../src/openapi";
import { RefreshService } from "../../src/public-data/refresh.service";
import * as ft from "../../src/public-data/france-travail-collection";
import * as jp from "../../src/public-data/jobspipe-collection";
import * as offers from "../../src/public-data/offers";
import * as geo from "../../src/public-data/jobspipe-geolocation";
import * as freshness from "../../src/public-data/freshness";
import * as duplicates from "../../src/public-data/offer-deduplication";
import * as repair from "../../src/public-data/repair-geolocation";
function fixture(answer: (sql: string, args: any[]) => any) {
  const calls: any[] = [];
  const db: any = {
    query: async (sql: string, args: any[] = []) => {
      calls.push({ sql, args });
      return answer(sql, args);
    },
  };
  db.transaction = async (fn: any) => fn(db);
  return { db, calls };
}
test("RPPS verification binds provider response to exact profile version and ignores stale results", async (t) => {
  const audits: any[] = [],
    matches: any[] = [];
  t.mock.method(database, "audit", async (...args: any[]) => {
    audits.push(args);
  });
  t.mock.method(database, "queueProfileMatches", async (...args: any[]) => {
    matches.push(args);
  });
  let stale = false;
  const f = fixture((sql) =>
    sql.startsWith("SELECT * FROM profile")
      ? [{}]
      : sql.startsWith("UPDATE profile SET rpps_number")
        ? [{ rpps_version: 3 }]
        : sql.startsWith("SELECT details")
          ? [{ details: { firstName: "Alice", lastName: "Martin" } }]
          : sql.startsWith("UPDATE profile SET rpps_status")
            ? stale
              ? []
              : [{ rpps_status: "FOUND" }]
            : [],
  );
  class Provider extends RppsService {
    protected async lookup(number: string, identity: any) {
      assert.equal(number, "12345678901");
      assert.equal(identity.firstName, "Alice");
      return {
        status: "FOUND" as const,
        reason: "EXACT_IDENTIFIER_FOUND",
        identityReview: "CONSISTENT_NAMES" as const,
      };
    }
  }
  const s = new Provider(f.db);
  assert.equal((await s.verify("actor", "12345678901")).status, "FOUND");
  assert.deepEqual(
    f.calls.find((c) => c.sql.startsWith("UPDATE profile SET rpps_status"))
      .args,
    [
      "actor",
      "12345678901",
      3,
      "FOUND",
      "EXACT_IDENTIFIER_FOUND",
      "CONSISTENT_NAMES",
    ],
  );
  assert.equal(matches.length, 1);
  stale = true;
  assert.deepEqual(await s.verify("actor", "12345678901"), {
    status: "STALE_RESULT_IGNORED",
  });
  assert.equal(matches.length, 1);
  const old = process.env.RPPS_ENABLED;
  process.env.RPPS_ENABLED = "false";
  t.after(() => {
    if (old === undefined) delete process.env.RPPS_ENABLED;
    else process.env.RPPS_ENABLED = old;
  });
  stale = false;
  assert.equal(
    ((await new RppsService(f.db).verify("actor", "12345678901")) as any)
      .reason,
    "PROVIDER_DISABLED",
  );
});
test("OpenAPI describes idempotency, CSRF, private downloads and distinct webhook authentication", () => {
  const paths: any = {};
  for (const [path, method] of [
    ["/api/v1/missions", "post"],
    ["/api/v1/me/documents/{id}", "get"],
    ["/api/v1/internal/automation/matches/{id}", "post"],
    ["/api/v1/internal/automation/smtp2go/webhook", "post"],
    ["/api/v1/admin/activate", "post"],
    ["/api/v1/admin/invitation/check", "post"],
    ["/api/v1/me/support-tickets/{id}/replies", "post"],
    ["/api/v1/me/favorites", "get"],
  ])
    paths[path!] = {
      [method!]: {
        responses: {
          200: { description: "Existing" },
          401: { description: "Specific unauthorized" },
        },
      },
    };
  const doc: any = { paths };
  configureOpenApi(doc);
  const command = paths["/api/v1/missions"].post;
  assert.ok(
    command.parameters.some(
      (p: any) => p.name === "Idempotency-Key" && p.required,
    ),
  );
  assert.ok(
    command.parameters.some(
      (p: any) => p.name === "X-CSRF-Token" && p.required,
    ),
  );
  assert.equal(command.responses[401].description, "Specific unauthorized");
  assert.equal(
    command.responses[200].content["application/json"].schema.$ref,
    "#/components/schemas/MissionCommand",
  );
  const internal = paths["/api/v1/internal/automation/matches/{id}"].post;
  assert.deepEqual(
    internal.parameters.map((p: any) => p.name),
    ["X-InfiMatch-Token"],
  );
  const webhook = paths["/api/v1/internal/automation/smtp2go/webhook"].post;
  assert.deepEqual(webhook.security, [{ Smtp2goWebhook: [] }]);
  assert.deepEqual(webhook.parameters, []);
  assert.equal(
    paths["/api/v1/me/documents/{id}"].get.responses[200].content[
      "application/pdf"
    ].schema.format,
    "binary",
  );
  assert.ok(
    doc.components.schemas.AdminActivationRequest.required.includes(
      "invitation",
    ),
  );
  assert.equal(
    doc.components.schemas.ClientReplyTicket.properties.status,
    undefined,
  );
});
test("provider refresh persists completed collection checkpoints and rechecks returned or missing job offers honestly", async (t) => {
  t.mock.method(
    jp,
    "advanceJobsPipeCollection",
    async () =>
      ({
        rows: [{ id: "new" }],
        state: { completedAt: "2026-01-01" },
        status: "COMPLETE",
        coverage: {},
      }) as any,
  );
  t.mock.method(
    jp,
    "verifyJobsPipeOffers",
    async () => ({ rows: [{ id: "existing" }], status: "COMPLETE" }) as any,
  );
  t.mock.method(geo, "enrichJobsPipeLocations", async (rows: any) => rows);
  const imported: any[] = [];
  t.mock.method(offers, "importOffers", async (...args: any[]) => {
    imported.push(args);
    return { accepted: 1 } as any;
  });
  t.mock.method(
    freshness,
    "retireStaleOffers",
    async () => ({ retired: 0 }) as any,
  );
  const f = fixture((sql) =>
    sql.includes("pg_try_advisory")
      ? [{ acquired: true }]
      : sql.includes("FROM source_control")
        ? [{ enabled: true }]
        : sql.startsWith("SELECT source_id")
          ? [{ source_id: "existing" }, { source_id: "missing" }]
          : [],
  );
  const r: any = await new RefreshService(f.db).run("JOBSPIPE");
  assert.equal(r.status, "SUCCESS");
  assert.equal(r.accepted, 1);
  assert.equal(r.availability.missingMeansClosed, false);
  assert.equal(imported.length, 2);
  assert.deepEqual(
    f.calls.find((c) => c.sql.includes("NOT_RETURNED_UNVERIFIED")).args[0],
    ["missing"],
  );
  assert.ok(!f.calls.some((c) => c.sql.includes("active=false")));
});
test("completed France Travail refresh performs availability checks and deduplicates reopened offers", async (t) => {
  t.mock.method(
    ft,
    "advanceFranceTravailCollection",
    async () =>
      ({
        state: { phase: "COMPLETE", startedAt: "2026-01-01" },
        status: "SUCCESS",
        accepted: 2,
        coverage: {},
      }) as any,
  );
  t.mock.method(
    freshness,
    "verifyClosedFranceTravailOffers",
    async () => ({ reopened: 1 }) as any,
  );
  t.mock.method(
    freshness,
    "retireStaleOffers",
    async () => ({ retired: 0 }) as any,
  );
  let deduplicated = 0;
  t.mock.method(duplicates, "guardCrossSourceDuplicates", async () => {
    deduplicated++;
    return {} as any;
  });
  const f = fixture((sql) =>
    sql.includes("pg_try_advisory")
      ? [{ acquired: true }]
      : sql.includes("FROM source_control")
        ? [{ enabled: true }]
        : [],
  );
  assert.equal(
    (await new RefreshService(f.db).run("FRANCE_TRAVAIL")).accepted,
    2,
  );
  assert.equal(deduplicated, 1);
  assert.ok(f.calls.some((c) => c.sql.includes("SET collection_state=$2")));
});
test("provider batches accumulate accepted counts, stop at completion and repair geolocation once", async (t) => {
  const s = new RefreshService({} as any);
  let batches = 0,
    repairs = 0;
  t.mock.method(s, "run", async () => ({
    provider: "JOBSPIPE",
    status: ++batches < 3 ? "IN_PROGRESS" : "SUCCESS",
    accepted: 2,
  }));
  t.mock.method(repair, "repairOfferLocations", async () => {
    repairs++;
    return { repaired: 1 } as any;
  });
  const r = await s.runBatch("JOBSPIPE");
  assert.equal(r.accepted, 6);
  assert.equal(r.batches, 3);
  assert.equal(repairs, 1);
});
