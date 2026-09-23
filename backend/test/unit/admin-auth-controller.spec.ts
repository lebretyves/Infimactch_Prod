import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AdminAuthController,
  AdminGuard,
  hashInvitation,
} from "../../src/admin/admin-auth";
import {
  newTotpSecret,
  sealSecret,
  totp,
  openSecret,
} from "../../src/admin/mfa";
const argon2 = require("argon2");
const status = (n: number) => (e: any) => e.getStatus?.() === n;
function fixture(t: any) {
  for (const [key, value] of Object.entries({
    ADMIN_ORIGIN: "https://admin.unit.invalid",
    ADMIN_MFA_KEY: Buffer.alloc(32, 4).toString("base64"),
    ADMIN_MFA_KEY_VERSION: "1",
  })) {
    const old = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (old === undefined) delete process.env[key];
      else process.env[key] = old;
    });
  }
  t.mock.method(argon2, "verify", async () => true);
  t.mock.method(argon2, "hash", async () => "password-hash");
  const secret = newTotpSecret();
  let row: any = {
    id: "admin",
    email: "admin@example.test",
    active: true,
    account_active: true,
    session_version: 1,
    version: 2,
    role: "OWNER",
    totp_secret: sealSecret(secret),
    last_counter: -1,
    password_hash: "hash",
    recovery_hashes: [],
    mfa_enrolled: true,
  };
  const calls: any[] = [];
  const db: any = {
    query: async (sql: string, args: any[] = []) => {
      calls.push({ sql, args });
      return sql.startsWith("SELECT") ? [row] : [];
    },
  };
  db.transaction = async (fn: any) => fn(db);
  const req: any = { session: {} };
  req.session.regenerate = (cb: any) => cb();
  req.session.save = (cb: any) => cb();
  req.session.destroy = (cb: any) => cb();
  return {
    c: new AdminAuthController(db),
    guard: new AdminGuard(db),
    req,
    secret,
    row,
    calls,
  };
}
test("admin login starts MFA without granting access and invalid passwords increment lockout counters", async (t) => {
  const f = fixture(t);
  const result = await f.c.login(f.req, {
    email: f.row.email,
    password: "password",
  });
  assert.equal(result.status, "MFA_REQUIRED");
  assert.equal(f.req.session.adminMfaVerified, undefined);
  assert.equal(f.req.session.adminChallenge.userId, "admin");
  assert.match(result.csrfToken!, /^[a-f0-9]{64}$/);
  t.mock.method(argon2, "verify", async () => false);
  await assert.rejects(
    f.c.login(f.req, { email: f.row.email, password: "wrong" }),
    status(401),
  );
  assert.ok(
    f.calls.some((c) => c.sql.includes("failed_attempts=failed_attempts+1")),
  );
});
test("first admin login enrolls an encrypted factor, returns recovery codes once and establishes MFA session", async (t) => {
  const f = fixture(t);
  f.row.totp_secret = null;
  const challenge = await f.c.login(f.req, {
    email: f.row.email,
    password: "password",
  });
  assert.equal(challenge.status, "MFA_ENROLLMENT_REQUIRED");
  assert.ok(challenge.otpauthUri!.startsWith("otpauth://totp/"));
  assert.notEqual(f.req.session.adminChallenge.enrollment, challenge.secret);
  assert.equal(
    openSecret(f.req.session.adminChallenge.enrollment),
    challenge.secret,
  );
  const result = await f.c.mfa(f.req, {
    code: totp(challenge.secret!, Math.floor(Date.now() / 30000)),
  });
  assert.equal(result.status, "AUTHENTICATED");
  assert.equal(result.recoveryCodes!.length, 8);
  assert.equal(new Set(result.recoveryCodes).size, 8);
  assert.equal(f.req.session.adminMfaVerified, true);
  assert.equal(f.req.session.adminVersion, 2);
  const update = f.calls.find((c) => c.sql.includes("SET totp_secret=$2"));
  assert.deepEqual(update.args[3], result.recoveryCodes!.map(hashInvitation));
  assert.ok(!JSON.stringify(update).includes(result.recoveryCodes![0]!));
});
test("admin MFA refuses expired challenges, reused codes and concurrent factor replacement", async (t) => {
  const f = fixture(t);
  await assert.rejects(f.c.mfa(f.req, { code: "000000" }), status(401));
  await f.c.login(f.req, { email: f.row.email, password: "password" });
  f.req.session.adminChallenge.expires = 0;
  await assert.rejects(f.c.mfa(f.req, { code: "000000" }), status(401));
  await f.c.login(f.req, { email: f.row.email, password: "password" });
  f.row.last_counter = Math.floor(Date.now() / 30000) + 2;
  await assert.rejects(
    f.c.mfa(f.req, { code: totp(f.secret, Math.floor(Date.now() / 30000)) }),
    status(401),
  );
  f.req.session.adminChallenge.enrollment = sealSecret(newTotpSecret());
  await assert.rejects(f.c.mfa(f.req, { code: "000000" }), status(401));
  assert.equal(
    f.calls.some((c) => c.sql.includes("SET totp_secret=$2")),
    false,
  );
});
test("admin recovery consumes the code, revokes sessions and requires enrollment of a new factor", async (t) => {
  const f = fixture(t),
    code = "a".repeat(32);
  f.row.recovery_hashes = [hashInvitation(code)];
  await f.c.login(f.req, { email: f.row.email, password: "password" });
  await assert.rejects(f.c.recover(f.req, { code: "invalid" }), status(401));
  const result = await f.c.recover(f.req, { code });
  assert.equal(result.status, "MFA_ENROLLMENT_REQUIRED");
  assert.equal(f.req.session.adminChallenge.reset, true);
  assert.equal(f.req.session.adminChallenge.version, 3);
  assert.notEqual(result.secret, f.secret);
  assert.ok(f.calls.some((c) => c.sql.startsWith("DELETE FROM admin_session")));
  assert.deepEqual(f.calls.find((c) => c.sql.includes("array_remove"))!.args, [
    "admin",
    hashInvitation(code),
  ]);
});
test("admin invitations require possession and activation preserves a client password", async (t) => {
  const f = fixture(t),
    invitation = "i".repeat(40);
  f.row.invitation_hash = hashInvitation(invitation);
  f.row.invitation_expires_at = new Date(Date.now() + 60000);
  f.row.totp_secret = null;
  f.row.platform_only = false;
  assert.deepEqual(
    await f.c.checkInvitation({ email: f.row.email, invitation }),
    { passwordSetupRequired: true },
  );
  await assert.rejects(
    f.c.checkInvitation({ email: f.row.email, invitation: "wrong" }),
    status(401),
  );
  const result = await f.c.activate(f.req, {
    email: f.row.email,
    password: "new-password",
    invitation,
  });
  assert.equal(result.status, "MFA_ENROLLMENT_REQUIRED");
  assert.equal(
    f.calls.some((c) => c.sql.startsWith("UPDATE account")),
    false,
  );
  assert.deepEqual(
    f.calls.find((c) =>
      c.sql.startsWith("UPDATE platform_admin SET admin_password_hash"),
    )!.args,
    ["admin", "password-hash"],
  );
});
test("admin reauthentication refreshes write permissions only after password and unused TOTP", async (t) => {
  const f = fixture(t);
  Object.assign(f.req.session, {
    adminId: "admin",
    adminVersion: 2,
    adminAccountVersion: 1,
    adminVerifiedAt: 0,
  });
  assert.deepEqual(
    await f.c.reauth(f.req, {
      password: "password",
      code: totp(f.secret, Math.floor(Date.now() / 30000)),
    }),
    { ok: true },
  );
  assert.ok(f.req.session.adminVerifiedAt > 0);
  f.row.version = 3;
  await assert.rejects(
    f.c.reauth(f.req, { password: "password", code: "000000" }),
    status(401),
  );
});
test("admin guard rejects expired sessions and changed privileges; self and logout retain identity", async (t) => {
  const f = fixture(t),
    ctx: any = { switchToHttp: () => ({ getRequest: () => f.req }) };
  await assert.rejects(f.guard.canActivate(ctx), status(401));
  Object.assign(f.req.session, {
    adminMfaVerified: true,
    adminId: "admin",
    adminVersion: 2,
    adminAccountVersion: 1,
    adminVerifiedAt: Date.now(),
    adminActivityAt: Date.now(),
    adminAuthenticatedAt: Date.now(),
  });
  assert.equal(await f.guard.canActivate(ctx), true);
  assert.equal(f.req.adminRole, "OWNER");
  assert.equal((await f.c.me(f.req)).role, "OWNER");
  f.row.version = 3;
  await assert.rejects(f.guard.canActivate(ctx), status(401));
  assert.deepEqual(await f.c.logout(f.req), { ok: true });
  assert.ok(f.calls.some((c) => c.args.includes("ADMIN_LOGOUT")));
});
