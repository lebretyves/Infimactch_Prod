import { MATCH_RULES } from "./rules";
import { DateTime } from "luxon";
export type Qualification = "IDE" | "IADE" | "IBODE";
export type Interval = { start: string; end: string };
export type Experience = Interval & { service: string };
export interface Professional {
  practiceServices?: Partial<Record<Qualification, string[]>>;
  qualifications: Qualification[];
  skills: string[];
  experience: Experience[];
  available: Interval[];
  unavailable: Interval[];
  conflicts: Interval[];
  rppsStatus: "FOUND" | "NOT_FOUND" | "PENDING" | "NOT_CHECKED";
  latitude: number | null;
  longitude: number | null;
  radiusKm: number | null;
  acceptedShifts: string[];
  preferredShifts: string[];
}
export interface MatchMission extends Interval {
  status: string;
  qualification: Qualification;
  service: string;
  requiredSkills: string[];
  desiredSkills: string[];
  minExperienceMonths: number;
  population: "ADULT" | "PEDIATRIC" | "MIXED";
  block: "NONE" | "GENERAL" | "SPECIALIZED";
  specialty: string | null;
  shift: string;
  schedulePrecision?: "EXACT" | "DATE";
  latitude: number | null;
  longitude: number | null;
}
export function instant(value: string): number {
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(value)) throw new Error("TIMEZONE_REQUIRED");
  const parsed = DateTime.fromISO(value, { setZone: true });
  const n = parsed.toMillis();
  if (!parsed.isValid || !Number.isFinite(n)) throw new Error("INVALID_DATE");
  return n;
}
export function interval(i: Interval): [number, number] {
  const a = instant(i.start),
    b = instant(i.end);
  if (a >= b) throw new Error("INVALID_INTERVAL");
  return [a, b];
}
export function union(items: Interval[]): [number, number][] {
  const sorted = items.map(interval).sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const current of sorted) {
    const last = out[out.length - 1];
    if (last && current[0] <= last[1]) last[1] = Math.max(last[1], current[1]);
    else out.push([...current]);
  }
  return out;
}
export function overlaps(a: Interval, b: Interval): boolean {
  const [s, e] = interval(a),
    [x, y] = interval(b);
  return s < y && x < e;
}
export function covers(
  target: Interval,
  available: Interval[],
  unavailable: Interval[],
): boolean {
  const [s, e] = interval(target);
  return (
    union(available).some(([a, b]) => a <= s && b >= e) &&
    !unavailable.some((i) => overlaps(target, i))
  );
}
export function experienceMonths(
  items: Experience[],
  service: string,
  until: string,
): number {
  const end = instant(until);
  const eligible = items
    .filter((i) => i.service === service && instant(i.start) < end)
    .map((i) => ({
      ...i,
      end: new Date(Math.min(instant(i.end), end)).toISOString(),
    }));
  return (
    union(eligible).reduce((n, [a, b]) => n + b - a, 0) /
    ((86400000 * 365.25) / 12)
  );
}
export function distanceKm(a: number, b: number, c: number, d: number): number {
  const r = Math.PI / 180,
    h =
      Math.sin(((c - a) * r) / 2) ** 2 +
      Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function requiredMissionSkills(m: MatchMission): string[] {
  const required = [...m.requiredSkills];
  if (m.qualification !== "IDE") {
    if (m.population === "ADULT" || m.population === "MIXED")
      required.push("POPULATION_ADULT");
    if (m.population === "PEDIATRIC" || m.population === "MIXED")
      required.push("POPULATION_PEDIATRIC");
    if (m.block === "SPECIALIZED") required.push("BLOCK_" + m.specialty);
  }
  return [...new Set(required)];
}
export function match(
  p: Professional,
  m: MatchMission,
  computedDistance?: number | null,
) {
  const reasons: string[] = [];
  if (m.status !== "OPEN") reasons.push("MISSION_NOT_OPEN");
  if (!p.qualifications.includes(m.qualification))
    reasons.push("QUALIFICATION_MISSING");
  if (p.rppsStatus !== "FOUND") reasons.push("RPPS_" + p.rppsStatus);
  const preferredServices = p.practiceServices?.[m.qualification];
  if (preferredServices?.length && !preferredServices.includes(m.service))
    reasons.push("SERVICE_NOT_PREFERRED");
  const required = requiredMissionSkills(m);
  if (required.some((s) => !p.skills.includes(s)))
    reasons.push("REQUIRED_SKILLS_MISSING");
  const months = experienceMonths(p.experience, m.service, m.start);
  if (months < m.minExperienceMonths) reasons.push("EXPERIENCE_INSUFFICIENT");
  // Date bounds locate a request in the calendar; they are not a full-day shift.
  const datesOnly = m.schedulePrecision === "DATE";
  if (datesOnly || m.shift === "UNKNOWN") reasons.push("SCHEDULE_UNCONFIRMED");
  if (!datesOnly) {
    if (!covers(m, p.available, p.unavailable))
      reasons.push("NOT_FULLY_AVAILABLE");
    if (p.conflicts.some((i) => overlaps(m, i)))
      reasons.push("ASSIGNMENT_CONFLICT");
  }
  if (m.shift !== "UNKNOWN" && !p.acceptedShifts.includes(m.shift))
    reasons.push("SHIFT_NOT_ACCEPTED");
  let distance: number | null = null;
  if (
    p.latitude === null ||
    p.longitude === null ||
    m.latitude === null ||
    m.longitude === null ||
    p.radiusKm === null ||
    p.radiusKm <= 0
  )
    reasons.push("MOBILITY_INCOMPLETE");
  else {
    distance =
      computedDistance === undefined
        ? distanceKm(p.latitude, p.longitude, m.latitude, m.longitude)
        : computedDistance;
    if (distance === null || !Number.isFinite(distance))
      reasons.push("MOBILITY_INCOMPLETE");
    else if (distance > p.radiusKm) reasons.push("OUTSIDE_RADIUS");
  }
  if (reasons.length)
    return {
      eligible: false,
      score: null,
      components: null,
      reasons,
      distanceKm: distance,
    };
  const {score, components} = scoreDetails(p, m, distance);
  return {
    eligible: true,
    score,
    components,
    reasons,
    distanceKm: distance,
  };
}

// Informational fit calculation; this never grants matching eligibility.
export function scoreDetails(p: Professional, m: MatchMission, distance: number | null) {
  const months = experienceMonths(p.experience, m.service, m.start);
  const C = m.desiredSkills.length
    ? m.desiredSkills.filter((s) => p.skills.includes(s)).length /
      m.desiredSkills.length
    : 1;
  const Z = distance !== null && Number.isFinite(distance) && p.radiusKm !== null && p.radiusKm > 0 ? Math.max(0, 1 - distance / p.radiusKm) : 0;
  const D = m.schedulePrecision === "DATE" || m.shift === "UNKNOWN" ? 0 :
    p.preferredShifts.length === 0 || p.preferredShifts.includes(m.shift)
      ? 1
      : 0.5;
  const E = Math.min(months / 24, 1);
  return {
    score:
      Math.round(
        100 *
          (MATCH_RULES.weights.C * C +
            MATCH_RULES.weights.Z * Z +
            MATCH_RULES.weights.D * D +
            MATCH_RULES.weights.E * E) *
          100,
      ) / 100,
    components: { C, Z, D, E },
  };
}
