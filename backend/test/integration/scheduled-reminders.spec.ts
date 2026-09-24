import "reflect-metadata";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { scheduledReminders } from "../../src/automation/scheduled-reminders";
import { NotificationsService } from "../../src/notifications/notifications.module";
import { Database } from "../../src/database/database";
import { MissionsService } from "../../src/missions/missions.service";
import { DocumentsService } from "../../src/documents/documents.module";
import { AutomationService } from "../../src/automation/automation.module";
import { dispatchMissionEmails } from "../../src/automation/mission-mail";
let db: Database, service: MissionsService, docs: DocumentsService;
before(async () => {
  const u = new URL(process.env.DATABASE_URL || "http://invalid");
  if (
    process.env.NODE_ENV !== "test" ||
    u.hostname !== "127.0.0.1" ||
    u.port !== "55433" ||
    u.pathname !== "/infimatch_test"
  )
    throw Error("Requires isolated database");
  process.env.APP_ORIGIN = "https://example.invalid";
  process.env.DOCUMENT_STORAGE = "postgres";
  process.env.SMTP2GO_API_KEY = "test-only";
  process.env.SMTP2GO_FROM = "InfiMatch <missions@example.invalid>";
  db = await new Database().connect();
  await db.source.runMigrations({ transaction: "all" });
  service = new MissionsService(db);
  docs = new DocumentsService(db);
});
after(async () => {
  await db?.onModuleDestroy();
});
async function fixture() {
  const [n] = await db.query(
    "INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture','NURSE','fixture') RETURNING id",
    [randomUUID() + "@example.invalid"],
  );
  const [r] = await db.query(
    "INSERT INTO account(email,password_hash,family,terms_version) VALUES($1,'fixture','ENTERPRISE','fixture') RETURNING id",
    [randomUUID() + "@example.invalid"],
  );
  await db.query(
    "INSERT INTO profile(user_id,display_name,qualifications,rpps_status,latitude,longitude,radius_km,accepted_shifts,details) VALUES($1,'Camille',ARRAY['IDE'],'FOUND',48,2,30,ARRAY['DAY'],$2)",
    [n.id, JSON.stringify({ firstName: "Camille", lastName: "Dupont" })],
  );
  const [org] = await db.query(
    "INSERT INTO organization(kind,name,address,referent,finess) VALUES('ESTABLISHMENT','Fictional test','Fictional address','Test','000000000') RETURNING id",
  );
  await db.query(
    "INSERT INTO membership(user_id,organization_id) VALUES($1,$2)",
    [r.id, org.id],
  );
  const [m] = await db.query(
    "INSERT INTO mission(establishment_id,title,description,qualification,service,population,block,start_at,end_at,shift,address,location,hourly_salary,status) VALUES($1,'Fictional email test','Fixture only','IDE','URGENCES','ADULT','NONE',now()+interval '10 days',now()+interval '10 days 8 hours','DAY','Fictional address',ST_SetSRID(ST_MakePoint(2,48),4326)::geography,25,'OPEN') RETURNING *",
    [org.id],
  );
  const application = await service.apply(n.id, m.id, 1, randomUUID());
  const a = await service.assign(r.id, m.id, application.id, randomUUID());
  return { n: n.id, r: r.id, m, a, org: org.id };
}

async function due(f: any, hours: number) {
  await db.query(
    "UPDATE mission SET start_at=now()+($2||' hours')::interval,end_at=now()+($2||' hours')::interval+interval '8 hours' WHERE id=$1",
    [f.m.id, String(hours)],
  );
  await db.query(
    "UPDATE assignment SET start_at=now()+($2||' hours')::interval,end_at=now()+($2||' hours')::interval+interval '8 hours' WHERE id=$1",
    [f.a.id, String(hours)],
  );
}
const mail: typeof fetch = async (_url, options) => {
  const b = JSON.parse(options!.body as string);
  assert.deepEqual(b.attachments, []);
  assert.ok(b.subject.includes("rappel"));
  assert.ok(b.text_body.includes("Début :"));
  return Response.json({
    data: { email_id: randomUUID(), succeeded: 1, failed: 0 },
  });
};
test("concurrent J-1 runs notify both parties once; H-2 is separate with no late J-1 catch-up", async () => {
  const f = await fixture();
  await due(f, 23);
  const runs = await Promise.all([
    scheduledReminders(db),
    scheduledReminders(db),
  ]);
  assert.equal(
    runs.reduce((n, r) => n + r.processed, 0),
    1,
  );
  assert.equal(
    (
      await db.query("SELECT * FROM mission_email WHERE assignment_id=$1", [
        f.a.id,
      ])
    ).length,
    2,
  );
  assert.equal((await dispatchMissionEmails(db, docs, 10, mail)).sent, 2);
  await due(f, 1.9);
  await scheduledReminders(db);
  assert.equal((await dispatchMissionEmails(db, docs, 10, mail)).sent, 2);
  assert.equal((await scheduledReminders(db)).processed, 0);
  const g = await fixture();
  await due(g, 1);
  await scheduledReminders(db);
  assert.deepEqual(
    (
      await db.query(
        "SELECT DISTINCT kind FROM mission_email WHERE assignment_id=$1",
        [g.a.id],
      )
    ).map((r) => r.kind),
    ["START_REMINDER_2H"],
  );
  await dispatchMissionEmails(db, docs, 10, mail);
});
test("cancelled assignment and revoked member cancel pending emails before transport", async () => {
  const f = await fixture();
  await due(f, 22);
  await scheduledReminders(db);
  await service.cancelAssignment(f.n, f.a.id, randomUUID());
  await dispatchMissionEmails(db, docs, 10, async () => {
    throw Error("MUST_NOT_SEND");
  });
  assert.deepEqual(
    (
      await db.query(
        "SELECT DISTINCT status FROM mission_email WHERE assignment_id=$1",
        [f.a.id],
      )
    ).map((r) => r.status),
    ["CANCELLED"],
  );
  const g = await fixture();
  await due(g, 22);
  await scheduledReminders(db);
  await db.query("UPDATE membership SET active=false WHERE user_id=$1", [g.r]);
  assert.equal((await dispatchMissionEmails(db, docs, 10, mail)).sent, 1);
  assert.equal(
    (
      await db.query(
        "SELECT status FROM mission_email WHERE assignment_id=$1 AND user_id=$2",
        [g.a.id, g.r],
      )
    )[0].status,
    "CANCELLED",
  );
});
test("unfilled reminder queues email and private Discord only for the active organization member", async () => {
  const f = await fixture();
  await service.cancelAssignment(f.n, f.a.id, randomUUID());
  await db.query("UPDATE mission SET reminders_enabled=false");
  await db.query(
    "UPDATE mission SET status='OPEN',reminders_enabled=true,first_published_at=now()-interval '2 days' WHERE id=$1",
    [f.m.id],
  );
  await db.query(
    "INSERT INTO discord_link(account_id,discord_user_id,username) VALUES($1,'123456789012345678','Fixture')",
    [f.r],
  );
  await db.query(
    "INSERT INTO discord_destination(user_id,connected_by,target_type,target_id,enabled,events) VALUES($1,$1,'user','123456789012345678',true,ARRAY['REMINDER'])",
    [f.r],
  );
  await new AutomationService(db, docs).reminders();
  assert.equal(
    (
      await db.query(
        "SELECT * FROM mission_email WHERE mission_id=$1 AND kind='REMINDER'",
        [f.m.id],
      )
    ).length,
    1,
  );
  const [delivery] = await db.query(
    "SELECT d.* FROM notification_delivery d JOIN notification n ON n.id=d.notification_id WHERE n.context->>'missionId'=$1",
    [f.m.id],
  );
  assert.ok(delivery);
  await db.query("UPDATE membership SET active=false WHERE user_id=$1", [f.r]);
  const original = process.env.DISCORD_RELAY_URL;
  process.env.DISCORD_RELAY_URL = "https://example.invalid";
  process.env.DISCORD_RELAY_TOKEN = "fixture";
  try {
    await new NotificationsService(db).dispatch(10);
  } finally {
    if (original) process.env.DISCORD_RELAY_URL = original;
    else delete process.env.DISCORD_RELAY_URL;
    delete process.env.DISCORD_RELAY_TOKEN;
  }
  assert.equal(
    (
      await db.query("SELECT status FROM notification_delivery WHERE id=$1", [
        delivery.id,
      ])
    )[0].status,
    "CANCELLED",
  );
  await dispatchMissionEmails(db, docs, 10, async () => {
    throw Error("MUST_NOT_SEND");
  });
});
test("expired J-1 and changed mission version suppress stale email payloads", async () => {
  const f = await fixture();
  await due(f, 22);
  await scheduledReminders(db);
  await db.query(
    "UPDATE mission_email SET expires_at=now()-interval '1 second' WHERE assignment_id=$1",
    [f.a.id],
  );
  await dispatchMissionEmails(db, docs, 10, async () => {
    throw Error("MUST_NOT_SEND");
  });
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int n FROM mission_email WHERE assignment_id=$1 AND status='CANCELLED'",
        [f.a.id],
      )
    )[0].n,
    2,
  );
  const g = await fixture();
  await due(g, 22);
  await scheduledReminders(db);
  await db.query("UPDATE mission SET version=version+1 WHERE id=$1", [g.m.id]);
  await dispatchMissionEmails(db, docs, 10, async () => {
    throw Error("MUST_NOT_SEND");
  });
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int n FROM mission_email WHERE assignment_id=$1 AND status='CANCELLED'",
        [g.a.id],
      )
    )[0].n,
    2,
  );
});
