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
  mode: 'MIXED'; generatedAt: string;
  internal: { status: 'READY' | 'UNAVAILABLE'; rppsStatus: string | null; items: Recommendation[] };
  external: { status: 'READY' | 'UNAVAILABLE'; personalization: 'PARTIAL' | 'GENERAL_PROFILE_INCOMPLETE'; items: Recommendation[]; sources: { provider: string; status: string; created_at: string | null }[] };
};
export const getRecommendations = (signal: AbortSignal) => api<Recommendations>('/me/recommendations', { signal });
