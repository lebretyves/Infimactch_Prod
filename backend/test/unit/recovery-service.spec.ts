import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RecoveryService,
  RecoveryController,
  recoveryHash,
  recoveryAcknowledgement,
  automaticRecoveryAcknowledgement,
} from "../../src/auth/recovery";
import * as mail from "../../src/auth/recovery-mail";
const argon2 = require("argon2");
const status = (n: number) => (e: any) => e.getStatus?.() === n;
function fixture(t: any, answer: (sql: string, args: any[]) => any) {
  const calls: any[] = [],
    delays: number[] = [];
  t.mock.method(globalThis, "setTimeout", ((fn: any, delay: number) => {
    delays.push(delay);
    queueMicrotask(fn);
    return {} as any;
  }) as any);
  const db: any = {
    query: async (sql: string, args: any[] = []) => {
      calls.push({ sql, args });
      return answer(sql, args);
    },
  };
  db.transaction = async (fn: any) => fn(db);
  return { s: new RecoveryService(db), calls, delays };
}
test("manual recovery creates an assistance request without token and does not enumerate unknown accounts", async (t) => {
  t.mock.method(mail, "recoveryMailConfig", () => null);
  let exists = false;
  const f = fixture(t, (sql) =>
    sql.includes("SELECT a.id,a.email")
      ? exists
        ? [{ id: "account", email: "alice@example.test", session_version: 2 }]
        : []
      : sql.startsWith("INSERT INTO recovery_request")
        ? [{ id: "request" }]
        : [],
  );
  assert.deepEqual(
    await f.s.request(" Alice@Example.test "),
    recoveryAcknowledgement,
  );
  assert.equal(
    f.calls.some((c) => c.sql.startsWith("INSERT")),
    false,
  );
  exists = true;
  assert.deepEqual(
    await f.s.request(" Alice@Example.test "),
    recoveryAcknowledgement,
  );
  assert.deepEqual(
    f.calls.find((c) => c.sql.startsWith("INSERT INTO recovery_request"))!.args,
    ["account", "REQUESTED", false, null, null, "NOT_REQUESTED"],
  );
  assert.equal(f.delays.length, 2);
});
test("automatic recovery stores only a token hash and never returns delivery status to the caller", async (t) => {
  t.mock.method(mail, "recoveryMailConfig", () => ({}) as any);
  let deliveredToken = "";
  t.mock.method(
    mail,
    "sendRecoveryMail",
    async (_config: any, email: string, token: string) => {
      assert.equal(email, "alice@example.test");
      assert.match(token, /^[0-9a-f]{64}$/);
      deliveredToken = token;
      return {
        status: "FAILED",
        providerId: null,
        error: "PROVIDER_FAILURE",
      } as any;
    },
  );
  const f = fixture(t, (sql) =>
    sql.includes("SELECT a.id,a.email")
      ? [{ id: "account", email: "alice@example.test", session_version: 2 }]
      : sql.startsWith("INSERT INTO recovery_request")
        ? [{ id: "request" }]
        : [],
  );
  const result = await f.s.request("alice@example.test");
  assert.deepEqual(result, automaticRecoveryAcknowledgement);
  const insert = f.calls.find((c) =>
    c.sql.startsWith("INSERT INTO recovery_request"),
  );
  assert.equal(insert.args[3], recoveryHash(deliveredToken));
  assert.equal(insert.args[4], 2);
  assert.ok(!JSON.stringify(f.calls).includes(deliveredToken));
  const update = f.calls.find((c) => c.sql.includes("email_provider_id=$4"));
  assert.deepEqual(update.args, [
    "request",
    recoveryHash(deliveredToken),
    "FAILED",
    null,
    "PROVIDER_FAILURE",
  ]);
});
test("recent or still-valid recovery requests suppress repeat issuance and delivery", async (t) => {
  t.mock.method(mail, "recoveryMailConfig", () => ({}) as any);
  let sent = 0;
  t.mock.method(mail, "sendRecoveryMail", async () => {
    sent++;
    return {} as any;
  });
  let recent = true;
  const f = fixture(t, (sql) =>
    sql.includes("SELECT a.id,a.email")
      ? [{ id: "account" }]
      : sql.includes("requested_at>now()")
        ? recent
          ? [{}]
          : []
        : sql.includes("status='ISSUED' AND expires_at>now()")
          ? [{}]
          : [],
  );
  assert.deepEqual(
    await f.s.request("alice@example.test"),
    automaticRecoveryAcknowledgement,
  );
  recent = false;
  assert.deepEqual(
    await f.s.request("alice@example.test"),
    automaticRecoveryAcknowledgement,
  );
  assert.equal(sent, 0);
  assert.equal(
    f.calls.some((c) => c.sql.startsWith("INSERT")),
    false,
  );
});
test("recovery completion rechecks account version, changes password and revokes every old session", async (t) => {
  t.mock.method(argon2, "hash", async (password: string) => {
    assert.equal(password, "new-password-123");
    return "new-hash";
  });
  const f = fixture(t, (sql) =>
    sql.startsWith("SELECT account_id")
      ? [{ account_id: "account" }]
      : sql.startsWith("SELECT id,active")
        ? [
            {
              id: "account",
              active: true,
              platform_only: false,
              session_version: 2,
            },
          ]
        : sql.startsWith("SELECT id,account_version")
          ? [{ id: "request", account_version: 2 }]
          : [],
  );
  assert.deepEqual(await f.s.complete("unit-token", "new-password-123"), {
    ok: true,
  });
  assert.deepEqual(
    f.calls.find((c) => c.sql.startsWith("UPDATE account"))!.args,
    ["account", "new-hash"],
  );
  assert.deepEqual(
    f.calls.find((c) => c.sql.startsWith("DELETE FROM session"))!.args,
    ["account"],
  );
  assert.ok(
    f.calls.some((c) => c.sql.includes("status='COMPLETED',completed_at")),
  );
  assert.ok(f.calls.some((c) => c.args.includes("PASSWORD_RECOVERED")));
});
test("invalid recovery tokens fail before password hashing", async (t) => {
  let hashes = 0;
  t.mock.method(argon2, "hash", async () => {
    hashes++;
    return "hash";
  });
  const f = fixture(t, () => []);
  await assert.rejects(f.s.complete("invalid", "password"), status(400));
  assert.equal(hashes, 0);
});
for (const reason of [
  "disabled",
  "platform",
  "admin",
  "closing",
  "expired",
  "changed-version",
])
  test(
    "recovery refuses " + reason + " accounts without changing passwords",
    async (t) => {
      t.mock.method(argon2, "hash", async () => "hash");
      const f = fixture(t, (sql) =>
        sql.startsWith("SELECT account_id")
          ? [{ account_id: "account" }]
          : sql.startsWith("SELECT id,active")
            ? [
                {
                  id: "account",
                  active: reason !== "disabled",
                  platform_only: reason === "platform",
                  session_version: 2,
                },
              ]
            : sql.startsWith("SELECT id,account_version")
              ? reason === "expired"
                ? []
                : [
                    {
                      id: "request",
                      account_version: reason === "changed-version" ? 1 : 2,
                    },
                  ]
              : sql.includes("FROM platform_admin") && reason === "admin"
                ? [{}]
                : sql.includes("FROM closure_request") && reason === "closing"
                  ? [{}]
                  : [],
      );
      await assert.rejects(
        f.s.complete("token", "password"),
        (e) =>
          status(400)(e) &&
          (e as any).getResponse().code === "RECOVERY_INVALID",
      );
      assert.equal(
        f.calls.some((c) => c.sql.startsWith("UPDATE")),
        false,
      );
    },
  );
test("recovery controller forwards supplied email, token and new password", async () => {
  const calls: any[] = [];
  const c = new RecoveryController({
    request: async (email: string) => {
      calls.push(email);
      return { ok: true };
    },
    complete: async (...args: any[]) => {
      calls.push(args);
      return { ok: true };
    },
  } as any);
  assert.deepEqual(await c.request({ email: "alice@example.test" }), {
    ok: true,
  });
  assert.deepEqual(await c.complete({ token: "token", password: "password" }), {
    ok: true,
  });
  assert.deepEqual(calls, ["alice@example.test", ["token", "password"]]);
});
