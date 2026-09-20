import { SqlClient } from "./database";
type Point = { latitude: number | null; longitude: number | null };
export async function geodesicKm(
  db: SqlClient,
  a: Point,
  b: Point,
): Promise<number | null> {
  if (
    a.latitude === null ||
    a.longitude === null ||
    b.latitude === null ||
    b.longitude === null
  )
    return null;
  const [r] = await db.query(
    "SELECT ST_Distance(ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,ST_SetSRID(ST_MakePoint($3,$4),4326)::geography)/1000 AS distance",
    [a.longitude, a.latitude, b.longitude, b.latitude],
  );
  return r.distance === null ? null : Number(r.distance);
}

/** Same PostGIS geography calculation as geodesicKm, in input order. */
export async function geodesicKmBatch(
  db: SqlClient,
  pairs: ReadonlyArray<readonly [Point, Point]>,
): Promise<Array<number | null>> {
  if (!pairs.length) return [];
  const rows = await db.query(
    `SELECT CASE WHEN a_lat IS NULL OR a_lon IS NULL OR b_lat IS NULL OR b_lon IS NULL
      THEN NULL ELSE ST_Distance(
        ST_SetSRID(ST_MakePoint(a_lon,a_lat),4326)::geography,
        ST_SetSRID(ST_MakePoint(b_lon,b_lat),4326)::geography)/1000 END AS distance
     FROM jsonb_to_recordset($1::jsonb)
       AS points(position integer,a_lat double precision,a_lon double precision,b_lat double precision,b_lon double precision)
     ORDER BY position`,
    [JSON.stringify(pairs.map(([a,b], position) => ({position,
      a_lat:a.latitude,a_lon:a.longitude,b_lat:b.latitude,b_lon:b.longitude})))],
  );
  return rows.map((r: {distance: number | string | null}) => r.distance === null ? null : Number(r.distance));
}
