import { MATCH_RULES } from "../domain/rules";
import { match, MatchMission, Professional } from '../domain/matching';

// Confirmation of a voluntary application is distinct from matching eligibility.
const assignmentWarnings = new Set([
  'SERVICE_NOT_PREFERRED', 'REQUIRED_SKILLS_MISSING', 'EXPERIENCE_INSUFFICIENT',
  'NOT_FULLY_AVAILABLE', 'SHIFT_NOT_ACCEPTED', 'MOBILITY_INCOMPLETE', 'OUTSIDE_RADIUS',
]);

export function assessAssignment(p: Professional, m: MatchMission, distance: number | null) {
  const result = match(p, m, distance);
  const blockingReasons = result.reasons.filter(reason => !assignmentWarnings.has(reason));
  return {
    ...result,
    eligible: blockingReasons.length === 0,
    blockingReasons,
    warnings: [...result.reasons.filter(reason => assignmentWarnings.has(reason)),
      ...(!MATCH_RULES.rppsRequired && p.rppsStatus !== "FOUND" ? ["RPPS_OPTIONAL_DEMO"] : [])],
  };
}
