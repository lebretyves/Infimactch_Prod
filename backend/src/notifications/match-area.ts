import type { SqlClient } from '../database/database';
import { geodesicKm } from '../database/distance';

/** Recheck the saved area when a queued alert is about to leave the application. */
export async function matchAreaStillValid(em: SqlClient, actor: string, missionId: string) {
  const [profile] = await em.query(
    'SELECT latitude,longitude,radius_km FROM profile WHERE user_id=$1 AND notifications_enabled AND visible', [actor]);
  if (!profile || profile.latitude === null || profile.longitude === null ||
      !Number.isFinite(profile.radius_km) || profile.radius_km <= 0) return false;
  const [mission] = await em.query(
    'SELECT ST_Y(location::geometry) AS latitude,ST_X(location::geometry) AS longitude FROM mission WHERE id=$1', [missionId]);
  if (!mission) return false;
  const distance = await geodesicKm(em, profile, mission);
  return distance !== null && Number.isFinite(distance) && distance <= profile.radius_km;
}
