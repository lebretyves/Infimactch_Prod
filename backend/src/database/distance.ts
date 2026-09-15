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
