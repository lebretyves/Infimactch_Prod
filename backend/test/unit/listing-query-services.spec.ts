import { test } from "node:test";
import assert from "node:assert/strict";
import { rankedListingPage } from "../../src/listings/listing-order";
import { RecommendationsController } from "../../src/listings/recommendations";
const start = new Date(Date.now() + 86400000).toISOString(),
  end = new Date(Date.now() + 115200000).toISOString(),
  published = new Date(Date.now() - 3600000).toISOString();
const profile = {
  user_id: "nurse",
  qualifications: ["IDE"],
  skills: [],
  experience: [],
  available: [{ start, end }],
  unavailable: [],
  rpps_status: "FOUND",
  latitude: 48,
  longitude: 2,
  radius_km: 30,
  accepted_shifts: ["DAY"],
  preferred_shifts: [],
};
const mission = {
  id: "m_a",
  kind: "INTERNAL_MISSION",
  status: "OPEN",
  title: "IDE",
  qualification: "IDE",
  service: "URGENCES",
  start_at: start,
  end_at: end,
  created_at: published,
  publicationDate: published,
  required_skills: [],
  desired_skills: [],
  min_experience_months: 0,
  population: "ADULT",
  block: "NONE",
  specialty: null,
  shift: "DAY",
  schedule_precision: "EXACT",
  latitude: 48,
  longitude: 2,
};
function fixture(answer: (sql: string, args: any[]) => any) {
  const calls: any[] = [];
  const db: any = {
    query: async (sql: string, args: any[] = []) => {
      calls.push({ sql, args });
      return answer(sql, args);
    },
  };
  db.transaction = async (fn: any) => fn(db);
  return { db, calls };
}
test("ranked catalogue uses one cursor, ranks every batch and hydrates only the selected page", async () => {
  let batch = 0;
  const items = [
    { ...mission, id: "m_c" },
    { ...mission, id: "m_a" },
    { ...mission, id: "m_b" },
  ];
  const f = fixture((sql, args) =>
    sql.startsWith("FETCH")
      ? batch++ === 0
        ? items.map((data) => ({ data }))
        : []
      : sql.startsWith("SELECT data")
        ? items
            .filter((m) => args.at(-1).includes(m.id))
            .reverse()
            .map((data) => ({ data }))
        : [],
  );
  const r = await rankedListingPage(
    f.db,
    "SELECT input",
    [],
    { q: " IDE' -- ", limit: 1, offset: 1, sort: "relevance" } as any,
    profile,
  );
  assert.equal(r.total, 3);
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0]!.id, "m_b");
  const cursor = f.calls.find((c) => c.sql.startsWith("DECLARE"));
  assert.ok(!cursor.sql.includes("IDE'"));
  assert.ok(cursor.args.includes("IDE' --"));
  assert.deepEqual(f.calls.find((c) => c.sql.startsWith("SELECT data")).args, [
    ["m_b"],
  ]);
  assert.ok(f.calls.some((c) => c.sql === "CLOSE ranked_listings"));
});
test("catalogue filters unknown availability and old publications without reporting inflated totals", async () => {
  const rows = [
    { ...mission, id: "current" },
    { ...mission, id: "old", publicationDate: "2000-01-01T00:00:00Z" },
    {
      id: "external",
      kind: "EXTERNAL_OFFER",
      title: "IDE",
      source: "FRANCE_TRAVAIL",
      provenance: { publishedAt: published },
    },
  ];
  const f = fixture((sql) =>
    sql.startsWith("FETCH") ? rows.map((data) => ({ data })) : [],
  );
  const r = await rankedListingPage(
    f.db,
    "SELECT input",
    [],
    {
      availableOnly: true,
      publishedWithinDays: 7,
      limit: 10,
      offset: 5,
    } as any,
    profile,
  );
  assert.equal(r.total, 1);
  assert.deepEqual(r.items, []);
  assert.equal(
    f.calls.some((c) => c.sql.startsWith("SELECT data")),
    false,
  );
});
test("catalogue closes its cursor when a batch fails", async () => {
  const f = fixture((sql) => {
    if (sql.startsWith("FETCH")) throw new Error("fetch failed");
    return [];
  });
  await assert.rejects(
    rankedListingPage(f.db, "SELECT input", [], {} as any, {
      ...profile,
      latitude: null,
      longitude: null,
    }),
    /fetch failed/,
  );
  assert.equal(f.calls.at(-1).sql, "CLOSE ranked_listings");
});
test("recommendations use matching for complete profiles and omit changed mission versions", async () => {
  const f = fixture((sql) =>
    sql.includes("FROM profile")
      ? [profile]
      : sql.includes("FROM mission")
        ? [
            { id: "a", version: 1, hourly_salary: "25" },
            { id: "changed", version: 2 },
          ]
        : [],
  );
  let matched = 0;
  const c = new RecommendationsController(f.db, {
    forNurse: async (actor: string, page: any, ranking: string) => {
      matched++;
      assert.equal(actor, "nurse");
      assert.deepEqual(page, { limit: 3, offset: 0 });
      assert.equal(ranking, "recent");
      return {
        rppsStatus: "FOUND",
        items: [
          {
            missionId: "a",
            missionVersion: 1,
            score: 80,
            explanationId: "history",
            publishedAt: published,
          },
          { missionId: "changed", missionVersion: 1 },
          { missionId: "missing", missionVersion: 1 },
        ],
      };
    },
  } as any);
  const r: any = await c.recommendations(
    { session: { userId: "nurse" } } as any,
    { origine: "partenaires" },
  );
  assert.equal(matched, 1);
  assert.equal(r.external.status, "HIDDEN");
  assert.equal(r.internal.items.length, 1);
  assert.equal(r.internal.items[0].matching_score, 80);
  assert.equal(r.internal.items[0].salary.amount, 25);
});
test("incomplete profiles receive general listings while external recommendations remain explicitly partial", async () => {
  let batch = 0;
  const f = fixture((sql) =>
    sql.includes("FROM profile")
      ? [{ ...profile, qualifications: [], rpps_status: "NOT_CHECKED" }]
      : sql.includes("FROM mission")
        ? [{ id: "a", hourly_salary: "25", created_at: published }]
        : sql.includes("FROM external_offer")
          ? batch++ === 0
            ? [1, 2, 3, 4].map((i) => ({
                id: String(i),
                source: "FRANCE_TRAVAIL",
                title: "IDE",
                provenance: { publishedAt: published },
                raw_hash: "private",
              }))
            : []
          : sql.includes("FROM source_control")
            ? [{ provider: "FRANCE_TRAVAIL" }]
          : sql.includes("FROM import_run")
            ? [{ provider: "FRANCE_TRAVAIL", status: "SUCCESS" }]
            : [],
  );
  const c = new RecommendationsController(f.db, {} as any);
  const r: any = await c.recommendations(
    { session: { userId: "nurse" } } as any,
    {},
  );
  assert.equal(r.internal.personalization, "GENERAL_PROFILE_INCOMPLETE");
  assert.equal(r.internal.items[0].id, "m_a");
  assert.equal(r.external.items.length, 3);
  assert.equal(r.external.personalization, "GENERAL_PROFILE_INCOMPLETE");
  assert.equal(r.external.items[0].correspondence.eligibilityVerified, false);
  assert.equal(r.external.items[0].raw_hash, undefined);
});
test("recommendation provider failures remain isolated and missing profiles are hidden", async () => {
  await assert.rejects(
    new RecommendationsController(
      fixture(() => []).db,
      {} as any,
    ).recommendations({ session: { userId: "nurse" } } as any, {}),
    (e) => (e as any).getStatus() === 404,
  );
  const f = fixture((sql) => {
    if (sql.includes("FROM profile")) return [profile];
    throw new Error("provider unavailable");
  });
  const c = new RecommendationsController(f.db, {
    forNurse: async () => {
      throw new Error("history unavailable");
    },
  } as any);
  let r: any = await c.recommendations(
    { session: { userId: "nurse" } } as any,
    {},
  );
  assert.equal(r.internal.status, "UNAVAILABLE");
  assert.equal(r.external.status, "UNAVAILABLE");
  r = await c.recommendations({ session: { userId: "nurse" } } as any, {
    origine: "externes",
  });
  assert.equal(r.internal.status, "HIDDEN");
});


test("source visibility outage leaves internal recommendations available", async () => {
  const f = fixture(sql => {
    if (sql.includes("FROM profile")) return [{ ...profile, qualifications: [] }];
    if (sql.includes("FROM source_control")) throw new Error("visibility unavailable");
    if (sql.includes("FROM mission")) return [{ id: "internal", hourly_salary: 25 }];
    throw new Error("unexpected external query");
  });
  const result = await new RecommendationsController(f.db, {} as any).recommendations({session:{userId:"nurse"}} as any, {});
  assert.equal(result.internal.status, "READY");
  assert.equal(result.external.status, "UNAVAILABLE");
  assert.equal(result.externalCatalogueVisible, false);
  assert.equal(f.calls.filter(c => c.sql.includes("FROM source_control")).length, 1);
});

test("hidden catalogues never query external offers or import metadata", async () => {
  const f = fixture(sql => {
    if (sql.includes("FROM profile")) return [profile];
    if (sql.includes("FROM source_control")) return [];
    throw new Error("hidden sources must not be queried");
  });
  const result = await new RecommendationsController(f.db, {} as any).recommendations({session:{userId:"nurse"}} as any, {origine:"externes"});
  assert.equal(result.internal.status, "HIDDEN");
  assert.equal(result.external.status, "HIDDEN");
  assert.equal(result.externalCatalogueVisible, false);
});
