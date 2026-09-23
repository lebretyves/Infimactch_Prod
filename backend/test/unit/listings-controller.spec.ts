import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { ListingsController } from "../../src/listings/listings.module";
import * as ranking from "../../src/listings/listing-order";
const actor = "11111111-1111-4111-8111-111111111111",
  id = "22222222-2222-4222-8222-222222222222";
const req = (family = "NURSE") =>
  ({ session: { userId: actor, family } }) as any;
const profile = {
  qualifications: ["IDE"],
  skills: [],
  experience: [],
  available: [],
  unavailable: [],
  rpps_status: "NOT_CHECKED",
  details: {},
  accepted_shifts: [],
  preferred_shifts: [],
};
const status = (n: number) => (e: any) => e.getStatus?.() === n;
function fixture(answer: (sql: string, args: any[]) => any) {
  const calls: { sql: string; args: any[] }[] = [];
  const db: any = {
    query: async (sql: string, args: any[] = []) => {
      calls.push({ sql, args });
      return answer(sql, args);
    },
  };
  db.transaction = async (fn: any) => fn(db);
  return { controller: new ListingsController(db), calls };
}
test("catalogue search rejects missing profiles and undeclared qualifications before ranking", async (t) => {
  let rankings = 0;
  t.mock.method(ranking, "rankedListingPage", async () => {
    rankings++;
    return { items: [], total: 0 };
  });
  await assert.rejects(
    fixture(() => []).controller.search(req(), { qualifications: [] } as any),
    status(404),
  );
  await assert.rejects(
    fixture(() => [profile]).controller.search(req(), {
      qualifications: ["IBODE"],
    } as any),
    status(400),
  );
  assert.equal(rankings, 0);
});
test("catalogue filters bind coordinates and preserve uncertainty instead of inventing eligibility", async (t) => {
  const captured: any[] = [];
  t.mock.method(ranking, "rankedListingPage", async (...args: any[]) => {
    captured.push(args);
    return {
      items: [
        {
          id: "e_" + id,
          kind: "EXTERNAL_OFFER",
          title: "IDE",
          provenance: {},
          source: "FRANCE_TRAVAIL",
        },
      ],
      total: 1,
    };
  });
  const f = fixture(() => [profile]);
  const result = await f.controller.search(req(), {
    qualifications: ["IDE"],
    latitude: 48,
    longitude: 2,
    radiusKm: 10,
    start: "2030-01-01T00:00:00Z",
    end: "2030-01-01T08:00:00Z",
    ideServices: ["MEDICINE"],
  } as any);
  assert.equal(result.total, 1);
  assert.equal(result.limit, 20);
  assert.equal(result.offset, 0);
  assert.equal(result.unknownExternalFieldsExcluded, true);
  assert.deepEqual(result.externalDistance, {
    basis: "PROVIDER_COORDINATES_OR_COMMUNE_CENTRE",
    approximate: true,
    unknownCoordinatesExcluded: true,
  });
  assert.ok(captured[0][2].includes(10000));
  assert.ok(captured[0][2].includes(48));
  assert.match(captured[0][1], /WHERE false/);
  assert.equal(result.items[0].requestedFiltersVerified, false);
  assert.equal(result.items[0].correspondence.eligibilityVerified, false);
  assert.ok(result.items[0].unverifiedSearchFilters.includes("ideServices"));
  const browse = fixture(() => [{ ...profile, qualifications: [] }]);
  const all = await browse.controller.search(req(), {
    qualifications: [],
    origine: "externes",
    includeUncertainExternal: true,
  } as any);
  assert.match(captured[1][1], /e.qualification IS NULL/);
  assert.equal(all.externalDistance, null);
  assert.equal(all.unknownExternalFieldsExcluded, false);
  await f.controller.search(req(), {
    qualifications: ["IDE"],
    origine: "partenaires",
  } as any);
  assert.match(captured[2][1], /AND false/);
});
test("public listing details validate identifiers and return organisation labels without private comparison", async () => {
  const missing = fixture(() => []);
  for (const bad of ["../secret", "e_bad", "x_" + id])
    await assert.rejects(missing.controller.detail(bad), status(404));
  assert.equal(missing.calls.length, 0);
  for (const kind of ["m_", "e_"])
    await assert.rejects(missing.controller.detail(kind + id), status(404));
  const f = fixture((sql) =>
    sql.includes("FROM organization")
      ? [
          { id: "agency", name: "Agency" },
          { id: "facility", name: "Hospital" },
        ]
      : [
          {
            id,
            agency_id: "agency",
            establishment_id: "facility",
            title: "IDE",
          },
        ],
  );
  const internal = await f.controller.detail("m_" + id);
  assert.equal(internal.id, "m_" + id);
  assert.equal(internal.agency_name, "Agency");
  assert.equal(internal.establishment_name, "Hospital");
  assert.equal("profileCorrespondence" in internal, false);
  const external = await f.controller.detail("e_" + id);
  assert.equal(external.correspondence.eligibilityVerified, false);
});
test("private external comparison requires both an active offer and an authenticated profile", async () => {
  await assert.rejects(
    fixture(() => []).controller.compareExternal(req(), "m_" + id),
    status(404),
  );
  await assert.rejects(
    fixture(() => []).controller.compareExternal(req(), "e_" + id),
    status(404),
  );
  await assert.rejects(
    fixture((sql) =>
      sql.includes("FROM profile") ? [profile] : [],
    ).controller.compareExternal(req(), "e_" + id),
    status(404),
  );
  const f = fixture((sql) =>
    sql.includes("FROM profile")
      ? [profile]
      : [{ title: "IDE", provenance: {} }],
  );
  const result = await f.controller.compareExternal(req(), "e_" + id);
  assert.equal(result.id, "e_" + id);
  assert.ok(result.profileCorrespondence);
  assert.deepEqual(f.calls[0]!.args, [actor]);
  assert.deepEqual(f.calls[1]!.args, [id]);
  assert.match(f.calls[1]!.sql, /AND e\.active/);
  assert.match(f.calls[1]!.sql, /AND s\.visible/);
});
test("catalogue pagination and facilities retain bounds and absent facilities return 404", async () => {
  const f = fixture((sql) =>
    sql.includes("WITH")
      ? [{ total: 1, items: [{ id, title: "IDE", provenance: {} }] }]
      : [{ id, name: "Hospital" }],
  );
  const result = await f.controller.external({ limit: 5, offset: 10 } as any);
  assert.equal(result.total, 1);
  assert.equal(result.items[0].id, "e_" + id);
  assert.equal(result.items[0].correspondence.eligibilityVerified, false);
  await f.controller.facilities({ limit: 5, offset: 10 });
  assert.deepEqual(f.calls.at(-1)!.args, [5, 10]);
  const facility = await f.controller.facility(id, { limit: 5, offset: 10 });
  assert.equal(facility.id, id);
  assert.deepEqual(f.calls.at(-1)!.args, [id, 5, 10]);
  await assert.rejects(
    fixture(() => []).controller.facility(id, { limit: 5, offset: 0 }),
    status(404),
  );
});
test("favorite writes require an existing target and remain scoped to the account", async () => {
  const f = fixture((sql) =>
    sql.includes("FROM profile")
      ? [profile]
      : sql.startsWith("SELECT")
        ? [{ id }]
        : [],
  );
  for (const kind of ["MISSION", "EXTERNAL", "ESTABLISHMENT"])
    assert.deepEqual(
      await f.controller.favorite(req(), { kind, targetId: id }),
      { ok: true },
    );
  for (const call of f.calls.filter((c) => c.sql.startsWith("INSERT")))
    assert.deepEqual(call.args.slice(0, 1), [actor]);
  await assert.rejects(
    f.controller.favorite(req(), { kind: "INVALID", targetId: id }),
    status(404),
  );
  const missing = fixture((sql) =>
    sql.includes("FROM profile") ? [profile] : [],
  );
  await assert.rejects(
    missing.controller.favorite(req(), { kind: "MISSION", targetId: id }),
    status(404),
  );
  assert.equal(
    missing.calls.some((c) => c.sql.startsWith("INSERT")),
    false,
  );
  assert.deepEqual(await f.controller.remove(req(), "MISSION", id), {
    ok: true,
  });
  assert.deepEqual(f.calls.at(-1)!.args, [actor, "MISSION", id]);
  for (const method of ["favorites", "history", "notifications"] as const) {
    await f.controller[method](req(), { limit: 7, offset: 14 });
    assert.deepEqual(f.calls.at(-1)!.args, [actor, 7, 14]);
  }
});
test("notification read never acknowledges a foreign or nonexistent item", async () => {
  await assert.rejects(
    fixture(() => []).controller.read(req(), id),
    status(404),
  );
  const f = fixture(() => [{ id }]);
  assert.deepEqual(await f.controller.read(req(), id), { ok: true });
  assert.deepEqual(f.calls[0]!.args, [id, actor]);
  assert.match(f.calls[0]!.sql, /COALESCE\(read_at,now\(\)\)/);
});
test("dashboard separates nurse data from organization aggregates and fills missing states with zero", async () => {
  const f = fixture((sql) =>
    sql.startsWith("SELECT m.status")
      ? [{ status: "OPEN", count: "3" }]
      : sql.includes("FROM profile")
        ? [profile]
        : [{ favorites: 2, needs: 1 }],
  );
  const nurse = await f.controller.dashboard(req());
  assert.equal(nurse.family, "NURSE");
  assert.deepEqual((nurse as any).profile, profile);
  const company = await f.controller.dashboard(req("ENTERPRISE"));
  assert.deepEqual(company.counts, {
    DRAFT: 0,
    OPEN: 3,
    FILLED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  });
  for (const call of f.calls) assert.deepEqual(call.args, [actor]);
});
