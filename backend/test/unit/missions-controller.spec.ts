import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { MissionsModule } from "../../src/missions/missions.module";
import * as inbox from "../../src/missions/application-inbox";
import * as directory from "../../src/organizations/establishment-directory";
const Controller = Reflect.getMetadata("controllers", MissionsModule)[0],
  req = { session: { userId: "actor" } },
  page = { limit: 10, offset: 20 };
const status = (n: number) => (e: any) => e.getStatus?.() === n;
function fixture(answer: (sql: string, args: any[]) => any = () => []) {
  const calls: any[] = [],
    commands: any[] = [];
  const db: any = {
    query: async (sql: string, args: any[] = []) => {
      calls.push({ sql, args });
      return answer(sql, args);
    },
  };
  db.transaction = async (fn: any) => fn(db);
  const service: any = {};
  for (const name of [
    "create",
    "edit",
    "transition",
    "applicationCheck",
    "apply",
    "applicationAction",
    "assign",
    "cancelAssignment",
  ])
    service[name] = (...args: any[]) => {
      commands.push([name, ...args]);
      return { ok: true };
    };
  return { c: new Controller(service, db), db, calls, commands };
}
test("mission commands preserve actor, version consent and idempotency keys", () => {
  const f = fixture(),
    body = { title: "Mission" };
  f.c.create(req, body, "key");
  f.c.createOpen(req, body, "key");
  f.c.edit(req, "key", "mission", body);
  for (const action of ["publish", "cancel", "reopen", "complete"])
    f.c[action](req, "key", "mission");
  f.c.applicationCheck(req, "mission");
  f.c.apply(req, "key", "mission", { version: 3 });
  f.c.withdraw(req, "key", "application");
  f.c.reject(req, "key", "application");
  f.c.assign(req, "mission", { applicationId: "application" }, "key");
  f.c.cancelAssignment(req, "assignment", "key");
  assert.deepEqual(f.commands, [
    ["create", "actor", body, "key"],
    ["create", "actor", body, "key", true],
    ["edit", "actor", "mission", body, "key"],
    ...["publish", "cancel", "reopen", "complete"].map((action) => [
      "transition",
      "actor",
      "mission",
      action,
      "key",
    ]),
    ["applicationCheck", "actor", "mission"],
    ["apply", "actor", "mission", 3, "key"],
    ["applicationAction", "actor", "application", "WITHDRAWN", "key"],
    ["applicationAction", "actor", "application", "REJECTED", "key"],
    ["assign", "actor", "mission", "application", "key"],
    ["cancelAssignment", "actor", "assignment", "key"],
  ]);
  assert.throws(() => f.c.create({ session: {} }, body, "key"), status(401));
});
test("personal application and assignment lists are scoped to the session identity", async () => {
  const f = fixture(() => [{ id: "result" }]);
  assert.deepEqual(await f.c.ownAssignments(req, "mission"), [
    { id: "result" },
  ]);
  assert.deepEqual(await f.c.applications(req, page), [{ id: "result" }]);
  assert.deepEqual(
    f.calls.map((c) => c.args),
    [
      ["actor", "mission"],
      ["actor", 10, 20],
    ],
  );
});
test("cancellation documents hide missing and foreign assignments, report unavailable pending records", async () => {
  await assert.rejects(
    fixture().c.cancellationDocument(req, "assignment"),
    status(404),
  );
  const own = fixture((sql) =>
    sql.includes("FROM assignment") ? [{ nurse_id: "actor" }] : [],
  );
  assert.deepEqual(await own.c.cancellationDocument(req, "assignment"), {
    status: "UNAVAILABLE",
    document_id: null,
  });
  const denied = fixture((sql) =>
    sql.includes("FROM assignment") ? [{ nurse_id: "other" }] : [],
  );
  await assert.rejects(
    denied.c.cancellationDocument(req, "assignment"),
    status(404),
  );
  assert.equal(
    denied.calls.some((c) => c.sql.includes("FROM mission_cancellation")),
    false,
  );
  const allowed = fixture((sql) =>
    sql.includes("FROM assignment")
      ? [
          {
            nurse_id: "other",
            agency_id: "agency",
            establishment_id: "hospital",
          },
        ]
      : sql.includes("FROM membership")
        ? [{}]
        : [{ status: "READY", document_id: "doc" }],
  );
  assert.deepEqual(await allowed.c.cancellationDocument(req, "assignment"), {
    status: "READY",
    document_id: "doc",
  });
});
test("enterprise mission detail requires membership and includes management rights and chronological evidence", async () => {
  await assert.rejects(fixture().c.ownMission(req, "mission"), status(404));
  const denied = fixture((sql) =>
    sql.includes("FROM mission m") ? [{ id: "mission" }] : [],
  );
  await assert.rejects(denied.c.ownMission(req, "mission"), status(404));
  const f = fixture((sql) =>
    sql.includes("FROM mission m")
      ? [{ id: "mission", agency_id: "agency", establishment_id: "hospital" }]
      : sql.startsWith("SELECT EXISTS")
        ? [{ can_manage: false }]
        : sql.includes("FROM membership")
          ? [{}]
          : sql.includes("count(*)")
            ? [{ count: 2 }]
            : sql.includes("FROM assignment")
              ? [{ id: "assignment" }]
              : sql.includes("FROM audit")
                ? [{ event: "MISSION_OPEN" }]
                : [],
  );
  const result = await f.c.ownMission(req, "mission");
  assert.equal(result.application_count, 2);
  assert.equal(result.can_manage, false);
  assert.deepEqual(result.assignments, [{ id: "assignment" }]);
  assert.deepEqual(result.events, [{ event: "MISSION_OPEN" }]);
});
test("application detail is visible to its owner or authorised enterprise but hidden from outsiders", async () => {
  await assert.rejects(
    fixture().c.applicationDetail(req, "application"),
    status(404),
  );
  const f = fixture((sql) =>
    sql.includes("FROM application a")
      ? [{ id: "application", nurse_id: "actor" }]
      : sql.includes("FROM assignment") && !sql.includes("FROM audit")
        ? [{ id: "assignment" }]
        : sql.includes("FROM audit")
          ? [{ event: "APPLICATION_SUBMITTED" }]
          : [],
  );
  const result = await f.c.applicationDetail(req, "application");
  assert.deepEqual(result.assignments, [{ id: "assignment" }]);
  assert.equal(result.events[0].event, "APPLICATION_SUBMITTED");
  assert.equal(
    f.calls.some((c) => c.sql.includes("FROM membership")),
    false,
  );
  await assert.rejects(
    fixture((sql) =>
      sql.includes("FROM application a")
        ? [{ id: "application", nurse_id: "other" }]
        : [],
    ).c.applicationDetail(req, "application"),
    status(404),
  );
  const allowed = fixture((sql) =>
    sql.includes("FROM application a")
      ? [{ id: "application", nurse_id: "other" }]
      : sql.includes("FROM membership")
        ? [{}]
        : [],
  );
  assert.equal(
    (await allowed.c.applicationDetail(req, "application")).id,
    "application",
  );
});
test("enterprise search and application inbox forward scope and pagination to query services", async (t) => {
  const f = fixture((sql) =>
    sql.includes("FROM mission")
      ? [{ id: "mission" }]
      : sql.includes("FROM membership")
        ? [{}]
        : [],
  );
  const calls: any[] = [];
  for (const method of [
    "enterpriseMissionPage",
    "enterpriseMissionSearch",
  ] as const)
    t.mock.method(directory, method, async (db: any, actor: string, p: any) => {
      assert.equal(db, f.db);
      calls.push([method, actor, p]);
      return { items: [] } as any;
    });
  t.mock.method(
    inbox,
    "enterpriseApplicationPage",
    async (db: any, actor: string, p: any) => {
      assert.equal(db, f.db);
      calls.push(["inbox", actor, p]);
      return { items: [] } as any;
    },
  );
  t.mock.method(
    inbox,
    "missionApplicationPage",
    async (db: any, id: string, p: any) => {
      assert.equal(db, f.db);
      calls.push(["candidates", id, p]);
      return { items: [] } as any;
    },
  );
  await f.c.missionSearch(req, page);
  await f.c.missions(req, page);
  await f.c.applicationInbox(req, page);
  await f.c.candidates(req, page, "mission");
  assert.deepEqual(calls, [
    ["enterpriseMissionSearch", "actor", page],
    ["enterpriseMissionPage", "actor", page],
    ["inbox", "actor", page],
    ["candidates", "mission", page],
  ]);
});
