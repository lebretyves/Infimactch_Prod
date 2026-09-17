import { test } from "node:test";
import assert from "node:assert/strict";
import {
  enrichFranceTravailLocations,
  franceCoordinates,
  offerLocationCoordinates,
} from "../../src/public-data/offer-geolocation";
import { enrichJobsPipeLocations } from "../../src/public-data/jobspipe-geolocation";
import { normalizeJobsPipe } from "../../src/public-data/jobspipe";
import { importOffers, normalizeOffer } from "../../src/public-data/offers";
const ft = {
  id: "GEO_FIXTURE",
  intitule: "Infirmier IDE",
  description: "Mission temporaire",
  typeContrat: "MIS",
  lieuTravail: { commune: "75115", libelle: "Paris 15e" },
};
const centre = {
  code: "75115",
  nom: "Paris 15e Arrondissement",
  centre: { type: "Point", coordinates: [2.2937, 48.8417] },
};
const response = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200 });
test("provider decimal numbers/strings are accepted without coercing blanks, booleans or wrong-country points", () => {
  for (const [lat, lon] of [
    [48.8, 2.3],
    [" 48.8 ", "2.3"],
    ["48,8", "2,3"],
  ])
    assert.deepEqual(franceCoordinates(lat, lon), {
      latitude: 48.8,
      longitude: 2.3,
    });
  for (const [lat, lon] of [
    [null, null],
    ["", 2],
    [true, 2],
    ["0x30", 2],
    ["48.8junk", 2],
    [999, 2],
    [0, 0],
    [40.7, -74],
    [2.3, 48.8],
  ])
    assert.equal(franceCoordinates(lat, lon), null);
  assert.ok(franceCoordinates(-20.88, 55.45));
  assert.ok(franceCoordinates(16.2, -61.5));
  assert.ok(franceCoordinates(41.9, 8.7));
  assert.deepEqual(
    normalizeOffer({
      ...ft,
      lieuTravail: { ...ft.lieuTravail, latitude: "48.8", longitude: "2.3" },
    }).provenance.facts.location.coordinates,
    { latitude: 48.8, longitude: 2.3 },
  );
});
test("official commune fallback is cached, shared per batch, precise about centre and does not change raw hash", async () => {
  let calls = 0;
  const cache = new Map();
  const transport = (async (input: any) => {
    calls++;
    const url = new URL(String(input));
    assert.equal(url.hostname, "geo.api.gouv.fr");
    assert.equal(url.pathname, "/communes/75115");
    assert.equal(url.searchParams.has("nom"), false);
    return response(centre);
  }) as typeof fetch;
  const rows = await enrichFranceTravailLocations(
    [ft, { ...ft, id: "SECOND" }],
    { transport, cache },
  );
  assert.equal(calls, 1);
  const normalized = normalizeOffer(rows[0]);
  assert.equal(normalized.rawHash, normalizeOffer(ft).rawHash);
  assert.equal(
    normalized.provenance.facts.location.precision,
    "COMMUNE_CENTRE",
  );
  assert.equal(
    normalized.provenance.facts.location.coordinateSource,
    "GEO_API_GOUV",
  );
  assert.deepEqual(normalized.provenance.facts.location.coordinates, {
    latitude: 48.8417,
    longitude: 2.2937,
  });
  await enrichFranceTravailLocations([ft], { transport, cache });
  assert.equal(calls, 1);
  assert.equal(offerLocationCoordinates(ft).coordinates, null);
});
test("known source coordinates avoid network and provider JSON cannot spoof trusted geocoding", async () => {
  const known = {
    ...ft,
    lieuTravail: { ...ft.lieuTravail, latitude: "48.8", longitude: "2.3" },
  };
  const rows = await enrichFranceTravailLocations(
    [known, { ...ft, lieuTravail: { commune: "75015?secret=1" } }],
    {
      transport: (async () => {
        throw Error("UNEXPECTED_NETWORK");
      }) as typeof fetch,
    },
  );
  assert.equal(rows[0], known);
  assert.equal(
    offerLocationCoordinates({
      ...ft,
      coordinateSource: "GEO_API_GOUV",
      coordinates: { latitude: 48, longitude: 2 },
    }).coordinates,
    null,
  );
});
test("mismatched commune, invalid response, 429 and timeout remain unknown with bounded requests", async () => {
  for (const body of [
    { ...centre, code: "92001" },
    { ...centre, centre: { type: "Point", coordinates: [0, 0] } },
    [],
  ]) {
    const rows = await enrichFranceTravailLocations([ft], {
      cache: new Map(),
      transport: (async () => response(body)) as typeof fetch,
    });
    assert.equal(offerLocationCoordinates(rows[0]).coordinates, null);
  }
  let calls = 0;
  const rows = Array.from({ length: 10 }, (_, i) => ({
    ...ft,
    lieuTravail: { commune: String(75001 + i) },
  }));
  await enrichFranceTravailLocations(rows, {
    cache: new Map(),
    maxRequests: 2,
    transport: (async () => {
      calls++;
      return new Response(null, { status: 429 });
    }) as typeof fetch,
  });
  assert.ok(calls <= 2);
  const timed = await enrichFranceTravailLocations([ft], {
    cache: new Map(),
    requestTimeoutMs: 5,
    transport: ((_: any, init: any) =>
      new Promise((_, reject) =>
        init.signal.addEventListener("abort", () => reject(Error("aborted"))),
      )) as typeof fetch,
  });
  assert.equal(offerLocationCoordinates(timed[0]).coordinates, null);
});
test("reimport updates existing provenance even when provider raw hash is unchanged", async () => {
  const rows = await enrichFranceTravailLocations([ft], {
    cache: new Map(),
    transport: (async () => response(centre)) as typeof fetch,
  });
  let saved: any;
  const db: any = {
    transaction: async (work: any) =>
      work({
        query: async (sql: string, args: any[]) => {
          if (sql.startsWith("INSERT INTO external_offer")) {
            assert.match(sql, /provenance=EXCLUDED.provenance/);
            saved = JSON.parse(args[8]);
          }
          return [];
        },
      }),
  };
  await importOffers(db, rows, false);
  assert.equal(saved.facts.location.precision, "COMMUNE_CENTRE");
});
const jp = {
  id: "fixture:jp",
  country_code: "FR",
  job_title: "Infirmier IDE",
  description: "Mission en interim",
  final_url: "https://example.invalid/offres/fixture",
  location: "Saint-Étienne",
  postal_code: "42000",
};
const stEtienne = {
  code: "42218",
  nom: "Saint-Étienne",
  codesPostaux: ["42000"],
  centre: { type: "Point", coordinates: [4.39, 45.44] },
};
test("JobsPipe exact unique official postal/town match transfers into normalized facts", async () => {
  let calls = 0;
  const rows = await enrichJobsPipeLocations([jp], {
    cache: new Map(),
    transport: (async (input: any) => {
      calls++;
      const url = new URL(String(input));
      assert.equal(url.searchParams.get("codePostal"), "42000");
      assert.equal(url.searchParams.has("nom"), false);
      return response([stEtienne]);
    }) as typeof fetch,
  });
  const value = normalizeJobsPipe(rows[0]);
  assert.equal(calls, 1);
  assert.equal(value.provenance.facts.location.precision, "COMMUNE_CENTRE");
  assert.deepEqual(value.provenance.facts.location.coordinates, {
    latitude: 45.44,
    longitude: 4.39,
  });
  assert.equal(value.rawHash, normalizeJobsPipe(jp).rawHash);
});
test("JobsPipe ambiguous postal/town results and broader labels remain unknown", async () => {
  for (const body of [
    [stEtienne, stEtienne],
    [{ ...stEtienne, nom: "Autre ville" }],
    [{ ...stEtienne, codesPostaux: ["42100"] }],
  ]) {
    const rows = await enrichJobsPipeLocations([jp], {
      cache: new Map(),
      transport: (async () => response(body)) as typeof fetch,
    });
    assert.equal(
      normalizeJobsPipe(rows[0]).provenance.facts.location.coordinates,
      null,
    );
  }
  const rows = await enrichJobsPipeLocations(
    [{ ...jp, latitude: "45.44", longitude: "4.39" }],
    {
      transport: (async () => {
        throw Error("UNEXPECTED_NETWORK");
      }) as typeof fetch,
    },
  );
  assert.equal(
    normalizeJobsPipe(rows[0]).provenance.facts.location.precision,
    "PROVIDER_COORDINATES_UNVERIFIED",
  );
});

test("JobsPipe without postal code resolves only an exact unique official town", async()=>{
 const raw={...jp,postal_code:undefined,location:"Saint-Étienne, France",normalized_city:"Saint-Étienne"};
 for(const [body,known] of [[[stEtienne],true],[[stEtienne,{...stEtienne,code:"99999"}],false]] as const){
  const rows=await enrichJobsPipeLocations([raw],{cache:new Map(),transport:(async(input:any)=>{
   const url=new URL(String(input));assert.equal(url.searchParams.get("nom"),"Saint-Étienne");assert.equal(url.searchParams.get("limit"),"100");return response(body);
  }) as typeof fetch});
  assert.equal(Boolean(normalizeJobsPipe(rows[0]).provenance.facts.location.coordinates),known);
 }
});
