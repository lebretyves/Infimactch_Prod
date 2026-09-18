import {match, scoreDetails, Professional, MatchMission} from './matching';

// Keep automatic eligibility and its strict score intact; expose a separate fit
// estimate for manual review when declared profile data is incomplete.
export function displayMatch(p: Professional, m: MatchMission, distance: number | null) {
  const result = match(p,m,distance);
  return {...result, indicativeScore:result.score ?? scoreDetails(p,m,result.distanceKm).score};
}
