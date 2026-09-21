import type { Recommendation, Recommendations } from '../services/recommendations.ts';
export type MissionCrush = { item: Recommendation; external: boolean };
/** The API ranks each source independently. A partial external comparison is not a partner matching score. */
export function missionCrushs(data: Recommendations, origin: 'toutes' | 'partenaires' | 'externes'): MissionCrush[] {
  const partners = origin !== 'externes' && data.internal.status === 'READY'
    ? data.internal.items.map(item => ({ item, external: false })) : [];
  const external = origin !== 'partenaires' && data.external.status !== 'HIDDEN'
    ? data.external.items.map(item => ({ item, external: true })) : [];
  const seen = new Set<string>();
  const available = [...partners, ...external].filter(({ item }) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  if (origin === 'toutes') {
    const partnerCards = available.filter(card => !card.external);
    const externalCards = available.filter(card => card.external);
    if (partnerCards.length && externalCards.length) {
      // Keep each source ranking, while reserving a place for an external offer.
      // External partial correspondence is never compared to a partner percentage.
      return [...partnerCards.slice(0, 2), externalCards[0], ...partnerCards.slice(2), ...externalCards.slice(1)].slice(0, 3);
    }
  }
  return available.slice(0, 3);
}
