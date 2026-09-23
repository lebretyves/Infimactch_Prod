import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { basename } from "node:path";
import {
  applyRetention,
  cleanupRemovedDocuments,
} from "../../src/security/retention";
import { Database } from "../../src/database/database";
import { EmailDeliveryService } from "../../src/automation/email-delivery";
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
test("document erasure deduplicates ids, preserves existing records and clears retry ledger after deletion", async (t) => {
  const old = process.env.DOCUMENT_STORAGE;
  process.env.DOCUMENT_STORAGE = "filesystem";
  t.after(() => {
    if (old === undefined) delete process.env.DOCUMENT_STORAGE;
    else process.env.DOCUMENT_STORAGE = old;
  });
  const id = "11111111-1111-4111-8111-111111111111",
    existing = "22222222-2222-4222-8222-222222222222",
    removed: string[] = [];
  t.mock.method(fs, "rm", async (path: any) => {
    removed.push(basename(String(path)));
  });
  const f = fixture((sql, args) =>
    sql.startsWith("SELECT id FROM document_erasure")
      ? [{ id }, { id }, { id: existing }]
      : sql.startsWith("SELECT id FROM document WHERE") && args[0] === existing
        ? [{ id: existing }]
        : [],
  );
  await cleanupRemovedDocuments(f.db);
  assert.deepEqual(removed, [id + ".bin", id + ".tmp"]);
  assert.deepEqual(
    f.calls
      .filter((c) => c.sql.startsWith("DELETE FROM document_erasure"))
      .map((c) => c.args),
    [[id]],
  );
  await assert.rejects(
    cleanupRemovedDocuments(f.db, ["../outside"]),
    /Invalid document id/,
  );
});
test("retention registers document erasure before deletion and removes history only with an explicit policy", async (t) => {
  const old = process.env.BUSINESS_HISTORY_RETENTION_DAYS;
  process.env.BUSINESS_HISTORY_RETENTION_DAYS = "365";
  t.after(() => {
    if (old === undefined) delete process.env.BUSINESS_HISTORY_RETENTION_DAYS;
    else process.env.BUSINESS_HISTORY_RETENTION_DAYS = old;
  });
  const f = fixture((sql, args) =>
    sql.startsWith("SELECT count")
      ? [{ n: 1 }]
      : sql.startsWith("SELECT id FROM document")
        ? [{ id: "staged-or-bank" }]
        : sql.startsWith("SELECT id FROM outbox")
          ? [{ id: "old-event" }]
          : sql.startsWith("SELECT id FROM mission")
            ? args[0] === null
              ? []
              : [{ id: "old-mission" }]
            : sql.startsWith("SELECT d.id FROM document")
              ? [{ id: "historical-doc" }]
              : [],
  );
  const r = await applyRetention(f.db);
  assert.equal(r.businessMissions, 1);
  assert.ok(r.documentIds!.includes("historical-doc"));
  const ledger = f.calls.findIndex((c) =>
      c.sql.startsWith("INSERT INTO document_erasure"),
    ),
    deletion = f.calls.findIndex((c) =>
      c.sql.startsWith("DELETE FROM document"),
    );
  assert.ok(ledger >= 0 && ledger < deletion);
  assert.ok(
    f.calls.some((c) => c.sql.startsWith("DELETE FROM workflow_receipt")),
  );
  assert.ok(f.calls.some((c) => c.sql.startsWith("DELETE FROM assignment")));
  const before = f.calls.length;
  assert.equal(
    (await applyRetention(f.db, { includeBusinessHistory: false }))
      .businessMissions,
    0,
  );
  assert.equal(
    f.calls
      .slice(before)
      .some((c) => c.sql.startsWith("DELETE FROM mission WHERE")),
    false,
  );
});
test("database adapter normalizes driver results, binds parameters and closes only initialized connections", async () => {
  const db: any = Object.create(Database.prototype);
  let initialized = 0,
    destroyed = 0;
  const calls: any[] = [];
  db.source = {
    isInitialized: false,
    initialize: async () => {
      initialized++;
      db.source.isInitialized = true;
    },
    destroy: async () => {
      destroyed++;
      db.source.isInitialized = false;
    },
    query: async (...args: any[]) => {
      calls.push(args);
      return [[{ id: 1 }], 1];
    },
    transaction: async (fn: any) =>
      fn({
        query: async (...args: any[]) => {
          calls.push(args);
          return [[{ id: 2 }], 1];
        },
      }),
  };
  assert.equal(await db.connect(), db);
  await db.connect();
  assert.equal(initialized, 1);
  assert.deepEqual(await db.query("SELECT id"), [{ id: 1 }]);
  assert.deepEqual(
    await db.transaction((em: any) =>
      em.query("UPDATE record RETURNING id", ["actor"]),
    ),
    [{ id: 2 }],
  );
  assert.deepEqual(calls, [
    ["SELECT id", []],
    ["UPDATE record RETURNING id", ["actor"]],
  ]);
  await db.onModuleDestroy();
  await db.onModuleDestroy();
  assert.equal(destroyed, 1);
});
test("email delivery callbacks correlate a single attempted recipient, deduplicate events and resolve uncertain sends", async () => {
  const id = "11111111-1111-4111-8111-111111111111",
    time = "2026-01-02T12:00:00Z";
  let rows: any[] = [
      {
        id,
        provider_id: null,
        first_attempt_at: "2026-01-02T11:59:00Z",
        delivery_status: "NOT_REPORTED",
        delivery_event_at: null,
      },
    ],
    duplicate = false;
  const f = fixture((sql) =>
      sql.startsWith("SELECT id,recipient")
        ? rows
        : sql.startsWith("INSERT INTO mission_email_delivery_event")
          ? duplicate
            ? []
            : [{ fingerprint: "accepted" }]
          : [],
    ),
    s = new EmailDeliveryService(f.db),
    body = {
      event: "delivered",
      email_id: "provider-id",
      rcpt: "Alice@Example.test",
      time,
      "X-InfiMatch-Email-ID": id,
    };
  assert.deepEqual(await s.receive(body), { ok: true });
  const query = f.calls.find((c) => c.sql.startsWith("SELECT id,recipient"));
  assert.deepEqual(query.args, [id, "provider-id", "alice@example.test"]);
  const update = f.calls.find((c) => c.sql.startsWith("UPDATE mission_email"));
  assert.equal(update.args[3], "DELIVERED");
  assert.ok(update.sql.includes("lease_token=NULL"));
  assert.ok(
    !JSON.stringify(
      f.calls.find((c) =>
        c.sql.startsWith("INSERT INTO mission_email_delivery_event"),
      ),
    ).includes("alice@example.test"),
  );
  duplicate = true;
  const before = f.calls.length;
  assert.deepEqual(await s.receive(body), { ok: true });
  assert.equal(
    f.calls.slice(before).some((c) => c.sql.startsWith("UPDATE")),
    false,
  );
  for (const value of [
    [],
    [{}, {}],
    [{ ...rows[0], provider_id: "other" }],
    [{ ...rows[0], first_attempt_at: "2026-02-01" }],
  ]) {
    rows = value;
    assert.deepEqual(await s.receive(body), { ok: true });
  }
  assert.deepEqual(await s.receive({ event: "open" }), { ok: true });
  await s.journal("actor");
  assert.deepEqual(f.calls.at(-1).args, ["actor", false]);
  await s.journal("actor", true);
  assert.deepEqual(f.calls.at(-1).args, ["actor", true]);
});
