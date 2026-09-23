import { nextDate, zonedDateTimeInput, zonedDateTimeToISO } from "./parisDateTime.ts";
export type SchedulePrecision = "DATE" | "EXACT";
export type OriginalMissionPeriod = { start: string; end: string; timezone?: string; schedulePrecision?: SchedulePrecision };
export type MissionClockTimes = { startTime: string; endTime: string };
export function localDate(value: string, timezone = "Europe/Paris"): string {
  return value ? zonedDateTimeInput(value, timezone).slice(0, 10) : "";
}
export function localTime(value: string, timezone = "Europe/Paris"): string {
  return value ? zonedDateTimeInput(value, timezone).slice(11, 16) : "";
}
// API ranges have an exclusive end. Subtracting one instant gives the last covered date.
export function inclusiveEndDate(value: string, timezone = "Europe/Paris"): string {
  return value ? localDate(new Date(Date.parse(value) - 1).toISOString(), timezone) : "";
}
/** Standard créneau hours used as defaults when the form has not set free times yet. */
export function missionShiftHours(shift: string): { startHour: number; endHour: number; crossesMidnight: boolean } | null {
  switch (shift) {
    case "MORNING":
      return { startHour: 6, endHour: 14, crossesMidnight: false };
    case "AFTERNOON":
      return { startHour: 14, endHour: 22, crossesMidnight: false };
    case "DAY":
      return { startHour: 6, endHour: 22, crossesMidnight: false };
    case "NIGHT":
      return { startHour: 22, endHour: 6, crossesMidnight: true };
    default:
      return null;
  }
}
export function missionShiftDefaultTimes(shift: string): MissionClockTimes | null {
  const hours = missionShiftHours(shift);
  if (!hours) return null;
  return {
    startTime: `${String(hours.startHour).padStart(2, "0")}:00`,
    endTime: `${String(hours.endHour).padStart(2, "0")}:00`,
  };
}
function clock(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}
function validClock(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
export function missionDateRange(
  startDate: string,
  endDate: string,
  timezone: string,
  original?: OriginalMissionPeriod,
  shift?: string,
  times?: MissionClockTimes,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate))
    throw new Error("Renseignez les dates de début et de fin.");
  if (endDate < startDate) throw new Error("La date de fin doit être égale ou postérieure au début.");
  if (times && (!validClock(times.startTime) || !validClock(times.endTime)))
    throw new Error("Renseignez des horaires valides.");
  const custom =
    times && validClock(times.startTime) && validClock(times.endTime)
      ? times
      : null;
  // Preserve exact custom hours when dates, timezone and clocks are unchanged.
  if (original && (original.timezone || "Europe/Paris") === timezone &&
      localDate(original.start, timezone) === startDate && inclusiveEndDate(original.end, timezone) === endDate &&
      original.schedulePrecision !== "DATE") {
    if (!custom ||
      (localTime(original.start, timezone) === custom.startTime &&
        localTime(original.end, timezone) === custom.endTime)) {
      return { start: original.start, end: original.end, schedulePrecision: original.schedulePrecision || "EXACT" };
    }
  }
  if (custom) {
    if (custom.endTime === custom.startTime)
      throw new Error("L’heure de fin doit être postérieure à l’heure de début.");
    const start = zonedDateTimeToISO(`${startDate}T${custom.startTime}`, undefined, timezone);
    let endDay = endDate;
    // Editing clocks on an existing overnight period must not add another day.
    const originalOvernightEnd = original && original.schedulePrecision !== "DATE" &&
      (original.timezone || "Europe/Paris") === timezone &&
      localDate(original.start, timezone) === startDate &&
      inclusiveEndDate(original.end, timezone) === endDate &&
      localDate(original.end, timezone) === endDate &&
      localTime(original.end, timezone) < localTime(original.start, timezone) &&
      endDate > startDate;
    if (custom.endTime < custom.startTime && !originalOvernightEnd) endDay = nextDate(endDate);
    const end = zonedDateTimeToISO(`${endDay}T${custom.endTime}`, undefined, timezone);
    if (Date.parse(end) <= Date.parse(start))
      throw new Error("L’heure de fin doit être postérieure à l’heure de début.");
    return { start, end, schedulePrecision: "EXACT" as const };
  }
  const hours = shift ? missionShiftHours(shift) : null;
  if (hours) {
    const start = zonedDateTimeToISO(`${startDate}T${clock(hours.startHour)}`, undefined, timezone);
    const endDay = hours.crossesMidnight ? nextDate(endDate) : endDate;
    const end = zonedDateTimeToISO(`${endDay}T${clock(hours.endHour)}`, undefined, timezone);
    return { start, end, schedulePrecision: "EXACT" as const };
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
