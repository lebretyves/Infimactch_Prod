import { api } from "./api";
export type NeedDetails = {
  qualification: "IDE" | "IADE" | "IBODE";
  service: string;
  start: string;
  end: string;
  shift: "DAY" | "NIGHT" | "MIXED" | "UNKNOWN";
  schedulePrecision?: "DATE" | "EXACT";
  timezone?: string;
  headcount: number;
  population: "ADULT" | "PEDIATRIC" | "MIXED";
  block: "NONE" | "GENERAL" | "SPECIALIZED";
  specialty?: string;
  requiredSkills: string[];
  minExperienceMonths: number;
  address: string;
};
export type NeedMission = {id:string;title:string;status:string;start_at:string;end_at:string;application_count:number};
export type StaffingNeed = {
  missions: NeedMission[];
  id: string;
  establishment_id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at?: string;
  details: NeedDetails | null;
  establishment_name?: string;
  establishment_address?: string;
};

function validateRecord(value: unknown): asserts value is StaffingNeed {
  const record = value as Partial<StaffingNeed> | null;
  if (!record || typeof record.id !== "string" || typeof record.title !== "string" ||
      typeof record.establishment_id !== "string" || !Array.isArray(record.missions) ||
      record.missions.some(mission => !mission || typeof mission.id !== "string")) {
    throw new Error("Les données de cette ancienne annonce sont incomplètes. Réessayez.");
  }
}
export async function staffingNeeds(offset: number, signal?: AbortSignal) {
  const rows = await api<unknown>("/staffing-requests?limit=20&offset=" + offset, { signal });
  if (!Array.isArray(rows)) throw new Error("La liste des anciennes annonces est indisponible. Réessayez.");
  rows.forEach(validateRecord);
  return rows as StaffingNeed[];
}
export async function staffingNeed(id: string, signal?: AbortSignal) {
  const record = await api<unknown>("/staffing-requests/" + encodeURIComponent(id), { signal });
  validateRecord(record);
  if (record.id !== id) throw new Error("Cette ancienne annonce ne correspond pas au lien demandé.");
  return record;
}
