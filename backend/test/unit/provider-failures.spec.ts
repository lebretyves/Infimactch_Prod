import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FranceTravailClient,
  advanceFtQuery,
} from "../../src/public-data/france-travail-client";
import {
  discordApi,
  discordConfigured,
  DiscordFailure,
  sendDiscord,
  channelPermissions,
  guildPermissions,
} from "../../src/notifications/discord-client";
function env(t: any, values: Record<string, string>) {
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
}
function ft(
  t: any,
  response: () => Response | Promise<Response>,
  auth = () => Response.json({ access_token: "fixture", expires_in: 300 }),
) {
  env(t, { FT_CLIENT_ID: "fixture", FT_CLIENT_SECRET: "fixture" });
  const calls: any[] = [],
    pauses: number[] = [];
  const transport = (async (input: any, options: any) => {
    calls.push({ url: String(input), options });
    return String(input).includes("access_token") ? auth() : response();
  }) as typeof fetch;
  return {
    client: new FranceTravailClient(transport, async (n) => {
      pauses.push(n);
    }),
    calls,
    pauses,
  };
}
test("France Travail validates bounds and identifiers before network access", async (t) => {
  const f = ft(t, () => {
    throw Error("unexpected network");
  });
  for (const limit of [0, 151, 1.5, NaN])
    await assert.rejects(f.client.search({ start: 0 }, limit), /Limit/);
  for (const start of [-1, 3001, 1.5, NaN])
    await assert.rejects(f.client.search({ start }), /RANGE/);
  for (const department of ["", "ABC", "1234"])
    await assert.rejects(
      f.client.search({ start: 0, department }),
      /department/,
    );
  for (const id of ["", "../secret", "a".repeat(51)])
    await assert.rejects(f.client.detail(id), /identifier/);
  assert.equal(f.calls.length, 0);
});
test("France Travail fails closed on absent credentials and malformed authentication", async (t) => {
  const f = ft(t, () => Response.json({ resultats: [] }));
  process.env.FT_CLIENT_ID = "";
  await assert.rejects(f.client.search({ start: 0 }), /credentials missing/);
  assert.equal(f.calls.length, 0);
  process.env.FT_CLIENT_ID = "fixture";
  for (const auth of [
    () => new Response(null, { status: 403 }),
    () => Response.json({}),
    () => Response.json({ access_token: "" }),
  ])
    await assert.rejects(
      ft(t, () => Response.json({ resultats: [] }), auth).client.search({
        start: 0,
      }),
      /authentication|token/,
    );
});
test("France Travail renews a rejected token exactly once and preserves query filters", async (t) => {
  let count = 0;
  const f = ft(t, () =>
    ++count === 1
      ? new Response(null, { status: 401 })
      : Response.json({ resultats: [{ id: "VALID_1" }] }),
  );
  const page = await f.client.search(
    {
      start: 0,
      department: "2A",
      rome: "J1503",
      keyword: "IDE",
      min: "2026-01-01T00:00:00Z",
      max: "2026-02-01T00:00:00Z",
    },
    1,
  );
  assert.deepEqual(page, { rows: [{ id: "VALID_1" }], total: 1, next: null });
  assert.equal(f.calls.filter((c) => c.url.includes("access_token")).length, 2);
  const url = new URL(f.calls.at(-1).url);
  assert.equal(url.searchParams.get("departement"), "2A");
  assert.equal(url.searchParams.get("codeROME"), "J1503");
  assert.equal(url.searchParams.get("minCreationDate"), "2026-01-01T00:00:00Z");
});
test("France Travail retry budget and long Retry-After do not trigger unbounded calls", async (t) => {
  for (const [status, retry, expected] of [
    [503, "bad", 3],
    [429, "6", 1],
    [401, "0", 2],
  ] as const) {
    const f = ft(
      t,
      () => new Response(null, { status, headers: { "Retry-After": retry } }),
    );
    await assert.rejects(f.client.search({ start: 0 }), /unavailable/);
    assert.equal(
      f.calls.filter((c) => !c.url.includes("access_token")).length,
      expected,
    );
    if (status === 503)
      assert.ok(f.pauses.includes(500) && f.pauses.includes(1000));
  }
});
test("France Travail rejects malformed payloads and impossible range metadata", async (t) => {
  for (const data of [
    {},
    { resultats: {} },
    { resultats: [{ id: "A" }, { id: "B" }] },
    { resultats: [null] },
    { resultats: [{ id: 1 }] },
    { resultats: [{ id: "../bad" }] },
  ])
    await assert.rejects(
      ft(t, () => Response.json(data)).client.search({ start: 0 }, 1),
      /Unexpected/,
    );
  for (const range of ["offres 0-1/1", "offres 0-0/0"])
    await assert.rejects(
      ft(t, () =>
        Response.json(
          { resultats: [{ id: "A" }] },
          { status: 206, headers: { "Content-Range": range } },
        ),
      ).client.search({ start: 0 }, 2),
      /INCONSISTENT/,
    );
  assert.deepEqual(
    await ft(t, () => new Response(null, { status: 204 })).client.search({
      start: 0,
    }),
    { rows: [], total: 0, next: null },
  );
});
test("France Travail deadline and saturated partition guards preserve incomplete status", async (t) => {
  const f = ft(t, () => Response.json({ resultats: [] }));
  (f.client as any).deadline = Date.now() - 1;
  await assert.rejects(f.client.search({ start: 0 }), /DEADLINE/);
  assert.equal(f.calls.length, 0);
  assert.throws(
    () =>
      advanceFtQuery(
        { start: 0, min: "invalid" },
        { rows: [], total: 4000, next: 150 },
      ),
    /SATURATED/,
  );
  assert.throws(
    () => advanceFtQuery({ start: 0 }, { rows: [], total: 3100, next: 3001 }),
    /INCOMPLETE/,
  );
  const split = advanceFtQuery(
    { start: 0, min: "2020-01-01T00:00:00Z", max: "2026-01-01T00:00:00Z" },
    { rows: [], total: 4000, next: 150 },
  );
  assert.equal(split[0]!.max, "2025-12-02T00:00:00Z");
});
test("Discord refuses unconfigured and insecure relay before making network requests", async (t) => {
  env(t, {
    DISCORD_BOT_TOKEN: "",
    DISCORD_RELAY_URL: "",
    DISCORD_RELAY_TOKEN: "",
  });
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return Response.json({});
  });
  assert.equal(discordConfigured(), false);
  await assert.rejects(discordApi("/users/@me"));
  process.env.DISCORD_RELAY_URL = "http://relay.example.invalid";
  process.env.DISCORD_RELAY_TOKEN = "fixture";
  await assert.rejects(discordApi("/users/@me"), /HTTPS/);
  assert.equal(calls, 0);
});
test("Discord relay validates envelope and forwards only the configured relay token", async (t) => {
  env(t, {
    DISCORD_BOT_TOKEN: "",
    DISCORD_RELAY_URL: "https://relay.example.invalid",
    DISCORD_RELAY_TOKEN: "fixture",
  });
  let reply: any = { statusCode: 200, body: { id: "channel" } };
  t.mock.method(globalThis, "fetch", async (url: any, options: any) => {
    assert.equal(url, "https://relay.example.invalid");
    assert.equal(options.method, "POST");
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.headers["X-InfiMatch-Discord"], "fixture");
    assert.deepEqual(JSON.parse(options.body), {
      path: "/users/@me",
      method: "GET",
    });
    return Response.json(reply);
  });
  assert.deepEqual(await discordApi("/users/@me"), { id: "channel" });
  for (const invalid of [null, {}, { statusCode: "200" }]) {
    reply = invalid;
    await assert.rejects(discordApi("/users/@me"), /INVALID_RELAY/);
  }
  for (const statusCode of [199, 403, 500]) {
    reply = { statusCode };
    await assert.rejects(
      discordApi("/users/@me"),
      (e) => e instanceof DiscordFailure && e.status === statusCode,
    );
  }
});
test("Discord direct delivery creates personal channel and disables mentions", async (t) => {
  env(t, {
    DISCORD_BOT_TOKEN: "fixture",
    DISCORD_RELAY_URL: "",
    DISCORD_RELAY_TOKEN: "",
  });
  const calls: any[] = [];
  t.mock.method(globalThis, "fetch", async (url: any, options: any) => {
    calls.push({ url, options });
    return Response.json({ id: calls.length === 1 ? "dm" : "message" });
  });
  assert.deepEqual(await sendDiscord("user", "person", "Hello", "nonce"), {
    id: "message",
  });
  assert.equal(calls[0].url, "https://discord.com/api/v10/users/@me/channels");
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    content: "Hello",
    allowed_mentions: { parse: [] },
    nonce: "nonce",
    enforce_nonce: true,
  });
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(null, { status: 403 }),
  );
  await assert.rejects(
    discordApi("/users/@me"),
    (e) => e instanceof DiscordFailure && e.status === 403,
  );
});
test("Discord permission resolution honours owner, everyone, role and personal overwrites", () => {
  const guild = { id: "guild", owner_id: "owner" };
  assert.equal(guildPermissions(guild, { user: { id: "owner" } }, []), 8n);
  assert.equal(guildPermissions(guild, {}, []), 0n);
  assert.equal(
    channelPermissions(guild, { user: { id: "member" } }, [], {}),
    0n,
  );
  const member = { user: { id: "member" }, roles: ["role"] };
  const roles = [
    { id: "guild", permissions: "1" },
    { id: "role", permissions: "2" },
    { id: "irrelevant", permissions: "8" },
  ];
  assert.equal(
    channelPermissions(guild, member, roles, {
      permission_overwrites: [
        { id: "guild", type: 0, deny: "1", allow: "4" },
        { id: "role", type: 0, deny: "2", allow: "16" },
        { id: "member", type: 1, deny: "4", allow: "32" },
      ],
    }),
    48n,
  );
  assert.equal(
    channelPermissions(guild, { user: { id: "owner" } }, [], {}),
    (1n << 53n) - 1n,
  );
});
