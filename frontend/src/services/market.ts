import type { ParsedOffer } from "./parsed-offer";
import { api } from "./api";
export type Listing = {
  publicationDate?: string | null;
  distanceKm?: number | null;
  availabilityCompatible?: boolean | null;
  parsedOffer?: ParsedOffer | null;
  id: string;
  kind?: "INTERNAL_MISSION" | "EXTERNAL_OFFER";
  matching_score?: number | null;
  matching_indicative_score?: number | null;
  match_explanation_id?: string | null;
  title: string;
  description?: string;
  qualification: string;
  start_at?: string;
  timezone?: string;
  end_at?: string;
  hourly_salary?: number | string;
  service?: string;
  shift?: string;
  version?: number;
  status?: string;
  establishment_id?: string;
  location_label?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  population?: string;
  block?: string;
  specialty?: string;
  agency_id?: string;
  agency_name?: string;
  establishment_name?: string;
  can_manage?: boolean;
  schedule_precision?: "EXACT" | "DATE";
  required_skills?: string[];
  min_experience_months?: number;
  source?: string;
  active?: boolean;
  expires_at?: string;
  imported_at?: string;
  provenance?: { publishedAt?: string | null; sourceUpdatedAt?: string | null; provider?: string | null; originalPublisher?: string | null };
  freshness?: { lastSeenAt?: string | null; staleAfterDays?: number; state?: string };
  search_unverified_filters?: string[];
  url?: string;
  salary?: {
    amount?: number;
    currency?: string;
    unit?: string;
    gross?: boolean;
  };
};
export type ListingPage = {
  items: Listing[];
  total: number;
  limit: number;
  offset: number;
  externalCatalogueVisible?: boolean;
};
export type Profile = {
  display_name: string;
  qualifications: string[];
  rpps_status: string;
  skills: string[];
  available: { start: string; end: string }[];
};
export type Application = {
  id: string;
  mission_id: string;
  title: string;
  status: string;
  created_at: string | null;
  updated_at: string;
  requires_reconsent: boolean;
  current_version: number;
  assignment_id?: string;
  assignment_status?: string;
};
export type Favorite = {
  kind: "MISSION" | "EXTERNAL" | "ESTABLISHMENT";
  target_id: string;
  title: string;
  status?: string;
  active?: boolean;
  expires_at?: string;
};
export const profile = (signal?: AbortSignal) =>
  api<Profile>("/profile", { signal });
export const externalListings = (
  offset: number,
  signal?: AbortSignal,
  q?: string,
) => {
  const params = new URLSearchParams({ limit: "20", offset: String(offset) });
  if (q?.trim()) params.set("q", q.trim());
  return api<ListingPage>("/listings/external?" + params, { signal });
};
export const detail = (id: string, signal?: AbortSignal) =>
  api<Listing>("/listings/" + encodeURIComponent(id), { signal });
export function list(
  qualifications: string[],
  offset: number,
  signal?: AbortSignal,
  q?: string,
  filters: SearchFilters = {},
  origine: "toutes" | "partenaires" | "externes" = "toutes",
) {
  return api<ListingPage>("/listings/search", {
    method: "POST",
    body: {
      qualifications,
      origine,
      ...filters,
      limit: 20,
      offset,
      ...(q?.trim() ? { q: q.trim() } : {}),
    },
    signal,
  });
}
export type EnterpriseMissionFilters = { qualification?: string; location?: string; date?: string };
export const enterpriseMissions = (offset: number, signal?: AbortSignal, establishmentId?: string, filters: EnterpriseMissionFilters = {}) => {
  const params = new URLSearchParams({ limit: "20", offset: String(offset) });
  if (establishmentId) params.set("establishmentId", establishmentId);
  for (const key of ["qualification", "location", "date"] as const) {
    const value = filters[key]?.trim(); if (value) params.set(key, value);
  }
  return api<Listing[]>("/missions?" + params, { signal });
};
export type EnterpriseMissionSearchFilters = EnterpriseMissionFilters & { q?: string; status?: string; shift?: string; sort?: string };
export const enterpriseMissionSearch = (offset: number, signal?: AbortSignal, establishmentId?: string, filters: EnterpriseMissionSearchFilters = {}) => {
  const params = new URLSearchParams({ limit: "20", offset: String(offset) });
  if (establishmentId) params.set("establishmentId", establishmentId);
  for (const key of ["qualification", "location", "date", "q", "status", "shift", "sort"] as const) {
    const value = filters[key]?.trim(); if (value) params.set(key, value);
  }
  return api<ListingPage>("/enterprise/missions?" + params, { signal });
};
export type ManagedEstablishment = {
  agencies?: {id:string;name:string}[];
  id: string; name: string; address: string; finess: string | null;
  counts: Record<"DRAFT" | "OPEN" | "FILLED" | "COMPLETED" | "CANCELLED", number>;
  total: number;
};
export const managedEstablishments = (offset: number, q: string, signal?: AbortSignal) => {
  const params = new URLSearchParams({ limit: "20", offset: String(offset) });
  if (q.trim()) params.set("q", q.trim());
  return api<{ items: ManagedEstablishment[]; total: number; limit: number; offset: number }>("/me/establishments?" + params, { signal });
};
export const applications = (offset: number, signal?: AbortSignal) =>
  api<Application[]>("/me/applications?limit=20&offset=" + offset, { signal });
export async function favorites(signal?: AbortSignal) {
  const result: Favorite[] = [];
  for (let offset = 0; ; offset += 50) {
    const page = await api<Favorite[]>(
      "/me/favorites?limit=50&offset=" + offset,
      { signal },
    );
    result.push(...page);
    if (page.length < 50) return result;
  }
}
export const favorite = (m: Listing, remove: boolean) =>
  api(
    remove
      ? "/me/favorites/" +
          (m.id.startsWith("e_") ? "EXTERNAL" : "MISSION") +
          "/" +
          m.id.slice(2)
      : "/me/favorites",
    {
      method: remove ? "DELETE" : "POST",
      ...(!remove
        ? {
            body: {
              kind: m.id.startsWith("e_") ? "EXTERNAL" : "MISSION",
              targetId: m.id.slice(2),
            },
          }
        : {}),
    },
  );
export type ApplicationCheck = {
  warnings: string[];
  blockingReasons: string[];
  missingSkills: string[];
  experienceMonths: number;
  requiredExperienceMonths: number;
  distanceKm: number | null;
};
export const applicationCheck = (id: string, signal?: AbortSignal) =>
  api<ApplicationCheck>("/missions/" + id.slice(2) + "/application-check", {
    signal,
  });
export const apply = (m: Listing, key: string) =>
  api<{ warnings?: string[] }>("/missions/" + m.id.slice(2) + "/applications", {
    method: "POST",
    body: { version: m.version },
    key,
  });
export const withdraw = (id: string, key: string) =>
  api("/applications/" + id + "/withdrawal", { method: "POST", key });
export function safeUrl(value?: string) {
  try {
    const u = new URL(value || "");
    return ["https:", "http:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
}
export function date(value?: string | null, timeZone = "Europe/Paris") {
  if (!value || !Number.isFinite(Date.parse(value))) return "Non précisée";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
export function missionDate(m: Pick<Listing, 'start_at' | 'end_at' | 'timezone' | 'schedule_precision'>, end = false) {
  const value = end ? m.end_at : m.start_at;
  if (m.schedule_precision !== 'DATE') return date(value, m.timezone);
  if (!value || !Number.isFinite(Date.parse(value))) return 'Non précisée';
  return new Intl.DateTimeFormat('fr-FR', {timeZone:m.timezone || 'Europe/Paris', dateStyle:'medium'}).format(new Date(Date.parse(value) - (end ? 1 : 0)));
}
export function salary(m: Listing) {
  if (m.id.startsWith("e_")) return "Rémunération : voir l’annonce source";
  return m.hourly_salary == null
    ? "Rémunération non précisée"
    : Number(m.hourly_salary).toLocaleString("fr-FR") + " € brut / heure";
}
export const statusLabels: Record<string, string> = {
  ACCEPTED: "Affectée",
  ACTIVE: "Confirmée",
  SUBMITTED: "En attente",
  SELECTED: "En attente de décision",
  REJECTED: "Refusée",
  WITHDRAWN: "Retirée",
  UNAVAILABLE: "Indisponible : autre mission confirmée",
  ASSIGNED: "Affectée",
  OPEN: "Ouverte",
  FILLED: "Pourvue",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
  DRAFT: "Brouillon",
};

export type SearchFilters = {
  sort?: "recent" | "relevance" | "distance" | "start";
  publishedWithinDays?: 1 | 7 | 30;
  availableOnly?: boolean;
  ideServices?: string[];
  iadePopulation?: string[];
  iadeBlocks?: string[];
  iadeSpecialties?: string[];
  ibodePopulation?: string[];
  ibodeBlocks?: string[];
  ibodeSpecialties?: string[];
  shifts?: string[];
  establishmentId?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  start?: string;
  end?: string;
};
export type Facility = {
  id: string;
  name: string;
  address: string;
  finess: string;
};
export async function allFacilities(signal?: AbortSignal) {
  const result: Facility[] = [];
  for (let offset = 0; ; offset += 50) {
    const page = await api<Facility[]>(
      "/facilities?limit=50&offset=" + offset,
      { signal },
    );
    result.push(...page);
    if (page.length < 50) return result;
  }
}
export async function allApplications(signal?: AbortSignal) {
  const result: Application[] = [];
  for (let offset = 0; ; offset += 20) {
    const page = await applications(offset, signal);
    result.push(...page);
    if (page.length < 20) return result;
  }
}
export type Match = {
  missionId: string;
  eligible: boolean;
  score: number | null;
  distanceKm?: number;
  explanationId: string | null;
  reasons: string[];
};
export type MatchPage = {
  items: Match[];
  total: number;
  limit: number;
  offset: number;
  rppsStatus: string;
};
export const matches = (offset: number, signal?: AbortSignal) =>
  api<MatchPage>("/me/matches?limit=20&offset=" + offset, { signal });
export const removeFavorite = (kind: Favorite["kind"], id: string) =>
  api("/me/favorites/" + kind + "/" + id, { method: "DELETE" });
export const facilityFavorite = (id: string, remove: boolean) =>
  remove
    ? removeFavorite("ESTABLISHMENT", id)
    : api("/me/favorites", {
        method: "POST",
        body: { kind: "ESTABLISHMENT", targetId: id },
      });
export const sourceLabel = (m: Listing) =>
  m.source === "FRANCE_TRAVAIL"
    ? "France Travail"
    : m.source === "JOBSPIPE" ? "JobsPipe" : m.source || "Site de l’annonceur";
export const externalExpired = (m: Listing) =>
  m.active === false ||
  !!(m.expires_at && Date.parse(m.expires_at) <= Date.now());
