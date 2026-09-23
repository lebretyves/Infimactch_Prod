import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { PscController } from "../../src/auth/psc.module";
import { sealSecret } from "../../src/admin/mfa";
function setup(t: any) {
  const values: Record<string, string> = {
    PSC_ENABLED: "true",
    PSC_ENVIRONMENT: "sandbox",
    PSC_CLIENT_ID: "fixture",
    PSC_CLIENT_SECRET: "fixture",
    APP_ORIGIN: "https://app.example.invalid",
    DOCUMENT_KEY: Buffer.alloc(32, 7).toString("base64"),
    DOCUMENT_KEY_VERSION: "1",
    ADMIN_MFA_KEY: "",
  };
  const old = Object.fromEntries(
    Object.keys(values).map((k) => [k, process.env[k]]),
  );
  Object.assign(process.env, values);
  t.after(() => {
    for (const [k, v] of Object.entries(old)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
  const calls: any[] = [],
    redirects: any[] = [];
  let challenge: any, account: any, linked: any;
  const db: any = {
    query: async (sql: string, params: any[]) => {
      calls.push({ sql, params });
      if (sql.startsWith("DELETE FROM psc_challenge WHERE state_hash"))
        return challenge ? [challenge] : [];
      if (sql.includes("FROM account")) return account ? [account] : [];
      if (sql.startsWith("SELECT user_id FROM professional_identity"))
        return linked ? [linked] : [];
      return [];
    },
    transaction: async (fn: any) => fn(db),
  };
  const session: any = {
    save: (cb: any) => cb(),
    regenerate: (cb: any) => cb(),
  };
  const req: any = {
    sessionID: "fixture-session",
    session,
    query: { state: "fixture-state", code: "fixture-code" },
  };
  const res: any = {
    redirect: (status: number, url: string) => {
      redirects.push({ status, url });
      return url;
    },
  };
  let completions = 0;
  const provider: any = {
    begin: async () => ({
      state: "fixture-state",
      nonce: "fixture-nonce",
      verifier: "fixture-verifier",
      url: "https://provider.invalid/authorize",
    }),
    complete: async () => {
      completions++;
      return { subjectNameId: "fixture-name", subject: "fixture-subject" };
    },
  };
  return {
    controller: new PscController(db, provider),
    req,
    res,
    calls,
    redirects,
    provider,
    session,
    setChallenge: (v: any) => (challenge = v),
    setAccount: (v: any) => (account = v),
    setLinked: (v: any) => (linked = v),
    get completions() {
      return completions;
    },
  };
}
test("PSC link requires a recent nurse session and a still-active account before creating a challenge", async (t) => {
  const f = setup(t);
  for (const session of [
    {},
    { userId: "nurse", family: "ENTERPRISE", authenticatedAt: Date.now() },
    { userId: "nurse", family: "NURSE", authenticatedAt: 0 },
    {
      userId: "nurse",
      family: "NURSE",
      authenticatedAt: Date.now(),
      sessionVersion: 1,
    },
  ]) {
    f.req.session = { ...f.session, ...session };
    await assert.rejects(
      f.controller.start(f.req, { purpose: "link" }),
      (e) => (e as any).getStatus() === 401,
    );
  }
  assert.equal(
    f.calls.some((c) => c.sql.startsWith("INSERT INTO psc_challenge")),
    false,
  );
  f.req.session = {
    ...f.session,
    userId: "nurse",
    family: "NURSE",
    authenticatedAt: Date.now(),
    sessionVersion: 1,
  };
  f.setAccount({ id: "nurse", session_version: 1 });
  assert.deepEqual(await f.controller.start(f.req, { purpose: "link" }), {
    url: "https://provider.invalid/authorize",
  });
  const insert = f.calls.find((c) =>
    c.sql.startsWith("INSERT INTO psc_challenge"),
  );
  assert.equal(insert.params[2], "nurse");
  assert.equal(insert.params[3], 1);
  assert.notEqual(insert.params[0], "fixture-state");
  assert.notEqual(insert.params[5], "fixture-verifier");
});
test("PSC login stores an anonymous challenge and propagates session persistence failure", async (t) => {
  const f = setup(t);
  await f.controller.start(f.req, { purpose: "login" });
  const insert = f.calls.find((c) =>
    c.sql.startsWith("INSERT INTO psc_challenge"),
  );
  assert.equal(insert.params[2], null);
  assert.equal(insert.params[3], null);
  f.session.save = (cb: any) => cb(Error("session unavailable"));
  await assert.rejects(
    f.controller.start(f.req, { purpose: "login" }),
    /session unavailable/,
  );
});
test("PSC callback refuses missing, excessive and consumed states without calling the provider", async (t) => {
  const f = setup(t);
  for (const state of [undefined, [], "x".repeat(201), "unknown"]) {
    f.req.query = { state };
    await f.controller.callback(f.req, f.res);
    assert.match(f.redirects.at(-1).url, /psc=echec$/);
  }
  assert.equal(f.completions, 0);
  assert.equal(
    f.redirects.every((r) => r.status === 303),
    true,
  );
});
test("PSC cancellation consumes its challenge but does not authenticate", async (t) => {
  const f = setup(t);
  f.setChallenge({ user_id: null });
  f.req.query.error = "access_denied";
  await f.controller.callback(f.req, f.res);
  assert.match(f.redirects[0].url, /psc=annule$/);
  assert.equal(f.completions, 0);
  assert.equal(f.session.userId, undefined);
});
test("PSC successful unlinked identity requires association, while a linked identity renews the session", async (t) => {
  const f = setup(t);
  f.setChallenge({
    user_id: null,
    nonce: "nonce",
    verifier: sealSecret("verifier"),
  });
  await f.controller.callback(f.req, f.res);
  assert.match(f.redirects.at(-1).url, /psc=association-requise$/);
  f.setAccount({ id: "nurse", family: "NURSE", session_version: 3 });
  let renewals = 0;
  f.session.regenerate = (cb: any) => {
    renewals++;
    cb();
  };
  await f.controller.callback(f.req, f.res);
  assert.equal(renewals, 1);
  assert.equal(f.session.userId, "nurse");
  assert.equal(f.session.sessionVersion, 3);
  assert.match(f.session.csrf, /^[a-f0-9]{64}$/);
  assert.equal(f.redirects.at(-1).url, "https://app.example.invalid/accueil");
});
test("PSC identity association checks session version, active ownership and collision", async (t) => {
  const f = setup(t);
  f.setChallenge({
    user_id: "nurse",
    account_version: 2,
    nonce: "nonce",
    verifier: sealSecret("verifier"),
  });
  await f.controller.callback(f.req, f.res);
  assert.match(f.redirects.at(-1).url, /psc=echec$/);
  Object.assign(f.session, { userId: "nurse", sessionVersion: 2 });
  await f.controller.callback(f.req, f.res);
  assert.match(f.redirects.at(-1).url, /psc=echec$/);
  f.setAccount({ id: "nurse", family: "NURSE", session_version: 2 });
  f.setLinked({ user_id: "other" });
  await f.controller.callback(f.req, f.res);
  assert.match(f.redirects.at(-1).url, /psc=echec$/);
  f.setLinked({ user_id: "nurse" });
  await f.controller.callback(f.req, f.res);
  assert.equal(
    f.redirects.at(-1).url,
    "https://app.example.invalid/profil?psc=associe",
  );
});
test("PSC provider and session errors redirect safely without exposing their contents", async (t) => {
  const f = setup(t);
  f.setChallenge({
    user_id: null,
    nonce: "nonce",
    verifier: sealSecret("verifier"),
  });
  f.provider.complete = async () => {
    throw Error("PRIVATE PROVIDER DETAIL");
  };
  await f.controller.callback(f.req, f.res);
  assert.match(f.redirects.at(-1).url, /psc=echec$/);
  assert.equal(JSON.stringify(f.redirects).includes("PRIVATE"), false);
});
