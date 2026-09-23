import { test } from "node:test";
import assert from "node:assert/strict";
import { DocumentsController } from "../../src/documents/documents.module";
const pdf = Buffer.from("%PDF-1.7 test"),
  req: any = { session: { userId: "owner" } };
const status = (n: number) => (e: any) => e.getStatus?.() === n;
function fixture() {
  let rows: any[] = [{ user_id: "owner" }],
    read: any = { mime: "application/pdf", data: pdf };
  const calls: any[] = [],
    stored: any[] = [],
    reads: any[] = [];
  const db: any = {
    query: async (sql: string, args: any[]) => {
      calls.push({ sql, args });
      return rows;
    },
  };
  db.transaction = async (fn: any) => fn(db);
  const service: any = {
    store: async (...args: any[]) => {
      stored.push(args);
      return { id: "doc", status: "READY" };
    },
    read: async (...args: any[]) => {
      reads.push(args);
      return read;
    },
  };
  return {
    c: new DocumentsController(db, service),
    calls,
    stored,
    reads,
    set rows(v: any[]) {
      rows = v;
    },
    set read(v: any) {
      read = v;
    },
  };
}
function response() {
  const r: any = {};
  r.set = (headers: any) => {
    r.headers = headers;
    return r;
  };
  r.send = (data: any) => {
    r.data = data;
    return r;
  };
  return r;
}
test("evidence uploads reject mismatched or oversize files and bind validated content to actor and command", async () => {
  const f = fixture(),
    body = {
      mime: "application/pdf",
      contentBase64: pdf.toString("base64"),
      fictional: true,
    };
  assert.deepEqual(await f.c.upload(req, "key", body), {
    id: "doc",
    status: "READY",
  });
  assert.deepEqual(f.stored[0].slice(0, 4), [
    "owner",
    "EVIDENCE",
    "application/pdf",
    pdf,
  ]);
  assert.deepEqual(f.stored[0][5], {
    operation: "document.upload",
    key: "key",
    content: body,
  });
  for (const content of [
    Buffer.alloc(0),
    Buffer.from("<html>"),
    Buffer.alloc(6 * 1024 * 1024),
  ])
    await assert.rejects(
      f.c.upload(req, "key", {
        ...body,
        contentBase64: content.toString("base64"),
      }),
      status(400),
    );
  f.rows = [];
  await assert.rejects(f.c.upload(req, "key", body), status(404));
  assert.equal(f.stored.length, 1);
});
test("document list is owner scoped and downloads hide bank files and disable caching", async () => {
  const f = fixture();
  await f.c.list(req, { limit: 10, offset: 20 });
  assert.deepEqual(f.calls[0].args, ["owner", 10, 20]);
  f.rows = [];
  await assert.rejects(f.c.download(req, "doc", response()), status(404));
  f.rows = [{ kind: "BANK" }];
  await assert.rejects(f.c.download(req, "doc", response()), status(404));
  assert.equal(f.reads.length, 0);
  f.rows = [{ kind: "CONFIRMATION" }];
  f.read = {
    mime: "application/pdf",
    data: pdf,
    confirmationStatus: "CANCELLED",
  };
  let res = response();
  await f.c.download(req, "doc", res);
  assert.equal(res.headers["Cache-Control"], "no-store");
  assert.equal(res.headers["X-InfiMatch-Document-State"], "CANCELLED");
  assert.equal(res.data, pdf);
  assert.deepEqual(f.reads[0], ["owner", "doc"]);
  f.read = { mime: "application/pdf", data: pdf };
  res = response();
  await f.c.download(req, "doc", res);
  assert.equal(res.headers["X-InfiMatch-Document-State"], "READY");
});
test("bank download returns only the latest owner file, decodes versioned envelopes and rejects details-only records", async () => {
  const f = fixture();
  f.rows = [];
  await assert.rejects(f.c.downloadBank(req, response()), status(404));
  f.rows = [{ id: "bank" }];
  for (const [mime, ext] of [
    ["application/pdf", "pdf"],
    ["image/png", "png"],
    ["image/jpeg", "jpg"],
  ]) {
    f.read = {
      mime: "application/json",
      data: Buffer.from(
        JSON.stringify({
          version: 2,
          file: { mime, contentBase64: pdf.toString("base64") },
        }),
      ),
    };
    const res = response();
    await f.c.downloadBank(req, res);
    assert.equal(res.headers["Content-Type"], mime);
    assert.ok(res.headers["Content-Disposition"].endsWith("." + ext + '"'));
    assert.equal(res.headers["Cache-Control"], "no-store");
    assert.deepEqual(res.data, pdf);
  }
  f.read = {
    mime: "application/json",
    data: Buffer.from(
      JSON.stringify({ version: 2, details: { iban: "FR761234" } }),
    ),
  };
  await assert.rejects(f.c.downloadBank(req, response()), status(404));
  f.read = { mime: "application/pdf", data: pdf };
  const legacy = response();
  await f.c.downloadBank(req, legacy);
  assert.equal(legacy.data, pdf);
});
test("bank summary distinguishes optional, suggested and legacy documents without exposing legacy full IBAN", async () => {
  const f = fixture();
  f.rows = [];
  assert.deepEqual(await f.c.getBank(req), {
    iban: null,
    details: null,
    document: null,
    required: false,
    suggested: false,
  });
  f.rows = [{ id: "bank", mime: "application/pdf" }];
  let result = await f.c.getBank(req);
  assert.equal(result.document?.id, "bank");
  assert.equal(result.iban, null);
  f.rows = [{ id: "bank", mime: "application/json" }];
  f.read = {
    mime: "application/json",
    data: Buffer.from(JSON.stringify({ iban: "FR761234567890" })),
  };
  result = await f.c.getBank(req);
  assert.ok(result.iban!.endsWith("7890"));
  assert.ok(!result.iban!.includes("123456"));
  assert.equal(result.details, null);
});
