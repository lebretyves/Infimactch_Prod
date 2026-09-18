import { api } from "./api";
export type CandidateMatching = {
  eligible: boolean;
  score: number | null;
  indicativeScore?: number | null;
  components: { C: number; Z: number; D: number; E: number } | null;
  reasons: string[];
  distanceKm: number | null;
  experienceMonths: number;
  requiredExperienceMonths: number;
  qualificationMatches: boolean;
  rppsStatus: string;
  missingRequiredSkills: string[];
  desiredSkillsMatched: string[];
  desiredSkills: string[];
  radiusKm: number | null;
};
export type EnterpriseApplication = {
  id: string; status: string; updated_at: string; display_name: string; qualifications: string[]; city: string | null;
  mission: {
    id: string; title: string; qualification: string; service: string;
    start_at: string; end_at: string; timezone: string; schedule_precision: "DATE" | "EXACT";
    address: string; establishment_name: string; min_experience_months: number;
  };
  matching: CandidateMatching | null;
};
export const enterpriseApplications = (offset: number, q: string, signal?: AbortSignal) => {
  const params = new URLSearchParams({ limit: "20", offset: String(offset) });
  if (q.trim()) params.set("q", q.trim());
  return api<{ total: number; items: EnterpriseApplication[] }>("/enterprise/applications?" + params, { signal });
};
