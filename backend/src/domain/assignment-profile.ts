import {normalizeAvailability, subtractPeriods, type Availability} from './availability';
import {overlaps, type Interval} from './matching';

/** Confirmed assignments remain the source of truth even with incomplete declarations.
 * Only newly withdrawn availability or newly declared unavailability can worsen an
 * existing commitment. Unchanged legacy gaps must not block unrelated profile edits.
 */
export function worsensCommittedAvailability(period: Interval, previous: Availability, next: Availability): boolean {
  const before = normalizeAvailability(previous), after = normalizeAvailability(next);
  return [
    ...subtractPeriods(before.available, after.available),
    ...subtractPeriods(after.unavailable, before.unavailable),
  ].some(change => overlaps(period, change));
}
