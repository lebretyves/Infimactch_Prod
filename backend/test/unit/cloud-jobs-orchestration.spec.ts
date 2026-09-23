import { test } from "node:test";
import assert from "node:assert/strict";
import { CloudJobsController } from "../../src/automation/cloud-jobs.module";
import * as closures from "../../src/security/closure";
import * as retention from "../../src/security/retention";
import * as limits from "../../src/security/shared-rate-limit";
import * as freshness from "../../src/public-data/freshness";
function fixture(t: any) {
  const old = process.env.SERVICE_TOKEN;
  process.env.SERVICE_TOKEN = "unit-token";
  t.after(() => {
    if (old === undefined) delete process.env.SERVICE_TOKEN;
    else process.env.SERVICE_TOKEN = old;
  });
  const steps: any[] = [],
    queries: any[] = [];
  let busy = false,
    failed = false,
    pending = 0;
  t.mock.method(
    limits,
    "cleanupSharedRateLimits",
    async (_db: any, limit: number) => {
      steps.push(["limits", limit]);
      return {} as any;
    },
  );
  t.mock.method(
    closures,
    "processClosures",
    async (_db: any, limit: number) => {
      steps.push(["closures", limit]);
      return { failed: failed ? 1 : 0 } as any;
    },
  );
  t.mock.method(freshness, "retireStaleOffers", async () => {
    steps.push("freshness");
    return {} as any;
  });
  t.mock.method(retention, "applyRetention", async (_em: any, options: any) => {
    assert.equal(options.includeBusinessHistory, false);
    steps.push("retention");
    return { documentIds: ["doc"] } as any;
  });
  t.mock.method(retention, "cleanupRemovedDocuments", async () => {
    steps.push("files");
  });
  const db: any = {
    query: async (sql: string, args: any[] = []) => {
      queries.push({ sql, args });
      return sql.includes("pg_try_advisory")
        ? [{ acquired: !busy }]
        : sql.includes("count(*)")
          ? [{ n: pending }]
          : [];
    },
  };
  db.transaction = async (fn: any) => {
    const r = await fn(db);
    steps.push("commit");
    return r;
  };
  const c = new CloudJobsController(
    {
      dispatch: async (limit: number) => {
        steps.push(["dispatch", limit]);
        return [{ id: "event" }];
      },
    } as any,
    {
      dispatch: async (limit: number) => {
        steps.push(["notifications", limit]);
      },
    } as any,
    db,
    {
      reconcile: async (age: number) => {
        steps.push(["reconcile", age]);
      },
    } as any,
    {
      runBatch: async (provider: string) => ({ provider, status: "SUCCESS" }),
    } as any,
  );
  return {
    c,
    steps,
    queries,
    set busy(v: boolean) {
      busy = v;
    },
    set failed(v: boolean) {
      failed = v;
    },
    set pending(v: number) {
      pending = v;
    },
  };
}
test("cloud jobs require internal token and use bounded dispatch and provider batches", async (t) => {
  const f = fixture(t);
  await assert.rejects(
    f.c.dispatch("wrong"),
    (e) => (e as any).getStatus() === 401,
  );
  assert.equal(f.steps.length, 0);
  assert.deepEqual(await f.c.dispatch("unit-token"), { processed: 1 });
  assert.deepEqual(f.steps, [
    ["dispatch", 1],
    ["notifications", 5],
  ]);
  assert.equal((await f.c.refresh("unit-token")).providers.length, 2);
  assert.equal(
    (await f.c.refreshProvider("unit-token", "JOBSPIPE")).provider,
    "JOBSPIPE",
  );
  await assert.rejects(f.c.refreshProvider("unit-token", "unknown"));
});
test("maintenance commits retention before file cleanup and keeps business history excluded", async (t) => {
  const f = fixture(t);
  assert.deepEqual(await f.c.maintenance("unit-token"), { ok: true });
  assert.ok(f.steps.indexOf("commit") < f.steps.indexOf("files"));
  assert.ok(
    f.steps.some((s) => Array.isArray(s) && s[0] === "closures" && s[1] === 5),
  );
  assert.ok(f.queries.some((q) => q.sql.includes("'completed'")));
});
test("busy maintenance does no cleanup; incomplete closures or file erasure produce retryable failure evidence", async (t) => {
  const f = fixture(t);
  f.busy = true;
  assert.deepEqual(await f.c.maintenance("unit-token"), {
    ok: false,
    status: "BUSY",
  });
  assert.equal(f.steps.includes("files"), false);
  f.busy = false;
  f.failed = true;
  await assert.rejects(f.c.maintenance("unit-token"), /CLOSURE_RETRY_REQUIRED/);
  f.failed = false;
  f.pending = 1;
  await assert.rejects(
    f.c.maintenance("unit-token"),
    /DOCUMENT_ERASURE_RETRY_REQUIRED/,
  );
  assert.equal(f.queries.filter((q) => q.sql.includes("'failed'")).length, 2);
});
