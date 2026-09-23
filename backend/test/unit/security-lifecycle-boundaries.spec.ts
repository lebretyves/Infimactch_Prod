import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSync } from "class-validator";
import { plainToInstance } from "class-transformer";
import { retryOutbox } from "../../src/automation/automation.module";
import * as database from "../../src/database/database";
import {
  closureBlockers,
  lockClosure,
} from "../../src/security/closure-blockers";
import { AuthController } from "../../src/auth/auth.module";
import { EnterpriseMissionsPageDto } from "../../src/organizations/establishment-directory";
import {
  ensureAvailabilityLimit,
  validateProfile,
} from "../../src/profiles/profile-validation";

const id = "11111111-1111-4111-8111-111111111111";
test("outbox retry rejects invalid, missing and reserved events and preserves completed events", async (t) => {
  let row: any;
  const writes: any[] = [];
  let transactions = 0;
  const db: any = {
    transaction: async (fn: any) => {
      transactions++;
      return fn(db);
    },
    query: async (sql: string, args: any[]) => {
      if (sql.startsWith("SELECT")) return row ? [row] : [];
      writes.push({ sql, args });
      return [];
    },
  };
  const audits: any[] = [];
  t.mock.method(database, "audit", async (...args: any[]) => {
    audits.push(args);
  });
  await assert.rejects(retryOutbox(db, "not-a-uuid"), /Invalid event UUID/);
  assert.equal(transactions, 0);
  await assert.rejects(retryOutbox(db, id), /Retryable event not found/);
  row = { event: "Unsupported" };
  await assert.rejects(retryOutbox(db, id), /Retryable event not found/);
  row = { event: "MissionOPEN", completed_at: new Date() };
  assert.deepEqual(await retryOutbox(db, id), {
    id,
    status: "ALREADY_COMPLETED",
  });
  row = { event: "MissionOPEN", lease_until: new Date(Date.now() + 60000) };
  await assert.rejects(retryOutbox(db, id), /still reserved/);
  assert.equal(writes.length, 0);
  assert.equal(audits.length, 0);
  for (const event of [
    "MissionOPEN",
    "MatchRequested",
    "AssignmentCreated",
    "MissionCANCELLED",
  ]) {
    row = { event, attempts: 5, lease_until: new Date(0) };
    assert.deepEqual(await retryOutbox(db, id), { id, status: "QUEUED" });
    assert.match(writes.at(-1).sql, /attempts=0/);
    assert.match(writes.at(-1).sql, /lease_token=NULL/);
    assert.deepEqual(writes.at(-1).args, [id]);
    assert.deepEqual(audits.at(-1).slice(1), [
      null,
      "OUTBOX_REQUEUED",
      id,
      { previousAttempts: 5 },
    ]);
  }
});
test("closure blockers report every obligation and lock account, profile and organizations in order", async () => {
  const calls: any[] = [];
  let blocked = true;
  const db: any = {
    query: async (sql: string, args: any[]) => {
      calls.push({ sql, args });
      if (sql.startsWith("SELECT platform_only"))
        return [{ platform_only: false }];
      if (!blocked) return [];
      if (sql.startsWith("SELECT o.name"))
        return [{ name: "Hospital A" }, { name: "Hospital B" }];
      return [{ id }];
    },
  };
  const blockers = await closureBlockers(db, id);
  assert.deepEqual(
    blockers.map((b) => b.code),
    [
      "ADMIN_ACCOUNT",
      "ACTIVE_ASSIGNMENT",
      "ACTIVE_APPLICATION",
      "LAST_MANAGER",
      "LAST_MANAGER",
    ],
  );
  assert.match(blockers[3]!.label, /Hospital A/);
  assert.match(blockers[4]!.label, /Hospital B/);
  assert.ok(calls.every((c) => c.args[0] === id));
  blocked = false;
  assert.deepEqual(await closureBlockers(db, id), []);
  calls.length = 0;
  await lockClosure(db, id);
  assert.equal(calls.length, 4);
  assert.match(calls[0].sql, /pg_advisory_xact_lock/);
  assert.match(calls[1].sql, /account.*FOR UPDATE/);
  assert.match(calls[2].sql, /profile.*FOR UPDATE/);
  assert.match(calls[3].sql, /ORDER BY o.id FOR UPDATE OF o/);
  assert.ok(calls.slice(1).every((c) => c.args[0] === id));
});
test("Google challenges prune expired entries, bound concurrent tabs and propagate session persistence failures", async () => {
  let enabled = true;
  const c = new AuthController(
    {} as any,
    { configuration: () => ({ enabled }) } as any,
    {} as any,
  );
  let saved = 0;
  const now = Date.now();
  const req: any = {
    session: {
      googleChallenges: [
        { nonce: "expired", expires: 0 },
        ...Array.from({ length: 10 }, (_, i) => ({
          nonce: String(i),
          expires: now + 60000,
        })),
      ],
      save: (cb: any) => {
        saved++;
        cb();
      },
    },
  };
  const result = await c.googleChallenge(req);
  assert.match(result.nonce, /^[a-f0-9]{64}$/);
  assert.equal(saved, 1);
  assert.equal(req.session.googleChallenges.length, 8);
  assert.deepEqual(
    req.session.googleChallenges.slice(0, -1).map((x: any) => x.nonce),
    ["3", "4", "5", "6", "7", "8", "9"],
  );
  assert.equal(req.session.googleChallenge.nonce, result.nonce);
  assert.ok(req.session.googleChallenge.expires >= now + 600000);
  const previous = result.nonce;
  delete req.session.googleChallenges;
  assert.notEqual((await c.googleChallenge(req)).nonce, previous);
  assert.equal(req.session.googleChallenges.length, 1);
  req.session.save = (cb: any) => cb(new Error("session unavailable"));
  await assert.rejects(c.googleChallenge(req), /session unavailable/);
  enabled = false;
  await assert.rejects(
    c.googleChallenge(req),
    (e: any) => e.getStatus() === 400,
  );
});
test("enterprise query DTO rejects unsupported filters, malformed dates and unbounded pages", () => {
  const valid = {
    qualification: "IDE",
    location: "Paris",
    date: "2026-01-02",
    q: "night",
    status: "OPEN",
    shift: "NIGHT",
    sort: "start_asc",
    establishmentId: id,
    limit: "10",
    offset: "2",
  };
  const dto = plainToInstance(EnterpriseMissionsPageDto, valid);
  assert.deepEqual(validateSync(dto), []);
  assert.equal(dto.limit, 10);
  assert.equal(dto.offset, 2);
  for (const [key, value] of Object.entries({
    qualification: "OTHER",
    location: "x".repeat(151),
    date: "2026-02-31",
    q: "x".repeat(151),
    status: "DELETED",
    shift: "OTHER",
    sort: "DROP TABLE",
    establishmentId: "bad",
    limit: 51,
    offset: -1,
  })) {
    const errors = validateSync(
      plainToInstance(EnterpriseMissionsPageDto, { ...valid, [key]: value }),
    );
    assert.ok(
      errors.some((e) => e.property === key),
      key,
    );
  }
  assert.deepEqual(validateSync(new EnterpriseMissionsPageDto()), []);
});
test("profile validation enforces real birth dates, valid periods and the planning limit for both states", () => {
  const base: any = {
    available: [],
    unavailable: [],
    experience: [],
    qualifications: ["IDE"],
    preferredShifts: [],
    acceptedShifts: [],
    details: { birthDate: "2000-02-29" },
  };
  assert.doesNotThrow(() => validateProfile(structuredClone(base)));
  for (const birthDate of ["not-a-date", "2001-02-29", "2999-01-01"])
    assert.throws(
      () =>
        validateProfile({ ...structuredClone(base), details: { birthDate } }),
      /Invalid birth date/,
    );
  assert.throws(
    () =>
      validateProfile({
        ...structuredClone(base),
        available: [{ start: "invalid", end: "invalid" }],
      }),
    /Invalid interval/,
  );
  for (const field of ["available", "unavailable"]) {
    const value: any = { available: [], unavailable: [] };
    value[field] = Array(200).fill({});
    assert.doesNotThrow(() => ensureAvailabilityLimit(value));
    value[field].push({});
    assert.throws(
      () => ensureAvailabilityLimit(value),
      (e: any) => e.getResponse().code === "AVAILABILITY_LIMIT",
    );
  }
});
