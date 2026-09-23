import { test } from "node:test";
import assert from "node:assert/strict";
import { AdminController } from "../../src/admin/admin.module";
import { AdminClientRequestsController } from "../../src/admin/client-requests";
import { hashInvitation } from "../../src/admin/admin-auth";
import { recoveryHash } from "../../src/auth/recovery";
import * as closure from "../../src/security/closure";
import * as blockers from "../../src/security/closure-blockers";
const req: any = {
    adminRole: "OWNER",
    session: { adminId: "admin", adminVerifiedAt: Date.now() },
  },
  reason = "Verified operator request";
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
test("admin invitation normalizes email, stores only the hash and refuses existing or inactive access", async () => {
  let active = true,
    exists = false;
  const f = fixture((sql) =>
      sql.startsWith("SELECT id,active")
        ? [{ id: "target", active }]
        : sql.startsWith("SELECT 1 FROM platform_admin")
          ? exists
            ? [{}]
            : []
          : sql.startsWith("INSERT INTO platform_admin")
            ? [{ invitation_expires_at: "2030-01-01" }]
            : [],
    ),
    c = new AdminController(f.db, {} as any);
  const result = await c.invite(req, {
    email: " Invite@Example.test ",
    role: "OPS",
    reason,
  });
  assert.equal(result.email, "invite@example.test");
  assert.match(result.invitation, /^[A-Za-z0-9_-]{43}$/);
  assert.deepEqual(
    f.calls.find((c) => c.sql.startsWith("INSERT INTO platform_admin")).args,
    ["target", "OPS", hashInvitation(result.invitation)],
  );
  assert.ok(!JSON.stringify(f.calls).includes(result.invitation));
  exists = true;
  await assert.rejects(
    c.invite(req, { email: "invite@example.test", role: "OPS", reason }),
    (e) => (e as any).getStatus() === 409,
  );
  exists = false;
  active = false;
  await assert.rejects(
    c.invite(req, { email: "invite@example.test", role: "OPS", reason }),
    (e) => (e as any).getStatus() === 409,
  );
});
test("renewed admin invitation revokes outstanding MFA challenges and replaces only the token hash", async () => {
  const f = fixture((sql) =>
    sql.startsWith("SELECT a.email")
      ? [
          {
            email: "invite@example.test",
            active: true,
            account_active: true,
            invitation_hash: "old",
          },
        ]
      : sql.startsWith("UPDATE platform_admin SET invitation_hash")
        ? [{ invitation_expires_at: "2030-01-01" }]
        : [],
  );
  const r = await new AdminController(f.db, {} as any).renewInvitation(
    req,
    "target",
    { reason },
  );
  assert.equal(
    f.calls.find((c) => c.sql.startsWith("UPDATE platform_admin")).args[1],
    hashInvitation(r.invitation),
  );
  assert.ok(f.calls.some((c) => c.sql.startsWith("DELETE FROM admin_session")));
});
test("deleting admin access preserves client account identity and anonymises dedicated administrator accounts", async () => {
  let dedicated = false;
  const f = fixture((sql) =>
      sql.startsWith("SELECT a.platform_only")
        ? [{ platform_only: dedicated }]
        : sql.startsWith("SELECT p.role")
          ? [{ role: "OPS", active: true }]
          : [],
    ),
    c = new AdminController(f.db, {} as any);
  await assert.rejects(
    c.deleteAccess(req, "admin", { reason }),
    (e) => (e as any).getStatus() === 409,
  );
  assert.deepEqual(await c.deleteAccess(req, "client", { reason }), {
    ok: true,
  });
  assert.equal(
    f.calls.some((c) => c.sql.startsWith("UPDATE account SET active=false")),
    false,
  );
  dedicated = true;
  await c.deleteAccess(req, "dedicated", { reason });
  const update = f.calls.find((c) =>
    c.sql.startsWith("UPDATE account SET active=false"),
  );
  assert.ok(update.args[1].endsWith("@example.invalid"));
  assert.ok(f.calls.some((c) => c.sql.startsWith("DELETE FROM session")));
});
test("manual recovery issues a fragment token while persisting only a version-bound digest", async (t) => {
  const old = process.env.APP_ORIGIN;
  process.env.APP_ORIGIN = "https://app.unit.invalid";
  t.after(() => {
    if (old === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = old;
  });
  const f = fixture((sql) =>
      sql.startsWith("SELECT account_id FROM recovery_request")
        ? [{ account_id: "client" }]
        : sql.startsWith("SELECT id,active")
          ? [
              {
                id: "client",
                active: true,
                platform_only: false,
                session_version: 4,
              },
            ]
          : sql.startsWith("SELECT status FROM recovery_request")
            ? [{ status: "REQUESTED" }]
            : sql.startsWith("UPDATE recovery_request SET status='ISSUED'")
              ? [{ expires_at: "2030-01-01" }]
              : sql.startsWith("UPDATE recovery_request SET status='REJECTED'")
                ? [{ id: "request" }]
                : sql.startsWith("SELECT count(*)")
                  ? [{ total: 1 }]
                  : [],
    ),
    c = new AdminClientRequestsController(f.db);
  const r = await c.issue(req, "request", { reason, identityVerified: true });
  const url = new URL(r.resetUrl),
    token = url.hash.slice("#token=".length);
  assert.equal(url.origin, "https://app.unit.invalid");
  assert.equal(url.search, "");
  assert.match(token, /^[a-f0-9]{64}$/);
  const update = f.calls.find((c) =>
    c.sql.startsWith("UPDATE recovery_request SET status='ISSUED'"),
  );
  assert.equal(update.args[1], recoveryHash(token));
  assert.equal(update.args[2], 4);
  assert.deepEqual(await c.rejectRecovery(req, "request", { reason }), {
    ok: true,
  });
  assert.equal((await c.listRecovery(req, { limit: 10, offset: 0 })).total, 1);
  assert.equal(
    (await c.listPrivacy(req, { limit: 10, offset: 0, accountId: "client" }))
      .total,
    1,
  );
});
test("privacy decisions recheck blockers and execute only approved requests, preserving retry status", async (t) => {
  let blocked = false,
    state = "REQUESTED",
    failed = false;
  t.mock.method(blockers, "lockClosure", async () => {});
  t.mock.method(blockers, "closureBlockers", async () =>
    blocked ? ([{ label: "Active assignment" }] as any) : [],
  );
  t.mock.method(closure, "executeClosure", async () => {
    if (failed) {
      state = "PROCESSING";
      throw new Error("private backend failure");
    }
    state = "COMPLETED";
    return { id: "client", documents: 0, documentIds: [] };
  });
  const f = fixture((sql) =>
      sql.startsWith("SELECT account_id")
        ? [{ account_id: "client", status: state }]
        : sql.startsWith("SELECT status")
          ? [
              {
                status: state,
                last_error: failed ? "CLOSURE_RETRY_REQUIRED" : null,
              },
            ]
          : sql.startsWith("SELECT r.id")
            ? [{ id: "request", account_id: "client", status: state }]
            : [],
    ),
    c = new AdminClientRequestsController(f.db);
  blocked = true;
  await assert.rejects(
    c.approve(req, "request", { reason }),
    (e) => (e as any).getResponse().code === "CLOSURE_BLOCKED",
  );
  blocked = false;
  assert.deepEqual(await c.approve(req, "request", { reason }), { ok: true });
  assert.deepEqual(await c.reject(req, "request", { reason }), { ok: true });
  await assert.rejects(
    c.execute(req, "request", { reason }),
    (e) => (e as any).getStatus() === 409,
  );
  state = "APPROVED";
  assert.equal((await c.privacy(req, "request")).canExecute, true);
  assert.equal(
    (await c.execute(req, "request", { reason })).status,
    "COMPLETED",
  );
  state = "APPROVED";
  failed = true;
  const result = await c.execute(req, "request", { reason });
  assert.equal(result.status, "PROCESSING");
  assert.ok(!JSON.stringify(result).includes("private backend failure"));
});
