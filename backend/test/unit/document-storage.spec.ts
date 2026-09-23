import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { resolve, basename } from "node:path";
import { DocumentsService } from "../../src/documents/documents.module";
import { encrypt, decrypt } from "../../src/documents/crypto";
import * as receipt from "../../src/common/idempotency";
const key = Buffer.alloc(32, 7),
  payload = Buffer.from("%PDF-1.7 private unit fixture");
const status = (n: number) => (e: any) => e.getStatus?.() === n;
function fixture(
  t: any,
  answer: (sql: string, args: any[]) => any = () => [],
  storage = "postgres",
) {
  const values = {
    DOCUMENT_STORAGE: storage,
    DOCUMENT_DIRECTORY: resolve("unit-document-fixture"),
    DOCUMENT_KEY: key.toString("base64"),
    DOCUMENT_KEY_VERSION: "1",
    DOCUMENT_QUOTA_BYTES: String(5 * 1024 * 1024),
  };
  for (const [name, value] of Object.entries(values)) {
    const old = process.env[name];
    process.env[name] = value;
    t.after(() => {
      if (old === undefined) delete process.env[name];
      else process.env[name] = old;
    });
  }
  const files = new Map<string, Buffer>();
  const file = (path: any) => basename(String(path));
  const missing = () => Object.assign(new Error("missing"), { code: "ENOENT" });
  t.mock.method(fs, "mkdir", async () => undefined);
  t.mock.method(fs, "writeFile", async (path: any, data: any) => {
    files.set(file(path), Buffer.from(data));
  });
  t.mock.method(fs, "rename", async (from: any, to: any) => {
    const data = files.get(file(from));
    if (!data) throw missing();
    files.set(file(to), data);
    files.delete(file(from));
  });
  t.mock.method(fs, "readFile", async (path: any) => {
    const data = files.get(file(path));
    if (!data) throw missing();
    return data;
  });
  t.mock.method(fs, "rm", async (path: any) => {
    files.delete(file(path));
  });
  t.mock.method(fs, "readdir", async () => [...files.keys()]);
  t.mock.method(fs, "stat", async (path: any) => {
    if (!files.has(file(path))) throw missing();
    return { mtimeMs: 0 };
  });
  const calls: { sql: string; args: any[] }[] = [];
  const db: any = {
    query: async (sql: string, args: any[] = []) => {
      calls.push({ sql, args });
      if (sql.includes("sum(size_bytes)")) return [{ bytes: 0 }];
      return answer(sql, args);
    },
  };
  db.transaction = async (fn: any) => fn(db);
  return { service: new DocumentsService(db), db, calls, files };
}
for (const storage of ["postgres", "filesystem"])
  test(
    "document store encrypts and reads an owner document using " + storage,
    async (t) => {
      let meta: any, blob: Buffer | undefined;
      const f = fixture(
        t,
        (sql, args) => {
          if (sql.startsWith("INSERT INTO document("))
            meta = {
              id: args[0],
              owner_id: args[1],
              assignment_id: args[2],
              kind: args[3],
              mime: args[4],
              size_bytes: args[5],
              key_version: args[6],
              storage_backend: args[7],
            };
          if (sql.startsWith("INSERT INTO document_blob")) blob = args[1];
          if (sql.startsWith("SELECT * FROM document")) return [meta];
          if (sql.startsWith("SELECT encrypted")) return [{ encrypted: blob }];
          return [];
        },
        storage,
      );
      const result = await f.service.store(
        "owner",
        "CV",
        "application/pdf",
        payload,
        null,
        undefined,
        true,
      );
      assert.equal(result.status, "READY");
      const encrypted =
        storage === "postgres" ? blob! : f.files.get(result.id + ".bin")!;
      assert.ok(!encrypted.includes(payload));
      assert.deepEqual(decrypt(encrypted, key, result.id), payload);
      const read = await f.service.read("owner", result.id);
      assert.equal(read.mime, "application/pdf");
      assert.deepEqual(read.data, payload);
      assert.ok(f.calls.some((c) => c.sql.includes("superseded_at=now()")));
      assert.ok(f.calls.some((c) => c.args.includes("DOCUMENT_READ")));
      await assert.rejects(f.service.read("stranger", result.id), status(404));
    },
  );
test("storage rejects quotas but permits system confirmations and validates encryption keys", async (t) => {
  const f = fixture(t);
  const original = f.db.query;
  f.db.query = async (sql: string, args: any[]) =>
    sql.includes("sum(size_bytes)")
      ? [{ bytes: 5 * 1024 * 1024 }]
      : original(sql, args);
  await assert.rejects(
    f.service.store("owner", "CV", "application/pdf", payload),
    status(413),
  );
  assert.equal(
    f.calls.some((c) => c.sql.startsWith("INSERT INTO document(")),
    false,
  );
  assert.equal(
    (
      await f.service.store(
        "owner",
        "CONFIRMATION",
        "application/pdf",
        payload,
        "assignment",
      )
    ).status,
    "READY",
  );
  process.env.DOCUMENT_KEY = "invalid";
  await assert.rejects(
    f.service.store("owner", "CANCELLATION", "application/pdf", payload),
    status(503),
  );
});
test("document command replay validates receipts and avoids storage writes", async (t) => {
  const f = fixture(t);
  let response: any = { id: "existing", status: "READY" };
  t.mock.method(receipt, "commandReceipt", async () => ({
    replay: true,
    response,
    save: async (v: any) => v,
  }));
  const command = { operation: "upload", key: "same", content: {} };
  assert.deepEqual(
    await f.service.store(
      "owner",
      "CV",
      "application/pdf",
      payload,
      null,
      command,
    ),
    response,
  );
  assert.equal(f.calls.length, 0);
  response = { id: "existing", status: "STAGING" };
  await assert.rejects(
    f.service.store("owner", "CV", "application/pdf", payload, null, command),
    status(503),
  );
});
test("a failed filesystem write cleans both temporary and final encrypted files", async (t) => {
  const f = fixture(
    t,
    (sql) => {
      if (sql.startsWith("UPDATE document SET status='READY'"))
        throw new Error("database failure");
      return [];
    },
    "filesystem",
  );
  await assert.rejects(
    f.service.store("owner", "CONFIRMATION", "application/pdf", payload),
    /database failure/,
  );
  assert.equal(f.files.size, 0);
});
test("confirmation and cancellation reads require ready records and assignment access", async (t) => {
  let kind = "CONFIRMATION",
    allowed = true,
    ready = true;
  const id = "document";
  const f = fixture(t, (sql) =>
    sql.startsWith("SELECT * FROM document")
      ? [
          {
            id,
            owner_id: "other",
            assignment_id: "assignment",
            kind,
            mime: "application/pdf",
            key_version: 1,
            storage_backend: "postgres",
          },
        ]
      : sql.includes("FROM mission_confirmation") ||
          sql.includes("FROM mission_cancellation")
        ? ready
          ? [{ status: "SUPERSEDED" }]
          : []
        : sql.includes("FROM assignment")
          ? allowed
            ? [{ id: "assignment" }]
            : []
          : sql.startsWith("SELECT encrypted")
            ? [{ encrypted: encrypt(payload, key, id) }]
            : [],
  );
  assert.equal(
    (await f.service.read("nurse", id)).confirmationStatus,
    "SUPERSEDED",
  );
  kind = "CANCELLATION";
  assert.equal(
    (await f.service.read("nurse", id)).confirmationStatus,
    "CANCELLED",
  );
  allowed = false;
  await assert.rejects(f.service.read("stranger", id), status(404));
  allowed = true;
  ready = false;
  for (const k of ["CONFIRMATION", "CANCELLATION"]) {
    kind = k;
    await assert.rejects(f.service.read("nurse", id), status(404));
  }
});
test("missing metadata is hidden and corrupted ciphertext produces an unavailable response", async (t) => {
  let exists = false;
  const f = fixture(t, (sql) =>
    sql.startsWith("SELECT * FROM document") && exists
      ? [
          {
            id: "doc",
            owner_id: "owner",
            kind: "CV",
            mime: "application/pdf",
            key_version: 1,
            storage_backend: "postgres",
          },
        ]
      : sql.startsWith("SELECT encrypted")
        ? [{ encrypted: Buffer.from("damaged") }]
        : [],
  );
  await assert.rejects(f.service.read("owner", "doc"), status(404));
  exists = true;
  await assert.rejects(f.service.read("owner", "doc"), status(503));
});
test("reconciliation authenticates staged postgres blobs and leaves missing or invalid records pending", async (t) => {
  let batch = 0;
  const f = fixture(t, (sql, args) => {
    if (sql.startsWith("SELECT id FROM document"))
      return batch++ === 0
        ? ["valid", "missing", "wrongsize", "removed"].map((id) => ({ id }))
        : [];
    if (sql.startsWith("SELECT * FROM document"))
      return args[0] === "removed"
        ? []
        : [
            {
              id: args[0],
              storage_backend: "postgres",
              key_version: 1,
              size_bytes: args[0] === "wrongsize" ? 999 : payload.length,
            },
          ];
    if (sql.startsWith("SELECT encrypted"))
      return args[0] === "missing"
        ? []
        : [{ encrypted: encrypt(payload, key, args[0]) }];
    return [];
  });
  assert.deepEqual(await f.service.reconcile(), {
    recovered: 1,
    pending: 3,
    orphansRemoved: 0,
  });
  assert.deepEqual(
    f.calls
      .filter((c) => c.sql.startsWith("UPDATE document SET status='READY'"))
      .map((c) => c.args[0]),
    ["valid"],
  );
  for (const age of [-1, 1441, 1.5])
    await assert.rejects(f.service.reconcile(age), status(400));
});
test("reconciliation promotes authenticated temporary files and removes only unlocked stale orphans", async (t) => {
  const ids = [
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333",
  ];
  let batch = 0;
  const f = fixture(
    t,
    (sql, args) => {
      if (sql.startsWith("SELECT id FROM document"))
        return batch++ === 0 ? [{ id: ids[0] }] : [];
      if (sql.startsWith("SELECT * FROM document"))
        return [
          {
            id: ids[0],
            key_version: 1,
            size_bytes: payload.length,
            storage_backend: "filesystem",
          },
        ];
      if (sql.includes("pg_try_advisory"))
        return [{ acquired: !args[0].endsWith(ids[2]) }];
      if (sql.startsWith("SELECT status FROM document"))
        return args[0] === ids[0] ? [{ status: "READY" }] : [];
      return [];
    },
    "filesystem",
  );
  f.files.set(ids[0] + ".tmp", encrypt(payload, key, ids[0]!));
  f.files.set(ids[1] + ".bin", Buffer.from("orphan"));
  f.files.set(ids[2] + ".bin", Buffer.from("locked"));
  f.files.set("unrelated.txt", Buffer.from("keep"));
  assert.deepEqual(await f.service.reconcile(), {
    recovered: 1,
    pending: 0,
    orphansRemoved: 1,
  });
  assert.ok(f.files.has(ids[0] + ".bin"));
  assert.ok(!f.files.has(ids[0] + ".tmp"));
  assert.ok(f.files.has(ids[2] + ".bin"));
  assert.ok(f.files.has("unrelated.txt"));
});
