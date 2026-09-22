import { api } from './api';
import type { Listing } from './market';
export type Recommendation = Listing & {
  publicationDate: string | null;
  importedAt: string | null;
  sourceUpdatedAt: string | null;
  profileCorrespondence?: { knownMismatches?: string[]; indicativeMismatches?: string[]; criteria?: Record<string, { status: string; reason?: string }> };
  provenance?: { salaryRaw?: string | null; contract?: string | null };
};
export type Recommendations = {
  mode: 'MIXED'; generatedAt: string; externalCatalogueVisible: boolean;
  internal: { status: 'READY' | 'UNAVAILABLE' | 'HIDDEN'; personalization?: 'COMPATIBLE' | 'GENERAL_PROFILE_INCOMPLETE'; rppsStatus: string | null; items: Recommendation[] };
  external: { status: 'READY' | 'UNAVAILABLE' | 'HIDDEN'; personalization: 'PARTIAL' | 'GENERAL_PROFILE_INCOMPLETE'; items: Recommendation[]; sources: { provider: string; status: string; created_at: string | null }[] };
};
export const getRecommendations = (signal: AbortSignal, origine: 'toutes' | 'partenaires' | 'externes' = 'toutes') => api<Recommendations>('/me/recommendations?origine=' + origine, { signal });
