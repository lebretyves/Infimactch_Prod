import { api } from "./api";
export type Period = { start: string; end: string };
export type ProfileDetails = {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  mobilityCity?: string;
  diploma?: string;
  diplomaYear?: number;
  ideDiplomaYear?: number;
  iadeDiplomaYear?: number;
  ibodeDiplomaYear?: number;
  referenceName?: string;
  referenceRole?: string;
  referenceEstablishment?: string;
  referenceEmail?: string;
  transport?: string;
};
export type Experience = Period & { service: string; establishment?: string };
export type ProfessionalProfile = {
  display_name: string;
  qualifications: string[];
  skills: string[];
  experience: Experience[];
  available: Period[];
  unavailable: Period[];
  latitude: number | null;
  longitude: number | null;
  radius_km: number | null;
  accepted_shifts: string[];
  preferred_shifts: string[];
  visible: boolean;
  rpps_status: string;
  rpps_number?: string | null;
  details?: ProfileDetails;
};
export const getProfile = (signal?: AbortSignal) =>
  api<ProfessionalProfile>("/profile", { signal });
export function profilePayload(p: ProfessionalProfile) {
  return {
    displayName: p.display_name,
    qualifications: p.qualifications,
    skills: p.skills,
    experience: p.experience,
    available: p.available,
    unavailable: p.unavailable,
    latitude: p.latitude,
    longitude: p.longitude,
    radiusKm: p.radius_km,
    acceptedShifts: p.accepted_shifts,
    preferredShifts: p.preferred_shifts,
    visible: p.visible,
    ...(p.details ? { details: p.details } : {}),
  };
}
export function saveProfile(p: ProfessionalProfile) {
  return api("/profile", { method: "PUT", body: profilePayload(p) });
}

export type AvailabilityState = "available" | "unavailable" | "unset";
export type AvailabilityChange = Period & { state: AvailabilityState };
export function updateAvailability(changes: AvailabilityChange[]) {
  return api<{ available: Period[]; unavailable: Period[] }>(
    "/profile/availability",
    {
      method: "PATCH",
      body: { changes },
    },
  );
}
