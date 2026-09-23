import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AutomationService,
  AutomationModule,
} from "../../src/automation/automation.module";
import * as pdf from "../../src/automation/confirmation-pdf";
import * as mail from "../../src/automation/mission-mail";
import * as reminders from "../../src/automation/reminders";
import * as distance from "../../src/database/distance";
const start = "2030-01-15T08:00:00Z",
  end = "2030-01-15T16:00:00Z";
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
  title: "Nursing mission",
  address: "Paris",
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
  details: {},
};
const status = (n: number) => (e: any) => e.getStatus?.() === n;
function fixture(answer: (sql: string, args: any[]) => any) {
  const calls: { sql: string; args: any[] }[] = [];
  const db: any = {
    query: async (sql: string, args: any[] = []) => {
      calls.push({ sql, args });
      return answer(sql, args);
    },
  };
  db.transaction = async (fn: any) => fn(db);
  const stored: any[] = [];
  const documents: any = {
    store: async (...args: any[]) => {
      stored.push(args);
      return { id: "doc", status: "READY" };
    },
  };
  return {
    service: new AutomationService(db, documents),
    db,
    documents,
    stored,
    calls,
  };
}
test("match workflow notifies only eligible profiles and consumes an event once", async (t) => {
  t.mock.method(distance, "geodesicKm", async () => 0);
  let batch = 0,
    processed = false;
  const f = fixture((sql) =>
    sql.includes("FROM outbox")
      ? [{ payload: { missionId: m.id, version: 1 } }]
      : sql.includes("FROM mission m")
        ? [m]
        : sql.includes("FROM workflow_receipt")
          ? processed
            ? [{}]
            : []
          : sql.startsWith("INSERT INTO workflow_receipt")
            ? ((processed = true), [])
            : sql.includes("FROM profile")
              ? batch++ === 0
                ? [p, { ...p, user_id: "unqualified", qualifications: [] }]
                : []
              : [],
  );
  assert.deepEqual(await f.service.matches("event"), {
    status: "PROCESSED",
    notifications: 1,
  });
  const notices = f.calls.filter((c) =>
    c.sql.startsWith("INSERT INTO notification"),
  );
  assert.equal(notices.length, 1);
  assert.equal(notices[0]!.args[0], "nurse");
  assert.equal(notices[0]!.args[5], "/missions/m_mission");
  assert.deepEqual(JSON.parse(notices[0]!.args[6]), {
    missionId: "mission",
    version: 1,
  });
  assert.deepEqual(await f.service.matches("event"), {
    status: "ALREADY_PROCESSED",
  });
});
test("missing and superseded match events never generate alerts", async () => {
  await assert.rejects(
    fixture(() => []).service.matches("missing"),
    status(404),
  );
  for (const mission of [
    { ...m, status: "CANCELLED" },
    { ...m, version: 2 },
    { ...m, start_at: "2000-01-01T00:00:00Z" },
  ]) {
    const f = fixture((sql) =>
      sql.includes("FROM outbox")
        ? [{ payload: { missionId: m.id, version: 1 } }]
        : sql.includes("FROM mission m")
          ? [mission]
          : [],
    );
    assert.deepEqual(await f.service.matches("event"), {
      status: "PROCESSED",
      notifications: 0,
    });
    assert.equal(
      f.calls.some((c) => c.sql.includes("FROM profile")),
      false,
    );
  }
});
function confirmation(
  t: any,
  options: {
    status?: string;
    confirmation?: any;
    assignment?: any;
    storageError?: boolean;
    changed?: boolean;
    leaseLost?: boolean;
  } = {},
) {
  let locks = 0;
  const c = { id: "confirmation", status: "PENDING", ...options.confirmation };
  const a = {
    id: "assignment",
    nurse_id: "nurse",
    status: "ACTIVE",
    ...options.assignment,
  };
  let queued = 0;
  t.mock.method(pdf, "createConfirmationPdf", async (data: any) => {
    assert.equal(data.assignmentId, a.id);
    assert.equal(data.missionVersion, 1);
    return Buffer.from("pdf");
  });
  t.mock.method(mail, "queueMissionEmails", async () => {
    queued++;
  });
  const f = fixture((sql) => {
    if (sql.includes("FROM outbox"))
      return [{ payload: { missionId: m.id, assignmentId: a.id, version: 1 } }];
    if (sql.includes("FROM mission m"))
      return [
        {
          ...m,
          status:
            options.changed && locks++ > 0
              ? "CANCELLED"
              : (options.status ?? "FILLED"),
        },
      ];
    if (sql.startsWith("SELECT * FROM assignment")) return [a];
    if (sql.startsWith("SELECT * FROM mission_confirmation")) return [c];
    if (sql.startsWith("SELECT lease_token"))
      return [{ lease_token: options.leaseLost ? "other" : c.lease_token }];
    if (sql.includes("professional_name"))
      return [
        {
          first_name: "Alice",
          last_name: "Martin",
          establishment_name: "Hospital",
        },
      ];
    if (sql.startsWith("SELECT a.id AS user_id"))
      return ["NURSE", "AGENCY", "ESTABLISHMENT"].map((role, i) => ({
        user_id: "recipient" + i,
        role,
      }));
    return [];
  });
  if (options.storageError)
    f.documents.store = async () => {
      throw new Error("private storage failure");
    };
  return {
    ...f,
    get queued() {
      return queued;
    },
  };
}
test("confirmation generation binds stored PDF to assignment and notifies all participant roles", async (t) => {
  const f = confirmation(t);
  assert.deepEqual(await f.service.confirmation("event"), {
    status: "READY",
    documentId: "doc",
  });
  assert.equal(f.queued, 1);
  assert.deepEqual(f.stored[0].slice(0, 3), [
    "nurse",
    "CONFIRMATION",
    "application/pdf",
  ]);
  assert.equal(f.stored[0][4], "assignment");
  const notices = f.calls.filter((c) =>
    c.sql.startsWith("INSERT INTO notification"),
  );
  assert.deepEqual(
    notices.map((c) => c.args[4]),
    [null, "agency", "hospital"],
  );
  assert.deepEqual(
    notices.map((c) => c.args[5]),
    [
      "/missions/m_mission",
      "/gestion/missions/mission",
      "/gestion/missions/mission",
    ],
  );
});
test("confirmation replay, cancelled assignment and active generation lease avoid duplicate PDF storage", async (t) => {
  const f = confirmation(t, {
    confirmation: { status: "READY", document_id: "existing" },
  });
  assert.deepEqual(await f.service.confirmation("event"), {
    done: true,
    status: "READY",
    documentId: "existing",
  });
  assert.equal(f.stored.length, 0);
});
test("confirmation cancels an obsolete assignment without storing a PDF", async (t) => {
  const f = confirmation(t, { assignment: { status: "CANCELLED" } });
  assert.deepEqual(await f.service.confirmation("event"), {
    done: true,
    status: "CANCELLED",
  });
  assert.equal(f.stored.length, 0);
});
test("confirmation reserves an exclusive generation lease", async (t) => {
  const f = confirmation(t, {
    confirmation: { lease_until: new Date(Date.now() + 60000) },
  });
  await assert.rejects(f.service.confirmation("event"), status(409));
  assert.equal(f.stored.length, 0);
});
test("mission cancellation during PDF storage prevents ready status and participant email", async (t) => {
  const f = confirmation(t, { changed: true });
  assert.deepEqual(await f.service.confirmation("event"), {
    status: "CANCELLED",
    documentId: "doc",
  });
  assert.equal(f.queued, 0);
  assert.equal(
    f.calls.some((c) => c.sql.startsWith("INSERT INTO notification")),
    false,
  );
});
test("storage failure releases only the held lease and redacts private error details", async (t) => {
  const logs: string[] = [];
  t.mock.method(console, "error", (v: string) => logs.push(v));
  const f = confirmation(t, { storageError: true });
  await assert.rejects(
    f.service.confirmation("event"),
    /private storage failure/,
  );
  const failed = f.calls.find((c) => c.sql.includes("status='FAILED'"));
  assert.ok(failed);
  assert.equal(failed.args[0], "confirmation");
  assert.equal(typeof failed.args[1], "string");
  assert.equal(JSON.parse(logs[0]!).stage, "STORAGE");
  assert.ok(!logs[0]!.includes("private storage failure"));
});
test("superseded confirmation lease cannot publish the generated document", async (t) => {
  const f = confirmation(t, { leaseLost: true });
  await assert.rejects(f.service.confirmation("event"), status(409));
  assert.equal(f.queued, 0);
  assert.equal(
    f.calls.some((c) =>
      c.sql.startsWith("UPDATE mission_confirmation SET status=$2"),
    ),
    false,
  );
});
test("cancellation deduplicates affected nurses, scopes links and skips unpublished drafts", async () => {
  let previousStatus = "FILLED",
    processed = false;
  const f = fixture((sql) =>
    sql.includes("FROM outbox")
      ? [
          {
            payload: {
              missionId: m.id,
              version: 1,
              previousStatus,
              nurseIds: ["nurse", "nurse"],
            },
          },
        ]
      : sql.includes("FROM mission m")
        ? [{ ...m, status: "CANCELLED" }]
        : sql.includes("FROM workflow_receipt")
          ? processed
            ? [{}]
            : []
          : sql.includes("FROM application")
            ? [{ nurse_id: "nurse" }, { nurse_id: "other" }]
            : sql.startsWith("SELECT a.id AS user_id")
              ? [{ user_id: "nurse", role: "NURSE" }]
              : sql.startsWith("INSERT INTO notification")
                ? [{ id: "notice" }]
                : [],
  );
  assert.deepEqual(await f.service.cancellation("event"), {
    status: "PROCESSED",
    notifications: 1,
  });
  assert.deepEqual(
    f.calls.find((c) => c.sql.startsWith("SELECT a.id AS user_id"))!.args[2],
    ["nurse", "other"],
  );
  previousStatus = "DRAFT";
  assert.deepEqual(await f.service.cancellation("event"), {
    status: "PROCESSED",
    notifications: 0,
  });
  processed = true;
  assert.deepEqual(await f.service.cancellation("event"), {
    status: "ALREADY_PROCESSED",
  });
  await assert.rejects(
    fixture(() => []).service.cancellation("missing"),
    status(404),
  );
});
test("dispatch acknowledges only successful deliveries with final receipts and reports exhausted retries", async (t) => {
  for (const [key, value] of Object.entries({
    N8N_WEBHOOK_BASE: "https://unit.invalid",
    SERVICE_TOKEN: "unit-token",
  })) {
    const old = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (old === undefined) delete process.env[key];
      else process.env[key] = old;
    });
  }
  t.mock.method(mail, "generateCancellations", async () => [] as any);
  t.mock.method(mail, "dispatchMissionEmails", async () => [] as any);
  const events = [
    { id: "ok", event: "MissionOPEN", attempts: 0 },
    { id: "no-receipt", event: "AssignmentCreated", attempts: 1 },
    { id: "http-failure", event: "MissionCANCELLED", attempts: 4 },
    { id: "network", event: "MatchRequested", attempts: 0 },
  ];
  const f = fixture((sql, args) =>
    sql.startsWith("SELECT * FROM outbox")
      ? events
      : sql.includes("FROM workflow_receipt") && args[0] === "ok"
        ? [{}]
        : [],
  );
  const urls: string[] = [];
  const transport: any = async (url: string, init: any) => {
    urls.push(url);
    assert.equal(init.headers["X-InfiMatch-Token"], "unit-token");
    const id = JSON.parse(init.body).eventId;
    if (id === "network") throw new Error("offline");
    return { ok: id !== "http-failure" };
  };
  assert.deepEqual(await f.service.dispatch(4, transport, "event"), [
    { id: "ok", status: "COMPLETED" },
    { id: "no-receipt", status: "RETRY_PENDING" },
    { id: "http-failure", status: "EXHAUSTED" },
    { id: "network", status: "RETRY_PENDING" },
  ]);
  assert.deepEqual(
    urls.map((u) => u.split("/").pop()),
    ["matches", "confirmation", "cancellation", "matches"],
  );
  assert.equal(
    f.calls.filter((c) => c.sql.startsWith("UPDATE outbox SET completed_at"))
      .length,
    1,
  );
  assert.ok(
    f.calls
      .filter((c) => c.sql.startsWith("UPDATE outbox"))
      .every((c) => typeof c.args[1] === "string"),
  );
});
test("automation endpoint rejects wrong tokens before calling service and forwards valid commands", async (t) => {
  const old = process.env.SERVICE_TOKEN;
  process.env.SERVICE_TOKEN = "unit-token";
  t.after(() => {
    if (old === undefined) delete process.env.SERVICE_TOKEN;
    else process.env.SERVICE_TOKEN = old;
  });
  const calls: any[] = [];
  const service: any = {};
  for (const name of ["matches", "confirmation", "cancellation", "reminders"])
    service[name] = (...args: any[]) => {
      calls.push([name, ...args]);
      return "ok";
    };
  const Controller = Reflect.getMetadata("controllers", AutomationModule)[0],
    c = new Controller(service);
  for (const bad of [undefined, "wrong", "unit-tokeX"])
    assert.throws(() => c.matches(bad, "event"), status(401));
  assert.equal(calls.length, 0);
  for (const name of ["matches", "confirmation", "cancellation"])
    assert.equal(c[name]("unit-token", "event"), "ok");
  assert.equal(c.reminders("unit-token"), "ok");
  assert.equal(calls.length, 4);
  t.mock.method(reminders, "sendReminders", async (_db: any, notify: any) => {
    assert.equal(typeof notify, "function");
    return { sent: 0 } as any;
  });
  assert.deepEqual(await fixture(() => []).service.reminders(), { sent: 0 });
});
