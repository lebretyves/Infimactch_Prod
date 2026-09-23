import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { seedDemo } from "../../src/demo/seed";
import { AuthService } from "../../src/auth/auth.module";
import { ProfilesService } from "../../src/profiles/profiles.module";
import { MissionsService } from "../../src/missions/missions.service";
function mode(t: any, value: string) {
  const old = process.env.NODE_ENV;
  process.env.NODE_ENV = value;
  t.after(() => {
    if (old === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = old;
  });
}
test("demo seeding is forbidden in production before any database operation", async (t) => {
  mode(t, "production");
  let queries = 0;
  await assert.rejects(
    seedDemo({
      query: async () => {
        queries++;
        return [];
      },
    } as any),
    /prohibited in production/,
  );
  assert.equal(queries, 0);
});
test("demo seed orchestrates fictional accounts, matching availability and private credential file", async (t) => {
  mode(t, "test");
  const accounts: any[] = [],
    profiles: any[] = [],
    missions: any[] = [],
    transitions: any[] = [],
    files: any[] = [];
  t.mock.method(AuthService.prototype, "register", async (b: any) => {
    accounts.push(b);
    return { id: b.email, family: b.family };
  });
  t.mock.method(ProfilesService.prototype, "update", async (...args: any[]) => {
    profiles.push(args);
    return { ok: true };
  });
  t.mock.method(MissionsService.prototype, "create", async (...args: any[]) => {
    missions.push(args);
    return { id: "mission" };
  });
  t.mock.method(
    MissionsService.prototype,
    "transition",
    async (...args: any[]) => {
      transitions.push(args);
      return { id: "mission", status: "OPEN" };
    },
  );
  t.mock.method(fs, "mkdir", async () => undefined);
  t.mock.method(fs, "writeFile", async (...args: any[]) => {
    files.push(args);
  });
  const calls: any[] = [];
  const db: any = {
    query: async (sql: string, args: any[] = []) => {
      calls.push({ sql, args });
      return sql.includes("FROM membership")
        ? [
            {
              organization_id: args[0].startsWith("agency")
                ? "agency"
                : "hospital",
            },
          ]
        : [];
    },
  };
  const result = await seedDemo(db);
  assert.equal(result.accountsCreated, 3);
  assert.ok(result.rpps.includes("NOT_CHECKED"));
  assert.ok(accounts.every((a) => a.email.endsWith("@example.invalid")));
  assert.equal(new Set(accounts.map((a) => a.password)).size, 3);
  assert.ok(accounts.every((a) => a.password.length >= 20));
  assert.equal(profiles.length, 1);
  assert.equal(missions.length, 1);
  assert.equal(profiles[0][1].available[0].start, missions[0][1].start);
  assert.deepEqual(transitions, [
    ["agency.demo@example.invalid", "mission", "publish"],
  ]);
  assert.equal(files.length, 1);
  assert.deepEqual(files[0][2], { flag: "wx", mode: 0o600 });
  assert.equal(JSON.parse(files[0][1]).length, 3);
  assert.deepEqual(
    calls.find((c) => c.sql.startsWith("INSERT INTO agency_link")).args,
    ["agency", "hospital"],
  );
});
test("demo seed leaves existing accounts and mission intact on subsequent runs", async (t) => {
  mode(t, "test");
  let writes = 0;
  t.mock.method(fs, "writeFile", async () => {
    writes++;
  });
  t.mock.method(AuthService.prototype, "register", async () => {
    throw new Error("duplicate registration");
  });
  t.mock.method(MissionsService.prototype, "create", async () => {
    throw new Error("duplicate mission");
  });
  const db: any = {
    query: async (sql: string, args: any[]) =>
      sql.includes("FROM account")
        ? [{ id: args[0], family: "NURSE" }]
        : sql.includes("FROM membership")
          ? [{ organization_id: "org" }]
          : sql.includes("FROM mission")
            ? [{ id: "existing" }]
            : [],
  };
  assert.equal((await seedDemo(db)).accountsCreated, 0);
  assert.equal(writes, 0);
});
