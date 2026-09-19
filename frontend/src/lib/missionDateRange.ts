import { nextDate, zonedDateTimeInput, zonedDateTimeToISO } from "./parisDateTime.ts";
export type SchedulePrecision = "DATE" | "EXACT";
export type OriginalMissionPeriod = { start: string; end: string; timezone?: string; schedulePrecision?: SchedulePrecision };
export function localDate(value: string, timezone = "Europe/Paris"): string {
  return value ? zonedDateTimeInput(value, timezone).slice(0, 10) : "";
}
// API ranges have an exclusive end. Subtracting one instant gives the last covered date.
export function inclusiveEndDate(value: string, timezone = "Europe/Paris"): string {
  return value ? localDate(new Date(Date.parse(value) - 1).toISOString(), timezone) : "";
}
export function missionDateRange(startDate: string, endDate: string, timezone: string, original?: OriginalMissionPeriod) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate))
    throw new Error("Renseignez les dates de début et de fin.");
  if (endDate < startDate) throw new Error("La date de fin doit être égale ou postérieure au début.");
  // Preserve exact imported vacations when only unrelated fields are edited.
  if (original && (original.timezone || "Europe/Paris") === timezone &&
      localDate(original.start, timezone) === startDate && inclusiveEndDate(original.end, timezone) === endDate) {
    return { start: original.start, end: original.end, schedulePrecision: original.schedulePrecision || "EXACT" };
  }
  // Validate the inclusive end independently before calculating the following day.
  zonedDateTimeToISO(endDate + "T00:00", undefined, timezone);
  return {
    start: zonedDateTimeToISO(startDate + "T00:00", undefined, timezone),
    end: zonedDateTimeToISO(nextDate(endDate) + "T00:00", undefined, timezone),
    schedulePrecision: "DATE" as const,
  };
}
export function missionDateRangeLabel(period: OriginalMissionPeriod): string {
  const timezone = period.timezone || "Europe/Paris";
  const format = (value: string, exact: boolean) => new Intl.DateTimeFormat("fr-FR", {
    timeZone: timezone, dateStyle: "medium", ...(exact ? { timeStyle: "short" as const } : {}),
  }).format(new Date(value));
  const exact = period.schedulePrecision !== "DATE";
  const end = exact ? period.end : new Date(Date.parse(period.end) - 1).toISOString();
  return `${format(period.start, exact)} → ${format(end, exact)}${exact ? "" : " inclus"} · ${timezone}`;
}

export function missionMaxDate(timezone='Europe/Paris',now=new Date()):string {
  const [year,month,day]=localDate(now.toISOString(),timezone).split('-').map(Number);
  const lastDay=new Date(Date.UTC(year+2,month,0)).getUTCDate();
  return `${year+2}-${String(month).padStart(2,'0')}-${String(Math.min(day,lastDay)).padStart(2,'0')}`;
}
export function validateMissionHorizon(start:string,end:string,timezone='Europe/Paris') {
  const max=missionMaxDate(timezone);
  if(start>max || end>max) throw new Error('Les dates ne peuvent pas dépasser deux ans à partir d’aujourd’hui.');
}
