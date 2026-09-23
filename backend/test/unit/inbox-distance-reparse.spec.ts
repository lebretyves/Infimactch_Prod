import { test } from "node:test";
import assert from "node:assert/strict";
import {
  enterpriseApplicationPage,
  missionApplicationPage,
} from "../../src/missions/application-inbox";
import { geodesicKm, geodesicKmBatch } from "../../src/database/distance";
import { reparseOffers } from "../../src/public-data/reparse-offers";
import { parseOffer } from "../../src/public-data/offer-parser";
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
test("candidate inbox escapes literal search characters and returns matching explanations without raw profile data", async () => {
  const start = "2030-01-01T08:00:00Z",
    end = "2030-01-01T16:00:00Z",
    profile = {
      qualifications: ["IDE"],
      skills: ["TRIAGE"],
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
    id: "mission",
    status: "OPEN",
    qualification: "IDE",
    service: "URGENCES",
    start_at: start,
    end_at: end,
    required_skills: ["TRIAGE"],
    desired_skills: ["TRIAGE"],
    min_experience_months: 0,
    population: "ADULT",
    block: "NONE",
    shift: "DAY",
  };
  let populated = true;
  const f = fixture((sql) =>
    sql.startsWith("SELECT count(*)")
      ? [{ total: 1 }]
      : sql.startsWith("SELECT a.*")
        ? populated
          ? [
              {
                id: "application",
                nurse_id: "nurse",
                profile_data: profile,
                mission_data: mission,
                mission_latitude: 48,
                mission_longitude: 2,
                distance_km: "1.5",
                establishment_name: "Hospital",
              },
            ]
          : []
        : [],
  );
  const r = await enterpriseApplicationPage(f.db, "actor", {
    q: "  100%_test ",
    limit: 10,
    offset: 0,
  });
  assert.equal(r.total, 1);
  assert.deepEqual(f.calls[0].args, ["actor", "100\\%\\_test"]);
  assert.equal(r.items[0]!.matching.qualificationMatches, true);
  assert.equal(r.items[0]!.matching.distanceKm, 1.5);
  assert.deepEqual(r.items[0]!.matching.desiredSkillsMatched, ["TRIAGE"]);
  assert.equal(r.items[0]!.mission.establishment_name, "Hospital");
  assert.equal(r.items[0]!.profile_data, undefined);
  assert.equal(
    (await missionApplicationPage(f.db, "mission", { limit: 10, offset: 0 }))
      .length,
    1,
  );
  populated = false;
  assert.deepEqual(
    await missionApplicationPage(f.db, "mission", { limit: 10, offset: 0 }),
    [],
  );
});
test("distance adapter preserves longitude-latitude order, absent coordinates and batch ordering", async () => {
  const a = { latitude: 48, longitude: 2 },
    b = { latitude: 49, longitude: 3 };
  const f = fixture((sql) =>
    sql.includes("jsonb_to_recordset")
      ? [{ distance: "12.5" }, { distance: null }]
      : [{ distance: "10.25" }],
  );
  assert.equal(await geodesicKm(f.db, a, b), 10.25);
  assert.deepEqual(f.calls[0].args, [2, 48, 3, 49]);
  assert.equal(await geodesicKm(f.db, { ...a, latitude: null }, b), null);
  assert.deepEqual(await geodesicKmBatch(f.db, []), []);
  assert.deepEqual(
    await geodesicKmBatch(f.db, [
      [a, b],
      [{ latitude: null, longitude: null }, b],
    ]),
    [12.5, null],
  );
  assert.deepEqual(JSON.parse(f.calls[1].args[0]), [
    { position: 0, a_lat: 48, a_lon: 2, b_lat: 49, b_lon: 3 },
    { position: 1, a_lat: null, a_lon: null, b_lat: 49, b_lon: 3 },
  ]);
});
test("offer reparsing previews stale records and applies only changed parser results", async () => {
  const offer: any = {
    id: "old",
    title: "IDE remplacement",
    description: "Mission de soins infirmiers",
    source: "FRANCE_TRAVAIL",
    source_id: "one",
  };
  const current: any = { ...offer, id: "current" };
  current.parsed_offer = parseOffer(current);
  let batch = 0;
  const f = fixture((sql) =>
    sql.startsWith("SELECT * FROM external_offer")
      ? batch++ % 2 === 0
        ? [offer, current]
        : []
      : [],
  );
  assert.deepEqual(await reparseOffers(f.db, false), {
    scanned: 2,
    changed: 1,
    applied: false,
  });
  assert.equal(
    f.calls.some((c) => c.sql.startsWith("UPDATE")),
    false,
  );
  assert.deepEqual(await reparseOffers(f.db, true), {
    scanned: 2,
    changed: 1,
    applied: true,
  });
  const updates = f.calls.filter((c) => c.sql.startsWith("UPDATE"));
  assert.equal(updates.length, 1);
  assert.equal(updates[0].args[0], "old");
  assert.ok(JSON.parse(updates[0].args[1]).parserVersion);
  assert.ok(f.calls.some((c) => c.sql.startsWith("INSERT INTO import_run")));
});
