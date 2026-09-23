import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateConfiguration,
  parseTrustProxy,
  documentQuotaBytes,
  required,
} from "../../src/config";
import { seedDemo } from "../../src/demo/seed";
import { structuredDetails } from "../../src/public-data/parser/structured-details";
import { PscProvider, pscConfiguration, pscIdentity } from "../../src/auth/psc";
function environment(t: any, values: Record<string, string | undefined>) {
  const old = Object.fromEntries(
    Object.keys(values).map((k) => [k, process.env[k]]),
  );
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  t.after(() => {
    for (const [k, v] of Object.entries(old)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
}
test("configuration rejects insecure production origins, missing secrets and unsupported persistence", (t) => {
  environment(t, {
    NODE_ENV: "test",
    DATABASE_URL: "postgres://fictional",
    MONGODB_URI: "mongodb://fictional",
    SESSION_SECRET: "s".repeat(32),
    SERVICE_TOKEN: "t".repeat(32),
    DOCUMENT_KEY: Buffer.alloc(32, 1).toString("base64"),
    APP_ORIGIN: "http://app.example.invalid",
    ADMIN_ORIGIN: undefined,
    VERCEL: undefined,
    DOCUMENT_STORAGE: undefined,
    TRUST_PROXY: undefined,
    DOCUMENT_QUOTA_BYTES: undefined,
  });
  validateConfiguration();
  for (const [key, values] of Object.entries({
    SESSION_SECRET: ["short", ""],
    SERVICE_TOKEN: ["short"],
    DOCUMENT_KEY: ["bad"],
    DOCUMENT_STORAGE: ["temporary"],
    ADMIN_ORIGIN: [
      "http://app.example.invalid",
      "https://admin.example.invalid/path",
      "https://user:pass@admin.example.invalid",
    ],
  })) {
    const old = process.env[key];
    for (const value of values) {
      process.env[key] = value;
      assert.throws(validateConfiguration);
    }
    if (old === undefined) delete process.env[key];
    else process.env[key] = old;
  }
  process.env.VERCEL = "1";
  assert.throws(validateConfiguration, /Persistent/);
  process.env.DOCUMENT_STORAGE = "postgres";
  validateConfiguration();
  process.env.NODE_ENV = "production";
  process.env.TRUST_PROXY = "1";
  assert.throws(validateConfiguration, /HTTPS/);
  process.env.APP_ORIGIN = "https://app.example.invalid";
  process.env.ADMIN_ORIGIN = "http://admin.example.invalid";
  assert.throws(validateConfiguration, /ADMIN_ORIGIN/);
  process.env.ADMIN_ORIGIN = "https://admin.example.invalid";
  validateConfiguration();
  process.env.SESSION_SECRET = "GENERATE_SECRET";
  assert.throws(() => required("SESSION_SECRET"));
});
test("proxy trust rejects malformed CIDRs and quota rejects fractions, infinity and unsafe values", () => {
  for (const value of [
    "",
    "11",
    "999999999999999999",
    "192.0.2.1/1/2",
    "192.0.2.1/x",
    "2001:db8::/129",
    ",",
    "host.example.invalid",
  ])
    assert.throws(() => parseTrustProxy(value, "production"));
  assert.deepEqual(
    parseTrustProxy("192.0.2.1,::1,linklocal,uniquelocal", "production"),
    ["192.0.2.1", "::1", "linklocal", "uniquelocal"],
  );
  assert.equal(documentQuotaBytes(""), 26214400);
  for (const value of ["Infinity", "NaN", "5242880.5", "9007199254740992"])
    assert.throws(() => documentQuotaBytes(value));
});
test("demo seed refuses production before accessing a database", async (t) => {
  environment(t, { NODE_ENV: "production" });
  await assert.rejects(seedDemo({} as any), /prohibited/);
});
test("structured salary ranges preserve units, components and uncertainty", () => {
  for (const [text, expected] of [
    [
      "Salaire 20 à 30 euros bruts par heure",
      {
        min: 20,
        max: 30,
        currency: "EUR",
        unit: "HOUR",
        gross: true,
        component: "UNSPECIFIED",
      },
    ],
    [
      "Fixe 2500 à 3000 euros nets par mois",
      {
        min: 2500,
        max: 3000,
        currency: "EUR",
        unit: "MONTH",
        gross: false,
        component: "FIXED",
      },
    ],
    [
      "Package 30k à 40k euros bruts annuels",
      {
        min: 30000,
        max: 40000,
        currency: "EUR",
        unit: "YEAR",
        gross: true,
        component: "PACKAGE",
      },
    ],
    [
      "Salaire 20 à 30",
      {
        min: 20,
        max: 30,
        currency: null,
        unit: null,
        gross: null,
        component: "UNSPECIFIED",
      },
    ],
  ] as const) {
    const ranges = structuredDetails(text).salaryRanges;
    assert.equal(ranges.length, 1, text);
    const { evidence, ...actual } = ranges[0];
    assert.deepEqual(actual, expected);
    assert.ok(evidence);
  }
  assert.deepEqual(structuredDetails("Entre 2 et 3 patients").salaryRanges, []);
  assert.deepEqual(
    structuredDetails("2 à 3 euros sans contexte").salaryRanges,
    [],
  );
  assert.deepEqual(
    structuredDetails("Poste en 12h ou 8h").shiftDurationsHours[0].values,
    [12, 8],
  );
  assert.deepEqual(
    structuredDetails("Mission en 7h").shiftDurationsHours[0].values,
    [7],
  );
  const pair = structuredDetails("7h30 à 19h45").hourPairs[0];
  assert.equal(pair.start, "07:30");
  assert.equal(pair.end, "19:45");
});
test("PSC discovery validates issuer and endpoints, caches metadata and creates PKCE challenges", async (t) => {
  environment(t, {
    PSC_ENABLED: "true",
    PSC_ENVIRONMENT: "sandbox",
    PSC_CLIENT_ID: "fixture-client",
    PSC_CLIENT_SECRET: "fixture-secret",
    APP_ORIGIN: "https://app.example.invalid",
  });
  const conf = pscConfiguration()!;
  let calls = 0;
  let meta: any = {
    issuer: conf.issuer,
    authorization_endpoint: conf.issuer + "/authorize",
    token_endpoint: conf.issuer + "/token",
    userinfo_endpoint: conf.issuer + "/userinfo",
    jwks_uri: conf.issuer + "/jwks",
    code_challenge_methods_supported: ["S256"],
  };
  t.mock.method(globalThis, "fetch", async (url: any) => {
    calls++;
    assert.equal(
      String(url),
      conf.issuer + "/.well-known/wallet-openid-configuration",
    );
    return new Response(JSON.stringify(meta));
  });
  const p = new PscProvider();
  assert.equal(await p.client(), await p.client());
  assert.equal(calls, 1);
  const begin = await p.begin(),
    url = new URL(begin.url);
  assert.equal(url.searchParams.get("state"), begin.state);
  assert.equal(url.searchParams.get("nonce"), begin.nonce);
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.ok(begin.verifier);
  for (const bad of [
    { issuer: "https://wrong.invalid" },
    { token_endpoint: undefined },
    { token_endpoint: "http://auth.bas.psc.esante.gouv.fr/token" },
    { jwks_uri: "https://user:pass@auth.bas.psc.esante.gouv.fr/jwks" },
    { userinfo_endpoint: "https://evil.example.invalid/userinfo" },
  ]) {
    const before = meta;
    meta = { ...meta, ...bad };
    await assert.rejects(new PscProvider().client());
    meta = before;
  }
  delete meta.code_challenge_methods_supported;
  assert.equal((await new PscProvider().begin()).verifier, "");
  process.env.PSC_ENABLED = "false";
  await assert.rejects(new PscProvider().begin());
  await assert.rejects(new PscProvider().client());
  for (const info of [
    { sub: "", SubjectNameID: "test" },
    { sub: "test", SubjectNameID: "" },
    { sub: "test", SubjectNameID: "a".repeat(201) },
  ])
    assert.throws(() => pscIdentity(info));
});
