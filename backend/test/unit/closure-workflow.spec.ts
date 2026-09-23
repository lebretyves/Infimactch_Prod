import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import mongoose from "mongoose";
import {
  executeClosure,
  replayApprovedErasure,
  processClosures,
  approveClosure,
} from "../../src/security/closure";
import * as retention from "../../src/security/retention";
import * as blockers from "../../src/security/closure-blockers";
const account = "11111111-1111-4111-8111-111111111111";
function fixture(t: any, storage = "postgres") {
  const old = process.env.DOCUMENT_STORAGE;
  process.env.DOCUMENT_STORAGE = storage;
  t.after(() => {
    if (old === undefined) delete process.env.DOCUMENT_STORAGE;
    else process.env.DOCUMENT_STORAGE = old;
  });
  const steps: any[] = [],
    calls: any[] = [];
  let requestStatus = "APPROVED",
    blocked = false,
    ledgerFails = false;
  t.mock.method(blockers, "lockClosure", async () => {});
  t.mock.method(blockers, "closureBlockers", async () =>
    blocked ? ([{ label: "Active mission" }] as any) : [],
  );
  t.mock.method(retention, "requireOwnerTransfer", async () => {
    steps.push("owner-check");
  });
  t.mock.method(
    retention,
    "anonymizeAccount",
    async (_db: any, id: string, options: any) => {
      steps.push(["anonymize", id, options]);
      return { id, documents: 1, documentIds: ["doc"] };
    },
  );
  t.mock.method(
    retention,
    "cleanupRemovedDocuments",
    async (_db: any, ids: any) => {
      steps.push(["cleanup", ids]);
    },
  );
  t.mock.method(fs, "mkdir", async () => undefined);
  t.mock.method(
    fs,
    "appendFile",
    async (_path: any, line: any, options: any) => {
      assert.equal(JSON.parse(line).accountId, account);
      assert.equal(options.mode, 0o600);
      steps.push("ledger-file");
    },
  );
  const conn: any = {
    asPromise: async () => conn,
    close: async () => {
      steps.push("mongo-close");
    },
    collection: (name: string) => ({
      updateOne: async (filter: any, value: any, options: any) => {
        assert.equal(name, "erasureledger");
        assert.equal(filter._id, account);
        assert.equal(options.writeConcern.w, "majority");
        if (ledgerFails) throw new Error("ledger unavailable");
        steps.push("ledger");
      },
      deleteMany: async (filter: any) => {
        assert.equal(name, "matchingruns");
        assert.deepEqual(filter, { ownerId: account });
        steps.push("mongo-erased");
      },
    }),
  };
  t.mock.method(mongoose, "createConnection", () => conn);
  const db: any = {
    query: async (sql: string, args: any[] = []) => {
      calls.push({ sql, args });
      if (sql.startsWith("SELECT id FROM account")) return [{ id: account }];
      if (sql.startsWith("SELECT status FROM closure_request"))
        return [{ status: requestStatus }];
      if (sql.startsWith("SELECT id FROM document_erasure"))
        return [{ id: "pending" }];
      if (sql.startsWith("UPDATE closure_request SET status='APPROVED'"))
        return [{ id: "request", status: "APPROVED" }];
      return [];
    },
  };
  db.transaction = async (fn: any) => {
    const r = await fn(db);
    steps.push("commit");
    return r;
  };
  return {
    db,
    calls,
    steps,
    set requestStatus(v: string) {
      requestStatus = v;
    },
    set blocked(v: boolean) {
      blocked = v;
    },
    set ledgerFails(v: boolean) {
      ledgerFails = v;
    },
  };
}
for (const storage of ["postgres", "filesystem"])
  test(
    "closure writes independent erasure evidence before anonymisation: " +
      storage,
    async (t) => {
      const f = fixture(t, storage);
      const r = await executeClosure(f.db, account, "request");
      assert.equal((r as any).documents, 1);
      const ledger = f.steps.indexOf(
          storage === "postgres" ? "ledger" : "ledger-file",
        ),
        anonymize = f.steps.findIndex(
          (s) => Array.isArray(s) && s[0] === "anonymize",
        ),
        commit = f.steps.indexOf("commit"),
        cleanup = f.steps.findIndex(
          (s) => Array.isArray(s) && s[0] === "cleanup",
        );
      assert.ok(
        ledger >= 0 &&
          ledger < anonymize &&
          anonymize < commit &&
          commit < cleanup,
      );
      assert.deepEqual(f.steps[cleanup], ["cleanup", ["doc", "pending"]]);
      assert.ok(f.steps.includes("mongo-erased"));
      assert.ok(f.calls.some((c) => c.sql.includes("status='COMPLETED'")));
    },
  );
test("closure skips unapproved requests and refuses blockers or unavailable independent ledger", async (t) => {
  const f = fixture(t);
  await assert.rejects(executeClosure(f.db, "invalid"), /Invalid account id/);
  f.requestStatus = "REQUESTED";
  assert.deepEqual(await executeClosure(f.db, account, "request"), {
    skipped: true,
  });
  f.requestStatus = "APPROVED";
  f.blocked = true;
  await assert.rejects(
    executeClosure(f.db, account, "request"),
    (e) => (e as any).getResponse().code === "CLOSURE_BLOCKED",
  );
  f.blocked = false;
  f.ledgerFails = true;
  await assert.rejects(
    executeClosure(f.db, account, "request"),
    /ledger unavailable/,
  );
  assert.equal(
    f.steps.some((s) => Array.isArray(s) && s[0] === "anonymize"),
    false,
  );
});
test("processing closure resumes physical cleanup without repeating anonymisation, replay uses retained approval", async (t) => {
  const f = fixture(t);
  f.requestStatus = "PROCESSING";
  await executeClosure(f.db, account, "request");
  assert.equal(
    f.steps.some((s) => Array.isArray(s) && s[0] === "anonymize"),
    false,
  );
  f.steps.length = 0;
  await replayApprovedErasure(f.db, account);
  assert.equal(f.steps.includes("owner-check"), false);
  assert.deepEqual(
    f.steps.find((s) => Array.isArray(s) && s[0] === "anonymize"),
    ["anonymize", account, { approvedErasureReplay: true }],
  );
});
test("closure batches bound work, sanitize failure details and skip unapproved requests", async (t) => {
  const f = fixture(t);
  const original = f.db.query;
  f.requestStatus = "REQUESTED";
  f.db.query = async (sql: string, args: any[]) =>
    sql.startsWith("SELECT id,account_id")
      ? [
          { id: "bad", account_id: "invalid" },
          { id: "skip", account_id: account },
        ]
      : original(sql, args);
  for (const limit of [0, 101, 1.5])
    await assert.rejects(
      processClosures(f.db, limit),
      /Invalid closure batch size/,
    );
  assert.deepEqual(await processClosures(f.db, 2), {
    processed: 0,
    skipped: 1,
    failed: 1,
    failures: [{ requestId: "bad", code: "CLOSURE_RETRY_REQUIRED" }],
  });
  assert.ok(
    f.calls.some((c) => c.sql.includes("last_error='CLOSURE_RETRY_REQUIRED'")),
  );
});
