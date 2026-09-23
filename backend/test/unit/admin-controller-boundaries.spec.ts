import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { AdminController } from "../../src/admin/admin.module";
import { AdminOperationsController } from "../../src/admin/operations";
const id = "00000000-0000-4000-8000-000000000002";
const reason = "Contrôle local justifié";
const req = (role = "OWNER") =>
  ({
    adminRole: role,
    session: { adminId: "actor", adminVerifiedAt: Date.now() },
  }) as any;
function fixture(answer: (sql: string, args: any[]) => any = () => []) {
  const calls: { sql: string; args: any[] }[] = [];
  const db: any = {
    query: async (sql: string, args: any[] = []) => {
      calls.push({ sql, args });
      return answer(sql, args);
    },
    transaction: async (fn: any) => fn(db),
  };
  return {
    calls,
    db,
    admin: new AdminController(db, {} as any),
    ops: new AdminOperationsController(db, {} as any, {} as any),
  };
}
const status = (expected: number) => (e: any) => e.getStatus?.() === expected;

test("admin missing resources reject before writes; privileged accounts require access permission", async () => {
  for (const method of ["state", "revoke"] as const) {
    const f = fixture((sql) =>
      sql.startsWith("SELECT 1 FROM platform_admin") ? [{ exists: 1 }] : [],
    );
    await assert.rejects(
      () =>
        method === "state"
          ? f.admin.state(req("SUPPORT"), id, { active: false, reason })
          : f.admin.revoke(req("SUPPORT"), id, { reason }),
      status(403),
    );
    assert.ok(!f.calls.some((c) => /^(UPDATE|DELETE|INSERT)/.test(c.sql)));
    const missing = fixture();
    await assert.rejects(
      () =>
        method === "state"
          ? missing.admin.state(req(), id, { active: true, reason })
          : missing.admin.revoke(req(), id, { reason }),
      status(404),
    );
    assert.ok(!missing.calls.some((c) => c.sql.startsWith("DELETE")));
  }
  const f = fixture();
  await assert.rejects(() => f.admin.mission(req(), id), status(404));
  await assert.rejects(
    () => f.admin.renewInvitation(req(), id, { reason }),
    status(404),
  );
  await assert.rejects(
    () =>
      f.admin.updateAccess(req(), id, { active: true, role: "OWNER", reason }),
    status(404),
  );
});

test("empty count and missing backup proof expose honest defaults", async () => {
  const f = fixture();
  assert.deepEqual(await f.admin.accounts(req(), { limit: 7, offset: 14 }), {
    items: [],
    total: 0,
    limit: 7,
    offset: 14,
  });
  assert.deepEqual(f.calls[1]!.args, ["", 7, 14]);
  assert.match(f.calls[1]!.sql, /LIMIT \$2 OFFSET \$3$/);
  const proof = await f.admin.backups(req());
  assert.equal(proof.state, "unknown");
  assert.equal(proof.lastVerifiedAt, null);
  assert.equal(proof.proof, null);
  assert.match(proof.message, /Aucune preuve/);
});

test("operations missing resources and invalid relationships reject with no mutation", async () => {
  const f = fixture();
  await assert.rejects(() => f.ops.organization(req(), id), status(404));
  await assert.rejects(
    () =>
      f.ops.membership(req(), id, {
        email: "test@example.invalid",
        active: true,
        reason,
      }),
    status(404),
  );
  await assert.rejects(
    () => f.ops.matches(req(), id, { limit: 10, offset: 0 }),
    status(404),
  );
  await assert.rejects(() => f.ops.verification(req(), id), status(404));
  await assert.rejects(
    () => f.ops.review(req(), id, { state: "REVIEWED", reason }),
    status(404),
  );
  await assert.rejects(
    () => f.ops.incidentState(req(), id, { state: "RESOLVED", reason }),
    status(404),
  );
  for (const rows of [
    [{ id, kind: "AGENCY" }],
    [
      { id, kind: "AGENCY" },
      { id: "other", kind: "AGENCY" },
    ],
    [
      { id, kind: "ESTABLISHMENT" },
      { id: "other", kind: "ESTABLISHMENT" },
    ],
  ]) {
    const g = fixture(() => rows);
    await assert.rejects(
      () =>
        g.ops.link(req(), id, {
          otherOrganizationId: "other",
          active: true,
          reason,
        }),
      status(400),
    );
    assert.equal(g.calls.length, 1);
  }
  assert.ok(!f.calls.some((c) => c.sql.startsWith("INSERT")));
  const membership = fixture((sql) =>
    sql.includes("FROM organization")
      ? [{ id }]
      : sql.includes("FROM account")
        ? [{ id: "member", family: "ENTERPRISE", active: true }]
        : [],
  );
  await assert.rejects(
    () =>
      membership.ops.membership(req(), id, {
        email: "member@example.invalid",
        active: false,
        reason,
      }),
    status(404),
  );
  assert.ok(!membership.calls.some((c) => c.sql.startsWith("INSERT")));
});

test("verification without identity returns null and preserves reviews", async () => {
  const f = fixture((sql) =>
    sql.includes("FROM profile")
      ? [{ rpps_status: "NOT_CHECKED", rpps_reason: "pending" }]
      : sql.includes("FROM professional_review")
        ? [{ id: "review" }]
        : [],
  );
  const result = await f.ops.verification(req(), id);
  assert.equal(result.professionalIdentity, null);
  assert.equal(result.directory.status, "NOT_CHECKED");
  assert.deepEqual(result.reviews, [{ id: "review" }]);
  assert.ok(f.calls.some((c) => c.args.includes("ADMIN_VERIFICATION_VIEWED")));
});

test("operations distinguishes missing collection state, stopped schedule and failed import without leaking supplier error", async () => {
  const f = fixture((sql) =>
    sql.includes("FROM source_control")
      ? [
          {
            provider: "FRANCE_TRAVAIL",
            enabled: false,
            collection_state: null,
          },
          {
            provider: "JOBSPIPE",
            enabled: true,
            collection_state: {
              completedAt: "2026-09-22T10:00:00Z",
              seenIds: ["a", "b"],
            },
          },
        ]
      : sql.includes("FROM import_run")
        ? [
            {
              provider: "JOBSPIPE",
              status: "FAILED",
              created_at: "2026-09-22",
              summary: {
                error: "private-provider-error",
                accepted: 2,
                rejected: [1],
                duplicates: [1, 2],
              },
            },
          ]
        : sql.includes("jobspipe_request_receipt")
          ? [{ used: 42 }]
          : [],
  );
  const result = await f.ops.operations(req());
  const a = result.sources[0]!,
    b = result.sources[1]!;
  assert.equal(a.collection, null);
  assert.equal(a.lastRun, null);
  assert.equal(a.nextScheduleLabel, "Planification suspendue");
  assert.deepEqual(a.counts, { total: 0, active: 0 });
  assert.equal(b.collection!.status, "COMPLETE");
  assert.equal(b.collection!.observed, 2);
  assert.equal(b.collection!.creditsUsed, 42);
  assert.equal(b.collection!.creditLimit, 1000);
  assert.equal(b.lastRun!.accepted, 2);
  assert.equal(b.lastRun!.rejected, 1);
  assert.equal(b.lastRun!.duplicates, 2);
  assert.match(b.lastRun!.error!, /Acquisition interrompue/);
  assert.ok(!JSON.stringify(result).includes("private-provider-error"));
});

test("infrastructure reports unavailable dependencies and configured delivery metadata without sending", async () => {
  const names = [
    "DISCORD_BOT_TOKEN",
    "DISCORD_RELAY_URL",
    "DISCORD_RELAY_TOKEN",
    "SMTP2GO_API_KEY",
    "SMTP2GO_FROM",
    "DOCUMENT_STORAGE",
    "VERCEL_GIT_COMMIT_SHA",
  ];
  const saved = names.map((n) => process.env[n]);
  const oldFetch = globalThis.fetch;
  try {
    process.env.DISCORD_BOT_TOKEN = "unit-token";
    process.env.SMTP2GO_API_KEY = "unit-key";
    process.env.SMTP2GO_FROM = "test@example.invalid";
    process.env.DOCUMENT_STORAGE = "postgres";
    process.env.VERCEL_GIT_COMMIT_SHA = "unit-commit";
    let requests = 0;
    globalThis.fetch = async () => {
      requests++;
      return new Response(JSON.stringify({ id: "invalid-human", bot: false }), {
        status: 200,
      });
    };
    const f = fixture((sql) => {
      if (sql === "SELECT PostGIS_Version()")
        throw Error("private database failure");
      return [{ checked_at: new Date().toISOString() }];
    });
    const matching: any = {
      connection: {
        asPromise: async () => {
          throw Error("private mongo failure");
        },
      },
    };
    const result = await new AdminController(f.db, matching).infrastructure(
      req(),
    );
    assert.equal(result.version, "unit-commit");
    assert.equal(requests, 1);
    for (const name of ["PostgreSQL/PostGIS", "MongoDB", "n8n / Discord"])
      assert.equal(
        result.services.find((s) => s.name === name).state,
        "unavailable",
      );
    assert.equal(
      result.services.find((s) => s.name === "Documents").state,
      "configured",
    );
    assert.equal(
      result.services.find((s) => s.name.startsWith("SMTP2GO")).state,
      "configured",
    );
    assert.match(
      result.services.find((s) => s.name === "Traitement cloud").message,
      /Dernier traitement/,
    );
    assert.ok(!JSON.stringify(result).includes("private"));
  } finally {
    globalThis.fetch = oldFetch;
    names.forEach((n, i) => {
      if (saved[i] === undefined) delete process.env[n];
      else process.env[n] = saved[i];
    });
  }
});
