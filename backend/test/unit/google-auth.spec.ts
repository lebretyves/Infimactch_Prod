import { test } from "node:test";
import assert from "node:assert/strict";
import { googleClaims } from "../../src/auth/google";
import type { TokenPayload } from "google-auth-library";
const claims = {
  iss: "https://accounts.google.com",
  aud: "client",
  sub: "google-subject",
  email: "PERSON@example.com",
  email_verified: true,
  iat: 1,
  exp: 2,
  nonce: "challenge",
} as TokenPayload;
test("Google identity uses the verified subject and normalizes email", () =>
  assert.deepEqual(googleClaims(claims, "challenge"), {
    subject: "google-subject",
    email: "person@example.com",
  }));
test("Google login rejects a missing or mismatched session nonce", () => {
  assert.throws(() => googleClaims(claims, "other"));
  assert.throws(() =>
    googleClaims({ ...claims, nonce: undefined } as TokenPayload, "challenge"),
  );
});
test("Google login rejects unverified or incomplete identity claims", () => {
  assert.throws(() =>
    googleClaims({ ...claims, email_verified: false }, "challenge"),
  );
  assert.throws(() => googleClaims({ ...claims, sub: "" }, "challenge"));
  assert.throws(() => googleClaims(undefined, "challenge"));
});

import { GoogleAuth } from "../../src/auth/google";
import { Database } from "../../src/database/database";
import * as argon2 from "argon2";
function service(rows: unknown[][], verified: TokenPayload = claims) {
  const calls: { sql: string; values?: unknown[] }[] = [];
  const db = {
    transaction: async (fn: (em: unknown) => Promise<unknown>) =>
      fn({
        query: async (sql: string, values?: unknown[]) => {
          calls.push({ sql, values });
          return rows.shift() || [];
        },
      }),
  };
  const auth = new GoogleAuth(db as unknown as Database);
  let verification: unknown;
  (auth as any).client = {
    verifyIdToken: async (options: unknown) => {
      verification = options;
      return { getPayload: () => verified };
    },
  };
  return { auth, calls, verification: () => verification };
}
test("Google verifies the configured audience and logs in by subject, never by changed email", async () => {
  const old = process.env.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = "test-client";
  try {
    const s = service([[{ id: "account", family: "NURSE", active: true, session_version: 3 }]]);
    assert.deepEqual(await s.auth.login("signed-token", "challenge"), {
      id: "account",
      family: "NURSE",
      session_version: 3,
    });
    assert.deepEqual(s.verification(), {
      idToken: "signed-token",
      audience: "test-client",
    });
    assert.equal(s.calls.length, 1);
    assert.deepEqual(s.calls[0]?.values, ["google-subject"]);
  } finally {
    if (old === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = old;
  }
});
test("Google never auto-links accounts on matching email alone", async () => {
  const old = process.env.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = "test-client";
  try {
    const s = service([[], [{ id: "account", family: "NURSE", active: true, session_version: 3, password_hash: "unused" }]]);
    await assert.rejects(
      s.auth.login("signed-token", "challenge"),
      (e: any) => e.getResponse().code === "GOOGLE_LINK_REQUIRED",
    );
    assert.equal(s.calls.length, 2);
  } finally {
    if (old === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = old;
  }
});
test("Google cannot link with an invalid local password", async () => {
  const old = process.env.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = "test-client";
  try {
    const hash = await argon2.hash("valid-test-password");
    const s = service([
      [],
      [{ id: "account", family: "NURSE", active: true, session_version: 3, password_hash: hash }],
    ]);
    await assert.rejects(
      s.auth.login("signed-token", "challenge", "wrong-test-password"),
    );
    assert.equal(
      s.calls.some((c) => c.sql.startsWith("INSERT")),
      false,
    );
  } finally {
    if (old === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = old;
  }
});
test("Google links only after checking the local password and audits the association", async () => {
  const old = process.env.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = "test-client";
  try {
    const hash = await argon2.hash("valid-test-password");
    const s = service([
      [],
      [{ id: "account", family: "ENTERPRISE", active: true, session_version: 3, password_hash: hash }],
    ]);
    assert.deepEqual(
      await s.auth.login("signed-token", "challenge", "valid-test-password"),
      { id: "account", family: "ENTERPRISE", session_version: 3 },
    );
    assert.deepEqual(
      s.calls.find((c) => c.sql.startsWith("INSERT INTO google_identity"))
        ?.values,
      ["google-subject", "account"],
    );
    assert.ok(s.calls.find((c) => c.sql.startsWith("INSERT INTO audit")));
  } finally {
    if (old === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = old;
  }
});
test("A rejected Google signature never queries application accounts", async () => {
  const old = process.env.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = "test-client";
  try {
    const s = service([]);
    (s.auth as any).client = {
      verifyIdToken: async () => {
        throw new Error("invalid signature");
      },
    };
    await assert.rejects(s.auth.login("forged", "challenge"));
    assert.equal(s.calls.length, 0);
  } finally {
    if (old === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = old;
  }
});

test("First Google access prepares registration without creating an account", async () => {
  const old = process.env.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = "test-client";
  try {
    const s = service([[], []]);
    assert.deepEqual(await s.auth.login("signed-token", "challenge"), {
      registrationRequired: true, identity: { subject: "google-subject", email: "person@example.com" },
    });
    assert.equal(s.calls.some(c => c.sql.startsWith("INSERT")), false);
  } finally {
    if (old === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = old;
  }
});


test("Certificate retrieval failures are service errors and never access accounts", async () => {
  const old = process.env.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = "test-client";
  try {
    const s = service([]);
    (s.auth as any).client = { verifyIdToken: async () => { throw new Error("Failed to retrieve verification certificates: unavailable"); } };
    await assert.rejects(s.auth.login("opaque-token", "challenge"), (e: any) => e.getStatus() === 503 && e.getResponse().code === "GOOGLE_UNAVAILABLE");
    assert.equal(s.calls.length, 0);
  } finally { if (old === undefined) delete process.env.GOOGLE_CLIENT_ID; else process.env.GOOGLE_CLIENT_ID = old; }
});

import { AuthController, AuthService, RegistrationDetails } from "../../src/auth/auth.module";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
function requestSession(values: Record<string, unknown> = {}) {
  const req: any = { session: { ...values } };
  const methods = {
    save: (done: (e?: unknown) => void) => done(),
    regenerate: (done: (e?: unknown) => void) => { req.session = { ...methods }; done(); },
  };
  Object.assign(req.session, methods);
  return req;
}
test("New verified identity stays on server until explicit registration; session rotates on completion", async () => {
  const identity = { subject: "private-subject", email: "new@example.invalid", firstName: "Camille" };
  let received: unknown;
  const ctrl = new AuthController({ registerGoogle: async (_body: unknown, value: unknown) => { received = value; return {id:"created",family:"NURSE",session_version:1}; } } as any,
    { login: async () => ({registrationRequired:true, identity}) } as any, {} as any);
  const req = requestSession({googleChallenges:[{nonce:"nonce-a",expires:Date.now()+10000},{nonce:"nonce-b",expires:Date.now()+10000}]});
  assert.deepEqual(await ctrl.googleLogin({credential:"never-stored",nonce:"nonce-a"},req), {registrationRequired:true});
  assert.equal(req.session.googleChallenges.length,1);
  assert.equal(req.session.googleChallenges[0].nonce,"nonce-b");
  assert.equal(JSON.stringify(req.session).includes("never-stored"),false);
  const exposed = ctrl.googleRegistration(req);
  assert.equal(exposed.email,identity.email);assert.equal("subject" in exposed,false);
  const result=await ctrl.googleRegister(req,{family:"NURSE",termsVersion:"2026-09-14"});
  assert.equal((received as any).subject,"private-subject");
  assert.equal(result.user.id,"created");assert.equal(req.session.userId,"created");
  assert.equal(req.session.sessionVersion,1);
  assert.equal(req.session.googleRegistration,undefined);assert.equal(req.session.googleChallenges,undefined);
});
test("Google challenge cannot be consumed twice; another tab challenge is retained",async()=>{
  const ctrl=new AuthController({} as any,{login:async()=>({id:"known",family:"NURSE",session_version:3})} as any,{} as any);
  const req=requestSession({googleChallenges:[{nonce:"single",expires:Date.now()+10000}]});
  await ctrl.googleLogin({credential:"token",nonce:"single"},req);
  await assert.rejects(ctrl.googleLogin({credential:"token",nonce:"single"},req),(e:any)=>e.getResponse().code==='GOOGLE_CHALLENGE_EXPIRED');
});
test("Missing or expired Google preregistration cannot create an account",async()=>{
  let creates=0;
  const ctrl=new AuthController({registerGoogle:async()=>{creates++;}} as any,{} as any,{} as any);
  for(const req of [requestSession(),requestSession({googleRegistration:{subject:"x",email:"x@example.invalid",expires:Date.now()-1}})]) {
    assert.throws(()=>ctrl.googleRegistration(req),(e:any)=>e.getResponse().code==='GOOGLE_REGISTRATION_EXPIRED');
    await assert.rejects(ctrl.googleRegister(req,{family:"NURSE",termsVersion:"2026-09-14"}),(e:any)=>e.getResponse().code==='GOOGLE_REGISTRATION_EXPIRED');
  }
  assert.equal(creates,0);
});
test("Google registration requires an explicit family and terms version and rejects supplied credentials",()=>{
  assert.equal(validateSync(plainToInstance(RegistrationDetails,{family:'NURSE',termsVersion:'2026-09-14'})).length,0);
  for(const body of [{family:'NURSE'}, {termsVersion:'2026-09-14'}, {family:'ADMIN',termsVersion:'2026-09-14'}, {family:'NURSE',termsVersion:'2026-09-14',email:'attacker@example.invalid',password:'irrelevant-password'}])
    assert.ok(validateSync(plainToInstance(RegistrationDetails,body),{whitelist:true,forbidNonWhitelisted:true}).length);
});
test("Google signup creates account, identity and profile in one transaction with a nonempty Argon2 hash",async()=>{
 const calls:{sql:string;values:any[]}[]=[];let transactions=0;
 const db={transaction:async(fn:any)=>{transactions++;return fn({query:async(sql:string,values:any[]=[])=>{calls.push({sql,values});return sql.startsWith('INSERT INTO account')?[{id:'new',family:'NURSE',session_version:1}]:[];}})}};
 const auth=new AuthService(db as any);
 const result=await auth.registerGoogle({family:'NURSE',termsVersion:'2026-09-14'},{subject:'verified-subject',email:'verified@example.invalid'});
 assert.equal(result.id,'new');assert.equal(transactions,1);
 const inserted=calls.find(c=>c.sql.startsWith('INSERT INTO account'))!;
 assert.equal(inserted.values[0],'verified@example.invalid');assert.match(inserted.values[1],/^\$argon2id\$/);
 assert.ok(calls.some(c=>c.sql.startsWith('INSERT INTO google_identity')&&c.values[0]==='verified-subject'));
 assert.ok(calls.some(c=>c.sql.startsWith('INSERT INTO profile')));
});

for (const linked of [true, false]) test(`Google refuses disabled accounts (${linked ? "linked" : "email association"})`, async () => {
  const old = process.env.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = "test-client";
  try {
    const account = { id: "disabled", family: "NURSE", active: false, session_version: 4 };
    const s = service(linked ? [[account]] : [[], [account]]);
    await assert.rejects(s.auth.login("signed-token", "challenge", "password"), (e: any) => e.getStatus() === 401);
    assert.equal(s.calls.some(c => c.sql.startsWith("INSERT")), false);
  } finally { if (old === undefined) delete process.env.GOOGLE_CLIENT_ID; else process.env.GOOGLE_CLIENT_ID = old; }
});
