import { displayMatch } from '../domain/matching-display';
import { Database } from '../database/database';
import { covers, distanceKm, match, overlaps, Professional } from '../domain/matching';
import { matchingMission } from '../missions/missions.service';
import { professional } from '../profiles/profiles.module';
import { partialOfferMatch } from '../public-data/partial-matching';
import { publicationDate } from './recommendations';
import { SearchDto } from './search';

export type ListingOrder = {
  id: string;
  publicationDate: string | null;
  distanceKm: number | null;
  availabilityCompatible: boolean | null;
  matching_score: number | null;
  matching_indicative_score?: number | null;
  relevance: number[];
  startsAt: number | null;
};
function point(latitude: unknown, longitude: unknown) {
  return typeof latitude === 'number' && typeof longitude === 'number' && Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
    ? {latitude, longitude} : null;
}
export function listingOrder(data: any, profile: Professional, search: SearchDto, now: number): ListingOrder {
  const external = data.kind === 'EXTERNAL_OFFER';
  const location = external ? data.provenance?.facts?.location?.coordinates : data;
  const target = point(location?.latitude, location?.longitude);
  const origin = point(search.latitude ?? profile.latitude, search.longitude ?? profile.longitude);
  const distance = origin && target ? distanceKm(origin.latitude, origin.longitude, target.latitude, target.longitude) : null;
  const published = publicationDate(external ? data.provenance?.publishedAt : data.publicationDate ?? data.created_at, now);
  let availability: boolean | null = null, score: number | null = null, indicativeScore: number | null = null, relevance: number[];
  if (external) {
    const result = partialOfferMatch(data, profile, new Date(now).toISOString());
    const positives = Object.values(result.criteria).filter(c => c.status === 'MATCH' || c.status === 'INDICATIVE_MATCH').length;
    // External data supports partial correspondence only, never a verified percentage.
    relevance = [result.knownMismatches.length ? 2 : 1, result.knownMismatches.length + result.indicativeMismatches.length, -positives, 0];
  } else {
    const mission = matchingMission(data);
    availability = covers(mission, profile.available, profile.unavailable) && !profile.conflicts.some(i => overlaps(mission, i));
    const result = displayMatch(profile, mission, data.matchingDistanceKm !== undefined ? data.matchingDistanceKm : (profile.latitude !== null && profile.longitude !== null && target ? distanceKm(profile.latitude,profile.longitude,target.latitude,target.longitude) : null));
    score = result.score;
    indicativeScore = result.indicativeScore;
    relevance = [0, -(score ?? indicativeScore ?? 0), result.eligible ? 0 : 1, result.reasons.length];
  }
  return {
    id: data.id, publicationDate: published, distanceKm: distance,
    availabilityCompatible: availability, matching_score: score, matching_indicative_score: indicativeScore, relevance,
    startsAt: !external && Number.isFinite(Date.parse(data.start_at)) ? Date.parse(data.start_at) : null,
  };
}
export function compareListingOrder(a: ListingOrder, b: ListingOrder, sort: SearchDto['sort']) {
  if (sort === 'relevance') {
    for (let i = 0; i < a.relevance.length; i++) { const delta = a.relevance[i]! - b.relevance[i]!; if (delta) return delta; }
  }
  if (sort === 'distance') { const delta = (a.distanceKm ?? Number.MAX_VALUE) - (b.distanceKm ?? Number.MAX_VALUE); if (delta) return delta; }
  if (sort === 'start') { const delta = (a.startsAt ?? Number.MAX_VALUE) - (b.startsAt ?? Number.MAX_VALUE); if (delta) return delta; }
  return (b.publicationDate ? Date.parse(b.publicationDate) : 0) - (a.publicationDate ? Date.parse(a.publicationDate) : 0) || a.id.localeCompare(b.id, 'en');
}

/** Scan compact records, rank the whole catalogue, and hydrate only the requested page.
 * Keyset batches and one repeatable snapshot avoid an arbitrary result cap and inconsistent totals.
 */
export async function rankedListingPage(db: Database, sourceSql: string, sourceParameters: unknown[], search: SearchDto, profileRow: any) {
  return db.transaction(async em => {
    await em.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    const conflicts = await em.query("SELECT start_at,end_at FROM assignment WHERE nurse_id=$1 AND status='ACTIVE'", [profileRow.user_id]);
    const profile = professional(profileRow, conflicts), now = Date.now();
    const parameters = [...sourceParameters];
    const bind = (v: unknown) => { parameters.push(v); return '$' + parameters.length; };
    const q = search.q?.trim();
    const textFilter = q ? "strpos(lower(concat_ws(' ',data->>'title',data->>'service',data->>'location_label',data->>'address')),lower(" + bind(q) + "::text))>0" : 'true';
    const fields = ['id','kind','title','qualification','service','status','start_at','end_at','timezone','created_at','publicationDate','required_skills','desired_skills','min_experience_months','population','block','specialty','shift','schedule_precision','latitude','longitude'];
    const profilePoint = point(profile.latitude, profile.longitude);
    const matchDistance = profilePoint
      ? "CASE WHEN data->>'kind'='INTERNAL_MISSION' THEN ST_Distance(ST_SetSRID(ST_MakePoint((data->>'longitude')::double precision,(data->>'latitude')::double precision),4326)::geography,ST_SetSRID(ST_MakePoint(" + bind(profilePoint.longitude) + "," + bind(profilePoint.latitude) + "),4326)::geography)/1000 ELSE NULL END"
      : 'NULL';
    const compact = 'jsonb_build_object(' + fields.map(k => "'"+k+"',data->'"+k+"'").join(',') + ",'matchingDistanceKm'," + matchDistance + ",'provenance',jsonb_build_object('publishedAt',data#>'{provenance,publishedAt}','facts',data#>'{provenance,facts}'))";
    const offset = search.offset ?? 0, limit = search.limit ?? 20, keep = offset + limit;
    let cursor = '', total = 0;
    const top: ListingOrder[] = [];
    for (;;) {
      const batch = await em.query('SELECT listing_id,' + compact + ' AS data FROM (' + sourceSql + ') available WHERE ' + textFilter + ' AND listing_id>$' + (parameters.length + 1) + ' ORDER BY listing_id LIMIT 500', [...parameters, cursor]);
      if (!batch.length) break;
      for (const row of batch) {
        const metric = listingOrder(row.data, profile, search, now);
        if (search.availableOnly && metric.availabilityCompatible !== true) continue;
        if (search.publishedWithinDays && (!metric.publicationDate || Date.parse(metric.publicationDate) < now - search.publishedWithinDays * 86400000)) continue;
        total++; top.push(metric);
      }
      top.sort((a,b) => compareListingOrder(a,b,search.sort));
      if (top.length > keep) top.length = keep;
      cursor = batch[batch.length - 1].listing_id;
      if (batch.length < 500) break;
    }
    const selected = top.slice(offset, offset + limit);
    if (!selected.length) return {total, items: []};
    const rows = await em.query('SELECT data FROM (' + sourceSql + ') available WHERE listing_id=ANY($' + (sourceParameters.length + 1) + '::text[])', [...sourceParameters, selected.map(x => x.id)]);
    const byId = new Map(rows.map(row => [row.data.id, row.data]));
    return {total, items: selected.map(({relevance,startsAt,...metric}) => ({...byId.get(metric.id), ...metric}))};
  });
}
