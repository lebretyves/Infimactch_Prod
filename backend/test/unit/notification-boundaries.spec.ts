import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { NotificationsService } from "../../src/notifications/notifications.module";
const actor = "11111111-1111-4111-8111-111111111111",
  discord = "111111111111111111",
  channelId = "222222222222222222",
  guildId = "333333333333333333",
  botId = "444444444444444444";
function enable(t: any) {
  const old = process.env.DISCORD_BOT_TOKEN;
  process.env.DISCORD_BOT_TOKEN = "fictional-local-test";
  t.after(() => {
    if (old === undefined) delete process.env.DISCORD_BOT_TOKEN;
    else process.env.DISCORD_BOT_TOKEN = old;
  });
}
test("Discord challenge hashes the account-bound code, sends only via provider boundary and enforces rate limit", async (t) => {
  enable(t);
  let count = 0,
    stored: any[],
    content = "";
  const queries: string[] = [];
  const db: any = {
    query: async (sql: string, args: any[]) => {
      queries.push(sql);
      if (sql.includes("count(*)")) return [{ n: count }];
      if (sql.includes("INSERT INTO discord_challenge")) {
        stored = args;
        return [{ id: actor }];
      }
      return [];
    },
  };
  db.transaction = async (fn: any) => fn(db);
  t.mock.method(globalThis, "fetch", async (url: any, init: any) => {
    assert.ok(String(url).startsWith("https://discord.com/api/v10/"));
    const body = JSON.parse(init.body);
    if (String(url).endsWith("/users/@me/channels")) {
      assert.equal(body.recipient_id, discord);
      return new Response(JSON.stringify({ id: channelId }));
    }
    assert.equal(
      String(url),
      "https://discord.com/api/v10/channels/" + channelId + "/messages",
    );
    content = body.content;
    assert.deepEqual(body.allowed_mentions, { parse: [] });
    return new Response(JSON.stringify({ id: botId }));
  });
  const svc = new NotificationsService(db);
  assert.deepEqual(await svc.challenge(actor, discord), { ok: true });
  const code = content.match(/\*\*(\d{6})\*\*/)?.[1];
  assert.ok(code);
  assert.equal(
    stored![2],
    createHash("sha256")
      .update(actor + ":" + code)
      .digest("hex"),
  );
  assert.ok(queries.some((q) => q.includes("SET expires_at=now()")));
  count = 3;
  const sends = (globalThis.fetch as any).mock.callCount();
  await assert.rejects(svc.challenge(actor, discord));
  assert.equal((globalThis.fetch as any).mock.callCount(), sends);
});
test("failed Discord delivery expires the challenge and never exposes the provider error or code", async (t) => {
  enable(t);
  const writes: any[] = [];
  const db: any = {
    query: async (sql: string, args: any[]) => {
      writes.push([sql, args]);
      if (sql.includes("count(*)")) return [{ n: 0 }];
      if (sql.includes("INSERT")) return [{ id: actor }];
      return [];
    },
  };
  db.transaction = async (fn: any) => fn(db);
  t.mock.method(globalThis, "fetch", async () => {
    throw Error("PRIVATE_PROVIDER_DETAIL");
  });
  await assert.rejects(
    new NotificationsService(db).challenge(actor, discord),
    (e: any) =>
      e.getStatus() === 400 && !e.message.includes("PRIVATE_PROVIDER_DETAIL"),
  );
  assert.ok(
    writes.some(
      ([sql, args]) => sql.includes("WHERE id=$1") && args[0] === actor,
    ),
  );
});
test("Discord organization destination requires a linked account, private text channel, administrator and bot permissions", async (t) => {
  enable(t);
  let linked = true,
    type = 0,
    humanAdmin = true,
    botAllowed = true,
    isPublic = false;
  const db: any = {
    query: async () => (linked ? [{ discord_user_id: discord }] : []),
  };
  const svc = new NotificationsService(db);
  t.mock.method(globalThis, "fetch", async (url: any) => {
    const path = new URL(String(url)).pathname.replace("/api/v10", "");
    let data: any;
    switch (path) {
      case "/channels/" + channelId:
        data = {
          id: channelId,
          type,
          guild_id: guildId,
          name: "Notifications",
          permission_overwrites: [
            {
              id: guildId,
              type: 0,
              deny: isPublic ? "0" : "1024",
              allow: isPublic ? "1024" : "0",
            },
            { id: botId, type: 1, deny: "0", allow: botAllowed ? "3072" : "0" },
          ],
        };
        break;
      case "/guilds/" + guildId:
        data = { id: guildId, owner_id: humanAdmin ? discord : "someone-else" };
        break;
      case "/guilds/" + guildId + "/roles":
        data = [{ id: guildId, permissions: "0" }];
        break;
      case "/guilds/" + guildId + "/members/" + discord:
        data = { user: { id: discord }, roles: [] };
        break;
      case "/users/@me":
        data = { id: botId };
        break;
      case "/guilds/" + guildId + "/members/" + botId:
        data = { user: { id: botId }, roles: [] };
        break;
      default:
        throw Error("Unexpected network request: " + path);
    }
    return new Response(JSON.stringify(data));
  });
  assert.equal((await svc.validateChannel(actor, channelId)).id, channelId);
  linked = false;
  await assert.rejects(svc.validateChannel(actor, channelId));
  linked = true;
  type = 2;
  await assert.rejects(svc.validateChannel(actor, channelId));
  type = 0;
  humanAdmin = false;
  await assert.rejects(svc.validateChannel(actor, channelId));
  humanAdmin = true;
  botAllowed = false;
  await assert.rejects(svc.validateChannel(actor, channelId));
  botAllowed = true;
  isPublic = true;
  await assert.rejects(svc.validateChannel(actor, channelId));
});
test("destination changes separate personal and organization events and revoke pending versions", async (t) => {
  const org = "55555555-5555-4555-8555-555555555555";
  let linked = true,
    used = false;
  const writes: any[] = [];
  const db: any = {
    query: async (sql: string, args: any[]) => {
      writes.push([sql, args]);
      if (sql.includes("SELECT o.kind")) return [{ kind: "AGENCY" }];
      if (sql.includes("SELECT * FROM discord_link"))
        return linked ? [{ discord_user_id: discord }] : [];
      if (sql.includes("SELECT id FROM discord_destination"))
        return used ? [{ id: actor }] : [];
      return [];
    },
  };
  db.transaction = async (fn: any) => fn(db);
  const svc = new NotificationsService(db);
  t.mock.method(svc, "validateChannel", async () => ({
    id: channelId,
    guild_id: guildId,
    name: "Private",
  }));
  await assert.rejects(
    svc.destination(actor, org, {
      enabled: true,
      events: ["WELCOME"],
      channelId,
    }),
  );
  await assert.rejects(
    svc.destination(actor, null, { enabled: true, events: ["NEED_CREATED"] }),
  );
  await svc.destination(actor, org, {
    enabled: true,
    events: ["NEED_CREATED"],
    channelId,
  });
  const insert = writes.find(([q]) =>
    q.startsWith("INSERT INTO discord_destination"),
  );
  assert.deepEqual(insert[1], [
    org,
    actor,
    channelId,
    guildId,
    "Private",
    true,
    ["NEED_CREATED"],
  ]);
  assert.match(insert[0], /version=discord_destination.version\+1/);
  used = true;
  await assert.rejects(
    svc.destination(actor, org, {
      enabled: true,
      events: ["NEED_CREATED"],
      channelId,
    }),
    (e: any) => e.getStatus() === 409,
  );
  await svc.destination(actor, org, { enabled: false, events: [] });
  assert.ok(
    writes.some(
      ([q, a]) => q.includes("enabled=false,version=version+1") && a[0] === org,
    ),
  );
  await svc.destination(actor, null, { enabled: true, events: ["WELCOME"] });
  assert.ok(
    writes.some(
      ([q, a]) =>
        q.includes("WHERE user_id=$1") && a[0] === actor && a[1] === true,
    ),
  );
  linked = false;
  await assert.rejects(
    svc.destination(actor, null, { enabled: true, events: ["WELCOME"] }),
  );
});
