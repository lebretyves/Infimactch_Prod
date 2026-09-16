import { test } from "node:test";
import assert from "node:assert/strict";
import { SessionGuard } from "../../src/common/access";
for (const scenario of ["valid", "revoked", "legacy", "disabled"] as const) {
  test(`session guard: ${scenario}`, async () => {
    let destroyed = false;
    const calls: string[] = [];
    const req = { session: { userId: "account", sessionVersion: scenario === "legacy" ? undefined : 3,
      destroy: (done: () => void) => { destroyed = true; done(); } } };
    const db = { query: async (sql: string) => { calls.push(sql); return sql.startsWith("SELECT") && scenario === "valid" ? [{value: 1}] : []; } };
    const guard = new SessionGuard(db as any);
    const context = { switchToHttp: () => ({ getRequest: () => req }) } as any;
    if (scenario === "valid") { assert.equal(await guard.canActivate(context), true); assert.equal(destroyed, false); }
    else { await assert.rejects(guard.canActivate(context), (e: any) => e.getStatus() === 401); assert.equal(destroyed, true); }
    if (scenario === "legacy") assert.equal(calls.some(sql => sql.startsWith("SELECT")), false);
    else assert.ok(calls.some(sql => sql.includes("AND active AND session_version=$2")));
  });
}
