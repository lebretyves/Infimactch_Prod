import { createHash } from "node:crypto";
import { Transform } from "node:stream";
import { createGunzip } from "node:zlib";
import { createReadStream } from "node:fs";
const { chain } = require("stream-chain");
const { parser } = require("stream-json");
const { pick } = require("stream-json/filters/pick.js");
const { streamValues } = require("stream-json/streamers/stream-values.js");
import { Database } from "../database/database";
export const FINESS_PATTERN = /^(?:[0-9]{2}|2[AB])[0-9]{7}$/;
function str(v: unknown, max = 500): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}
function pair(x: unknown, y: unknown) {
  if (typeof x !== "string" || typeof y !== "string" || !x.trim() || !y.trim())
    return null;
  const lon = Number(x),
    lat = Number(y);
  return Number.isFinite(lon) &&
    Number.isFinite(lat) &&
    Math.abs(lon) <= 180 &&
    Math.abs(lat) <= 90
    ? { longitude: lon, latitude: lat }
    : null;
}
export function finessCoordinates(c: any) {
  if (!c) return null;
  const direction = pair(c.directionLongitude, c.directionLatitude);
  const xy = pair(c.coordonneeX, c.coordonneeY);
  if (
    direction &&
    xy &&
    (Math.abs(direction.longitude - xy.longitude) > 0.000001 ||
      Math.abs(direction.latitude - xy.latitude) > 0.000001)
  )
    return null;
  if (direction)
    return { ...direction, coordinate_source: "SOURCE_DIRECTION_DEGREES" };
  if (xy) return { ...xy, coordinate_source: "SOURCE_XY_DEGREES" };
  return null;
}
export function normalizeFiness(source: any) {
  if (
    !source ||
    !Array.isArray(source.pmej) ||
    !Number.isFinite(Date.parse(source.generatedAt))
  )
    throw new Error("Invalid official FINESS snapshot");
  const rows: any[] = [];
  const seen = new Set<string>();
  for (const pm of source.pmej) {
    if (pm.ege !== undefined && !Array.isArray(pm.ege))
      throw new Error("Invalid EGE collection");
    for (const e of pm.ege ?? []) {
      const info = e.informationsGeneralesEGE;
      const id = info?.numFinessEge;
      if (typeof id !== "string" || !FINESS_PATTERN.test(id) || seen.has(id))
        throw new Error("Invalid or duplicate FINESS identifier");
      seen.add(id);
      const addresses = Array.isArray(e.adresse) ? e.adresse : [];
      const a =
        addresses.find((a: any) =>
          finessCoordinates(a.coordonneesGeographique),
        ) ??
        addresses[0] ??
        {};
      const coords = finessCoordinates(a.coordonneesGeographique);
      rows.push({
        finess: id,
        legal_finess: str(pm.informationsGeneralesPMEJ?.numFinessPm, 9),
        name: str(info.nomEgeLong) ?? str(info.nomEgeCourt) ?? id,
        status: str(e.etatObjet, 20) ?? "UNKNOWN",
        address: str(a.ligneQuatre),
        postal_code: str(a.codePostal, 10),
        city: str(a.ligneAcheminement),
        category: str(e.categorieentiteGeographiqueExercice, 30),
        longitude: coords?.longitude ?? null,
        latitude: coords?.latitude ?? null,
        coordinate_source: coords?.coordinate_source ?? null,
      });
    }
  }
  if (!rows.length)
    throw new Error("Empty FINESS snapshot cannot replace reference data");
  return rows;
}
export async function importFiness(
  db: Database,
  path: string,
  sourceUrl: string,
) {
  const url = new URL(sourceUrl);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "static.data.gouv.fr" ||
    !url.pathname.includes("/finess-structures-1/")
  )
    throw new Error("Official FINESS resource URL required");
  const hash = createHash("sha256");
  const hashing = new Transform({
    transform(chunk, encoding, callback) {
      hash.update(chunk);
      callback(null, chunk);
    },
  });
  const rows: any[] = [];
  let generatedAt: string | undefined;
  const stream = chain([
    createReadStream(path),
    hashing,
    createGunzip(),
    parser(),
    pick({ filter: /^(generatedAt|pmej\.\d+)$/ }),
    streamValues(),
  ]);
  try {
    for await (const item of stream) {
      if (typeof item.value === "string") generatedAt = item.value;
      else {
        if (
          !item.value ||
          typeof item.value !== "object" ||
          (item.value.ege !== undefined && !Array.isArray(item.value.ege))
        )
          throw new Error("Invalid EGE collection");
        if (item.value.ege?.length)
          for (const row of normalizeFiness({
            generatedAt: "2000-01-01T00:00:00Z",
            pmej: [item.value],
          }))
            rows.push(row);
      }
    }
  } finally {
    stream.destroy();
  }
  if (
    !generatedAt ||
    !Number.isFinite(Date.parse(generatedAt)) ||
    !rows.length ||
    new Set(rows.map((r) => r.finess)).size !== rows.length
  )
    throw new Error(
      "Invalid FINESS snapshot metadata or duplicate identifiers",
    );
  const source = { generatedAt };
  const sha256 = hash.digest("hex");
  const summary = {
    rows: rows.length,
    active: rows.filter((r) => r.status === "A").length,
    withCoordinates: rows.filter((r) => r.longitude !== null).length,
    withoutCoordinates: rows.filter((r) => r.longitude === null).length,
    generatedAt: source.generatedAt,
    sourceUrl,
    sha256,
  };
  await db.transaction(async (em) => {
    await em.query("SELECT pg_advisory_xact_lock(1789380300)");
    const current = await em.query(
      "SELECT generated_at FROM finess_snapshot WHERE id=1",
    );
    if (
      current[0] &&
      new Date(current[0].generated_at).getTime() >
        Date.parse(source.generatedAt)
    )
      throw new Error("Older FINESS snapshot refused");
    await em.query("DELETE FROM finess_establishment");
    for (let i = 0; i < rows.length; i += 500)
      await em.query(
        `INSERT INTO finess_establishment SELECT * FROM jsonb_to_recordset($1::jsonb) AS r(finess text,legal_finess text,name text,status text,address text,postal_code text,city text,category text,longitude double precision,latitude double precision,coordinate_source text)`,
        [JSON.stringify(rows.slice(i, i + 500))],
      );
    await em.query(
      "INSERT INTO finess_snapshot(id,generated_at,source_url,sha256,summary) VALUES(1,$1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET generated_at=EXCLUDED.generated_at,source_url=EXCLUDED.source_url,sha256=EXCLUDED.sha256,summary=EXCLUDED.summary,imported_at=now()",
      [source.generatedAt, sourceUrl, sha256, JSON.stringify(summary)],
    );
  });
  return summary;
}
