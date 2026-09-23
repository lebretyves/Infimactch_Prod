import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import {
  MatchingService,
  MatchingModule,
} from "../../src/matching/matching.module";
import { MATCH_RULES } from "../../src/domain/rules";
import * as distance from "../../src/database/distance";
const start = "2030-01-15T08:00:00Z",
  end = "2030-01-15T16:00:00Z";
const p = {
  user_id: "nurse",
  updated_at: "2026-01-01T00:00:00Z",
  rpps_version: 1,
  qualifications: ["IDE"],
  skills: [],
  experience: [],
  available: [{ start, end }],
  unavailable: [],
  rpps_status: "FOUND",
  latitude: 48,
  longitude: 2,
  radius_km: 50,
  accepted_shifts: ["DAY"],
  preferred_shifts: ["DAY"],
  details: {},
  display_name: "Alice",
};
const m = {
  id: "mission",
  version: 1,
  status: "OPEN",
  start_at: start,
  end_at: end,
  qualification: "IDE",
  service: "URGENCES",
  required_skills: [],
  desired_skills: [],
  min_experience_months: 0,
  population: "ADULT",
  block: "NONE",
  specialty: null,
  latitude: 48,
  longitude: 2,
  shift: "DAY",
  schedule_precision: "EXACT",
  agency_id: "agency",
  establishment_id: "hospital",
};
const status = (n: number) => (e: any) => e.getStatus?.() === n;
function fixture(t: any, answer: (sql: string, args: any[]) => any = () => []) {
  const calls: { sql: string; args: any[] }[] = [];
  const saved: any[] = [];
  let closed = 0,
    initialized = 0;
  const runs: any = {
    init: async () => {
      initialized++;
    },
    create: async (v: any) => {
      saved.push(v);
      return { _id: "507f1f77bcf86cd799439011" };
    },
    findOne: () => ({ lean: async () => null }),
  };
  const conn: any = {
    readyState: 1,
    model: () => runs,
    on: () => {},
    asPromise: async () => conn,
    close: async () => {
      closed++;
    },
  };
  t.mock.method(mongoose, "createConnection", () => conn);
  const old = process.env.MONGODB_URI;
  process.env.MONGODB_URI = "mongodb://unit.invalid/test";
  t.after(() => {
    if (old === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = old;
  });
  t.mock.method(distance, "geodesicKm", async () => 0);
  t.mock.method(distance, "geodesicKmBatch", async (_db: any, pairs: any[]) =>
    pairs.map(() => 0),
  );
  const db: any = {
    query: async (sql: string, args: any[] = []) => {
      calls.push({ sql, args });
      return answer(sql, args);
    },
  };
  db.transaction = async (fn: any) => fn(db);
  const service = new MatchingService(db);
  return {
    service,
    conn,
    runs,
    calls,
    saved,
    get closed() {
      return closed;
    },
    get initialized() {
      return initialized;
    },
  };
}
test("matching stores a reproducible versioned result with bounded expiry and closes Mongo", async (t) => {
  const f = fixture(t, () => [{ id: "nurse" }]);
  const before = Date.now();
  const result = await f.service.calculate("nurse", m, p, []);
  assert.equal(result.eligible, true);
  assert.equal(result.historyStatus, "SAVED");
  assert.equal(result.explanationId, "507f1f77bcf86cd799439011");
  const saved = f.saved[0];
  assert.equal(saved.ownerId, "nurse");
  assert.equal(saved.profileVersion, "2026-01-01T00:00:00.000Z:1");
  assert.equal(saved.missionVersion, 1);
  assert.equal(saved.rulesVersion, MATCH_RULES.version);
  assert.ok(saved.expiresAt.getTime() >= before + 86400000);
  assert.ok(saved.expiresAt.getTime() <= Date.now() + 365 * 86400000);
  assert.equal(f.initialized, 1);
  await f.service.onModuleDestroy();
  assert.equal(f.closed, 1);
});
test("Mongo failure or inactive account preserves matching result but marks history unavailable", async (t) => {
  const f = fixture(t, () => []);
  f.conn.readyState = 0;
  let r = await f.service.calculate("nurse", m, p, [], 0);
  assert.equal(r.eligible, true);
  assert.equal(r.historyStatus, "UNAVAILABLE");
  assert.equal(r.explanationId, null);
  f.conn.readyState = 1;
  r = await f.service.calculate("nurse", m, p, [], 0);
  assert.equal(r.historyStatus, "UNAVAILABLE");
  assert.equal(f.saved.length, 0);
  assert.equal(
    f.calls.filter((c) => c.sql.includes("MATCHING_HISTORY_UNAVAILABLE"))
      .length,
    2,
  );
});
test("nurse ranking scans all batches, excludes ineligible missions and paginates in stable order", async (t) => {
  let batch = 0;
  const missions = [
    { ...m, id: "c", published_at: "2029-12-03" },
    { ...m, id: "a", published_at: "2029-12-01" },
    { ...m, id: "b", published_at: "2029-12-02" },
    { ...m, id: "x", required_skills: ["UNDECLARED"] },
  ];
  const f = fixture(t, (sql) =>
    sql.includes("FROM profile")
      ? [p]
      : sql.includes("FROM mission m")
        ? batch++ % 2 === 0
          ? missions
          : []
        : sql.includes("FROM account")
          ? [{ id: "nurse" }]
          : [],
  );
  let r = await f.service.forNurse("nurse", { limit: 1, offset: 1 });
  assert.equal(r.total, 3);
  assert.equal(r.excluded, 1);
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0]!.missionId, "b");
  assert.equal(f.saved.length, 1);
  r = await f.service.forNurse("nurse", { limit: 1, offset: 0 }, "recent");
  assert.equal(r.items[0]!.missionId, "c");
  assert.equal((r.items[0] as any).publishedAt, "2029-12-03T00:00:00.000Z");
  assert.equal(r.rppsStatus, "FOUND");
});
test("nurse ranking rejects a missing active profile", async (t) => {
  await assert.rejects(fixture(t).service.forNurse("nurse"), status(404));
});
test("mission candidates require membership, exclude schedule conflicts and keep candidate sorting stable", async (t) => {
  let batches = 0;
  const f = fixture(t, (sql) =>
    sql.includes("FROM mission m")
      ? [m]
      : sql.includes("FROM membership")
        ? [{ organization_id: "hospital" }]
        : sql.includes("FROM profile")
          ? batches++ === 0
            ? [
                { ...p, user_id: "b" },
                { ...p, user_id: "a" },
                { ...p, user_id: "conflict" },
              ]
            : []
          : sql.includes("FROM assignment")
            ? [{ nurse_id: "conflict", start_at: start, end_at: end }]
            : [],
  );
  const r = await f.service.forMission("enterprise", "mission", {
    limit: 1,
    offset: 1,
  });
  assert.equal(r.total, 2);
  assert.equal(r.excluded, 1);
  assert.equal(r.items[0].candidateId, "b");
  assert.equal(f.saved.length, 0);
  assert.deepEqual(
    f.calls.find((c) => c.sql.includes("FROM membership"))!.args,
    ["enterprise", "agency", "hospital"],
  );
});
test("mission candidate requests hide absent and unauthorised missions", async (t) => {
  const f = fixture(t, (sql) => (sql.includes("FROM mission m") ? [m] : []));
  await assert.rejects(
    f.service.forMission("stranger", "mission"),
    status(404),
  );
  assert.equal(
    f.calls.some((c) => c.sql.includes("FROM profile")),
    false,
  );
});
test("explanation lookup enforces owner and expiry, rejects invalid ids and marks stale histories", async (t) => {
  const current = {
    updated_at: p.updated_at,
    rpps_version: 1,
    version: 1,
    status: "OPEN",
    end_at: end,
  };
  const f = fixture(t, () => [current]);
  await assert.rejects(f.service.explanation("nurse", "invalid"), status(404));
  const id = "507f1f77bcf86cd799439011";
  await assert.rejects(f.service.explanation("nurse", id), status(404));
  const run: any = {
    missionId: m.id,
    profileVersion: "2026-01-01T00:00:00.000Z:1",
    missionVersion: 1,
    missionStatus: "OPEN",
    rulesVersion: MATCH_RULES.version,
    result: { eligible: true },
  };
  f.runs.findOne = (query: any) => {
    assert.equal(query.ownerId, "nurse");
    assert.equal(query._id, id);
    assert.ok(query.expiresAt.$gt instanceof Date);
    return { lean: async () => run };
  };
  let r = await f.service.explanation("nurse", id);
  assert.equal(r.stale, false);
  assert.equal(r.notice, null);
  for (const patch of [
    { missionVersion: 2 },
    { rulesVersion: "old" },
    { missionStatus: "CANCELLED" },
    { profileVersion: "old" },
  ]) {
    const old = { ...run };
    Object.assign(run, patch);
    r = await f.service.explanation("nurse", id);
    assert.equal(r.stale, true);
    assert.equal(r.notice, "RECALCULATE_REQUIRED");
    Object.assign(run, old);
  }
  f.conn.asPromise = async () => {
    throw new Error("offline");
  };
  await assert.rejects(f.service.explanation("nurse", id), status(503));
});
test("matching endpoints forward authenticated identity and pagination to the matching service", async () => {
  const calls: any[] = [];
  const service: any = {};
  for (const method of ["forPair", "forNurse", "forMission", "explanation"])
    service[method] = (...args: any[]) => {
      calls.push([method, ...args]);
      return "result";
    };
  const Controller = Reflect.getMetadata("controllers", MatchingModule)[0],
    c = new Controller(service),
    req = { session: { userId: "nurse" } },
    page = { limit: 3, offset: 2 };
  assert.equal(c.rules(), MATCH_RULES);
  assert.equal(c.pair(req, "mission"), "result");
  c.matches(req, page);
  c.candidates(req, "mission", page);
  c.explanation(req, "history");
  assert.deepEqual(calls, [
    ["forPair", "nurse", "mission"],
    ["forNurse", "nurse", page],
    ["forMission", "nurse", "mission", page],
    ["explanation", "nurse", "history"],
  ]);
  assert.throws(() => c.matches({ session: {} }, page), status(401));
});
