import { test } from "node:test";
import assert from "node:assert/strict";
import {
  queueReminderEmail,
  reminderContent,
  scheduledReminders,
} from "../../src/automation/scheduled-reminders";
const mission = {
  id: "mission",
  version: 3,
  title: 'IDE <script>"&test</script>',
  start_at: "2030-03-31T06:00:00Z",
  timezone: "Europe/Paris",
  agency_id: "agency",
  establishment_id: "hospital",
  assignment_id: "assignment",
  nurse_id: "nurse",
};
function origin(t: any) {
  for (const key of ["APP_ORIGIN", "NOTIFICATION_APP_ORIGIN"]) {
    const before = process.env[key];
    t.after(() => {
      if (before === undefined) delete process.env[key];
      else process.env[key] = before;
    });
    delete process.env[key];
  }
  process.env.APP_ORIGIN = "https://example.invalid";
}
test("reminder messages escape user content and show actual local time over DST", () => {
  for (const kind of [
    "REMINDER",
    "START_REMINDER_24H",
    "START_REMINDER_2H",
  ] as const) {
    const message = reminderContent(
      kind,
      mission,
      'https://example.invalid/?x="&',
    );
    assert.ok(!message.html.includes("<script>"));
    assert.ok(message.html.includes("&lt;script&gt;"));
    assert.ok(message.text.includes("08:00"));
    assert.ok(message.text.includes("Europe/Paris"));
    assert.ok(
      message.subject.includes(
        kind === "REMINDER"
          ? "pourvoir"
          : kind === "START_REMINDER_24H"
            ? "J-1"
            : "H-2",
      ),
    );
  }
  assert.ok(
    reminderContent(
      "REMINDER",
      { ...mission, timezone: undefined },
      "/mission",
    ).text.includes("Europe/Paris"),
  );
});
test("inactive account queues nothing and missing origin fails closed", async (t) => {
  origin(t);
  let writes = 0;
  const em: any = {
    query: async (sql: string) => {
      if (!sql.startsWith("SELECT")) writes++;
      return [];
    },
  };
  await queueReminderEmail(
    em,
    "event",
    { user_id: "user", role: "NURSE" },
    "REMINDER",
    mission,
  );
  assert.equal(writes, 0);
  delete process.env.APP_ORIGIN;
  await assert.rejects(
    queueReminderEmail(
      { query: async () => [{ email: "test@example.invalid" }] } as any,
      "event",
      { user_id: "user", role: "NURSE" },
      "REMINDER",
      mission,
    ),
    /APP_ORIGIN_REQUIRED/,
  );
});
test("email queue separates recipients, organization scope, links and expiration windows", async (t) => {
  origin(t);
  process.env.NOTIFICATION_APP_ORIGIN = "https://preferred.invalid";
  for (const [role, kind, org] of [
    ["NURSE", "START_REMINDER_24H", null],
    ["AGENCY", "START_REMINDER_2H", "agency"],
    ["ESTABLISHMENT", "REMINDER", "hospital"],
  ] as const) {
    let row: any[] = [];
    const em: any = {
      query: async (sql: string, args: any[]) => {
        if (sql.startsWith("SELECT"))
          return [{ email: "recipient@example.invalid" }];
        row = args;
        return [];
      },
    };
    await queueReminderEmail(
      em,
      "event",
      { user_id: "actor", role },
      kind,
      mission,
      kind === "REMINDER" ? null : "assignment",
    );
    assert.equal(row[2], org);
    assert.equal(row[4], "recipient@example.invalid");
    assert.equal(row[7], 3);
    const payload = JSON.parse(row[5]);
    assert.ok(
      payload.text.includes(
        "https://preferred.invalid" +
          (role === "NURSE"
            ? "/missions/m_mission"
            : "/gestion/missions/mission"),
      ),
    );
    assert.equal(
      row[9].getTime(),
      new Date(mission.start_at).getTime() -
        (kind === "START_REMINDER_24H" ? 7200000 : 0),
    );
  }
});
test("scheduler with no due assignments emits no receipt or notification", async () => {
  let writes = 0;
  const em: any = {
    query: async (sql: string) => {
      if (sql.startsWith("INSERT")) writes++;
      return [];
    },
  };
  const result = await scheduledReminders({
    transaction: async (fn: any) => fn(em),
  } as any);
  assert.equal(result.processed, 0);
  assert.equal(result.hasMore, false);
  assert.equal(writes, 0);
});
for (const kind of ["START_REMINDER_24H", "START_REMINDER_2H"] as const)
  test(
    "scheduler scopes all recipients and timestamps for " + kind,
    async (t) => {
      origin(t);
      const notices: any[][] = [];
      const receipts: any[][] = [];
      let emails = 0;
      const em: any = {
        query: async (sql: string, args: any[] = []) => {
          if (sql.includes("FROM assignment a JOIN mission"))
            return [{ ...mission, reminder_kind: kind }];
          if (sql.includes("SELECT a.id AS user_id"))
            return [
              { user_id: "nurse", role: "NURSE" },
              { user_id: "agent", role: "AGENCY" },
              { user_id: "member", role: "ESTABLISHMENT" },
            ];
          if (sql.startsWith("SELECT email"))
            return [{ email: "fixture@example.invalid" }];
          if (sql.startsWith("INSERT INTO outbox")) return [{ id: "event" }];
          if (sql.startsWith("INSERT INTO notification(")) notices.push(args);
          if (sql.startsWith("INSERT INTO mission_email")) emails++;
          if (sql.startsWith("INSERT INTO assignment_reminder"))
            receipts.push(args);
          return [];
        },
      };
      const result = await scheduledReminders({
        transaction: async (fn: any) => fn(em),
      } as any);
      assert.equal(result.notifications, 3);
      assert.equal(emails, 3);
      assert.equal(receipts.length, 1);
      assert.deepEqual(
        notices.map((n) => n[4]),
        [null, "agency", "hospital"],
      );
      assert.ok(notices[0]![3].includes("Votre affectation"));
      assert.ok(notices[1]![3].includes("votre organisation"));
      const context = JSON.parse(notices[0]![6]);
      assert.equal(context.assignmentId, "assignment");
      assert.equal(
        new Date(context.expiresAt).getTime(),
        new Date(mission.start_at).getTime() -
          (kind === "START_REMINDER_24H" ? 7200000 : 0),
      );
    },
  );
test("scheduler propagates a queue failure rather than committing a reminder receipt", async (t) => {
  origin(t);
  let receipt = false;
  const em: any = {
    query: async (sql: string) => {
      if (sql.includes("FROM assignment a JOIN mission"))
        return [{ ...mission, reminder_kind: "START_REMINDER_2H" }];
      if (sql.includes("SELECT a.id AS user_id"))
        return [{ user_id: "nurse", role: "NURSE" }];
      if (sql.startsWith("INSERT INTO outbox")) return [{ id: "event" }];
      if (sql.startsWith("SELECT email"))
        return [{ email: "fixture@example.invalid" }];
      if (sql.startsWith("INSERT INTO mission_email"))
        throw Error("queue unavailable");
      if (sql.startsWith("INSERT INTO assignment_reminder")) receipt = true;
      return [];
    },
  };
  await assert.rejects(
    scheduledReminders({ transaction: async (fn: any) => fn(em) } as any),
    /queue unavailable/,
  );
  assert.equal(receipt, false);
});
