import snapshot from "./muted-demo-missions.json";

// Exact import receipt, never a title/date heuristic: new missions remain enabled.
export const mutedDemoMissionIds: readonly string[] = Object.freeze(snapshot.missionIds);
const muted = new Set(mutedDemoMissionIds);
export function demoNoticeSuppressed(missionId: unknown, kind: string): boolean {
  return typeof missionId === "string" && muted.has(missionId) &&
    ["MATCH", "REMINDER", "MISSION_PUBLISHED", "START_REMINDER_24H", "START_REMINDER_2H"].includes(kind);
}
