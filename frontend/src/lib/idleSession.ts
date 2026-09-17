export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
export const IDLE_WARNING_MS = 60 * 1000;
export function idlePhase(expiresAt:number, now:number):"active"|"warning"|"expired" {
 return now>=expiresAt?"expired":expiresAt-now<=IDLE_WARNING_MS?"warning":"active";
}
