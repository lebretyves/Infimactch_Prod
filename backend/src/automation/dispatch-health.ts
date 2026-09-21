/** Four-hour periodic dispatch, with one hour allowed for scheduling delay. */
export const DISPATCH_HEALTH_MAX_AGE_MS = 5 * 60 * 60 * 1000;

export function dispatchHealth(checkedAt: unknown, now = Date.now()): 'ready' | 'unknown' {
  if (!(checkedAt instanceof Date) && typeof checkedAt !== 'string') return 'unknown';
  const timestamp = checkedAt instanceof Date ? checkedAt.getTime() : Date.parse(checkedAt);
  const age = now - timestamp;
  return Number.isFinite(age) && age >= 0 && age <= DISPATCH_HEALTH_MAX_AGE_MS ? 'ready' : 'unknown';
}
