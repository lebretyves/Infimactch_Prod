import { test } from "node:test";
import assert from "node:assert/strict";
import { ContractsService } from "../../src/contracts/contracts.service";
const status = (n: number) => (e: any) => e.getStatus?.() === n;
const notes = {
  reason: " Staff cover ",
  workSchedule: " Day shift ",
  payTerms: " 25 EUR/h ",
  contactName: " Alice ",
  additionalNotes: " ",
};
function fixture() {
  let preparation: any,
    member = true,
    active = true,
    assignmentStatus = "ACTIVE",
    exists = true;
  const calls: any[] = [];
  const db: any = {
    query: async (sql: string, args: any[] = []) => {
      calls.push({ sql, args });
      if (sql.startsWith("SELECT id FROM account")) return [{ id: "actor" }];
      if (sql.startsWith("SELECT mission_id"))
        return exists ? [{ mission_id: "mission" }] : [];
      if (sql.startsWith("SELECT * FROM mission"))
        return [
          {
            id: "mission",
            agency_id: "agency",
            establishment_id: "hospital",
            title: "IDE",
            timezone: "Europe/Paris",
          },
        ];
      if (sql.startsWith("SELECT * FROM assignment"))
        return [
          {
            id: "assignment",
            nurse_id: "nurse",
            status: assignmentStatus,
            start_at: "2030-01-01",
            end_at: "2030-01-02",
          },
        ];
      if (sql.includes("FROM membership"))
        return member ? [{ organization_id: "agency" }] : [];
      if (sql.startsWith("SELECT active")) return [{ active }];
      if (sql.startsWith("SELECT id,kind"))
        return [
          {
            id: "agency",
            kind: "AGENCY",
            name: "Agency",
            address: "Paris",
            siret: "12345678901234",
          },
        ];
      if (sql.startsWith("SELECT name,address")) return [{ name: "Hospital" }];
      if (sql.startsWith("SELECT display_name"))
        return [
          {
            display_name: "Legacy",
            details: { firstName: " Alice ", lastName: " Martin " },
          },
        ];
      if (sql.startsWith("SELECT version,notes"))
        return preparation ? [preparation] : [];
      if (sql.startsWith("INSERT INTO contract_preparation")) {
        preparation = {
          version: (preparation?.version ?? 0) + 1,
          notes: JSON.parse(args[1]),
          updated_at: "2026-01-01",
        };
        return [preparation];
      }
      return [];
    },
  };
  db.transaction = async (fn: any) => fn(db);
  return {
    s: new ContractsService(db),
    calls,
    set member(v: boolean) {
      member = v;
    },
    set active(v: boolean) {
      active = v;
    },
    set assignmentStatus(v: string) {
      assignmentStatus = v;
    },
    set exists(v: boolean) {
      exists = v;
    },
  };
}
test("contract preparation shows missing fields and grants edits only to the employer", async () => {
  const f = fixture();
  let r = await f.s.read("employer", "assignment");
  assert.equal(r.canEdit, true);
  assert.equal(r.worker.displayName, "Alice Martin");
  assert.equal(r.preparation.version, 0);
  assert.equal(r.missingInformation.length, 4);
  f.member = false;
  r = await f.s.read("nurse", "assignment");
  assert.equal(r.canEdit, false);
  await assert.rejects(f.s.read("stranger", "assignment"), status(404));
  await assert.rejects(
    f.s.save("nurse", "assignment", { version: 0, notes }),
    status(403),
  );
  f.exists = false;
  await assert.rejects(f.s.read("nurse", "assignment"), status(404));
});
test("contract save trims values, detects concurrent edits and replays identical previous submission", async () => {
  const f = fixture();
  let r = await f.s.save("employer", "assignment", { version: 0, notes });
  assert.equal(r.preparation.version, 1);
  assert.equal(r.preparation.notes.reason, "Staff cover");
  assert.equal(r.missingInformation.length, 0);
  assert.ok(f.calls.some((c) => c.args.includes("CONTRACT_PREPARATION_SAVED")));
  r = await f.s.save("employer", "assignment", { version: 0, notes });
  assert.equal(r.preparation.version, 1);
  assert.equal(
    f.calls.filter((c) => c.sql.startsWith("INSERT INTO contract_preparation"))
      .length,
    1,
  );
  await assert.rejects(
    f.s.save("employer", "assignment", {
      version: 0,
      notes: { ...notes, reason: "Changed" },
    }),
    (e) =>
      status(409)(e) &&
      (e as any).getResponse().code === "CONTRACT_PREPARATION_CHANGED",
  );
  f.active = false;
  await assert.rejects(
    f.s.save("employer", "assignment", { version: 1, notes }),
    status(403),
  );
  f.active = true;
  f.assignmentStatus = "CANCELLED";
  await assert.rejects(
    f.s.save("employer", "assignment", { version: 1, notes }),
    status(403),
  );
});
