import { test } from "node:test";
import assert from "node:assert/strict";
import {
  enterpriseMissionPage,
  enterpriseMissionSearch,
  establishmentPage,
} from "../../src/organizations/establishment-directory";
import {
  ConversionService,
  ConversionController,
} from "../../src/listings/conversions";
import { purgeDemoAlerts } from "../../src/notifications/purge-demo-alerts";
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
test("enterprise search binds all user filters and limits sorting to trusted expressions", async () => {
  const f = fixture(() => [{ items: [], total: 12 }]);
  const q: any = {
    limit: 10,
    offset: 20,
    establishmentId: "org",
    qualification: "IDE",
    location: " Paris' OR true -- ",
    date: "2026-01-01",
    q: " title ",
    status: "OPEN",
    shift: "NIGHT",
    sort: "start_asc",
  };
  const r = await enterpriseMissionSearch(f.db, "actor", q);
  assert.deepEqual(r, { items: [], total: 12, limit: 10, offset: 20 });
  assert.deepEqual(f.calls[0].args, [
    "actor",
    10,
    20,
    "org",
    "IDE",
    "Paris' OR true --",
    "2026-01-01",
    "title",
    "OPEN",
    "NIGHT",
  ]);
  assert.ok(!f.calls[0].sql.includes("Paris'"));
  assert.match(f.calls[0].sql, /ORDER BY start_at ASC,id ASC/);
  for (const [sort, order] of [
    ["start_desc", "start_at DESC"],
    ["DROP TABLE mission", "created_at DESC"],
  ]) {
    await enterpriseMissionPage(f.db, "actor", { limit: 3, offset: 0, sort });
    assert.ok(f.calls.at(-1).sql.includes(order));
    assert.ok(!f.calls.at(-1).sql.includes("DROP TABLE"));
  }
  assert.deepEqual(
    await establishmentPage(f.db, "actor", {
      limit: 3,
      offset: 0,
      q: " Hospital ",
    }),
    { items: [], total: 12, limit: 3, offset: 0 },
  );
  assert.deepEqual(f.calls.at(-1).args, ["actor", "Hospital", 3, 0]);
  await establishmentPage(f.db, "actor", { limit: 3, offset: 0 });
  assert.equal(f.calls.at(-1).args[1], "");
});
test("conversion report calculates honest rates, rounded delays and explicit exclusions", async () => {
  let allowed = true;
  const data: any = {
    published: 3,
    filled: 1,
    cancelled_missions: 1,
    applications: 4,
    selected: 2,
    assignments: 2,
    cancelled_assignments: 1,
    average_fill_hours: 1.2345,
    delay_samples: 2,
    undated_publications: 1,
    undated_applications: 2,
    excluded_demo: 3,
    observed_at: "2026-01-02T12:00:00Z",
  };
  const f = fixture((sql) =>
      sql.includes("SELECT o.id,o.name")
        ? allowed
          ? [{ id: "org", name: "Hospital" }]
          : []
        : sql.startsWith("WITH scoped")
          ? [data]
          : [],
    ),
    s = new ConversionService(f.db),
    q = { organizationId: "org", from: "2026-01-01", to: "2026-01-02" };
  let r = await s.report("actor", q);
  assert.deepEqual(r.fillRate, {
    numerator: 1,
    denominator: 3,
    percent: 33.33,
  });
  assert.equal(r.selectionRate.percent, 50);
  assert.deepEqual(r.fillDelay, { averageHours: 1.23, samples: 2 });
  assert.equal(r.exclusions.demoMissions, 3);
  assert.equal(r.period.endInclusive, true);
  assert.equal(
    f.calls[0].sql,
    "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ",
  );
  data.published = 0;
  data.filled = 0;
  data.average_fill_hours = null;
  r = await s.report("actor", q);
  assert.equal(r.fillRate.percent, null);
  assert.equal(r.fillDelay.averageHours, null);
  allowed = false;
  await assert.rejects(
    s.report("stranger", q),
    (e) => (e as any).getStatus() === 404,
  );
  const c = new ConversionController({
    report: async (actor: string, input: any) => {
      assert.equal(actor, "actor");
      assert.equal(input, q);
      return r;
    },
  } as any);
  assert.equal(await c.report({ session: { userId: "actor" } } as any, q), r);
});
test("demo alert cleanup previews without deletion and preserves sending or uncertain deliveries", async () => {
  let after = false;
  const f = fixture((sql, args) =>
    sql.startsWith("SELECT\n")
      ? [
          {
            alerts: 5,
            deletable_alerts: after ? 0 : 3,
            legacy_deliveries: after ? 0 : 1,
            pending_events: after ? 0 : 1,
          },
        ]
      : sql.startsWith("SELECT n.id")
        ? ["safe", "sending", "uncertain", "other-kind"].map((id) => ({ id }))
        : sql.startsWith("SELECT id,notification_id")
          ? [
              {
                id: "d1",
                notification_id: "safe",
                status: "SENT",
                kind: "MATCH",
              },
              {
                id: "d2",
                notification_id: "sending",
                status: "SENDING",
                kind: "MATCH",
              },
              {
                id: "d3",
                notification_id: "uncertain",
                status: "UNCERTAIN",
                kind: "MATCH",
              },
              {
                id: "d4",
                notification_id: "other-kind",
                status: "SENT",
                kind: "CONFIRMATION",
              },
            ]
          : sql.startsWith("DELETE FROM notification")
            ? ((after = true), args[0].map((id: string) => ({ id })))
            : sql.startsWith("WITH target")
              ? [{ id: "legacy-or-event" }]
              : [],
  );
  const preview = await purgeDemoAlerts(f.db);
  assert.equal(preview.mode, "PREVIEW");
  assert.equal(preview.hasMore, true);
  assert.equal(
    f.calls.some((c) => c.sql.startsWith("DELETE")),
    false,
  );
  const applied = await purgeDemoAlerts(f.db, true);
  assert.equal(applied.deletedAlerts, 1);
  assert.equal(applied.deletedDeliveries, 1);
  assert.equal(applied.completedEvents, 1);
  assert.equal(applied.hasMore, false);
  assert.deepEqual(
    f.calls.find((c) => c.sql.startsWith("DELETE FROM notification")).args,
    [["safe"]],
  );
  assert.ok(f.calls.some((c) => c.sql.includes("LEGACY_DEMO_ALERTS_PURGED")));
});
