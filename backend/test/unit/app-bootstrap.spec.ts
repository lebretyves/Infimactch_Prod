import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import { HttpException } from "@nestjs/common";
import { Pool } from "pg";
import vercelHandler, { createApp, AppModule } from "../../src/app";
import { AutomationService } from "../../src/automation/automation.module";
import { NotificationsService } from "../../src/notifications/notifications.module";
import * as config from "../../src/config";
import * as rate from "../../src/security/shared-rate-limit";
import * as authRate from "../../src/auth/auth-rate-limit";
import { Database } from "../../src/database/database";
function response() {
  const r: any = new EventEmitter();
  r.headers = {};
  r.setHeader = (k: string, v: any) => {
    r.headers[k] = v;
  };
  r.getHeader = (k: string) => r.headers[k];
  r.status = (code: number) => {
    r.statusCode = code;
    return r;
  };
  r.json = (body: any) => {
    r.body = body;
    return r;
  };
  return r;
}
async function fixture(t: any) {
  for (const [key, value] of Object.entries({
    APP_ORIGIN: "https://app.unit.invalid",
    ADMIN_ORIGIN: "https://admin.unit.invalid",
    SESSION_SECRET: "unit-secret-".repeat(5),
    DATABASE_URL: "postgres://unit:unit@localhost/unit",
    NODE_ENV: "test",
  })) {
    const old = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (old === undefined) delete process.env[key];
      else process.env[key] = old;
    });
  }
  t.mock.method(config, "validateConfiguration", () => {});
  const middleware: any[][] = [],
    limits: any[] = [],
    calls: any[] = [],
    queries: any[] = [];
  let filter: any,
    pipe: any,
    closed = 0,
    poolClosed = 0;
  const db: any = {
    query: async (...args: any[]) => {
      queries.push(args);
      return [];
    },
  };
  const app: any = {
    set: (...a: any[]) => calls.push(["set", ...a]),
    setGlobalPrefix: (...a: any[]) => calls.push(["prefix", ...a]),
    use: (...a: any[]) => middleware.push(a),
    useBodyParser: (...a: any[]) => calls.push(["parser", ...a]),
    enableCors: (...a: any[]) => calls.push(["cors", ...a]),
    get: (type: any) => {
      if (type === AutomationService)
        return {
          dispatch: async (limit: number) => calls.push(["automation", limit]),
        };
      if (type === NotificationsService)
        return {
          dispatch: async (limit: number) =>
            calls.push(["notifications", limit]),
        };
      assert.equal(type, Database);
      return db;
    },
    getHttpAdapter: () => ({ getInstance: () => () => calls.push(["http"]) }),
    useGlobalPipes: (p: any) => {
      pipe = p;
    },
    useGlobalFilters: (f: any) => {
      filter = f;
    },
    enableShutdownHooks: () => calls.push(["shutdown"]),
    close: async () => {
      closed++;
    },
    init: async () => calls.push(["init"]),
  };
  t.mock.method(NestFactory, "create", async () => app);
  t.mock.method(
    SwaggerModule,
    "createDocument",
    () =>
      ({
        openapi: "3.0.0",
        info: {},
        paths: {},
        components: { schemas: {} },
      }) as any,
  );
  t.mock.method(SwaggerModule, "setup", () => {});
  t.mock.method(
    rate,
    "sharedRateLimit",
    (_db: any, name: string, options: any) => {
      limits.push({ name, options });
      return (() => {}) as any;
    },
  );
  t.mock.method(authRate, "authRateLimit", () => (() => {}) as any);
  t.mock.method(Pool.prototype, "end", async () => {
    poolClosed++;
  });
  await createApp();
  t.after(() => app.close());
  return {
    app,
    db,
    middleware,
    limits,
    calls,
    queries,
    get filter() {
      return filter;
    },
    get pipe() {
      return pipe;
    },
    get closed() {
      return closed;
    },
    get poolClosed() {
      return poolClosed;
    },
  };
}
test("HTTP boot registers trusted origins, upload limits, validation and rate-limit identities", async (t) => {
  const f = await fixture(t);
  assert.ok(f.calls.some((c) => c[0] === "prefix" && c[1] === "api/v1"));
  assert.deepEqual(f.calls.find((c) => c[0] === "parser")!.slice(1), [
    "json",
    { limit: "7mb" },
  ]);
  assert.deepEqual(f.calls.find((c) => c[0] === "cors")![1], {
    origin: ["https://app.unit.invalid", "https://admin.unit.invalid"],
    credentials: true,
  });
  assert.equal(
    f.limits
      .find((l) => l.name === "documents")
      .options.keyGenerator({
        session: { userId: "owner" },
        sessionID: "session",
      }),
    "owner",
  );
  assert.equal(
    f.limits
      .find((l) => l.name === "documents")
      .options.keyGenerator({ sessionID: "session" }),
    "session",
  );
  assert.equal(
    f.limits
      .find((l) => l.name === "activity")
      .options.keyGenerator({ sessionID: "session" }),
    "session",
  );
  assert.equal(f.limits.find((l) => l.name === "rpps").options.limit, 5);
  assert.equal(f.pipe.validatorOptions.whitelist, true);
  assert.equal(f.pipe.validatorOptions.forbidNonWhitelisted, true);
  const Health = Reflect.getMetadata("controllers", AppModule)[0];
  assert.deepEqual(await new Health(f.db).health(), {
    status: "ok",
    application: "InfiMatch",
  });
  assert.ok(f.queries.some((q) => q[0] === "SELECT 1"));
});
test("request middleware assigns correlation ids and private responses cannot be cached", async (t) => {
  const f = await fixture(t);
  const requestId = f.middleware.find(
    (a) => typeof a[0] === "function" && String(a[0]).includes("X-Request-Id"),
  )![0];
  let next = 0;
  const req: any = {},
    res = response();
  requestId(req, res, () => next++);
  assert.match(req.requestId, /^[a-f0-9-]{36}$/);
  assert.equal(res.headers["X-Request-Id"], req.requestId);
  assert.equal(next, 1);
  const cache = f.middleware.find(
    (a) =>
      typeof a[0] === "function" &&
      String(a[0]).includes("Cache-Control") &&
      String(a[0]).includes("req.session"),
  )![0];
  for (const request of [
    { path: "/api/v1/admin/me" },
    { path: "/api/v1/auth/me" },
    { path: "/api/v1/me", session: { userId: "actor" } },
  ]) {
    const r = response();
    cache(request, r, () => next++);
    assert.equal(r.headers["Cache-Control"], "no-store");
  }
  const publicResponse = response();
  cache({ path: "/api/v1/listings" }, publicResponse, () => next++);
  assert.equal(publicResponse.headers["Cache-Control"], undefined);
  const sessions = f.middleware.find(
    (a) => typeof a[0] === "function" && String(a[0]).includes("adminSession"),
  )![0];
  for (const path of ["/api/v1/admin/login", "/api/v1/auth/login"])
    sessions({ path, session: {} }, response(), () => next++);
  assert.equal(next, 7);
});
test("CSRF middleware checks trusted origin and constant-length token on all mutations", async (t) => {
  const f = await fixture(t),
    csrf = f.middleware.find(
      (a) =>
        typeof a[0] === "function" && String(a[0]).includes("CSRF_INVALID"),
    )![0];
  function run(
    method: string,
    path: string,
    origin: any = "https://app.unit.invalid",
    provided: any = "valid",
    expected: any = "valid",
  ) {
    let passed = false;
    const res = response();
    csrf(
      {
        method,
        path,
        requestId: "req",
        session: { csrf: expected },
        get: (name: string) => (name === "origin" ? origin : provided),
      },
      res,
      () => {
        passed = true;
      },
    );
    return { passed, res };
  }
  for (const method of ["GET", "HEAD", "OPTIONS"])
    assert.equal(
      run(method, "/api/v1/me", undefined, undefined, undefined).passed,
      true,
    );
  assert.equal(run("POST", "/api/v1/internal/automation/matches").passed, true);
  assert.equal(run("POST", "/api/v1/me").passed, true);
  assert.equal(
    run("POST", "/api/v1/admin/me", "https://admin.unit.invalid").passed,
    true,
  );
  for (const [origin, token, expected] of [
    ["https://evil.invalid", "valid", "valid"],
    ["https://app.unit.invalid", undefined, "valid"],
    ["https://app.unit.invalid", "x", "valid"],
    ["https://app.unit.invalid", "wrong", "valid"],
    ["https://app.unit.invalid", "valid", undefined],
  ]) {
    const r = run(
      "POST",
      "/api/v1/me",
      origin,
      token === undefined ? null : token,
      expected === undefined ? null : expected,
    );
    assert.equal(r.passed, false);
    assert.equal(r.res.statusCode, 403);
    assert.equal(r.res.body.code, "CSRF_INVALID");
  }
  assert.equal(run("POST", "/api/v1/admin/me").res.statusCode, 403);
});
test("HTTP exception filter redacts internals, maps conflicts and preserves structured validation errors", async (t) => {
  const f = await fixture(t);
  async function caught(error: any, session: any = {}) {
    const res = response();
    await f.filter.catch(error, {
      switchToHttp: () => ({
        getRequest: () => ({
          method: "POST",
          path: "/api/v1/me",
          requestId: "req",
          session,
        }),
        getResponse: () => res,
      }),
    });
    return res;
  }
  const internal = await caught(new Error("private database password"));
  assert.equal(internal.statusCode, 500);
  assert.equal(internal.body.message, "Internal server error");
  assert.equal(internal.body.requestId, "req");
  for (const [error, status] of [
    [{ type: "entity.too.large" }, 413],
    [{ type: "entity.parse.failed" }, 400],
    [{ code: "23505" }, 409],
    [{ code: "40P01" }, 409],
  ] as const)
    assert.equal((await caught(error)).statusCode, status);
  const structured = await caught(
    new HttpException(
      { code: "INVALID_FIELD", message: "Invalid input", reasons: ["title"] },
      400,
    ),
  );
  assert.deepEqual(structured.body, {
    code: "INVALID_FIELD",
    message: "Invalid input",
    fields: ["title"],
    requestId: "req",
  });
  const denied = await caught(new HttpException("Forbidden", 403), {
    userId: "actor",
  });
  assert.equal(denied.body.message, "Forbidden");
  assert.equal(f.queries.length, 1);
  assert.equal(f.queries[0][1][0], "actor");
  f.db.query = async () => {
    throw new Error("audit offline");
  };
  assert.equal(
    (await caught(new HttpException("Not found", 404), { userId: "actor" }))
      .statusCode,
    404,
  );
});

test("Vercel handler reuses the app and dispatches background deliveries only after successful mutations", async (t) => {
  const f = await fixture(t);
  let initializations = 0;
  t.mock.method(NestFactory, "create", async () => {
    initializations++;
    if (initializations === 1) throw new Error("cold start failure");
    return f.app;
  });
  await assert.rejects(
    vercelHandler({ method: "GET", url: "/api/v1/health" } as any, response()),
    /cold start failure/,
  );
  await vercelHandler(
    { method: "GET", url: "/api/v1/health" } as any,
    response(),
  );
  for (const [method, url, finished, code, event] of [
    ["POST", "/api/v1/missions", true, 201, "finish"],
    ["PUT", "/api/v1/profile", true, 400, "finish"],
    ["DELETE", "/api/v1/me/favorites", false, 200, "close"],
    ["POST", "/api/v1/internal/automation/matches", true, 200, "finish"],
  ] as const) {
    const res = response();
    res.writableFinished = finished;
    res.statusCode = code;
    await vercelHandler({ method, url } as any, res);
    res.emit(event);
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(initializations, 2);
  assert.equal(f.calls.filter((c) => c[0] === "automation").length, 1);
  assert.equal(f.calls.filter((c) => c[0] === "notifications").length, 1);
  assert.ok(f.calls.some((c) => c[0] === "automation" && c[1] === 1));
  assert.ok(f.calls.some((c) => c[0] === "notifications" && c[1] === 5));
});
