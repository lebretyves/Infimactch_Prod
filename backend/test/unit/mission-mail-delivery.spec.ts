import { test } from "node:test";
import assert from "node:assert/strict";
import {
  missionEmailContent,
  queueMissionEmails,
  cancellationRecord,
  generateCancellations,
  dispatchMissionEmails,
} from "../../src/automation/mission-mail";
import * as pdf from "../../src/automation/confirmation-pdf";
function fixture(answer: (sql: string, args: any[]) => any) {
  const calls: any[] = [];
  const db: any = {
    query: async (sql: string, args: any[] = []) => {
      calls.push({ sql, args });
      return answer(sql, args);
    },
  };
  db.transaction = async (fn: any) => fn(db);
  return { db, calls };
}
function env(t: any) {
  for (const [key, value] of Object.entries({
    APP_ORIGIN: "https://app.unit.invalid",
    SMTP2GO_API_KEY: "unit-key",
    SMTP2GO_FROM: "unit@example.invalid",
  })) {
    const old = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (old === undefined) delete process.env[key];
      else process.env[key] = old;
    });
  }
}
test("mission email escapes untrusted titles and links for both cancellation initiators", () => {
  for (const [kind, initiator] of [
    ["CONFIRMATION", undefined],
    ["CANCELLATION", "NURSE"],
    ["CANCELLATION", "ENTERPRISE"],
  ] as const) {
    const result = missionEmailContent(
      kind,
      "<script>\"&'</script>",
      'https://app.unit.invalid/?x="&',
      initiator,
    );
    assert.ok(!result.html.includes("<script>"));
    assert.ok(result.html.includes("&lt;script&gt;"));
    assert.ok(result.html.includes("&quot;"));
    assert.ok(result.text.includes("<script>"));
    assert.ok(result.subject.includes("<script>"));
  }
});
test("queued mission emails choose personal or enterprise links and preserve cancellation evidence", async (t) => {
  env(t);
  const m = {
      id: "mission",
      version: 2,
      title: "Mission",
      establishment_id: "hospital",
      agency_id: "agency",
    },
    a = {
      id: "assignment",
      nurse_id: "nurse",
      start_at: "2030-01-01",
      end_at: "2030-01-02",
    };
  const f = fixture((sql) =>
    sql.startsWith("SELECT a.id,a.email")
      ? [
          {
            id: "nurse",
            email: "nurse@example.invalid",
            organization_id: null,
          },
          {
            id: "enterprise",
            email: "enterprise@example.invalid",
            organization_id: "hospital",
          },
        ]
      : sql.includes("professional_name")
        ? [{ first_name: "Alice", last_name: "Martin" }]
        : [],
  );
  await queueMissionEmails(f.db, m, a, "CONFIRMATION", "doc");
  const inserts = f.calls.filter((c) =>
    c.sql.startsWith("INSERT INTO mission_email"),
  );
  assert.equal(inserts.length, 2);
  assert.ok(
    JSON.parse(inserts[0].args[6]).text.includes("/missions/m_mission"),
  );
  assert.ok(
    JSON.parse(inserts[1].args[6]).text.includes("/gestion/missions/mission"),
  );
  await cancellationRecord(f.db, m, a, "NURSE", "Transport");
  const details = JSON.parse(
    f.calls.find((c) => c.sql.startsWith("INSERT INTO mission_cancellation"))
      .args[1],
  );
  assert.equal(details.professionalName, "Alice Martin");
  assert.equal(details.cancellation.reason, "Transport");
  assert.equal(details.missionVersion, 2);
});
for (const scenario of [
  "sent",
  "429",
  "400",
  "500",
  "invalid-receipt",
  "network",
  "document-error",
  "revoked",
])
  test(
    "mission email dispatch handles " +
      scenario +
      " with a leased delivery and safe retry state",
    async (t) => {
      env(t);
      let batch = 0,
        requests = 0;
      const row = {
        id: "delivery",
        assignment_id: "assignment",
        assignment_status: "ACTIVE",
        user_id: "nurse",
        recipient: "nurse@example.invalid",
        organization_id: null,
        kind: "CONFIRMATION",
        document_id: "doc",
        attempts: 0,
        payload: { subject: "Subject", text: "Plain", html: "<p>HTML</p>" },
      };
      const f = fixture((sql) =>
        sql.startsWith("SELECT e.*")
          ? batch++ === 0
            ? [row]
            : []
          : sql.startsWith("SELECT 1 FROM account")
            ? scenario === "revoked"
              ? []
              : [{}]
            : [],
      );
      const documents: any = {
        read: async (actor: string, id: string) => {
          assert.equal(actor, "nurse");
          assert.equal(id, "doc");
          if (scenario === "document-error") throw new Error("missing");
          return { data: Buffer.from("pdf") };
        },
      };
      const transport: any = async (url: string, init: any) => {
        requests++;
        assert.equal(url, "https://api.smtp2go.com/v3/email/send");
        const body = JSON.parse(init.body);
        assert.equal(
          body.attachments[0].fileblob,
          Buffer.from("pdf").toString("base64"),
        );
        assert.equal(body.custom_headers[0].value, "delivery");
        assert.equal(body.to[0], "nurse@example.invalid");
        if (scenario === "network") throw new Error("offline");
        if (/^\d+$/.test(scenario))
          return { ok: false, status: Number(scenario) };
        return {
          ok: true,
          json: async () => ({
            data:
              scenario === "invalid-receipt"
                ? { succeeded: 0, failed: 1 }
                : { succeeded: 1, failed: 0, email_id: "provider-id" },
          }),
        };
      };
      const result = await dispatchMissionEmails(f.db, documents, 2, transport);
      assert.equal(result.sent, scenario === "sent" ? 1 : 0);
      if (scenario === "revoked") {
        assert.equal(requests, 0);
        assert.ok(f.calls.some((c) => c.sql.includes("status='CANCELLED'")));
      } else if (scenario === "sent") {
        assert.ok(
          f.calls.some(
            (c) =>
              c.sql.includes("status='SENT'") && c.args[2] === "provider-id",
          ),
        );
      } else {
        const failed = f.calls.find((c) =>
          c.sql.startsWith("UPDATE mission_email SET status=$3"),
        );
        assert.equal(
          failed.args[2],
          ["429", "document-error"].includes(scenario)
            ? "PENDING"
            : ["400", "invalid-receipt"].includes(scenario)
              ? "FAILED"
              : "UNCERTAIN",
        );
      }
    },
  );
for (const scenario of ["ready", "storage-failure", "lost-lease"])
  test(
    "cancellation PDF worker handles " +
      scenario +
      " without publishing under another lease",
    async (t) => {
      env(t);
      t.mock.method(pdf, "createConfirmationPdf", async () =>
        Buffer.from("pdf"),
      );
      let batch = 0;
      const row: any = {
        id: "cancellation",
        assignment_id: "assignment",
        nurse_id: "nurse",
        mission_id: "mission",
        created_at: "2026-01-01",
        details: {
          title: "Archived title",
          cancellation: { initiator: "NURSE" },
        },
      };
      const f = fixture((sql) =>
        sql.startsWith("SELECT c.*")
          ? batch++ === 0
            ? [row]
            : []
          : sql.startsWith("SELECT lease_token")
            ? [{ lease_token: scenario === "lost-lease" ? "other" : row.token }]
            : sql.startsWith("SELECT * FROM mission")
              ? [{ id: "mission", title: "Current title" }]
              : sql.startsWith("SELECT a.id,a.email")
                ? [{ id: "nurse", email: "nurse@example.invalid" }]
                : [],
      );
      const documents: any = {
        store: async (...args: any[]) => {
          assert.equal(args[1], "CANCELLATION");
          assert.equal(args[4], "assignment");
          assert.equal(args[5].operation, "mission-cancellation:cancellation");
          if (scenario === "storage-failure") throw new Error("offline");
          return { id: "doc" };
        },
      };
      await generateCancellations(f.db, documents, 2);
      if (scenario === "ready") {
        assert.ok(
          f.calls.some(
            (c) => c.sql.includes("SET status='READY'") && c.args[1] === "doc",
          ),
        );
        const email = f.calls.find((c) =>
          c.sql.startsWith("INSERT INTO mission_email"),
        );
        assert.ok(JSON.parse(email.args[6]).subject.includes("Archived title"));
      } else if (scenario === "storage-failure")
        assert.ok(
          f.calls.some((c) => c.sql.includes("attempts>=5 THEN 'FAILED'")),
        );
      else
        assert.equal(
          f.calls.some(
            (c) =>
              c.sql.includes("SET status='READY'") ||
              c.sql.startsWith("INSERT INTO mission_email"),
          ),
          false,
        );
    },
  );

for (const scenario of [
 {kind:'REMINDER',status:'OPEN',allowed:true},
 {kind:'START_REMINDER_24H',status:'FILLED',allowed:true},
 {kind:'START_REMINDER_2H',status:'FILLED',allowed:true},
 {kind:'REMINDER',status:'FILLED',allowed:false},
 {kind:'START_REMINDER_2H',status:'OPEN',allowed:false},
 {kind:'REMINDER',status:'OPEN',allowed:false,expired:true},
 {kind:'REMINDER',status:'OPEN',allowed:false,version:9},
 {kind:'REMINDER',status:'OPEN',allowed:false,missing:true},
]) test('reminder transport revalidates mission without reading a PDF: '+JSON.stringify(scenario),async(t)=>{
 env(t);let served=false,cancelled=false,sends=0;
 const row={id:'mail',kind:scenario.kind,user_id:'actor',recipient:'unit@example.invalid',organization_id:'org',mission_id:'mission',mission_version:1,assignment_status:'ACTIVE',expires_at:new Date(Date.now()+(scenario.expired?-60000:3600000)),attempts:0,payload:{subject:'Rappel',html:'<p>Rappel</p>',text:'Rappel'}};
 const f=fixture((sql)=>{
  if(sql.startsWith('SELECT e.*')){if(served)return [];served=true;return [row];}
  if(sql.startsWith('SELECT 1 FROM account'))return [{}];
  if(sql.startsWith('SELECT status,version,start_at,reminders_enabled'))return scenario.missing?[]:[{status:scenario.status,version:scenario.version||1,reminders_enabled:true}];
  if(sql.includes("SET status='CANCELLED'"))cancelled=true;
  return [];
 });
 const result=await dispatchMissionEmails(f.db,{read:async()=>{throw Error('A reminder must not read a PDF');}} as any,1,async(_url,options)=>{
  sends++;const body=JSON.parse(String(options?.body));assert.deepEqual(body.attachments,[]);assert.equal(body.to.length,1);
  return Response.json({data:{email_id:'receipt',succeeded:1,failed:0}});
 });
 assert.equal(sends,scenario.allowed?1:0);assert.equal(result.sent,sends);assert.equal(cancelled,!scenario.allowed);
});
