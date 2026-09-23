import { test } from "node:test";
import assert from "node:assert/strict";
import { sendReminders } from "../../src/automation/reminders";
import {
  PersonalCorrectionsService,
  PersonalCorrectionsController,
  AdminPersonalCorrectionsController,
} from "../../src/profiles/personal-corrections";
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
test("reminders honour recipient budget and never partially notify a mission", async () => {
  let remaining = 1;
  const f = fixture((sql) =>
    sql.includes("AS missions")
      ? [{ missions: 0, recipients: 100 - remaining }]
      : sql.startsWith("SELECT * FROM mission")
        ? [
            {
              id: "mission",
              version: 2,
              reminder_count: 1,
              agency_id: "agency",
              establishment_id: "hospital",
            },
          ]
        : sql.startsWith("SELECT a.id AS user_id")
          ? [{ user_id: "a" }, { user_id: "b" }]
          : sql.startsWith("INSERT INTO outbox")
            ? [{ id: "event" }]
            : [],
  );
  const sent: any[] = [];
  const notice: any = async (...args: any[]) => {
    sent.push(args);
    return [{ id: "notice" }];
  };
  assert.deepEqual(await sendReminders(f.db, notice), {
    status: "PROCESSED",
    processed: 0,
    notifications: 0,
    hasMore: false,
    budgetLimited: true,
  });
  assert.equal(sent.length, 0);
  remaining = 2;
  const r = await sendReminders(f.db, notice);
  assert.equal(r.notifications, 2);
  assert.equal(r.processed, 1);
  assert.equal(r.budgetLimited, true);
  assert.ok(sent.every((a) => a[3] === "REMINDER"));
  assert.deepEqual(
    f.calls.find((c) => c.sql.startsWith("INSERT INTO reminder_window")).args,
    ["mission", 2, "reminder-2", "event", 2],
  );
  remaining = 0;
  assert.equal((await sendReminders(f.db, notice)).processed, 0);
});
test("personal correction request records old and proposed value without changing identity immediately", async () => {
  let pending = false;
  const f = fixture((sql) =>
    sql.startsWith("SELECT email")
      ? [{ email: "old@example.test" }]
      : sql.startsWith("SELECT * FROM profile")
        ? [{ details: { firstName: "Alice" } }]
        : sql.startsWith("SELECT id FROM personal_correction")
          ? pending
            ? [{ id: "pending" }]
            : []
          : sql.startsWith("INSERT INTO personal_correction")
            ? [{ id: "request", status: "REQUESTED" }]
            : [],
  );
  const s = new PersonalCorrectionsService(f.db);
  await assert.rejects(
    s.request("actor", { field: "firstName", value: "Alice" }),
    (e) => (e as any).getStatus() === 409,
  );
  assert.deepEqual(
    await s.request("actor", { field: "email", value: " New@Example.test " }),
    { id: "request", status: "REQUESTED" },
  );
  assert.deepEqual(
    f.calls.find((c) => c.sql.startsWith("INSERT INTO personal_correction"))
      .args,
    ["actor", "email", "new@example.test", "old@example.test"],
  );
  assert.equal(
    f.calls.some((c) => c.sql.startsWith("UPDATE account")),
    false,
  );
  pending = true;
  await assert.rejects(
    s.request("actor", { field: "email", value: "new@example.test" }),
    (e) => (e as any).getStatus() === 409,
  );
});
for (const field of ["email", "firstName", "phone"] as const)
  test(
    "approved " +
      field +
      " correction applies only after identity verification and current-value check",
    async () => {
      const previous =
        field === "email"
          ? "old@example.test"
          : field === "firstName"
            ? "Alice"
            : "0102030405";
      const value =
        field === "email"
          ? "new@example.test"
          : field === "firstName"
            ? "Alicia"
            : "";
      let changed = false;
      const f = fixture((sql) =>
        sql.startsWith("SELECT account_id")
          ? [{ account_id: "actor" }]
          : sql.startsWith("SELECT email,active")
            ? [{ email: previous, active: true, platform_only: false }]
            : sql.startsWith("SELECT * FROM profile")
              ? [
                  {
                    display_name: "Alice",
                    details: { [field]: changed ? "Changed" : previous },
                  },
                ]
              : sql.startsWith("SELECT * FROM personal_correction")
                ? [
                    {
                      account_id: "actor",
                      status: "REQUESTED",
                      field,
                      proposed_value: value,
                      previous_value: previous,
                    },
                  ]
                : [],
      );
      const s = new PersonalCorrectionsService(f.db);
      await assert.rejects(
        s.decide("admin", "request", { reason: "Verified request" }, true),
        (e) => (e as any).getStatus() === 409,
      );
      assert.deepEqual(
        await s.decide(
          "admin",
          "request",
          { identityVerified: true, reason: "Verified request" },
          true,
        ),
        { ok: true },
      );
      if (field === "email") {
        assert.deepEqual(
          f.calls.find((c) => c.sql.startsWith("UPDATE account SET email"))
            .args,
          ["actor", "new@example.test"],
        );
        assert.ok(f.calls.some((c) => c.sql.startsWith("DELETE FROM session")));
        assert.ok(
          f.calls.some((c) => c.sql.startsWith("UPDATE recovery_request")),
        );
      } else {
        const update = f.calls.find((c) => c.sql.startsWith("UPDATE profile"));
        assert.equal(update.args[3], field === "firstName");
        const details = JSON.parse(update.args[1]);
        assert.equal(details[field], field === "phone" ? undefined : value);
        changed = true;
        await assert.rejects(
          s.decide(
            "admin",
            "request",
            { identityVerified: true, reason: "Verified request" },
            true,
          ),
          (e) => (e as any).getStatus() === 409,
        );
      }
    },
  );
test("correction controllers scope users and require recent admin confirmation for decisions", async () => {
  const f = fixture((sql) =>
      sql.startsWith("SELECT count") ? [{ total: 1 }] : [],
    ),
    calls: any[] = [],
    service: any = {
      request: async (...args: any[]) => {
        calls.push(args);
        return { id: "request" };
      },
      decide: async (...args: any[]) => {
        calls.push(args);
        return { ok: true };
      },
    },
    c = new PersonalCorrectionsController(f.db, service),
    admin = new AdminPersonalCorrectionsController(f.db, service),
    req: any = { session: { userId: "actor" } },
    staff: any = {
      adminRole: "OWNER",
      session: { adminId: "admin", adminVerifiedAt: Date.now() },
    };
  assert.deepEqual(await c.get(req), { request: null });
  const b: any = { field: "firstName", value: "Alicia" };
  await c.post(req, b);
  assert.deepEqual(calls[0], ["actor", b]);
  assert.equal((await admin.list(staff, { limit: 10, offset: 0 })).total, 1);
  await admin.approve(staff, "request", {
    identityVerified: true,
    reason: "Verified request",
  });
  await admin.reject(staff, "request", { reason: "Identity unverified" });
  assert.equal(calls[1][3], true);
  assert.equal(calls[2][3], false);
});
