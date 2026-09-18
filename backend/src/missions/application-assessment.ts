import {experienceMonths, match, MatchMission, Professional, requiredMissionSkills} from '../domain/matching';
const applicationWarnings = new Set([
  'REQUIRED_SKILLS_MISSING', 'EXPERIENCE_INSUFFICIENT', 'NOT_FULLY_AVAILABLE',
  'SHIFT_NOT_ACCEPTED', 'MOBILITY_INCOMPLETE', 'OUTSIDE_RADIUS', 'SCHEDULE_UNCONFIRMED',
]);
export function assessApplication(p: Professional, m: MatchMission, distance: number | null, now = Date.now()) {
  const result = match(p, m, distance);
  const blockingReasons = result.reasons.filter(reason => !applicationWarnings.has(reason));
  if (new Date(m.schedulePrecision === 'DATE' ? m.end : m.start).getTime() <= now) blockingReasons.push('MISSION_ALREADY_STARTED');
  return {
    warnings: result.reasons.filter(reason => applicationWarnings.has(reason)),
    blockingReasons,
    missingSkills: requiredMissionSkills(m).filter(skill => !p.skills.includes(skill)),
    experienceMonths: experienceMonths(p.experience, m.service, m.start),
    requiredExperienceMonths: m.minExperienceMonths,
    distanceKm: result.distanceKm,
  };
}
