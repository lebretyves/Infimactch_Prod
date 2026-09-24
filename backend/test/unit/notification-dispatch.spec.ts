import {validate} from 'class-validator';
﻿import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  NotificationsService,
  NotificationsController,
} from "../../src/notifications/notifications.module";
import * as discord from "../../src/notifications/discord-client";
import * as area from "../../src/notifications/match-area";
function fixture(answer: (sql: string, args: any[]) => any) {
  const calls: any[] = [];
  const db: any = {
    query: async (sql: string, args: any[] = []) => {
      calls.push({ sql, args });
      return answer(sql, args);
    },
  };
  db.transaction = async (fn: any) => fn(db);
  return { s: new NotificationsService(db), db, calls };
}
test("Discord verification binds code to actor and revokes the previous destination before relinking", async () => {
  let row: any = {
      id: "challenge",
      discord_user_id: "123456789012345678",
      attempts: 0,
      code_hash: createHash("sha256").update("actor:123456").digest("hex"),
    },
    other = false;
  const f = fixture((sql) =>
    sql.startsWith("SELECT * FROM discord_challenge")
      ? row
        ? [row]
        : []
      : sql.startsWith("SELECT account_id FROM discord_link")
        ? other
          ? [{}]
          : []
        : sql.startsWith("INSERT INTO outbox")
          ? [{ id: "event" }]
          : [],
  );
  await assert.rejects(
    f.s.verify("actor", "000000"),
    (e) => (e as any).getStatus() === 400,
  );
  other = true;
  await assert.rejects(
    f.s.verify("actor", "123456"),
    (e) => (e as any).getStatus() === 400,
  );
  other = false;
  assert.deepEqual(await f.s.verify("actor", "123456"), { ok: true });
  const remove = f.calls.findIndex((c) =>
      c.sql.startsWith("DELETE FROM discord_link"),
    ),
    insert = f.calls.findIndex((c) =>
      c.sql.startsWith("INSERT INTO discord_link"),
    );
  assert.ok(remove >= 0 && remove < insert);
  assert.deepEqual(f.calls[insert].args, ["actor", "123456789012345678"]);
  row.attempts = 5;
  await assert.rejects(f.s.verify("actor", "123456"));
  row = null;
  await assert.rejects(f.s.verify("actor", "123456"));
});
for (const scenario of [
  "sent",
  "rate-limit",
  "forbidden",
  "network",
  "invalid-receipt",
  "muted",
  "obsolete",
  "outside-area",
])
  test(
    "Discord dispatch handles " + scenario + " without unsafe replay",
    async (t) => {
      t.mock.method(discord, "discordConfigured", () => true);
      t.mock.method(
        area,
        "matchAreaStillValid",
        async () => scenario !== "outside-area",
      );
      const old = process.env.APP_ORIGIN;
      process.env.APP_ORIGIN = "https://app.unit.invalid";
      t.after(() => {
        if (old === undefined) delete process.env.APP_ORIGIN;
        else process.env.APP_ORIGIN = old;
      });
      let sent = 0;
      t.mock.method(
        discord,
        "sendDiscord",
        async (_type: any, _target: any, content: string) => {
          sent++;
          assert.ok(content.includes("notification=notice"));
          assert.match(content,/\[Voir la mission\]\(</);
          assert.ok(!content.includes("Référence mission"));
          if (scenario === "rate-limit") throw new discord.DiscordFailure(429);
          if (scenario === "forbidden") throw new discord.DiscordFailure(403);
          if (scenario === "network") throw new Error("offline");
          return {
            id:
              scenario === "invalid-receipt" ? "invalid" : "123456789012345678",
          };
        },
      );
      let batch = 0;
      const row = {
        id: "delivery",
        notification_id: "notice",
        user_id: "actor",
        connected_by: "actor",
        organization_id: null,
        target_type: "user",
        target_id: "123456789012345678",
        kind: "MATCH",
        enabled: true,
        version: 1,
        destination_version: 1,
        events: ["MATCH"],
        attempts: 0,
        message: "A mission",
        href: "/missions/m_mission",
        context: { missionId: "mission", version: 1 },
      };
      const f = fixture((sql) =>
        sql.startsWith("SELECT d.*")
          ? batch++ === 0
            ? [row]
            : []
          : sql.includes("FROM notification_preference")
            ? scenario === "muted"
              ? [{}]
              : []
            : sql.startsWith("SELECT status,version")
              ? [
                  {
                    status: "OPEN",
                    version: scenario === "obsolete" ? 2 : 1,
                    start_at: "2030-01-01",
                  },
                ]
              : sql.startsWith("SELECT 1 FROM account")
                ? [{}]
                : [],
      );
      const result = await f.s.dispatch(2);
      assert.equal(result.sent, scenario === "sent" ? 1 : 0);
      if (["muted", "obsolete", "outside-area"].includes(scenario)) {
        assert.equal(sent, 0);
        assert.ok(f.calls.some((c) => c.sql.includes("status='CANCELLED'")));
      } else if (scenario === "sent")
        assert.ok(f.calls.some((c) => c.sql.includes("status='SENT'")));
      else {
        const failed = f.calls.find((c) =>
          c.sql.startsWith("UPDATE notification_delivery SET status=$3"),
        );
        assert.equal(
          failed.args[2],
          scenario === "rate-limit"
            ? "PENDING"
            : scenario === "forbidden"
              ? "FAILED"
              : "UNCERTAIN",
        );
      }
      assert.ok(
        f.calls.some((c) =>
          c.sql.includes("status='UNCERTAIN',last_error='SEND_RESULT_UNKNOWN'"),
        ),
      );
    },
  );
test("notification controller returns scoped preferences and disconnect revokes links and outstanding codes", async (t) => {
  t.mock.method(discord, "discordConfigured", () => false);
  const f = fixture(() => []);
  const delegated: any[] = [];
  const service: any = {};
  for (const method of ["challenge", "verify", "destination"])
    service[method] = (...args: any[]) => {
      delegated.push([method, ...args]);
      return { ok: true };
    };
  const c = new NotificationsController(f.db, service),
    req: any = { session: { userId: "actor" } };
  const settings = await c.settings(req);
  assert.equal(settings.configured, false);
  assert.equal(settings.link, null);
  assert.deepEqual(settings.destinations, []);
  assert.deepEqual(await f.s.dispatch(), { sent: 0, configured: false });
  c.challenge(req, { discordUserId: "discord" });
  c.verify(req, { code: "123456" });
  const body = { enabled: false, events: [] };
  c.destination(req, body);
  c.orgDestination(req, "org", body);
  assert.deepEqual(delegated, [
    ["challenge", "actor", "discord"],
    ["verify", "actor", "123456"],
    ["destination", "actor", null, body],
    ["destination", "actor", "org", body],
  ]);
  await c.preference(req, "MATCH", { discord: false });
  await assert.rejects(c.preference(req, "INVALID", { discord: false }));
  await c.deliveries(req);
  assert.deepEqual(await c.disconnect(req), { ok: true });
  assert.equal(f.calls.filter((c) => c.sql.startsWith("DELETE")).length, 2);
  assert.ok(f.calls.every((c) => c.args[0] === "actor"));
});

for (const state of ['active','cancelled','missing','expired','no-expiry','muted'] as const)
 test('private scheduled reminder checks assignment, expiry and preferences: '+state,async(t)=>{
 t.mock.method(discord,'discordConfigured',()=>true);
 const old=process.env.APP_ORIGIN;process.env.APP_ORIGIN='https://example.invalid';t.after(()=>{if(old===undefined)delete process.env.APP_ORIGIN;else process.env.APP_ORIGIN=old;});
 let sent=0,batch=0;t.mock.method(discord,'sendDiscord',async()=>{sent++;return {id:'123456789012345678'};});
 const row={id:'delivery',notification_id:'notice',user_id:'actor',connected_by:'actor',organization_id:'org',target_type:'user',target_id:'123456789012345678',kind:'START_REMINDER_2H',enabled:true,version:1,destination_version:1,events:['START_REMINDER_2H'],attempts:0,message:'Votre mission approche',href:'/gestion/missions/mission',context:{missionId:'mission',version:1,assignmentId:'assignment',expiresAt:state==='no-expiry'?undefined:new Date(Date.now()+(state==='expired'?-60000:3600000)).toISOString()}};
 const f=fixture(sql=>{
 if(sql.startsWith('SELECT d.*'))return batch++===0?[row]:[];
 if(sql.includes('FROM notification_preference'))return state==='muted'?[{}]:[];
 if(sql.startsWith('SELECT status,version'))return [{status:'FILLED',version:1,start_at:'2030-01-01'}];
 if(sql.startsWith('SELECT status FROM assignment'))return state==='missing'?[]:[{status:state==='cancelled'?'CANCELLED':'ACTIVE'}];
 if(sql.startsWith('SELECT 1 FROM account'))return [{}];return [];
 });
 const result=await f.s.dispatch(1);assert.equal(sent,state==='active'?1:0);assert.equal(result.sent,sent);
 if(state!=='active')assert.ok(f.calls.some(c=>c.sql.includes("status='CANCELLED'")));
});

test('destination validation rejects unknown notification events and malformed channel IDs',async()=>{
 const Dto=Reflect.getMetadata('design:paramtypes',NotificationsController.prototype,'destination')[1];
 const value=Object.assign(new Dto(),{enabled:true,events:['UNRECOGNIZED_EVENT'],channelId:'not-a-discord-id'});
 const errors=await validate(value);assert.ok(errors.some(e=>e.property==='events'));assert.ok(errors.some(e=>e.property==='channelId'));
});
for(const assignmentStatus of ['CANCELLED','ACTIVE','MISSING'])test('cancellation notification follows assignment even if mission reopened: '+assignmentStatus,async(t)=>{
 t.mock.method(discord,'discordConfigured',()=>true);
 const old=process.env.APP_ORIGIN;process.env.APP_ORIGIN='https://example.invalid';t.after(()=>{if(old===undefined)delete process.env.APP_ORIGIN;else process.env.APP_ORIGIN=old;});
 let calls=0,sent=0;t.mock.method(discord,'sendDiscord',async()=>{sent++;return {id:'123456789012345678'};});
 const row={id:'delivery',notification_id:'notice',user_id:'actor',connected_by:'actor',organization_id:null,target_type:'user',target_id:'123456789012345678',kind:'CANCELLATION',enabled:true,version:1,destination_version:1,events:['CANCELLATION'],attempts:0,message:'Annulation',href:'/missions/m_mission',context:{missionId:'mission',version:1,assignmentId:'assignment'}};
 const f=fixture(sql=>{
 if(sql.startsWith('SELECT d.*'))return calls++===0?[row]:[];
 if(sql.includes('FROM notification_preference'))return [];
 if(sql.startsWith('SELECT status,version'))return [{status:'OPEN',version:2,start_at:'2030-01-01'}];
 if(sql.startsWith('SELECT status FROM assignment'))return assignmentStatus==='MISSING'?[]:[{status:assignmentStatus}];
 if(sql.startsWith('SELECT 1 FROM account'))return [{}];return [];
 });
 await f.s.dispatch(1);assert.equal(sent,assignmentStatus==='CANCELLED'?1:0);
});
