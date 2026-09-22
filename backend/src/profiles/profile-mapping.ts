import type { Professional } from "../domain/matching";

export function professional(p: any, conflicts: any[] = []): Professional {
  return {
    qualifications: p.qualifications,
    practiceServices: p.details?.practiceServices,
    skills: p.skills,
    experience: p.experience,
    available: p.available,
    unavailable: p.unavailable,
    conflicts: conflicts.map((a) => ({
      start: new Date(a.start_at).toISOString(),
      end: new Date(a.end_at).toISOString(),
    })),
    rppsStatus: p.rpps_status,
    latitude: p.latitude,
    longitude: p.longitude,
    radiusKm: p.radius_km,
    acceptedShifts: p.accepted_shifts,
    preferredShifts: p.preferred_shifts,
  };
}
