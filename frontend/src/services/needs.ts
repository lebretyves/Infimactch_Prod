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
  missions?: NeedMission[];
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
export type StaffingNeedInput = {
  establishmentId: string;
  title: string;
  description: string;
  details: NeedDetails;
};
export const staffingNeeds = (offset: number, signal?: AbortSignal) =>
  api<StaffingNeed[]>("/staffing-requests?limit=20&offset=" + offset, {
    signal,
  });
export const staffingNeed = (id: string, signal?: AbortSignal) =>
  api<StaffingNeed>("/staffing-requests/" + encodeURIComponent(id), { signal });
export const saveStaffingNeed = (
  input: StaffingNeedInput,
  key: string,
  id?: string,
) =>
  api<StaffingNeed>(
    id ? "/staffing-requests/" + encodeURIComponent(id) : "/staffing-requests",
    { method: id ? "PUT" : "POST", body: input, key },
  );
