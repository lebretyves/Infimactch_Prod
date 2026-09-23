import { test } from "node:test";
import assert from "node:assert/strict";
import { SupportService } from "../../src/support/support.service";
function fixture() {
  let old: any,
    count = 0,
    exists = true;
  const calls: any[] = [],
    ticket = { id: "ticket", owner_id: "owner", status: "RESOLVED" };
  const db: any = {
    query: async (sql: string, args: any[] = []) => {
      calls.push({ sql, args });
      if (sql.startsWith("SELECT id FROM account"))
        return exists ? [{ id: "owner" }] : [];
      if (sql.startsWith("SELECT * FROM support_ticket WHERE owner_id"))
        return old ? [old] : [];
      if (sql.startsWith("SELECT * FROM support_ticket WHERE id"))
        return exists ? [ticket] : [];
      if (sql.startsWith("SELECT id,body FROM support_reply"))
        return old ? [old] : [];
      if (sql.startsWith("SELECT count(*)")) return [{ n: count }];
      if (sql.startsWith("INSERT INTO support_ticket")) return [ticket];
      if (sql.startsWith("INSERT INTO support_reply")) return [{ id: "reply" }];
      if (sql.startsWith("SELECT id,category,subject,description"))
        return exists ? [ticket] : [];
      if (
        sql.startsWith("SELECT id,category") ||
        sql.startsWith("SELECT id,body,is_staff")
      )
        return Array.from({ length: 21 }, (_, i) => ({ id: String(i) }));
      return [];
    },
  };
  db.transaction = async (fn: any) => fn(db);
  return {
    s: new SupportService(db),
    calls,
    set old(v: any) {
      old = v;
    },
    set count(v: number) {
      count = v;
    },
    set exists(v: boolean) {
      exists = v;
    },
  };
}
const b = {
  clientRequestId: "request",
  category: "ACCESS",
  subject: " Login issue ",
  description: " Cannot access account ",
};
test("support creation trims input, replays identical requests and enforces hourly limits", async () => {
  const f = fixture();
  assert.equal((await f.s.create("owner", b)).id, "ticket");
  assert.deepEqual(
    f.calls.find((c) => c.sql.startsWith("INSERT INTO support_ticket")).args,
    ["owner", "request", "ACCESS", "Login issue", "Cannot access account"],
  );
  f.old = {
    id: "old",
    subject: "Login issue",
    description: "Cannot access account",
    category: "ACCESS",
    status: "OPEN",
  };
  assert.equal((await f.s.create("owner", b)).id, "old");
  await assert.rejects(
    f.s.create("owner", { ...b, subject: "Different" }),
    (e) => (e as any).getStatus() === 409,
  );
  f.old = null;
  f.count = 5;
  await assert.rejects(
    f.s.create("owner", b),
    (e) => (e as any).getStatus() === 429,
  );
  f.exists = false;
  await assert.rejects(
    f.s.create("owner", b),
    (e) => (e as any).getStatus() === 404,
  );
});
test("support list and details bind owner access and use a lookahead row for pagination", async () => {
  const f = fixture();
  let r = await f.s.list("owner", 20);
  assert.equal(r.items.length, 20);
  assert.equal(r.hasMore, true);
  assert.deepEqual(f.calls[0].args, ["owner", 20]);
  await f.s.list("staff", 40, true);
  assert.deepEqual(f.calls[1].args, [40]);
  let d = await f.s.detail("owner", "ticket", 20);
  assert.equal(d.replies.length, 20);
  assert.equal(d.hasMore, true);
  assert.ok(
    f.calls.some((c) => c.args[0] === "ticket" && c.args[1] === "owner"),
  );
  await f.s.detail("staff", "ticket", 0, true);
  f.exists = false;
  await assert.rejects(
    f.s.detail("stranger", "ticket", 0),
    (e) => (e as any).getStatus() === 404,
  );
});
test("client support reply reopens tickets, staff can resolve and duplicate keys cannot change content", async () => {
  const f = fixture();
  const b = { clientRequestId: "reply-key", body: " Additional details " };
  assert.deepEqual(await f.s.reply("owner", "ticket", b), { id: "reply" });
  assert.deepEqual(
    f.calls.find((c) => c.sql.startsWith("UPDATE support_ticket")).args,
    ["ticket", "OPEN"],
  );
  await assert.rejects(
    f.s.reply("owner", "ticket", { ...b, status: "RESOLVED" }),
    (e) => (e as any).getStatus() === 400,
  );
  await f.s.reply("staff", "ticket", { ...b, status: "RESOLVED" }, true);
  assert.ok(
    f.calls.some(
      (c) =>
        c.sql.startsWith("INSERT INTO notification") && c.args[0] === "owner",
    ),
  );
  f.old = { id: "prior", body: "Additional details" };
  assert.deepEqual(await f.s.reply("owner", "ticket", b), { id: "prior" });
  await assert.rejects(
    f.s.reply("owner", "ticket", { ...b, body: "changed" }),
    (e) => (e as any).getStatus() === 409,
  );
  f.old = null;
  f.count = 40;
  await assert.rejects(
    f.s.reply("owner", "ticket", b),
    (e) => (e as any).getStatus() === 429,
  );
});
