import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ProfilesService,
  ProfilesController,
} from "../../src/profiles/profiles.module";
const status = (n: number) => (e: any) => e.getStatus?.() === n;
const slot = { start: "2030-01-15T08:00:00Z", end: "2030-01-15T16:00:00Z" };
const profile = {
  display_name: "Alice",
  qualifications: ["IDE"],
  available: [slot],
  unavailable: [],
  details: { firstName: "Alice" },
};
function body() {
  return {
    displayName: "Alice",
    qualifications: ["IDE"],
    skills: [],
    experience: [],
    available: [slot],
    unavailable: [],
    latitude: 48,
    longitude: 2,
    radiusKm: 30,
    acceptedShifts: ["DAY"],
    preferredShifts: [],
    visible: true,
    details: { firstName: "Alice" },
  } as any;
}
function fixture(assignments: any[] = [], current: any = profile) {
  const calls: any[] = [];
  const db: any = {
    query: async (sql: string, args: any[] = []) => {
      calls.push({ sql, args });
      return sql.startsWith("SELECT * FROM profile")
        ? [current]
        : sql.includes("FROM assignment")
          ? assignments
          : [];
    },
  };
  db.transaction = async (fn: any) => fn(db);
  return { s: new ProfilesService(db), db, calls };
}
test("availability changes merge periods, write actor-scoped data and enqueue matching", async () => {
  const f = fixture();
  const next = await f.s.changeAvailability("actor", {
    changes: [
      { start: slot.end, end: "2030-01-15T18:00:00Z", state: "available" },
    ],
  });
  assert.equal(next.available.length, 1);
  assert.equal(next.available[0]!.end, "2030-01-15T18:00:00.000Z");
  const update = f.calls.find((c) => c.sql.startsWith("UPDATE profile"));
  assert.equal(update.args[0], "actor");
  assert.deepEqual(JSON.parse(update.args[1]), next.available);
  assert.ok(f.calls.some((c) => c.sql.startsWith("INSERT INTO outbox")));
});
test("availability rejects invalid intervals and cannot remove a committed assignment period", async () => {
  const f = fixture([{ start_at: slot.start, end_at: slot.end }]);
  await assert.rejects(
    f.s.changeAvailability("actor", {
      changes: [{ ...slot, start: "invalid", state: "available" }],
    }),
    status(400),
  );
  assert.equal(f.calls.length, 0);
  await assert.rejects(
    f.s.changeAvailability("actor", {
      changes: [{ ...slot, state: "unavailable" }],
    }),
    (e) =>
      status(409)(e) &&
      (e as any).getResponse().code === "ACTIVE_ASSIGNMENT_INCOMPATIBLE",
  );
  assert.equal(
    f.calls.some((c) => c.sql.startsWith("UPDATE")),
    false,
  );
});
test("full profile update preserves personal identity, qualifications and committed availability", async () => {
  const f = fixture([
    { start_at: slot.start, end_at: slot.end, qualification: "IDE" },
  ]);
  await assert.rejects(
    f.s.update("actor", { ...body(), displayName: "Someone else" }),
    status(403),
  );
  await assert.rejects(
    f.s.update("actor", { ...body(), qualifications: [], available: [] }),
    (e) =>
      status(409)(e) &&
      JSON.stringify((e as any).getResponse().reasons) ===
        '["QUALIFICATION_MISSING","NOT_FULLY_AVAILABLE"]',
  );
  assert.equal(
    f.calls.some((c) => c.sql.startsWith("UPDATE")),
    false,
  );
  assert.deepEqual(await f.s.update("actor", body()), { ok: true });
  const update = f.calls.find((c) => c.sql.startsWith("UPDATE profile"));
  assert.equal(update.args[0], "actor");
  assert.equal(update.args[1], "Alice");
  assert.deepEqual(update.args[2], ["IDE"]);
  assert.deepEqual(JSON.parse(update.args[13]), { firstName: "Alice" });
  assert.ok(
    f.calls.some((c) => c.sql.startsWith("DELETE FROM profile_qualification")),
  );
  assert.ok(
    f.calls.some((c) => c.sql.startsWith("INSERT INTO profile_qualification")),
  );
  const unchangedDetails = fixture();
  await unchangedDetails.s.update("actor", { ...body(), details: undefined });
  assert.equal(
    unchangedDetails.calls.find((c) => c.sql.startsWith("UPDATE profile"))
      .args[13],
    null,
  );
});
test("profile reads normalize overlapping legacy periods without persisting silent edits", async () => {
  const f = fixture([], { ...profile, available: [slot, slot] });
  const c = new ProfilesController(f.db, f.s, {} as any);
  const result = await c.get({ session: { userId: "actor" } } as any);
  assert.equal(result.available.length, 1);
  assert.equal(
    f.calls.some((c) => c.sql.startsWith("UPDATE")),
    false,
  );
});
test("profile endpoints use the authenticated actor and RPPS retry requires an existing number", async () => {
  const calls: any[] = [],
    service: any = {};
  for (const name of ["changeAvailability", "changeSearchArea", "update"])
    service[name] = (...args: any[]) => {
      calls.push([name, ...args]);
      return { ok: true };
    };
  let number: string | undefined;
  const c = new ProfilesController(
      { query: async () => [{ rpps_number: number }] } as any,
      service,
      {
        verify: async (...args: any[]) => {
          calls.push(["rpps", ...args]);
          return { status: "PENDING" };
        },
      } as any,
    ),
    req: any = { session: { userId: "actor" } },
    b: any = {};
  c.availability(req, b);
  c.searchArea(req, b);
  c.update(req, b);
  await c.rppsCheck(req, { number: "12345678901" });
  await assert.rejects(c.retry(req), status(400));
  number = "10987654321";
  await c.retry(req);
  assert.deepEqual(calls, [
    ["changeAvailability", "actor", b],
    ["changeSearchArea", "actor", b],
    ["update", "actor", b],
    ["rpps", "actor", "12345678901"],
    ["rpps", "actor", "10987654321"],
  ]);
});
