import { test } from "node:test";
import assert from "node:assert/strict";
import { AdminOperationsController } from "../../src/admin/operations";
import { MATCH_RULES } from "../../src/domain/rules";
const req: any = {
    adminRole: "OWNER",
    session: { adminId: "admin", adminVerifiedAt: Date.now() },
  },
  reason = "Verified administrative request";
function fixture(
  answer: (sql: string, args: any[]) => any,
  matching: any = {},
  refresh: any = {},
) {
  const calls: any[] = [];
  const db: any = {
    query: async (sql: string, args: any[] = []) => {
      calls.push({ sql, args });
      return answer(sql, args);
    },
  };
  db.transaction = async (fn: any) => fn(db);
  return { c: new AdminOperationsController(db, matching, refresh), calls };
}
test("admin notification audit distinguishes association, muted events and pending or expired challenges", async () => {
  let linked = true,
    expiry = new Date(Date.now() + 60000).toISOString();
  const f = fixture((sql) =>
    sql.startsWith("SELECT id FROM account")
      ? [{ id: "account" }]
      : sql.includes("FROM discord_link")
        ? linked
          ? [{ discord_user_id: "discord", connected_at: "2026-01-01" }]
          : []
        : sql.includes("FROM discord_challenge")
          ? [{ expires_at: expiry }]
          : sql.startsWith("SELECT enabled,events")
            ? [{ enabled: true, events: ["MATCH", "CONFIRMATION"] }]
            : sql.includes("FROM notification_preference")
              ? [{ kind: "MATCH" }]
              : sql.startsWith("SELECT count(*)")
                ? [{ total: 3, unread: 1 }]
                : sql.startsWith("SELECT d.status")
                  ? [{ status: "SENT", total: 2 }]
                  : [],
  );
  let r = await f.c.accountNotifications(req, "account");
  assert.equal(r.connection.state, "ASSOCIATED");
  assert.deepEqual(r.personal.effectiveEvents, ["CONFIRMATION"]);
  assert.equal(r.deliveries.counts.SENT, 2);
  assert.equal(r.internal.unread, 1);
  linked = false;
  r = await f.c.accountNotifications(req, "account");
  assert.equal(r.connection.state, "PENDING");
  assert.equal(r.personal.state, "NOT_ASSOCIATED");
  expiry = "2000-01-01";
  assert.equal(
    (await f.c.accountNotifications(req, "account")).connection.state,
    "EXPIRED",
  );
  assert.ok(
    f.calls.some((c) => c.args.includes("ADMIN_NOTIFICATION_SETTINGS_VIEWED")),
  );
});
test("membership removal preserves a remaining manager then revokes affected sessions", async () => {
  let others = 0;
  const f = fixture((sql) =>
    sql.startsWith("SELECT id FROM organization")
      ? [{ id: "org" }]
      : sql.startsWith("SELECT id,family")
        ? [{ id: "member", family: "ENTERPRISE", active: true }]
        : sql.startsWith("SELECT active FROM membership")
          ? [{ active: true }]
          : sql.startsWith("SELECT count(*)")
            ? [{ count: others }]
            : [],
  );
  await assert.rejects(
    f.c.membership(req, "org", {
      email: "member@example.invalid",
      active: false,
      reason,
    }),
    (e) => (e as any).getStatus() === 409,
  );
  assert.equal(
    f.calls.some((c) => c.sql.startsWith("DELETE")),
    false,
  );
  others = 1;
  assert.deepEqual(
    await f.c.membership(req, "org", {
      email: "member@example.invalid",
      active: false,
      reason,
    }),
    { ok: true },
  );
  assert.deepEqual(
    f.calls.find((c) => c.sql.startsWith("INSERT INTO membership")).args,
    ["member", "org", false],
  );
  assert.ok(f.calls.some((c) => c.sql.startsWith("DELETE FROM session")));
});
test("agency links are removable only when no draft, open or filled mission depends on them", async () => {
  let active = true;
  const f = fixture((sql) =>
    sql.startsWith("SELECT id,kind FROM organization")
      ? [
          { id: "agency", kind: "AGENCY" },
          { id: "hospital", kind: "ESTABLISHMENT" },
        ]
      : sql.startsWith("SELECT id FROM mission")
        ? active
          ? [{ id: "mission" }]
          : []
        : [],
  );
  await assert.rejects(
    f.c.link(req, "agency", {
      otherOrganizationId: "hospital",
      active: false,
      reason,
    }),
    (e) => (e as any).getStatus() === 409,
  );
  active = false;
  assert.deepEqual(
    await f.c.link(req, "agency", {
      otherOrganizationId: "hospital",
      active: false,
      reason,
    }),
    { ok: true },
  );
  assert.deepEqual(
    f.calls.find((c) => c.sql.startsWith("DELETE FROM agency_link")).args,
    ["agency", "hospital"],
  );
});
test("admin matching history marks changed profiles stale and retains requested pagination", async () => {
  const date = "2026-01-01T00:00:00.000Z",
    runs = [
      {
        _id: "run",
        ownerId: "nurse",
        missionVersion: 1,
        missionStatus: "OPEN",
        rulesVersion: MATCH_RULES.version,
        profileVersion: date + ":1",
        result: { eligible: true },
      },
    ];
  const options: any[] = [];
  const query: any = {
    sort: (v: any) => {
      options.push(v);
      return query;
    },
    skip: (v: any) => {
      options.push(v);
      return query;
    },
    limit: (v: any) => {
      options.push(v);
      return query;
    },
    lean: async () => runs,
  };
  let version = 1;
  const f = fixture(
    (sql) =>
      sql.startsWith("SELECT version,status")
        ? [{ version: 1, status: "OPEN" }]
        : sql.startsWith("SELECT user_id,updated_at")
          ? [{ user_id: "nurse", updated_at: date, rpps_version: version }]
          : [],
    {
      ready: async () => {},
      runs: { find: () => query, countDocuments: async () => 1 },
    },
  );
  let r = await f.c.matches(req, "mission", { limit: 10, offset: 20 });
  assert.equal(r.items[0]!.stale, false);
  assert.equal(r.total, 1);
  assert.deepEqual(options.slice(1, 3), [20, 10]);
  version = 2;
  r = await f.c.matches(req, "mission", { limit: 10, offset: 20 });
  assert.equal(r.items[0]!.stale, true);
});
test("professional review records an assessment without changing RPPS or qualification data", async () => {
  const f = fixture((sql) =>
    sql.startsWith("SELECT rpps_status")
      ? [{ rpps_status: "FOUND", rpps_identity_review: "TO_REVIEW" }]
      : sql.startsWith("SELECT issuer")
        ? [{ issuer: "psc", authenticated_at: "2026-01-01" }]
        : sql.startsWith("SELECT user_id FROM profile")
          ? [{ user_id: "nurse" }]
          : sql.startsWith("INSERT INTO professional_review")
            ? [{ id: "review" }]
            : [],
  );
  const r = await f.c.verification(req, "nurse");
  assert.equal(r.directory.status, "FOUND");
  assert.equal(r.professionalIdentity?.issuer, "psc");
  assert.deepEqual(
    await f.c.review(req, "nurse", { state: "REVIEWED", reason }),
    { ok: true },
  );
  assert.equal(
    f.calls.some((c) => c.sql.startsWith("UPDATE profile")),
    false,
  );
});
test("source operations summarize progress and sanitize provider failure details", async () => {
  const f = fixture((sql) =>
    sql.includes("FROM source_control")
      ? [
          {
            provider: "JOBSPIPE",
            enabled: true,
            collection_state: {
              phase: "IN_PROGRESS",
              seenIds: ["a", "b"],
              queue: [{}],
              pages: 3,
            },
          },
          {
            provider: "FRANCE_TRAVAIL",
            enabled: false,
            collection_state: null,
          },
        ]
      : sql.includes("FROM import_run")
        ? [
            {
              provider: "JOBSPIPE",
              status: "FAILED",
              summary: {
                accepted: 2,
                rejected: [{}],
                duplicates: [],
                error: "private provider token",
              },
            },
          ]
        : sql.includes("FROM jobspipe_request_receipt")
          ? [{ used: 23 }]
          : [],
  );
  const r = await f.c.operations(req);
  assert.equal(r.sources[0]!.collection?.observed, 2);
  assert.equal(r.sources[0]!.collection?.creditsUsed, 23);
  assert.equal(r.sources[0]!.lastRun?.rejected, 1);
  assert.ok(!JSON.stringify(r).includes("private provider token"));
  assert.equal(r.sources[1]!.collection, null);
});
test("incident administration and source refresh bind parameters and write audit evidence", async () => {
  const refreshed: any[] = [];
  const f = fixture(
    (sql) =>
      sql.startsWith("SELECT count(*)")
        ? [{ total: 1 }]
        : sql.startsWith("INSERT INTO operational_incident") ||
            sql.startsWith("UPDATE operational_incident")
          ? [{ id: "incident" }]
          : sql.startsWith("SELECT id,name,kind")
            ? [{ id: "org" }]
            : [],
    {},
    {
      run: async (...args: any[]) => {
        refreshed.push(args);
        return { status: "STARTED" };
      },
    },
  );
  const list = await f.c.incidents(req, { limit: 10, offset: 20 });
  assert.equal(list.total, 1);
  assert.deepEqual(f.calls[1].args, [10, 20]);
  assert.deepEqual(
    await f.c.incident(req, {
      service: "API",
      impact: "Unavailable API",
      ownerLabel: "Ops",
      reason,
    }),
    { id: "incident" },
  );
  assert.deepEqual(
    await f.c.incidentState(req, "incident", { state: "RESOLVED", reason }),
    { ok: true },
  );
  await f.c.sourceState(req, "FRANCE_TRAVAIL", { enabled: false, reason });
  await f.c.refreshSource(req, "JOBSPIPE", { reason });
  assert.deepEqual(refreshed, [["JOBSPIPE", true]]);
  assert.equal((await f.c.organization(req, "org")).organization.id, "org");
});


test("source visibility changes are audited without altering import scheduling", async () => {
  const f = fixture(() => []);
  assert.deepEqual(await f.c.sourceVisibility(req, "FRANCE_TRAVAIL", {visible:false, reason}), {ok:true});
  assert.deepEqual(f.calls[0].args, ["FRANCE_TRAVAIL", false]);
  assert.match(f.calls[0].sql, /SET visible=/);
  assert.doesNotMatch(f.calls[0].sql, /enabled/);
  const audit = f.calls.find(c => c.args.includes("ADMIN_SOURCE_VISIBILITY_CHANGED"));
  assert.ok(audit);
  assert.ok(JSON.stringify(audit.args).includes(reason));
  await f.c.sourceVisibility(req, "FRANCE_TRAVAIL", {visible:true, reason});
  assert.ok(f.calls.some(c => c.args[0] === "FRANCE_TRAVAIL" && c.args[1] === true));
});

test("source visibility rejects unsupported providers and missing recent admin authentication", async () => {
  for (const [request, provider] of [
    [req, "INVALID"],
    [{...req, adminRole:"SUPPORT"}, "FRANCE_TRAVAIL"],
    [{...req, session:{...req.session, adminVerifiedAt:0}}, "FRANCE_TRAVAIL"],
  ] as const) {
    const f = fixture(() => []);
    await assert.rejects(f.c.sourceVisibility(request, provider, {visible:false, reason}));
    assert.equal(f.calls.length, 0);
  }
});
