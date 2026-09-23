import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createCli } from "../../src/cli";
import { Database } from "../../src/database/database";
import { DocumentsService } from "../../src/documents/documents.module";
import { RefreshService } from "../../src/public-data/refresh.service";
import * as retention from "../../src/security/retention";
import * as closure from "../../src/security/closure";
import * as offers from "../../src/public-data/offers";
import * as geo from "../../src/public-data/offer-geolocation";
import * as reparse from "../../src/public-data/reparse-offers";
import * as freshness from "../../src/public-data/freshness";
import * as automation from "../../src/automation/automation.module";
import * as finess from "../../src/reference-data/finess";
import * as seed from "../../src/demo/seed";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const id = "11111111-1111-4111-8111-111111111111";
function fixture(t: any, answer: (sql: string, args: any[]) => any = () => []) {
  const old = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgres://fixture:fixture@127.0.0.1:1/unit";
  t.after(() => {
    if (old === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = old;
  });
  const calls: any[] = [];
  let closed = 0,
    connected = 0;
  const output: any[] = [];
  const db: any = {
    query: async (sql: string, args: any[]) => {
      calls.push({ sql, args });
      return answer(sql, args);
    },
    onModuleDestroy: async () => {
      closed++;
    },
    source: { runMigrations: async () => [{ name: "FixtureMigration" }] },
  };
  db.transaction = async (fn: any) => fn(db);
  t.mock.method(Database.prototype, "connect", async () => {
    connected++;
    return db;
  });
  t.mock.method(console, "log", (...args: any[]) => output.push(args));
  return {
    db,
    calls,
    output,
    get closed() {
      return closed;
    },
    get connected() {
      return connected;
    },
    run: (args: string[]) =>
      createCli()
        .exitOverride()
        .configureOutput({ writeErr: () => {} })
        .parseAsync(args, { from: "user" }),
  };
}
test("operator migrations close the connection after success and database failure", async (t) => {
  const f = fixture(t);
  await f.run(["migrate"]);
  assert.equal(f.closed, 1);
  assert.deepEqual(JSON.parse(f.output[0][0]), {
    migrations: ["FixtureMigration"],
  });
  f.db.source.runMigrations = async () => {
    throw Error("migration failed");
  };
  await assert.rejects(f.run(["migrate"]), /migration failed/);
  assert.equal(f.closed, 2);
});
test("organization linking refuses wrong roles before writes and inserts a parameterized valid pair", async (t) => {
  let valid = false;
  const f = fixture(t, (sql) =>
    sql.startsWith("SELECT")
      ? valid
        ? [
            { id: "agency", kind: "AGENCY" },
            { id: "facility", kind: "ESTABLISHMENT" },
          ]
        : []
      : [],
  );
  await assert.rejects(
    f.run([
      "link-organizations",
      "--agency",
      "agency",
      "--establishment",
      "facility",
    ]),
    /Invalid organization/,
  );
  assert.equal(
    f.calls.some((c) => c.sql.startsWith("INSERT")),
    false,
  );
  assert.equal(f.closed, 1);
  valid = true;
  await f.run([
    "link-organizations",
    "--agency",
    "agency",
    "--establishment",
    "facility",
  ]);
  assert.deepEqual(f.calls.find((c) => c.sql.startsWith("INSERT")).args, [
    "agency",
    "facility",
  ]);
  assert.equal(f.closed, 2);
});
test("account operator commands revoke sessions, preserve active state on revoke and audit their action", async (t) => {
  let exists = true;
  const f = fixture(t, (sql, args) =>
    sql.startsWith("SELECT id,active")
      ? exists
        ? [{ id, active: false }]
        : []
      : sql.startsWith("UPDATE account")
        ? [{ id, active: args[1], session_version: 4 }]
        : [],
  );
  for (const [command, active, event] of [
    ["disable-account", false, "ACCOUNT_DISABLED"],
    ["enable-account", true, "ACCOUNT_ENABLED"],
    ["revoke-account-sessions", false, "ACCOUNT_SESSIONS_REVOKED"],
  ] as const) {
    f.calls.length = 0;
    await f.run([command, "--account", id]);
    assert.deepEqual(
      f.calls.find((c) => c.sql.startsWith("UPDATE account")).args,
      [id, active],
    );
    assert.deepEqual(
      f.calls.find((c) => c.sql.startsWith("DELETE FROM session")).args,
      [id],
    );
    assert.equal(
      f.calls.find((c) => c.sql.startsWith("INSERT INTO audit")).args[1],
      event,
    );
  }
  exists = false;
  f.calls.length = 0;
  await assert.rejects(
    f.run(["disable-account", "--account", id]),
    /Account not found/,
  );
  assert.equal(
    f.calls.some((c) => /^(UPDATE|DELETE)/.test(c.sql)),
    false,
  );
  assert.equal(f.closed, 4);
});
test("retention and account anonymization are read-only unless apply is explicit", async (t) => {
  let existing = true;
  const f = fixture(t, (sql) =>
    sql.includes("count(*)")
      ? [{ n: 2 }]
      : sql.includes("FROM account")
        ? existing
          ? [{ id, email: "private@example.invalid", active: true }]
          : []
        : [],
  );
  let applied = 0,
    cleaned = 0,
    erased = 0;
  t.mock.method(retention, "inspectRetention", async () => ({
    expiredSessions: 2,
  }));
  t.mock.method(retention, "applyRetention", async () => {
    applied++;
    return { documentIds: ["doc"] } as any;
  });
  t.mock.method(
    retention,
    "cleanupRemovedDocuments",
    async (_db: any, ids: any) => {
      cleaned++;
      assert.deepEqual(ids, ["doc"]);
      return {} as any;
    },
  );
  t.mock.method(closure, "executeClosure", async (_db: any, actor: string) => {
    assert.equal(actor, id);
    erased++;
    return { ok: true } as any;
  });
  await f.run(["purge-retention"]);
  assert.equal(applied, 0);
  assert.equal(cleaned, 0);
  assert.equal(JSON.parse(f.output.at(-1)[0]).dryRun, true);
  await f.run(["purge-retention", "--apply"]);
  assert.equal(applied, 1);
  assert.equal(cleaned, 1);
  await f.run(["anonymize-account", "--account", id]);
  const preview = JSON.parse(f.output.at(-1)[0]);
  assert.equal(preview.dryRun, true);
  assert.equal(preview.documents, 2);
  assert.equal("email" in preview, false);
  assert.equal(erased, 0);
  await f.run(["anonymize-account", "--account", id, "--apply"]);
  assert.equal(erased, 1);
  existing = false;
  await assert.rejects(
    f.run(["anonymize-account", "--account", id]),
    /Account not found/,
  );
  assert.equal(f.closed, 5);
});
test("provider, reconciliation and seed commands forward operator options and always release database resources", async (t) => {
  const f = fixture(t);
  const seen: any[] = [];
  t.mock.method(reparse, "reparseOffers", async (...a: any[]) => {
    seen.push(["reparse", ...a.slice(1)]);
    return {} as any;
  });
  t.mock.method(freshness, "retireStaleOffers", async (...a: any[]) => {
    seen.push(["retire", ...a.slice(1)]);
    return {} as any;
  });
  t.mock.method(automation, "retryOutbox", async (...a: any[]) => {
    seen.push(["retry", ...a.slice(1)]);
    return {} as any;
  });
  t.mock.method(finess, "importFiness", async (...a: any[]) => {
    seen.push(["finess", ...a.slice(1)]);
    return {} as any;
  });
  t.mock.method(seed, "seedDemo", async () => {
    seen.push(["seed"]);
    return {} as any;
  });
  t.mock.method(DocumentsService.prototype, "reconcile", async (n: any) => {
    seen.push(["reconcile", n]);
    return {} as any;
  });
  t.mock.method(
    offers,
    "fetchOffers",
    async (n: any, _fetch: any, department: any) => {
      seen.push(["fetch", n, department]);
      return [] as any;
    },
  );
  t.mock.method(geo, "enrichFranceTravailLocations", async (rows: any) => rows);
  t.mock.method(
    offers,
    "importOffers",
    async (_db: any, rows: any, dry: any) => {
      seen.push(["import", rows, dry]);
      return {} as any;
    },
  );
  for (const args of [
    ["reparse-offers"],
    ["reparse-offers", "--apply"],
    ["retire-stale-offers", "--apply"],
    ["retry-outbox", "--event", id],
    [
      "import-finess",
      "--file",
      "fixture.gz",
      "--source-url",
      "https://example.invalid/finess",
    ],
    ["seed"],
    ["reconcile-documents", "--minimum-age-minutes", "15"],
    ["import-offers", "--limit", "2", "--department", "75", "--dry-run"],
  ])
    await f.run(args);
  assert.deepEqual(seen, [
    ["reparse", false],
    ["reparse", true],
    ["retire", true],
    ["retry", id],
    ["finess", "fixture.gz", "https://example.invalid/finess"],
    ["seed"],
    ["reconcile", 15],
    ["fetch", 2, "75"],
    ["import", [], true],
  ]);
  assert.equal(f.closed, 8);
  t.mock.method(reparse, "reparseOffers", async () => {
    throw Error("provider boundary failure");
  });
  await assert.rejects(f.run(["reparse-offers"]), /provider boundary failure/);
  assert.equal(f.closed, 9);
});
test("JobsPipe rejects invalid paid-page budgets before opening a database and dry-run never calls provider", async (t) => {
  const f = fixture(t, () => [{ provider: "JOBSPIPE", enabled: true }]);
  let requests = 0;
  t.mock.method(
    RefreshService.prototype,
    "run",
    async (p: any, manual: any) => {
      assert.equal(p, "JOBSPIPE");
      assert.equal(manual, true);
      requests++;
      return {} as any;
    },
  );
  for (const limit of ["0", "26", "1.5", "bad"])
    await assert.rejects(
      f.run(["import-jobspipe", "--limit", limit]),
      /maximum/,
    );
  assert.equal(f.connected, 0);
  await f.run(["import-jobspipe", "--dry-run"]);
  assert.equal(requests, 0);
  await f.run(["import-jobspipe"]);
  assert.equal(requests, 1);
  assert.equal(f.closed, 2);
});
test("closure operations preserve dry-runs, signal partial failure and replay unique existing ledger accounts only", async (t) => {
  const f = fixture(t, (sql, args) =>
    sql.includes("count(*)") ? [{ n: 2 }] : args?.[0] === id ? [{ id }] : [],
  );
  let processed = 0,
    cleaned = 0;
  t.mock.method(closure, "approveClosure", async (_db: any, request: any) => {
    assert.equal(request, id);
    return { ok: true } as any;
  });
  t.mock.method(closure, "processClosures", async () => {
    processed++;
    return { failed: 1 } as any;
  });
  t.mock.method(
    closure,
    "replayApprovedErasure",
    async (_db: any, actor: any) => {
      assert.equal(actor, id);
      return {} as any;
    },
  );
  t.mock.method(retention, "cleanupRemovedDocuments", async () => {
    cleaned++;
    return {} as any;
  });
  await f.run(["closure-requests"]);
  await f.run(["approve-closure", "--request", id]);
  await f.run(["process-closure-requests"]);
  assert.equal(processed, 0);
  const previous = process.exitCode;
  t.after(() => {
    process.exitCode = previous;
  });
  await f.run(["process-closure-requests", "--apply"]);
  assert.equal(process.exitCode, 1);
  process.exitCode = previous;
  await f.run(["retry-document-erasures"]);
  assert.equal(cleaned, 0);
  await f.run(["retry-document-erasures", "--apply"]);
  assert.equal(cleaned, 1);
  const dir = await mkdtemp(join(tmpdir(), "infimatch-unit-ledger-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, "ledger.jsonl");
  await writeFile(
    file,
    [
      { accountId: id },
      { accountId: id },
      { accountId: "22222222-2222-4222-8222-222222222222" },
    ]
      .map((v) => JSON.stringify(v))
      .join("\n"),
  );
  await f.run(["replay-erasures", "--ledger", file]);
  assert.deepEqual(JSON.parse(f.output.at(-1)[0]), { processed: 1 });
  await writeFile(file, JSON.stringify({ accountId: "invalid" }));
  const connections = f.connected;
  await assert.rejects(
    f.run(["replay-erasures", "--ledger", file]),
    /Invalid erasure ledger/,
  );
  assert.equal(f.connected, connections);
});
