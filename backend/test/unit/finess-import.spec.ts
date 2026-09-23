import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Readable } from "node:stream";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { importFiness } from "../../src/reference-data/finess";
import { FinessController } from "../../src/reference-data/finess.module";
const sourceUrl =
  "https://static.data.gouv.fr/resources/finess-structures-1/snapshot.json.gz";
function snapshot() {
  return {
    generatedAt: "2026-01-01T00:00:00Z",
    pmej: [
      {
        ege: [
          {
            informationsGeneralesEGE: {
              numFinessEge: "750000001",
              nomEgeLong: "Hospital",
            },
            etatObjet: "A",
            adresse: [
              {
                ligneQuatre: "Paris",
                coordonneesGeographique: {
                  directionLongitude: "2",
                  directionLatitude: "48",
                },
              },
            ],
          },
          {
            informationsGeneralesEGE: { numFinessEge: "750000002" },
            etatObjet: "F",
          },
        ],
      },
    ],
  };
}
function fixture(t: any, data: any, current?: string) {
  const compressed = gzipSync(JSON.stringify(data));
  t.mock.method(
    fs,
    "createReadStream",
    () => Readable.from([compressed]) as any,
  );
  const calls: any[] = [];
  const db: any = {
    query: async (sql: string, args: any[] = []) => {
      calls.push({ sql, args });
      return sql.startsWith("SELECT generated_at") && current
        ? [{ generated_at: current }]
        : [];
    },
  };
  db.transaction = async (fn: any) => fn(db);
  return { db, calls, compressed };
}
test("official FINESS import streams compressed data, computes provenance and preserves unknown coordinates", async (t) => {
  const f = fixture(t, snapshot());
  const result = await importFiness(f.db, "unit.gz", sourceUrl);
  assert.deepEqual(result, {
    rows: 2,
    active: 1,
    withCoordinates: 1,
    withoutCoordinates: 1,
    generatedAt: "2026-01-01T00:00:00Z",
    sourceUrl,
    sha256: createHash("sha256").update(f.compressed).digest("hex"),
  });
  const rows = JSON.parse(
    f.calls.find((c) => c.sql.startsWith("INSERT INTO finess_establishment"))
      .args[0],
  );
  assert.equal(rows[0].latitude, 48);
  assert.equal(rows[1].latitude, null);
  assert.equal(rows[1].name, "750000002");
  assert.ok(
    f.calls.some((c) => c.sql.startsWith("INSERT INTO finess_snapshot")),
  );
});
test("FINESS import refuses untrusted source URLs without reading any file", async () => {
  for (const url of [
    "http://static.data.gouv.fr/finess-structures-1/x",
    "https://evil.invalid/finess-structures-1/x",
    "https://static.data.gouv.fr/unrelated/x",
  ])
    await assert.rejects(
      importFiness({} as any, "unused", url),
      /Official FINESS resource URL required/,
    );
});
test("FINESS import refuses older snapshots before replacing reference data", async (t) => {
  const f = fixture(t, snapshot(), "2027-01-01");
  await assert.rejects(
    importFiness(f.db, "unit.gz", sourceUrl),
    /Older FINESS snapshot refused/,
  );
  assert.equal(
    f.calls.some((c) => c.sql.startsWith("DELETE")),
    false,
  );
});
for (const kind of ["empty", "duplicate", "invalid-date", "invalid-collection"])
  test(
    "FINESS import rejects " + kind + " snapshot before database writes",
    async (t) => {
      const data: any = snapshot();
      if (kind === "empty") data.pmej = [];
      if (kind === "duplicate") data.pmej.push(data.pmej[0]);
      if (kind === "invalid-date") data.generatedAt = "invalid";
      if (kind === "invalid-collection") data.pmej[0].ege = {};
      const f = fixture(t, data);
      await assert.rejects(importFiness(f.db, "unit.gz", sourceUrl), /Invalid/);
      assert.equal(f.calls.length, 0);
    },
  );
test("FINESS searches and lookups provide provenance without granting organisation membership", async () => {
  let rows: any[] = [];
  const calls: any[] = [];
  const c = new FinessController({
    query: async (sql: string, args: any[]) => {
      calls.push(args);
      return rows;
    },
  } as any);
  await assert.rejects(
    c.search({ limit: 10, offset: 0 }),
    (e) => (e as any).getStatus() === 503,
  );
  await assert.rejects(
    c.lookup("invalid"),
    (e) => (e as any).getStatus() === 400,
  );
  await assert.rejects(
    c.lookup("750000001"),
    (e) => (e as any).getStatus() === 503,
  );
  rows = [
    { items: [{ finess: "750000001" }], total: 1, generated_at: "2026-01-01" },
  ];
  let r: any = await c.search({ q: "Hospital", limit: 10, offset: 20 });
  assert.equal(r.grantsOrganizationAccess, false);
  assert.deepEqual(calls.at(-1), ["Hospital", 10, 20]);
  rows = [{ establishment: null }];
  r = await c.lookup("750000001");
  assert.equal(r.status, "NOT_IN_SNAPSHOT");
  rows = [{ establishment: { finess: "750000001" } }];
  r = await c.lookup("750000001");
  assert.equal(r.status, "FOUND_IN_SNAPSHOT");
  assert.equal(r.grantsOrganizationAccess, false);
});
