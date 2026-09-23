import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { OrganizationsModule } from "../../src/organizations/organizations.module";
import * as receipts from "../../src/common/idempotency";
import * as directory from "../../src/organizations/establishment-directory";
const Controller = Reflect.getMetadata("controllers", OrganizationsModule)[0];
const actor = "actor",
  org = "hospital",
  id = "need";
const req: any = { session: { userId: actor } };
const status = (n: number) => (e: any) => e.getStatus?.() === n;
function fixture(answer: (sql: string, args: any[]) => any) {
  const calls: { sql: string; args: any[] }[] = [];
  const db: any = {
    query: async (sql: string, args: any[] = []) => {
      calls.push({ sql, args });
      return sql.startsWith("INSERT INTO outbox")
        ? [{ id: "notice" }]
        : answer(sql, args);
    },
  };
  db.transaction = async (fn: any) => fn(db);
  return { controller: new Controller(db), db, calls };
}
function body() {
  return {
    establishmentId: org,
    title: "  New need  ",
    description: "  Nursing cover required  ",
    details: {
      start: new Date(Date.now() + 86400000 * 7).toISOString(),
      end: new Date(Date.now() + 86400000 * 7 + 3600000).toISOString(),
      schedulePrecision: "EXACT",
      timezone: "Europe/Paris",
      block: "GENERAL",
      address: "  Hospital address  ",
      requiredSkills: [],
      minExperienceMonths: 0,
    },
  };
}
test("organisation reads and directory remain scoped to the authenticated actor", async (t) => {
  const f = fixture((sql) =>
    sql.includes("FROM agency_link") ? [{ id: "linked" }] : [{ id: org }],
  );
  assert.deepEqual(await f.controller.own(req), {
    organizations: [{ id: org }],
    links: [{ id: "linked" }],
  });
  assert.ok(f.calls.every((c) => c.args[0] === actor));
  t.mock.method(
    directory,
    "establishmentPage",
    async (db: any, user: string, page: any) => {
      assert.equal(db, f.db);
      assert.equal(user, actor);
      assert.equal(page.limit, 10);
      return { items: [], total: 0 } as any;
    },
  );
  assert.deepEqual(await f.controller.directory(req, { limit: 10 }), {
    items: [],
    total: 0,
  });
  assert.throws(() => f.controller.directory({ session: {} }, {}), status(401));
});
test("organisation update requires membership and FINESS for establishments", async () => {
  const denied = fixture(() => []);
  await assert.rejects(denied.controller.update(req, org, {}), status(404));
  const f = fixture((sql) =>
    sql.startsWith("SELECT") ? [{ kind: "ESTABLISHMENT" }] : [],
  );
  await assert.rejects(
    f.controller.update(req, org, { name: "Hospital" }),
    status(400),
  );
  assert.equal(
    f.calls.some((c) => c.sql.startsWith("UPDATE")),
    false,
  );
  const b = {
    name: "Hospital",
    address: "Paris",
    referent: "Nurse",
    finess: "750000000",
  };
  assert.deepEqual(await f.controller.update(req, org, b), { ok: true });
  assert.deepEqual(f.calls.find((c) => c.sql.startsWith("UPDATE"))?.args, [
    org,
    b.name,
    b.address,
    b.referent,
    b.finess,
    null,
  ]);
  assert.ok(f.calls.some((c) => c.args.includes("ORGANIZATION_UPDATED")));
  const agency = fixture((sql) =>
    sql.startsWith("SELECT") ? [{ kind: "AGENCY" }] : [],
  );
  await agency.controller.update(req, org, {
    ...b,
    finess: undefined,
    siret: "12345678901234",
  });
  assert.deepEqual(
    agency.calls.find((c) => c.sql.startsWith("UPDATE"))?.args.slice(-2),
    [null, "12345678901234"],
  );
});
test("staffing creation normalizes content, saves its receipt and avoids duplicate writes on replay", async (t) => {
  let replay = false;
  const saved: any[] = [];
  t.mock.method(
    receipts,
    "commandReceipt",
    async (_db: any, user: string, action: string, key: string) => {
      assert.equal(user, actor);
      assert.equal(action, "staffing-request:create");
      assert.equal(key, "create-1");
      return {
        replay,
        response: { id: "existing" },
        save: async (value: any) => {
          saved.push(value);
          return value;
        },
      };
    },
  );
  const f = fixture((sql) =>
    sql.includes("FROM membership")
      ? [{ kind: "ESTABLISHMENT" }]
      : sql.startsWith("INSERT INTO staffing_request")
        ? [{ id, title: "New need" }]
        : [],
  );
  assert.deepEqual(await f.controller.create(req, body(), "create-1"), {
    id,
    title: "New need",
  });
  const insert = f.calls.find((c) =>
    c.sql.startsWith("INSERT INTO staffing_request"),
  )!;
  assert.deepEqual(insert.args.slice(0, 4), [
    org,
    "New need",
    "Nursing cover required",
    actor,
  ]);
  assert.equal(JSON.parse(insert.args[4]).address, "Hospital address");
  assert.equal(saved.length, 1);
  replay = true;
  const before = f.calls.length;
  assert.deepEqual(await f.controller.create(req, body(), "create-1"), {
    id: "existing",
  });
  assert.equal(
    f.calls.slice(before).some((c) => c.sql.startsWith("INSERT")),
    false,
  );
});
test("staffing detail hides missing records and list binds pagination and actor", async () => {
  await assert.rejects(
    fixture(() => []).controller.detail(req, id),
    status(404),
  );
  const f = fixture(() => [{ id }]);
  assert.deepEqual(await f.controller.detail(req, id), { id });
  assert.deepEqual(f.calls[0]!.args, [actor, id]);
  assert.deepEqual(await f.controller.list(req, { limit: 10, offset: 20 }), [
    { id },
  ]);
  assert.deepEqual(f.calls[1]!.args, [actor, 10, 20]);
});
test("staffing edits reject missing records and reassignment before saving, and replay is idempotent", async (t) => {
  await assert.rejects(
    fixture(() => []).controller.editNeed(req, id, body(), "edit"),
    status(404),
  );
  let replay = false;
  let receiptsCalled = 0;
  t.mock.method(
    receipts,
    "commandReceipt",
    async (_db: any, user: string, action: string) => {
      receiptsCalled++;
      assert.equal(user, actor);
      assert.equal(action, "staffing-request:edit:" + id);
      return {
        replay,
        response: { id, title: "saved" },
        save: async (v: any) => v,
      };
    },
  );
  const f = fixture((sql) =>
    sql.includes("FROM membership")
      ? [{ kind: "ESTABLISHMENT" }]
      : sql.startsWith("SELECT * FROM staffing_request")
        ? [{ id, establishment_id: org }]
        : sql.startsWith("UPDATE staffing_request")
          ? [{ id, title: "updated" }]
          : [],
  );
  await assert.rejects(
    f.controller.editNeed(
      req,
      id,
      { ...body(), establishmentId: "other" },
      "edit",
    ),
    status(400),
  );
  assert.equal(receiptsCalled, 0);
  assert.deepEqual(await f.controller.editNeed(req, id, body(), "edit"), {
    id,
    title: "updated",
  });
  const update = f.calls.find((c) => c.sql.startsWith("UPDATE"))!;
  assert.deepEqual(update.args.slice(0, 3), [
    id,
    "New need",
    "Nursing cover required",
  ]);
  assert.equal(JSON.parse(update.args[3]).address, "Hospital address");
  replay = true;
  const before = f.calls.length;
  assert.deepEqual(await f.controller.editNeed(req, id, body(), "edit"), {
    id,
    title: "saved",
  });
  assert.equal(
    f.calls.slice(before).some((c) => c.sql.startsWith("UPDATE")),
    false,
  );
});
test("notification preferences require a nurse profile and persist either boolean", async () => {
  const denied = fixture(() => []);
  await assert.rejects(denied.controller.getPreferences(req), status(404));
  await assert.rejects(
    denied.controller.preferences(req, { enabled: true }),
    status(404),
  );
  const f = fixture((sql) =>
    sql.includes("AS enabled") ? [{ enabled: false }] : [{ user_id: actor }],
  );
  assert.deepEqual(await f.controller.getPreferences(req), { enabled: false });
  for (const enabled of [false, true])
    assert.deepEqual(await f.controller.preferences(req, { enabled }), {
      enabled,
    });
  assert.deepEqual(
    f.calls.filter((c) => c.sql.startsWith("UPDATE")).map((c) => c.args),
    [
      [actor, false],
      [actor, true],
    ],
  );
});
test("confirmation access hides foreign assignments and returns pending or latest document", async () => {
  const denied = fixture(() => []);
  await assert.rejects(denied.controller.confirmation(req, id), status(404));
  assert.equal(denied.calls.length, 1);
  const pending = fixture((sql) =>
    sql.includes("FROM assignment") ? [{ id }] : [],
  );
  assert.deepEqual(await pending.controller.confirmation(req, id), {
    status: "PENDING",
    document_id: null,
  });
  assert.deepEqual(pending.calls[0]!.args, [id, actor]);
  const ready = {
    status: "READY",
    document_id: "doc",
    mission_version: 2,
    template_version: 1,
  };
  assert.deepEqual(
    await fixture((sql) =>
      sql.includes("FROM assignment") ? [{ id }] : [ready],
    ).controller.confirmation(req, id),
    ready,
  );
});
