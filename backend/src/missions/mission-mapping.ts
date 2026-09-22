import type { MatchMission } from "../domain/matching";

export function matchingMission(m: any): MatchMission {
  return {
    start: new Date(m.start_at).toISOString(),
    end: new Date(m.end_at).toISOString(),
    status: m.status,
    qualification: m.qualification,
    service: m.service,
    population: m.population,
    block: m.block,
    specialty: m.specialty,
    requiredSkills: m.required_skills,
    desiredSkills: m.desired_skills,
    minExperienceMonths: Number(m.min_experience_months),
    latitude: m.latitude,
    longitude: m.longitude,
    shift: m.shift,
    schedulePrecision: m.schedule_precision,
  };
}
