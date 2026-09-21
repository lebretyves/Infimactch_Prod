import type { Recommendation, Recommendations } from '../services/recommendations.ts';
export type MissionCrush = { item: Recommendation; external: boolean };
/** The API ranks each source independently. A partial external comparison is not a partner matching score. */
export function missionCrushs(data: Recommendations, origin: 'toutes' | 'partenaires' | 'externes'): MissionCrush[] {
  const partners = origin !== 'externes' && data.internal.status === 'READY'
    ? data.internal.items.map(item => ({ item, external: false })) : [];
  const external = origin !== 'partenaires' && data.external.status !== 'HIDDEN'
    ? data.external.items.map(item => ({ item, external: true })) : [];
  const seen = new Set<string>();
  return [...partners, ...external].filter(({ item }) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  }).slice(0, 3);
}
