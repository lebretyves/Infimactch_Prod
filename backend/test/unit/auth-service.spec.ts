import { test } from "node:test";
import assert from "node:assert/strict";
import { AuthService, AuthController } from "../../src/auth/auth.module";
import * as validation from "../../src/profiles/profile-validation";
const argon2 = require("argon2");
const status = (n: number) => (e: any) => e.getStatus?.() === n;
function fixture(t: any, answer: (sql: string, args: any[]) => any) {
  const calls: any[] = [];
  t.mock.method(argon2, "hash", async () => "hashed-password");
  t.mock.method(argon2, "verify", async () => true);
  const db: any = {
    query: async (sql: string, args: any[] = []) => {
      calls.push({ sql, args });
      return answer(sql, args);
    },
  };
  db.transaction = async (fn: any) => fn(db);
  return { auth: new AuthService(db), db, calls };
}
const account = { id: "account", family: "NURSE", session_version: 2 };
const base = {
  email: " Alice@Example.test ",
  password: "unit-password-123",
  family: "NURSE",
  termsVersion: "2026-09-14",
} as any;
test("nurse registration normalizes email, stores only the hash and creates an empty profile", async (t) => {
  const f = fixture(t, (sql) =>
    sql.startsWith("INSERT INTO account")
      ? [account]
      : sql.startsWith("INSERT INTO outbox")
        ? [{ id: "event" }]
        : [],
  );
  assert.deepEqual(await f.auth.register(base), account);
  assert.deepEqual(
    f.calls.find((c) => c.sql.startsWith("INSERT INTO account"))!.args,
    ["alice@example.test", "hashed-password", "NURSE", "2026-09-14"],
  );
  assert.deepEqual(
    f.calls.find((c) => c.sql.startsWith("INSERT INTO profile("))!.args,
    ["account"],
  );
  assert.ok(!JSON.stringify(f.calls).includes(base.password));
});
test("registration stores validated profile qualifications and links Google identity", async (t) => {
  let validated = 0;
  t.mock.method(validation, "validateProfile", () => {
    validated++;
  });
  const f = fixture(t, (sql) =>
    sql.startsWith("INSERT INTO account")
      ? [account]
      : sql.startsWith("INSERT INTO outbox")
        ? [{ id: "event" }]
        : [],
  );
  const profile = {
    displayName: "Alice",
    qualifications: ["IDE", "IADE"],
    skills: [],
    experience: [],
    available: [],
    unavailable: [],
    latitude: null,
    longitude: null,
    radiusKm: null,
    acceptedShifts: [],
    preferredShifts: [],
    visible: true,
    details: { firstName: "Alice" },
  };
  assert.deepEqual(
    await f.auth.registerGoogle(
      { ...base, profile, rppsNumber: "12345678901" },
      { email: "alice@example.test", subject: "google-subject" },
    ),
    account,
  );
  assert.equal(validated, 1);
  assert.deepEqual(
    f.calls.find((c) => c.sql.startsWith("INSERT INTO google_identity"))!.args,
    ["google-subject", "account"],
  );
  assert.deepEqual(
    f.calls
      .filter((c) => c.sql.startsWith("INSERT INTO profile_qualification"))
      .map((c) => c.args),
    [
      ["account", "IDE"],
      ["account", "IADE"],
    ],
  );
  assert.equal(
    f.calls.find((c) => c.sql.startsWith("INSERT INTO profile("))!.args[14],
    "12345678901",
  );
});
test("enterprise registration validates required organisation data before writing and creates membership", async (t) => {
  const f = fixture(t, (sql) =>
    sql.startsWith("INSERT INTO account")
      ? [{ ...account, family: "ENTERPRISE" }]
      : sql.startsWith("INSERT INTO organization")
        ? [{ id: "org" }]
        : sql.startsWith("INSERT INTO outbox")
          ? [{ id: "event" }]
          : [],
  );
  await assert.rejects(
    f.auth.register({ ...base, family: "ENTERPRISE" }),
    status(400),
  );
  assert.equal(f.calls.length, 0);
  const b = {
    ...base,
    family: "ENTERPRISE",
    organizationType: "ESTABLISHMENT",
    name: "Hospital",
    address: "Paris centre",
    referent: "Alice",
  };
  await assert.rejects(f.auth.register(b), status(400));
  await f.auth.register({ ...b, finess: "750000000" });
  assert.deepEqual(
    f.calls.find((c) => c.sql.startsWith("INSERT INTO membership"))!.args,
    ["account", "org"],
  );
});
test("registration distinguishes Google conflicts without leaking uniqueness details", async (t) => {
  const f = fixture(t, () => {
    throw Object.assign(new Error("private unique detail"), { code: "23505" });
  });
  await assert.rejects(
    f.auth.register(base),
    (e) => status(400)(e) && !String(e).includes("private unique"),
  );
  await assert.rejects(
    f.auth.registerGoogle(base, { email: base.email, subject: "google" }),
    (e) =>
      status(409)(e) &&
      (e as any).getResponse().code === "GOOGLE_ACCOUNT_EXISTS",
  );
});
test("login performs password work for unknown users and rejects invalid, disabled and platform-only accounts", async (t) => {
  let row: any;
  const f = fixture(t, () => (row ? [row] : []));
  let hashes = 0;
  t.mock.method(argon2, "hash", async () => {
    hashes++;
    return "hash";
  });
  await assert.rejects(f.auth.login(base), status(401));
  assert.equal(hashes, 1);
  for (const patch of [{ active: false }, { platform_only: true }]) {
    row = {
      ...account,
      password_hash: "hash",
      active: true,
      platform_only: false,
      ...patch,
    };
    await assert.rejects(f.auth.login(base), status(401));
  }
  row = {
    ...account,
    password_hash: "hash",
    active: true,
    platform_only: false,
  };
  assert.deepEqual(await f.auth.login(base), account);
  t.mock.method(argon2, "verify", async () => {
    throw new Error("malformed hash");
  });
  await assert.rejects(f.auth.login(base), status(401));
});
function request(failure?: "regenerate" | "save" | "destroy") {
  const req: any = { session: {} };
  const calls: string[] = [];
  for (const name of ["regenerate", "save", "destroy"])
    req.session[name] = (cb: any) => {
      calls.push(name);
      cb(failure === name ? new Error(name + " failure") : undefined);
    };
  return { req, calls };
}
test("password login and registration rotate the session and bind CSRF to the new identity", async () => {
  const auth: any = {
    login: async () => account,
    register: async () => account,
  };
  const c = new AuthController(auth, {} as any, {} as any);
  for (const method of ["login", "register"] as const) {
    const r = request();
    const result = await c[method](base, r.req);
    assert.deepEqual(r.calls, ["regenerate", "save"]);
    assert.deepEqual(result.user, { id: "account", family: "NURSE" });
    assert.match(result.csrfToken, /^[a-f0-9]{64}$/);
    assert.equal(r.req.session.sessionVersion, 2);
    assert.equal(r.req.session.authenticatedAt, r.req.session.lastActivityAt);
  }
  for (const failure of ["regenerate", "save"] as const)
    await assert.rejects(
      c.login(base, request(failure).req),
      new RegExp(failure + " failure"),
    );
});
test("session endpoints return identity, preserve CSRF and destroy cookies only after logout", async () => {
  const db: any = {
    query: async (sql: string, args: any[]) => {
      assert.deepEqual(args, ["account"]);
      return sql.includes("FROM account")
        ? [{ id: "account", email: "alice@example.test" }]
        : [{ id: "org" }];
    },
  };
  const c = new AuthController(
      {} as any,
      { configuration: () => ({ enabled: false }) } as any,
      db,
    ),
    r = request();
  r.req.session.userId = "account";
  r.req.session.authenticatedAt = Date.now();
  r.req.session.lastActivityAt = Date.now();
  assert.deepEqual(c.googleConfig(), { enabled: false });
  const csrf = c.csrf(r.req);
  assert.deepEqual(c.csrf(r.req), csrf);
  const me = await c.me(r.req);
  assert.equal(me.email, "alice@example.test");
  assert.deepEqual(me.organizations, [{ id: "org" }]);
  await c.activity(r.req);
  assert.ok(r.calls.includes("save"));
  const cookies: any[] = [];
  assert.deepEqual(
    await c.logout(r.req, {
      clearCookie: (...args: any[]) => cookies.push(args),
    } as any),
    { ok: true },
  );
  assert.deepEqual(cookies, [["infimatch.sid", { path: "/" }]]);
  await assert.rejects(
    c.logout(request("destroy").req, {} as any),
    /destroy failure/,
  );
});
