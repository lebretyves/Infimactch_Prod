import { test } from "node:test";
import assert from "node:assert/strict";
import { MissionsService } from "../../src/missions/missions.service";
import * as receipt from "../../src/common/idempotency";
import * as database from "../../src/database/database";
import * as mail from "../../src/automation/mission-mail";
import * as distance from "../../src/database/distance";
const status = (n: number) => (e: any) => e.getStatus?.() === n;
function fixture(t: any) {
  const start = new Date(Date.now() + 86400000).toISOString(),
    end = new Date(Date.now() + 115200000).toISOString();
  const m: any = {
    id: "mission",
    agency_id: "agency",
    establishment_id: "hospital",
    version: 1,
    status: "OPEN",
    start_at: start,
    end_at: end,
    timezone: "Europe/Paris",
    schedule_precision: "EXACT",
    qualification: "IDE",
    service: "URGENCES",
    population: "ADULT",
    block: "NONE",
    specialty: null,
    required_skills: [],
    desired_skills: [],
    min_experience_months: 0,
    latitude: 48,
    longitude: 2,
    shift: "DAY",
  };
  const p = {
    user_id: "nurse",
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
    preferred_shifts: [],
  };
  const a: any = {
    id: "assignment",
    application_id: "application",
    mission_id: "mission",
    nurse_id: "nurse",
    status: "ACTIVE",
    start_at: start,
    end_at: end,
  };
  let application: any = {
      id: "application",
      mission_id: "mission",
      nurse_id: "nurse",
      status: "SUBMITTED",
      consent_version: 1,
    },
    assignments: any[] = [];
  const calls: any[] = [],
    events: any[] = [],
    audits: any[] = [],
    cancellations: any[] = [];
  let replay = false;
  t.mock.method(receipt, "commandReceipt", async () => ({
    replay,
    response: { id: "replayed" },
    save: async (v: any) => v,
  }));
  t.mock.method(database, "audit", async (_db: any, ...args: any[]) => {
    audits.push(args);
  });
  t.mock.method(database, "event", async (_db: any, ...args: any[]) => {
    events.push(args);
    return undefined as any;
  });
  t.mock.method(
    mail,
    "cancellationRecord",
    async (_db: any, ...args: any[]) => {
      cancellations.push(args);
      return undefined as any;
    },
  );
  t.mock.method(distance, "geodesicKm", async () => 0);
  const db: any = {
    query: async (sql: string, args: any[] = []) => {
      calls.push({ sql, args });
      if (sql.includes("FROM mission m")) return [m];
      if (sql.includes("FROM membership")) return [{ kind: "AGENCY" }];
      if (sql.includes("FROM account")) return [{ id: "nurse" }];
      if (sql.startsWith("SELECT * FROM profile")) return [p];
      if (
        sql.startsWith("SELECT mission_id,nurse_id FROM assignment") ||
        sql.startsWith("SELECT * FROM assignment WHERE id=")
      )
        return [a];
      if (sql.includes("FROM assignment")) return assignments;
      if (sql.includes("FROM application"))
        return application ? [application] : [];
      if (sql.startsWith("UPDATE mission SET status=$2"))
        return [
          { id: "mission", status: args[1], version: m.version + args[2] },
        ];
      if (sql.startsWith("INSERT INTO application"))
        return [{ ...application, status: "SUBMITTED" }];
      if (sql.startsWith("INSERT INTO assignment")) return [a];
      if (sql.startsWith("UPDATE application a")) return [{ id: "competing" }];
      if (sql.startsWith("INSERT INTO outbox")) return [{ id: "event" }];
      return [];
    },
  };
  db.transaction = async (fn: any) => fn(db);
  return {
    s: new MissionsService(db),
    db,
    m,
    p,
    a,
    calls,
    events,
    audits,
    cancellations,
    set replay(v: boolean) {
      replay = v;
    },
    set application(v: any) {
      application = v;
    },
    set assignments(v: any[]) {
      assignments = v;
    },
  };
}
test("mission publication, reopening and completion enforce legal states and persist versioned events", async (t) => {
  const f = fixture(t);
  await assert.rejects(
    f.s.transition("actor", "mission", "publish", "key"),
    status(409),
  );
  f.m.status = "DRAFT";
  assert.deepEqual(await f.s.transition("actor", "mission", "publish", "key"), {
    id: "mission",
    status: "OPEN",
    version: 1,
  });
  f.m.status = "CANCELLED";
  assert.deepEqual(await f.s.transition("actor", "mission", "reopen", "key"), {
    id: "mission",
    status: "DRAFT",
    version: 2,
  });
  f.m.status = "FILLED";
  await assert.rejects(
    f.s.transition("actor", "mission", "complete", "key"),
    status(409),
  );
  f.m.end_at = new Date(Date.now() - 1000).toISOString();
  f.assignments = [f.a];
  assert.equal(
    (await f.s.transition("actor", "mission", "complete", "key")).status,
    "COMPLETED",
  );
  assert.ok(
    f.calls.some(
      (c) => c.sql.startsWith("UPDATE assignment") && c.args[1] === "COMPLETED",
    ),
  );
  assert.equal(f.events.at(-1)[0], "MissionCOMPLETED");
});
test("mission publication rejects past dates and dates beyond the supported horizon", async (t) => {
  const f = fixture(t);
  f.m.status = "DRAFT";
  f.m.start_at = "2000-01-01T00:00:00Z";
  await assert.rejects(
    f.s.transition("actor", "mission", "publish", "key"),
    status(409),
  );
  f.m.start_at = "2099-01-01T00:00:00Z";
  f.m.end_at = "2099-01-01T08:00:00Z";
  await assert.rejects(
    f.s.transition("actor", "mission", "publish", "key"),
    status(409),
  );
  assert.equal(
    f.calls.some((c) => c.sql.startsWith("UPDATE")),
    false,
  );
});
test("enterprise cancellation invalidates confirmations and records affected nurses", async (t) => {
  const f = fixture(t);
  f.m.status = "FILLED";
  f.assignments = [f.a];
  assert.equal(
    (await f.s.transition("actor", "mission", "cancel", "key")).status,
    "CANCELLED",
  );
  assert.equal(f.cancellations[0][2], "ENTERPRISE");
  assert.ok(
    f.calls.some((c) =>
      c.sql.includes("UPDATE mission_confirmation SET status='CANCELLED'"),
    ),
  );
  assert.deepEqual(f.events[0], [
    "MissionCANCELLED",
    {
      missionId: "mission",
      version: 1,
      previousStatus: "FILLED",
      nurseIds: ["nurse"],
    },
  ]);
  f.replay = true;
  const before = f.calls.length;
  assert.deepEqual(await f.s.transition("actor", "mission", "cancel", "key"), {
    id: "replayed",
  });
  assert.equal(
    f.calls.slice(before).some((c) => c.sql.startsWith("UPDATE")),
    false,
  );
});
test("application checks and submissions bind fresh consent and reject closed missions", async (t) => {
  const f = fixture(t);
  assert.deepEqual(
    (await f.s.applicationCheck("nurse", "mission")).blockingReasons,
    [],
  );
  await assert.rejects(f.s.apply("nurse", "mission", 2, "key"), status(409));
  const result = await f.s.apply("nurse", "mission", 1, "key");
  assert.equal(result.status, "SUBMITTED");
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(
    f.calls.find((c) => c.sql.startsWith("INSERT INTO application"))!.args,
    ["mission", "nurse", 1],
  );
  f.m.status = "FILLED";
  f.application = { status: "ACCEPTED" };
  await assert.rejects(f.s.apply("nurse", "mission", 1, "key"), status(409));
  f.application = null;
  await assert.rejects(
    f.s.apply("nurse", "mission", 1, "key"),
    (e) => status(409)(e) && (e as any).getResponse().code === "INELIGIBLE",
  );
});
test("nurse assignment cancellation withdraws consent, invalidates PDF and reopens the mission", async (t) => {
  const f = fixture(t);
  f.m.status = "FILLED";
  await assert.rejects(
    f.s.cancelAssignment("stranger", "assignment", "key"),
    status(404),
  );
  assert.deepEqual(await f.s.cancelAssignment("nurse", "assignment", "key"), {
    id: "assignment",
    status: "CANCELLED",
  });
  assert.equal(f.cancellations[0][2], "NURSE");
  assert.ok(
    f.calls.some((c) => c.sql.includes("UPDATE mission SET status='OPEN'")),
  );
  assert.ok(
    f.calls.some((c) =>
      c.sql.includes("UPDATE application SET status='WITHDRAWN'"),
    ),
  );
  assert.ok(f.calls.some((c) => c.sql.startsWith("INSERT INTO notification")));
  f.a.status = "CANCELLED";
  assert.equal(
    (await f.s.cancelAssignment("nurse", "assignment", "key")).status,
    "CANCELLED",
  );
  f.a.status = "COMPLETED";
  await assert.rejects(
    f.s.cancelAssignment("nurse", "assignment", "key"),
    status(409),
  );
  f.a.status = "ACTIVE";
  f.a.start_at = "2000-01-01";
  await assert.rejects(
    f.s.cancelAssignment("nurse", "assignment", "key"),
    status(409),
  );
});
test("assignment requires an idempotency key, closes overlapping applications and translates SQL conflicts", async (t) => {
  const f = fixture(t);
  await assert.rejects(
    f.s.assign("actor", "mission", "application", ""),
    status(400),
  );
  const assigned = await f.s.assign("actor", "mission", "application", "key");
  assert.equal(assigned.id, "assignment");
  assert.ok(
    f.audits.some(
      (a) => a[1] === "APPLICATION_UNAVAILABLE" && a[2] === "competing",
    ),
  );
  assert.deepEqual(f.events[0], [
    "AssignmentCreated",
    { assignmentId: "assignment", missionId: "mission", version: 1 },
  ]);
  f.application = {
    id: "application",
    nurse_id: "nurse",
    status: "SUBMITTED",
    consent_version: 0,
  };
  await assert.rejects(
    f.s.assign("actor", "mission", "application", "key2"),
    status(409),
  );
  f.db.transaction = async () => {
    throw Object.assign(new Error("private SQL"), { code: "23P01" });
  };
  await assert.rejects(
    f.s.assign("actor", "mission", "application", "key3"),
    (e) => status(409)(e) && !String(e).includes("private SQL"),
  );
});
